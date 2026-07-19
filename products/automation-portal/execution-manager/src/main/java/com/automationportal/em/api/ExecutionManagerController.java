package com.automationportal.em.api;

import com.automationportal.em.callback.PortalCallbackClient;
import com.automationportal.em.model.ExecutionJob;
import com.automationportal.em.model.RunnerRegistry;
import com.automationportal.em.repository.ExecutionJobRepository;
import com.automationportal.em.repository.RunnerRegistryRepository;
import com.automationportal.em.runner.RunnerClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/em")
public class ExecutionManagerController {
    private static final Logger log = LoggerFactory.getLogger(ExecutionManagerController.class);

    private final ExecutionJobRepository jobRepository;
    private final RunnerRegistryRepository runnerRepository;
    private final RunnerClient runnerClient;
    private final PortalCallbackClient callbackClient;

    @org.springframework.beans.factory.annotation.Value("${em.runner-url:http://localhost:9090}")
    private String defaultRunnerUrl;

    private final java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    public ExecutionManagerController(ExecutionJobRepository jobRepository,
                                      RunnerRegistryRepository runnerRepository,
                                      RunnerClient runnerClient,
                                      PortalCallbackClient callbackClient) {
        this.jobRepository = jobRepository;
        this.runnerRepository = runnerRepository;
        this.runnerClient = runnerClient;
        this.callbackClient = callbackClient;
    }

