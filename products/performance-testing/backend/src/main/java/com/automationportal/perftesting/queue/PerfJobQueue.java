package com.automationportal.perftesting.queue;

import com.automationportal.perftesting.results.RunTrigger;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * JPA entity mapping the {@code perf_job_queue} table.
 *
 * <p>The queue decouples schedule-firing from k6 process launch. When the
 * {@link com.automationportal.perftesting.schedule.ScheduledRunner} claims a due
 * schedule it writes a PENDING row here and returns immediately. The
 * {@link PerfJobWorker} polls this table every few seconds and dispatches up to
 * {@code perf.queue.max-concurrent-runs} jobs concurrently — preventing unlimited
 * k6 process spawning when many schedules fire at the same cron tick.</p>
 */
@Entity
@Table(name = "perf_job_queue")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfJobQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false, length = 20)
    private JobType jobType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_trigger", nullable = false, length = 20)
    private RunTrigger runTrigger;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private JobStatus status = JobStatus.PENDING;

    /**
     * Lower number = higher priority. Scheduler-triggered jobs default to 5.
     * Manual runs go straight to ResultService and bypass this queue entirely.
     */
    @Column(name = "priority", nullable = false)
    @Builder.Default
    private int priority = 5;

    /** Set to {@code perf_test_run.id} once the worker dispatches the job. */
    @Column(name = "run_id")
    private Long runId;

    /** Set to {@code perf_test_schedule.id} if triggered by the scheduler. */
    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private int maxRetries = 2;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "enqueued_at", nullable = false)
    @Builder.Default
    private LocalDateTime enqueuedAt = LocalDateTime.now();

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
