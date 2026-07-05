package com.automationportal.em.queue;

import com.automationportal.em.callback.PortalCallbackClient;
import com.automationportal.em.model.ExecutionJob;
import com.automationportal.em.model.RunnerRegistry;
import com.automationportal.em.repository.ExecutionJobRepository;
import com.automationportal.em.repository.RunnerRegistryRepository;
import com.automationportal.em.runner.RunnerClient;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
public class QueueProcessor {
    private static final Logger log = LoggerFactory.getLogger(QueueProcessor.class);

    private final ExecutionJobRepository jobRepository;
    private final RunnerRegistryRepository runnerRepository;
    private final RunnerClient runnerClient;
    private final PortalCallbackClient callbackClient;

    @Value("${em.max-concurrent:1}")
    private int maxConcurrent;

    @Value("${em.timeout-minutes:120}")
    private int timeoutMinutes;

    @Value("${em.runner-url:http://localhost:9090}")
    private String defaultRunnerUrl;

    @Value("${em.portal-backend-url:http://localhost:8080}")
    private String portalBackendUrl;

    @Value("${em.portal-api-key:shared-secret}")
    private String portalApiKey;

    public QueueProcessor(ExecutionJobRepository jobRepository,
                          RunnerRegistryRepository runnerRepository,
                          RunnerClient runnerClient,
                          PortalCallbackClient callbackClient) {
        this.jobRepository = jobRepository;
        this.runnerRepository = runnerRepository;
        this.runnerClient = runnerClient;
        this.callbackClient = callbackClient;
    }

    /**
     * The registry row persists in MySQL across environments, but the correct runner URL
     * differs per environment (docker-compose sets EM_RUNNER_URL to the Docker network
     * hostname; native runs default to localhost). Sync the default runner's row to this
     * instance's configured URL on every boot so a stale row from the other environment
     * can never black-hole dispatches.
     */
    @PostConstruct
    void syncDefaultRunner() {
        RunnerRegistry runner = runnerRepository.findById("default-runner").orElseGet(() -> {
            RunnerRegistry r = new RunnerRegistry();
            r.setRunnerId("default-runner");
            r.setRunnerName("Default Runner");
            return r;
        });
        if (!defaultRunnerUrl.equals(runner.getRunnerUrl()) || !"IDLE".equalsIgnoreCase(runner.getStatus())) {
            log.info("Syncing default-runner registry entry: url {} -> {}, status {} -> IDLE",
                     runner.getRunnerUrl(), defaultRunnerUrl, runner.getStatus());
        }
        runner.setRunnerUrl(defaultRunnerUrl);
        runner.setStatus("IDLE");
        runner.setLastHeartbeat(Instant.now());
        runnerRepository.save(runner);
    }

    @Scheduled(fixedDelay = 5000)
    public void processQueue() {
        try {
            // 1. Process active running jobs and check timeouts
            checkRunningJobsTimeout();

            // 2. Concurrency check
            List<ExecutionJob> runningJobs = jobRepository.findByState("RUNNING");
            int runningCount = runningJobs.size();
            
            if (runningCount >= maxConcurrent) {
                return;
            }

            int availableSlots = maxConcurrent - runningCount;

            // 3. Find next enqueued jobs
            List<ExecutionJob> queuedJobs = jobRepository.findQueuedJobsOrdered();
            if (queuedJobs.isEmpty()) {
                return;
            }

            log.info("Found {} queued jobs. Running: {}/{}. Available slots: {}", 
                     queuedJobs.size(), runningCount, maxConcurrent, availableSlots);

            // 4. Dispatch jobs
            for (int i = 0; i < Math.min(availableSlots, queuedJobs.size()); i++) {
                ExecutionJob job = queuedJobs.get(i);
                dispatchJob(job);
            }
        } catch (Exception e) {
            log.error("Error in queue processor loop", e);
        }
    }

