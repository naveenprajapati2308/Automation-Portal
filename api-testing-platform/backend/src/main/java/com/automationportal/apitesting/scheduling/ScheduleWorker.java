package com.automationportal.apitesting.scheduling;

import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.regularapi.DependencyExecutionService;
import com.automationportal.apitesting.regularapi.RegularApi;
import com.automationportal.apitesting.regularapi.RegularApiRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Executes one claimed schedule on the worker pool: runs the regular API
 * (dependencies + validation included), applies retry-with-backoff on failure,
 * computes the next run, and releases the lock.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduleWorker {

    private final ScheduleRepository scheduleRepository;
    private final RegularApiRepository regularApiRepository;
    private final DependencyExecutionService dependencyExecutionService;
    private final com.automationportal.apitesting.group.ApiGroupRepository groupRepository;
    private final com.automationportal.apitesting.group.GroupExecutionService groupExecutionService;

    public void run(Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId).orElse(null);
        if (schedule == null) return;

        Instant now = Instant.now();
        schedule.setLastRunAt(now);
        try {
            if (schedule.getTargetType() == Schedule.TargetType.GROUP) {
                runGroupTarget(schedule, now);
                return;
            }

            RegularApi api = schedule.getRegularApiId() == null ? null
                    : regularApiRepository.findById(schedule.getRegularApiId()).orElse(null);
            if (api == null) {
                log.warn("Schedule '{}' points to missing regular API {} — disabling", schedule.getName(), schedule.getRegularApiId());
                schedule.setStatus(Schedule.Status.DISABLED);
                schedule.setLastRunStatus(Schedule.RunStatus.FAILED);
                return;
            }

            var result = dependencyExecutionService.execute(api, ExecutionHistory.TriggeredBy.SCHEDULE, schedule.getId());
            ExecutionResponse response = result.getResponse();

            boolean httpOk = response.isSuccess()
                    && response.getStatusCode() != null && response.getStatusCode() < 400;
            boolean validationOk = result.getValidationPassed() == null || result.getValidationPassed();

            if (httpOk && validationOk) {
                schedule.setLastRunStatus(Schedule.RunStatus.SUCCESS);
                schedule.setRetryCount(0);
                schedule.setNextRunAt(computeNextRun(schedule, now));
            } else if (response.isTimedOut()) {
                schedule.setLastRunStatus(Schedule.RunStatus.TIMEOUT);
                applyRetryOrAdvance(schedule, now);
            } else {
                schedule.setLastRunStatus(Schedule.RunStatus.FAILED);
                applyRetryOrAdvance(schedule, now);
            }
        } catch (Exception ex) {
            log.error("Schedule '{}' crashed: {}", schedule.getName(), ex.getMessage(), ex);
            schedule.setLastRunStatus(Schedule.RunStatus.FAILED);
            applyRetryOrAdvance(schedule, now);
        } finally {
            schedule.setLockedBy(null);
            schedule.setLockedUntil(null);
            scheduleRepository.save(schedule);
        }
    }

    /**
     * Group-target schedules run the whole group inline (already on a worker
     * thread) through the same execution pipeline. SUCCESS requires every
     * member to pass; a PARTIAL result counts as failed for retry purposes.
     */
    private void runGroupTarget(Schedule schedule, Instant now) {
        var group = schedule.getGroupId() == null ? null
                : groupRepository.findById(schedule.getGroupId()).orElse(null);
        if (group == null) {
            log.warn("Schedule '{}' points to missing group {} — disabling", schedule.getName(), schedule.getGroupId());
            schedule.setStatus(Schedule.Status.DISABLED);
            schedule.setLastRunStatus(Schedule.RunStatus.FAILED);
            return;
        }
        var execution = groupExecutionService.executeSync(group, schedule.getId());
        if (execution.getStatus() == com.automationportal.apitesting.group.ApiGroupExecution.Status.SUCCESS) {
            schedule.setLastRunStatus(Schedule.RunStatus.SUCCESS);
            schedule.setRetryCount(0);
            schedule.setNextRunAt(computeNextRun(schedule, now));
        } else {
            schedule.setLastRunStatus(Schedule.RunStatus.FAILED);
            applyRetryOrAdvance(schedule, now);
        }
    }

    /**
     * Retry with exponential backoff (30s, 2m, 10m), then fall back to the
     * normal cadence. A recurring schedule is never auto-disabled by failures.
     */
    private void applyRetryOrAdvance(Schedule schedule, Instant now) {
        if (schedule.getRetryCount() < schedule.getMaxRetries()) {
            schedule.setRetryCount(schedule.getRetryCount() + 1);
            schedule.setNextRunAt(now.plus(backoff(schedule.getRetryCount())));
        } else {
            schedule.setRetryCount(0);
            schedule.setNextRunAt(computeNextRun(schedule, now));
        }
    }

    private Duration backoff(int attempt) {
        return switch (attempt) {
            case 1 -> Duration.ofSeconds(30);
            case 2 -> Duration.ofMinutes(2);
            default -> Duration.ofMinutes(10);
        };
    }

    static Instant computeNextRun(Schedule schedule, Instant from) {
        return switch (schedule.getFrequencyType()) {
            case EVERY_X_MIN -> from.plus(Duration.ofMinutes(parseMinutes(schedule.getFrequencyValue())));
            case HOURLY -> from.plus(Duration.ofHours(1));
            case DAILY -> from.plus(Duration.ofDays(1));
            case WEEKLY -> from.plus(Duration.ofDays(7));
            case CRON -> {
                CronExpression cron = CronExpression.parse(schedule.getFrequencyValue());
                ZonedDateTime next = cron.next(ZonedDateTime.ofInstant(from, ZoneId.systemDefault()));
                yield next == null ? from.plus(Duration.ofDays(1)) : next.toInstant();
            }
        };
    }

    private static long parseMinutes(String value) {
        try {
            return Math.max(1, Long.parseLong(value.trim()));
        } catch (Exception e) {
            return 5;
        }
    }
}
