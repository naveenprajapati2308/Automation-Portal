package com.automationportal.perftesting.queue;

import com.automationportal.perftesting.group.TestGroupService;
import com.automationportal.perftesting.results.PerfTestRun;
import com.automationportal.perftesting.results.ResultService;
import com.automationportal.perftesting.results.RunTrigger;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Queue drain loop — the concurrency gatekeeper for k6 process launches.
 *
 * <h3>Why this exists</h3>
 * <p>Without this worker, the {@link com.automationportal.perftesting.schedule.ScheduledRunner}
 * launches k6 via {@code @Async} immediately on every due schedule. If 100 schedules fire
 * at midnight, 100 k6 processes spawn concurrently, exhausting CPU/RAM and bringing down the
 * portal itself.</p>
 *
 * <h3>How it works</h3>
 * <ol>
 *   <li>Every {@code perf.queue.poll-interval-ms} (default 5 s), wake up.</li>
 *   <li>First, evict stale RUNNING jobs whose k6 process died or timed out.</li>
 *   <li>Count RUNNING jobs. If {@code >= max-concurrent-runs}, skip and wait.</li>
 *   <li>Claim next PENDING job with {@code FOR UPDATE SKIP LOCKED} (DB-level mutual exclusion —
 *       the sole concurrency guard; this is a single-instance-per-product deployment, so no
 *       additional multi-node lock is needed).</li>
 *   <li>Dispatch: call {@link ResultService} / {@link TestGroupService} which ultimately
 *       calls {@link K6ProcessRunner} {@code @Async} — now safely gated.</li>
 *   <li>Repeat until cap is reached or queue is empty.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class PerfJobWorker {

    private static final Logger log = LoggerFactory.getLogger(PerfJobWorker.class);

    private final PerfJobQueueRepository jobRepository;
    private final ResultService resultService;
    private final TestGroupService testGroupService;

    @Value("${perf.queue.max-concurrent-runs:3}")
    private int maxConcurrentRuns;

    @Value("${perf.queue.job-timeout-minutes:60}")
    private int jobTimeoutMinutes;

    /**
     * Main drain loop. Wakes up every {@code perf.queue.poll-interval-ms} milliseconds.
     */
    @Scheduled(fixedDelayString = "${perf.queue.poll-interval-ms:5000}")
    public void drainQueue() {
        try {
            // Step 1: Evict stale RUNNING jobs before checking the cap
            timeoutStaleJobs();

            // Step 2: Count currently active k6 processes
            long running = jobRepository.countByStatus(JobStatus.RUNNING);
            if (running >= maxConcurrentRuns) {
                log.debug("Concurrency cap reached ({}/{}). Queue drain deferred.", running, maxConcurrentRuns);
                return;
            }

            // Step 3: Fill all available slots (not just one) in a single tick
            boolean dispatched = claimAndDispatch();
            while (dispatched && jobRepository.countByStatus(JobStatus.RUNNING) < maxConcurrentRuns) {
                dispatched = claimAndDispatch();
            }

        } catch (Exception e) {
            log.error("Error in PerfJobWorker drain loop", e);
        }
    }

    /**
     * Claims and dispatches a single PENDING job.
     *
     * <p>Uses {@code REQUIRES_NEW} so the database row lock (SKIP LOCKED) is
     * committed/released immediately after claim — identical to how
     * {@link com.automationportal.perftesting.schedule.ScheduledRunner#claimAndRunNext()} works.</p>
     *
     * @return {@code true} if a job was found and dispatched; {@code false} if queue is empty
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimAndDispatch() {
        Optional<PerfJobQueue> claimed = jobRepository.claimNextPendingJob();
        if (claimed.isEmpty()) {
            return false;
        }

        PerfJobQueue job = claimed.get();
        log.info("Claimed queue job #{} type={} targetId={}", job.getId(), job.getJobType(), job.getTargetId());

        // Mark as RUNNING in DB immediately so the cap check sees it on next iteration
        job.setStatus(JobStatus.RUNNING);
        job.setStartedAt(LocalDateTime.now());
        jobRepository.save(job);

        try {
            PerfTestRun run = dispatch(job);
            if (run != null) {
                job.setRunId(run.getId());
                jobRepository.save(job);
                log.info("Job #{} dispatched → PerfTestRun #{}", job.getId(), run.getId());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch job #{}: {}", job.getId(), e.getMessage(), e);
            handleDispatchFailure(job, e.getMessage());
        }

        return true;
    }

    /**
     * Routes the job to the correct service based on {@link JobType}.
     */
    private PerfTestRun dispatch(PerfJobQueue job) {
        RunTrigger trigger = job.getRunTrigger();
        return switch (job.getJobType()) {
            case PERF_TEST -> resultService.startPerformanceTest(job.getTargetId(), trigger);
            case LOAD_TEST -> resultService.startLoadTest(job.getTargetId(), trigger);
            case GROUP     -> testGroupService.triggerGroupRun(job.getTargetId(), trigger);
        };
    }

    /**
     * Handles dispatch failure with retry logic.
     * If retries are exhausted, marks the job as FAILED.
     */
    private void handleDispatchFailure(PerfJobQueue job, String errorMessage) {
        int newRetryCount = job.getRetryCount() + 1;
        if (newRetryCount <= job.getMaxRetries()) {
            log.info("Retrying job #{} (attempt {}/{})", job.getId(), newRetryCount, job.getMaxRetries());
            job.setStatus(JobStatus.PENDING);  // put back in queue
            job.setRetryCount(newRetryCount);
            job.setErrorMessage("Retry " + newRetryCount + ": " + errorMessage);
            job.setStartedAt(null);
            jobRepository.save(job);
        } else {
            log.error("Job #{} exhausted {} retries. Marking FAILED.", job.getId(), job.getMaxRetries());
            job.setStatus(JobStatus.FAILED);
            job.setCompletedAt(LocalDateTime.now());
            job.setErrorMessage(errorMessage);
            jobRepository.save(job);
        }
    }

    /**
     * Scans for RUNNING jobs where {@code started_at < now - jobTimeoutMinutes}.
     * These are jobs whose k6 process has likely died without sending a completion signal.
     * Marks them FAILED and frees up the concurrency slot automatically.
     */
    private void timeoutStaleJobs() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(jobTimeoutMinutes);
        List<PerfJobQueue> stale = jobRepository.findStaleRunningJobs(JobStatus.RUNNING, cutoff);
        for (PerfJobQueue job : stale) {
            log.warn("Job #{} has been RUNNING for over {} minutes. Force-failing (timeout).",
                    job.getId(), jobTimeoutMinutes);
            job.setStatus(JobStatus.FAILED);
            job.setCompletedAt(LocalDateTime.now());
            job.setErrorMessage("Job timed out after " + jobTimeoutMinutes + " minutes");
            jobRepository.save(job);

            // Best-effort: also abort the underlying k6 process if still alive
            if (job.getRunId() != null) {
                try {
                    resultService.abortRun(job.getRunId());
                } catch (Exception e) {
                    log.warn("Could not abort run #{} during job timeout eviction: {}", job.getRunId(), e.getMessage());
                }
            }
        }
    }
}