    private void dispatchJob(ExecutionJob job) {
        log.info("Attempting to dispatch job: {} for execution: {}", job.getJobId(), job.getExecutionId());

        // Find an IDLE runner or register the default one if registry is empty
        String runnerUrl = selectRunner();
        if (runnerUrl == null) {
            log.warn("No active/idle runners found for job: {}", job.getJobId());
            return;
        }

        // Trigger run on Framework Runner
        boolean success = runnerClient.triggerRun(
                runnerUrl,
                job.getJobId(),
                job.getSuiteXml(),
                portalBackendUrl,
                portalApiKey
        );

        if (success) {
            job.setState("RUNNING");
            job.setStartedAt(Instant.now());
            job.setAssignedRunner(runnerUrl);
            jobRepository.save(job);

            // Mark runner as BUSY
            updateRunnerStatus(runnerUrl, "BUSY");

            // Notify Portal Backend that execution state is RUNNING
            callbackClient.notifyStateChange(job.getExecutionId(), "RUNNING");
            log.info("Job {} successfully dispatched to runner {}", job.getJobId(), runnerUrl);
        } else {
            log.error("Failed to trigger job {} on runner {}", job.getJobId(), runnerUrl);
            // Handle dispatch failures - check retry or mark as ERROR
            handleDispatchFailure(job);
        }
    }

    private String selectRunner() {
        List<RunnerRegistry> runners = runnerRepository.findAll();
        if (runners.isEmpty()) {
            // Registry is empty, register the default configured runner
            RunnerRegistry defaultRunner = new RunnerRegistry();
            defaultRunner.setRunnerId("default-runner");
            defaultRunner.setRunnerName("Default Runner");
            defaultRunner.setRunnerUrl(defaultRunnerUrl);
            defaultRunner.setStatus("IDLE");
            defaultRunner.setLastHeartbeat(Instant.now());
            runnerRepository.save(defaultRunner);
            return defaultRunnerUrl;
        }

        // Find first runner which is IDLE or whose status is active
        for (RunnerRegistry r : runners) {
            if ("IDLE".equalsIgnoreCase(r.getStatus())) {
                return r.getRunnerUrl();
            }
        }

        // Fallback: If all are BUSY or none are IDLE but we have default, return it
        // Or if we run sequential (maxConcurrent = 1), just return default-runner's URL
        return defaultRunnerUrl;
    }

    private void updateRunnerStatus(String url, String status) {
        List<RunnerRegistry> runners = runnerRepository.findAll();
        for (RunnerRegistry r : runners) {
            if (r.getRunnerUrl().equals(url)) {
                r.setStatus(status);
                r.setLastHeartbeat(Instant.now());
                runnerRepository.save(r);
                break;
            }
        }
    }

    private void handleDispatchFailure(ExecutionJob job) {
        int max = job.getMaxRetries();
        int current = job.getRetryCount();
        if (current < max) {
            job.setRetryCount(current + 1);
            job.setState("QUEUED"); // Keep enqueued
            jobRepository.save(job);
            log.info("Retrying job dispatch: {} (attempt {}/{})", job.getJobId(), job.getRetryCount(), max);
        } else {
            job.setState("ERROR");
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);
            callbackClient.notifyStateChange(job.getExecutionId(), "ERROR");
        }
    }

    private void checkRunningJobsTimeout() {
        List<ExecutionJob> runningJobs = jobRepository.findByState("RUNNING");
        for (ExecutionJob job : runningJobs) {
            if (job.getStartedAt() != null) {
                long minutesElapsed = Duration.between(job.getStartedAt(), Instant.now()).toMinutes();
                if (minutesElapsed >= job.getTimeoutMinutes()) {
                    log.warn("Job {} exceeded timeout of {} minutes. Force-terminating...", 
                             job.getJobId(), job.getTimeoutMinutes());
                    
                    // Terminate process on runner
                    if (job.getAssignedRunner() != null) {
                        runnerClient.triggerCancel(job.getAssignedRunner(), job.getJobId());
                        updateRunnerStatus(job.getAssignedRunner(), "IDLE");
                    }
                    
                    job.setState("ERROR");
                    job.setCompletedAt(Instant.now());
                    jobRepository.save(job);
                    
                    // Notify Portal Backend
                    callbackClient.notifyStateChange(job.getExecutionId(), "ERROR");
                }
            }
        }
    }
}
