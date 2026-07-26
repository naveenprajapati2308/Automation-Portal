package com.automationportal.perftesting.queue;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.results.RunTrigger;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Manages the lifecycle of {@link PerfJobQueue} entries.
 *
 * <p>This service is intentionally thin — it only writes state transitions.
 * All dispatching logic lives in {@link PerfJobWorker}.</p>
 */
@Service
@RequiredArgsConstructor
public class PerfJobQueueService {

    private static final Logger log = LoggerFactory.getLogger(PerfJobQueueService.class);

    private final PerfJobQueueRepository repository;

    /**
     * Enqueues a new job for the given target. The {@link PerfJobWorker} will
     * dispatch it as soon as a concurrency slot is available.
     *
     * @param type       the type of test to run
     * @param targetId   the ID of the test (PerformanceTest, LoadTest, or TestGroup)
     * @param trigger    SCHEDULED for cron-triggered runs
     * @param scheduleId the schedule row that triggered this job (may be null for manual queue enqueue)
     * @return the saved queue entry (status = PENDING)
     */
    @Transactional
    public PerfJobQueue enqueue(JobType type, Long targetId, RunTrigger trigger, Long scheduleId) {
        PerfJobQueue job = PerfJobQueue.builder()
                .jobType(type)
                .targetId(targetId)
                .runTrigger(trigger)
                .scheduleId(scheduleId)
                .status(JobStatus.PENDING)
                .priority(5)
                .enqueuedAt(LocalDateTime.now())
                .build();
        PerfJobQueue saved = repository.save(job);
        log.info("Enqueued job #{} type={} targetId={} trigger={}", saved.getId(), type, targetId, trigger);
        return saved;
    }

    /**
     * Transitions a job to RUNNING and records the {@code perf_test_run} ID
     * that was created for it.
     */
    @Transactional
    public void markRunning(Long jobId, Long runId) {
        PerfJobQueue job = findOrThrow(jobId);
        job.setStatus(JobStatus.RUNNING);
        job.setRunId(runId);
        job.setStartedAt(LocalDateTime.now());
        repository.save(job);
    }

    /**
     * Transitions a job to COMPLETED when the k6 run finishes successfully
     * or with an acceptable result (PASSED / FAILED status is on the run, not the job).
     */
    @Transactional
    public void markCompleted(Long jobId) {
        PerfJobQueue job = findOrThrow(jobId);
        job.setStatus(JobStatus.COMPLETED);
        job.setCompletedAt(LocalDateTime.now());
        repository.save(job);
        log.info("Job #{} marked COMPLETED", jobId);
    }

    /**
     * Transitions a job to FAILED (dispatch error, timeout, or retries exhausted).
     */
    @Transactional
    public void markFailed(Long jobId, String errorMessage) {
        PerfJobQueue job = findOrThrow(jobId);
        job.setStatus(JobStatus.FAILED);
        job.setCompletedAt(LocalDateTime.now());
        job.setErrorMessage(errorMessage);
        repository.save(job);
        log.warn("Job #{} marked FAILED: {}", jobId, errorMessage);
    }

    /**
     * Cancels a PENDING job (e.g. user explicitly cancels via the API).
     * Only PENDING jobs can be cancelled — RUNNING jobs must be aborted at the run level.
     */
    @Transactional
    public void cancel(Long jobId) {
        PerfJobQueue job = findOrThrow(jobId);
        if (job.getStatus() != JobStatus.PENDING) {
            throw ApiException.badRequest("Only PENDING jobs can be cancelled. Current status: " + job.getStatus());
        }
        job.setStatus(JobStatus.CANCELLED);
        job.setCompletedAt(LocalDateTime.now());
        repository.save(job);
        log.info("Job #{} cancelled", jobId);
    }

    private PerfJobQueue findOrThrow(Long jobId) {
        return repository.findById(jobId)
                .orElseThrow(() -> ApiException.notFound("Queue job not found with ID: " + jobId));
    }
}