    @GetMapping("/suites")
    public ResponseEntity<?> getSuites() {
        try {
            String runnerUrl = defaultRunnerUrl;
            List<RunnerRegistry> runners = runnerRepository.findAll();
            if (!runners.isEmpty()) {
                runnerUrl = runners.get(0).getRunnerUrl();
            }

            String url = runnerUrl + "/runner/suites";
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(url))
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(5))
                    .build();
            java.net.http.HttpResponse<String> response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(response.statusCode())
                    .header("Content-Type", "application/json")
                    .body(response.body());
        } catch (Exception e) {
            log.error("Failed to proxy suites from runner", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // Submit execution to queue
    @PostMapping("/executions")
    public ResponseEntity<?> submitExecution(@RequestBody ExecutionJob jobRequest) {
        try {
            // Generate jobId matching executionId or custom code
            String jobId = "JOB_" + jobRequest.getExecutionId();
            if (jobRequest.getJobId() != null && !jobRequest.getJobId().isEmpty()) {
                jobId = jobRequest.getJobId();
            } else {
                jobRequest.setJobId(jobId);
            }

            jobRequest.setState("QUEUED");
            jobRequest.setSubmittedAt(Instant.now());
            
            // Find max queue position and set next
            int maxPos = jobRepository.findMaxQueuePosition();
            jobRequest.setQueuePosition(maxPos + 1);

            ExecutionJob savedJob = jobRepository.save(jobRequest);
            log.info("Enqueued execution job: {}", savedJob.getJobId());

            return ResponseEntity.ok(savedJob);
        } catch (Exception e) {
            log.error("Failed to enqueue job", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // Cancel queued or running execution
    @PostMapping("/executions/{jobId}/cancel")
    public ResponseEntity<?> cancelExecution(@PathVariable String jobId) {
        Optional<ExecutionJob> opt = jobRepository.findById(jobId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ExecutionJob job = opt.get();
        if ("COMPLETED".equals(job.getState()) || "CANCELLED".equals(job.getState()) || "ERROR".equals(job.getState())) {
            return ResponseEntity.badRequest().body("Job is already in finished state: " + job.getState());
        }

        log.info("Request to cancel job: {}", jobId);

        if ("RUNNING".equals(job.getState())) {
            if (job.getAssignedRunner() != null) {
                runnerClient.triggerCancel(job.getAssignedRunner(), jobId);
                updateRunnerStatus(job.getAssignedRunner(), "IDLE");
            }
        }

        job.setState("CANCELLED");
        job.setCompletedAt(Instant.now());
        jobRepository.save(job);

        // Notify Portal Backend
        callbackClient.notifyStateChange(job.getExecutionId(), "CANCELLED");

        return ResponseEntity.ok(job);
    }

    // Pause running execution
    @PostMapping("/executions/{jobId}/pause")
    public ResponseEntity<?> pauseExecution(@PathVariable String jobId) {
        Optional<ExecutionJob> opt = jobRepository.findById(jobId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ExecutionJob job = opt.get();
        if (!"RUNNING".equals(job.getState())) {
            return ResponseEntity.badRequest().body("Only running jobs can be paused");
        }

        log.info("Request to pause job: {}", jobId);
        
        // Notify runner if supported (send POST /runner/pause)
        // For simplicity, we just mark state as PAUSED
        job.setState("PAUSED");
        jobRepository.save(job);

        callbackClient.notifyStateChange(job.getExecutionId(), "PAUSED");

        return ResponseEntity.ok(job);
    }

    // Resume paused execution
    @PostMapping("/executions/{jobId}/resume")
    public ResponseEntity<?> resumeExecution(@PathVariable String jobId) {
        Optional<ExecutionJob> opt = jobRepository.findById(jobId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ExecutionJob job = opt.get();
        if (!"PAUSED".equals(job.getState())) {
            return ResponseEntity.badRequest().body("Only paused jobs can be resumed");
        }

        log.info("Request to resume job: {}", jobId);

        job.setState("RUNNING");
        jobRepository.save(job);

        callbackClient.notifyStateChange(job.getExecutionId(), "RUNNING");

        return ResponseEntity.ok(job);
    }

    // Remove from queue (only if QUEUED)
    @DeleteMapping("/executions/{jobId}")
    public ResponseEntity<?> deleteQueuedExecution(@PathVariable String jobId) {
        Optional<ExecutionJob> opt = jobRepository.findById(jobId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ExecutionJob job = opt.get();
        if (!"QUEUED".equals(job.getState())) {
            return ResponseEntity.badRequest().body("Only queued jobs can be deleted from queue");
        }

        jobRepository.delete(job);
        log.info("Deleted enqueued job: {}", jobId);
        return ResponseEntity.ok().build();
    }

    // Callback when job finishes
    @PostMapping("/executions/{jobId}/completed")
    public ResponseEntity<?> executionCompleted(@PathVariable String jobId) {
        Optional<ExecutionJob> opt = jobRepository.findById(jobId);
        if (opt.isEmpty()) {
            // Also try by executionId (in case portal backend sends executionCode instead of jobId, but since jobId contains executionCode we can query it)
            // Or look up by job ID or check if jobId is executionCode
            opt = jobRepository.findAll().stream().filter(j -> jobId.equals(j.getJobId()) || jobId.contains(String.valueOf(j.getExecutionId()))).findFirst();
        }

        if (opt.isEmpty()) {
            log.warn("Completed callback received for unknown job: {}", jobId);
            return ResponseEntity.notFound().build();
        }

        ExecutionJob job = opt.get();
        log.info("Job completion callback received for job: {}", job.getJobId());

        job.setState("COMPLETED");
        job.setCompletedAt(Instant.now());
        jobRepository.save(job);

        if (job.getAssignedRunner() != null) {
            updateRunnerStatus(job.getAssignedRunner(), "IDLE");
        }

        callbackClient.notifyJobFinished(job.getExecutionId());

        return ResponseEntity.ok().build();
    }

    // Get queue snapshot
    @GetMapping("/queue")
    public ResponseEntity<List<ExecutionJob>> getQueue() {
        return ResponseEntity.ok(jobRepository.findAll());
    }

    // Get running executions
    @GetMapping("/queue/running")
    public ResponseEntity<List<ExecutionJob>> getRunning() {
        return ResponseEntity.ok(jobRepository.findByState("RUNNING"));
    }

    // Get pending/queued executions
    @GetMapping("/queue/pending")
    public ResponseEntity<List<ExecutionJob>> getPending() {
        return ResponseEntity.ok(jobRepository.findByState("QUEUED"));
    }

    // Get status of a job
    @GetMapping("/executions/{jobId}/status")
    public ResponseEntity<ExecutionJob> getJobStatus(@PathVariable String jobId) {
        return ResponseEntity.of(jobRepository.findById(jobId));
    }

    // Register a runner
    @PostMapping("/runners/register")
    public ResponseEntity<?> registerRunner(@RequestBody RunnerRegistry runner) {
        runner.setLastHeartbeat(Instant.now());
        runner.setStatus("IDLE");
        RunnerRegistry saved = runnerRepository.save(runner);
        log.info("Registered new runner node: {}", saved.getRunnerId());
        return ResponseEntity.ok(saved);
    }

    // List runners
    @GetMapping("/runners")
    public ResponseEntity<List<RunnerRegistry>> listRunners() {
        return ResponseEntity.ok(runnerRepository.findAll());
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
}
