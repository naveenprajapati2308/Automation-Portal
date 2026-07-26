package com.automationportal.perftesting.schedule;

import com.automationportal.perftesting.queue.JobType;
import com.automationportal.perftesting.queue.PerfJobQueueService;
import com.automationportal.perftesting.results.RunTrigger;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Cron-schedule poller. Wakes up every {@code perf.scheduler.poll-interval-ms}
 * (default 30 s) and claims any due schedule rows using {@code FOR UPDATE SKIP LOCKED}.
 *
 * <h3>Concurrency-safe design</h3>
 * <p>In a multi-instance deployment the DB lock ensures exactly one node claims each
 * schedule row. Once claimed, the runner writes a {@code PENDING} entry to the
 * {@code perf_job_queue} table and returns immediately — <strong>k6 is NOT launched
 * here</strong>. The {@link com.automationportal.perftesting.queue.PerfJobWorker}
 * drains that queue at a configurable concurrency cap, preventing the portal from
 * being overwhelmed when many schedules fire simultaneously.</p>
 */
@Component
@RequiredArgsConstructor
public class ScheduledRunner {

    private static final Logger log = LoggerFactory.getLogger(ScheduledRunner.class);

    private final PerfTestScheduleRepository repository;
    private final PerfTestScheduleService service;
    private final PerfJobQueueService jobQueueService;

    /**
     * Wakes up every 30 seconds to poll and enqueue due schedules.
     */
    @Scheduled(fixedDelayString = "${perf.scheduler.poll-interval-ms:30000}")
    public void pollAndEnqueue() {
        log.trace("ScheduledRunner checking for due performance tests...");
        boolean processed;
        do {
            processed = claimAndEnqueueNext();
        } while (processed);
    }

    /**
     * Claims a single due schedule row and writes a PENDING job to the queue.
     * Uses {@code REQUIRES_NEW} so the database row lock is released as quickly
     * as possible (same pattern as the old direct-dispatch version).
     *
     * @return {@code true} if a schedule was found and a job was enqueued
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimAndEnqueueNext() {
        LocalDateTime now = LocalDateTime.now();
        Optional<PerfTestSchedule> claimed = repository.claimNextSchedule(now);

        if (claimed.isEmpty()) {
            return false;
        }

        PerfTestSchedule schedule = claimed.get();
        log.info("Claimed schedule ID={} targetType={} targetId={}",
                schedule.getId(), schedule.getTargetType(), schedule.getTargetId());

        try {
            JobType jobType = toJobType(schedule.getTargetType());
            if (jobType == null) {
                log.warn("Unsupported schedule target type: {}. Skipping.", schedule.getTargetType());
                schedule.setLastStatus(ScheduleLastStatus.ERROR);
            } else {
                // Enqueue — k6 launch happens later in PerfJobWorker when a slot is free
                jobQueueService.enqueue(jobType, schedule.getTargetId(), RunTrigger.SCHEDULED, schedule.getId());
                schedule.setLastStatus(ScheduleLastStatus.QUEUED);
                log.info("Schedule ID={} enqueued as {} job (target={})",
                        schedule.getId(), jobType, schedule.getTargetId());
            }
        } catch (Exception e) {
            log.error("Failed to enqueue schedule ID={}: {}", schedule.getId(), e.getMessage(), e);
            schedule.setLastStatus(ScheduleLastStatus.ERROR);
        }

        // Update last run timestamp and calculate next execution time
        schedule.setLastRunAt(now);
        LocalDateTime nextRun = service.calculateNextRun(schedule.getCronExpression(), schedule.getTimezone());
        schedule.setNextRunAt(nextRun);

        if (nextRun == null) {
            schedule.setIsEnabled(false);
            log.info("No further occurrences for schedule ID={}. Disabling.", schedule.getId());
        }

        repository.save(schedule);
        return true;
    }

    private JobType toJobType(ScheduleTargetType targetType) {
        return switch (targetType) {
            case PERF_TEST  -> JobType.PERF_TEST;
            case LOAD_TEST  -> JobType.LOAD_TEST;
            case GROUP      -> JobType.GROUP;
        };
    }
}
