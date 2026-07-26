package com.automationportal.perftesting.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PerfJobQueueRepository extends JpaRepository<PerfJobQueue, Long> {

    /**
     * Atomically claims the next PENDING job ordered by (priority ASC, enqueued_at ASC).
     *
     * <p>{@code FOR UPDATE SKIP LOCKED} ensures that in a multi-node deployment two
     * worker threads never claim the same row — exactly like the schedule-claiming
     * query in {@link com.automationportal.perftesting.schedule.PerfTestScheduleRepository}.</p>
     *
     * <p>This must be a native query because JPQL does not support {@code FOR UPDATE SKIP LOCKED}.</p>
     */
    @Query(value = "SELECT * FROM perf_job_queue " +
                   "WHERE status = 'PENDING' " +
                   "ORDER BY priority ASC, enqueued_at ASC " +
                   "LIMIT 1 FOR UPDATE SKIP LOCKED",
           nativeQuery = true)
    Optional<PerfJobQueue> claimNextPendingJob();

    /**
     * Counts jobs in the given status. Used by the worker to enforce the concurrency cap.
     * Spring Data derives this from the method name — no query needed.
     */
    long countByStatus(JobStatus status);

    List<PerfJobQueue> findByStatus(JobStatus status);

    List<PerfJobQueue> findTop50ByOrderByEnqueuedAtDesc();

    /**
     * Finds RUNNING jobs whose {@code started_at} is before {@code cutoff}.
     * Used by the worker to evict stale/timed-out jobs.
     *
     * <p>Note: compares the JPQL enum field directly (not a string literal) via
     * the named parameter, so the comparison is type-safe.</p>
     */
    @Query("SELECT j FROM PerfJobQueue j WHERE j.status = :runningStatus AND j.startedAt < :cutoff")
    List<PerfJobQueue> findStaleRunningJobs(
            @Param("runningStatus") JobStatus runningStatus,
            @Param("cutoff") LocalDateTime cutoff);

    /**
     * Bulk-cancels all PENDING jobs for a given schedule (e.g. when a schedule is deleted).
     * Uses a native query to avoid needing a @Transactional update + CURRENT_TIMESTAMP() in JPQL.
     */
    @Modifying
    @Query(value = "UPDATE perf_job_queue " +
                   "SET status = 'CANCELLED', completed_at = NOW() " +
                   "WHERE schedule_id = :scheduleId AND status = 'PENDING'",
           nativeQuery = true)
    int cancelPendingByScheduleId(@Param("scheduleId") Long scheduleId);
}
