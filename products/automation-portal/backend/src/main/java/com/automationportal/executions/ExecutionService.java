package com.automationportal.executions;

import com.automationportal.config.PortalAutomationProperties;
import com.automationportal.events.LiveBroadcastService;
import com.automationportal.events.ExecutionEventPayload;
import com.automationportal.events.ExecutionEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExecutionService {
    private static final Logger log = LoggerFactory.getLogger(ExecutionService.class);

    // Generous on purpose: a large suite's testng-results.xml merge alone can take 8+ seconds,
    // and the whole run (Selenium against a real site) can legitimately run long. This only
    // needs to catch executions that are ACTUALLY stuck (runner died before any SUITE_COMPLETED
    // ever arrived) — see reapStaleRunningExecutions() below for why it's time-based, not
    // triggered by the runner's process-exit signal.
    private static final java.time.Duration STALE_RUNNING_GRACE_PERIOD = java.time.Duration.ofMinutes(20);

    private final ExecutionRepository repository;
    private final ExecutionTestCaseRepository testCaseRepository;
    private final ExecutionArtifactRepository artifactRepository;
    private final ExecutionLogRepository logRepository;
    private final PortalAutomationProperties properties;
    private final ExecutionWorker worker;
    private final LiveBroadcastService broadcastService;

    public ExecutionService(ExecutionRepository repository,
                            ExecutionTestCaseRepository testCaseRepository,
                            ExecutionArtifactRepository artifactRepository,
                            ExecutionLogRepository logRepository,
                            PortalAutomationProperties properties,
                            @Lazy ExecutionWorker worker,
                            LiveBroadcastService broadcastService) {
        this.repository = repository;
        this.testCaseRepository = testCaseRepository;
        this.artifactRepository = artifactRepository;
        this.logRepository = logRepository;
        this.properties = properties;
        this.worker = worker;
        this.broadcastService = broadcastService;
    }

    public Execution queue(RunExecutionRequest request, Long triggeredByUserId) {
        Execution execution = new Execution();
        execution.setExecutionCode("AUTO-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(java.time.ZoneOffset.UTC).format(Instant.now()));
        execution.setExecutionType(request.executionType());
        execution.setEnvironmentId(request.environmentId());
        execution.setModuleCode(request.executionType() == ExecutionType.ALL_MODULES ? "ALL" : request.moduleCode());
        execution.setSuiteXmlPath(request.suiteXmlPath());
        execution.setTriggeredBy(triggeredByUserId);
        execution.setStatus(ExecutionStatus.QUEUED);
        return repository.save(execution);
    }

    /**
     * Permanently removes an execution and every trace of it: test cases (+steps,
     * +tag links), artifact rows, logs, the EM job/queue rows, the execution row
     * itself, and the copied artifact files on disk.
     */
    @Transactional
    public void delete(Long id) {
        Execution e = repository.findById(id).orElseThrow();
        if (e.getStatus() == ExecutionStatus.QUEUED || e.getStatus() == ExecutionStatus.RUNNING) {
            throw new IllegalStateException("Cannot delete a QUEUED/RUNNING execution — cancel it first.");
        }
        repository.deleteTestStepsFor(id);
        repository.deleteTestCaseTagLinksFor(id);
        repository.deleteTestCasesFor(id);
        repository.deleteArtifactRowsFor(id);
        repository.deleteLogRowsFor(id);
        repository.deleteJobRowsFor(id);
        repository.deleteQueueRowsFor(id);
        repository.delete(e);
        deleteArtifactDirectory(e.getExecutionCode());
    }

    private void deleteArtifactDirectory(String executionCode) {
        if (executionCode == null || executionCode.isBlank()) return;
        try {
            Path root = Path.of(properties.getArtifactsRoot()).toAbsolutePath().normalize();
            Path dir = root.resolve("executions").resolve(executionCode).normalize();
            if (!dir.startsWith(root) || !Files.exists(dir)) return;
            try (var walk = Files.walk(dir)) {
                walk.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                    try { Files.delete(p); } catch (IOException ignored) { }
                });
            }
        } catch (IOException ignored) {
            // DB cleanup already committed; leftover files are harmless and re-deletable.
        }
    }

    public List<Execution> recent() {
        return repository.findTop25ByOrderByCreatedAtDesc();
    }

    public List<Execution> filter(String status, String module, Instant from, Instant to) {
        return repository.findAll().stream()
                .filter(e -> status == null || status.trim().isEmpty() || e.getStatus().toString().equalsIgnoreCase(status))
                .filter(e -> module == null || module.trim().isEmpty() || (e.getModuleCode() != null && e.getModuleCode().equalsIgnoreCase(module)))
                .filter(e -> from == null || (e.getCreatedAt() != null && e.getCreatedAt().isAfter(from)))
                .filter(e -> to == null || (e.getCreatedAt() != null && e.getCreatedAt().isBefore(to)))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
    }

    public void cancel(Long id) {
        worker.cancelExecution(id);
    }

    public Execution rerun(Long id, Long triggeredByUserId) {
        Execution old = repository.findById(id).orElseThrow();
        RunExecutionRequest req = new RunExecutionRequest(
                old.getExecutionType(),
                old.getEnvironmentId(),
                old.getModuleCode(),
                old.getSuiteXmlPath()
        );
        return queue(req, triggeredByUserId);
    }

    public Execution rerunFailed(Long id, Long triggeredByUserId) {
        Execution old = repository.findById(id).orElseThrow();
        
        // Find failed xml artifact
        List<ExecutionArtifact> failedArtifacts = artifactRepository.findByExecutionIdAndArtifactType(id, "TESTNG_FAILED_XML");
        if (failedArtifacts.isEmpty()) {
            throw new IllegalArgumentException("No testng-failed.xml found for execution " + id);
        }

        ExecutionArtifact artifact = failedArtifacts.get(0);
        Path src = Path.of(properties.getArtifactsRoot(), artifact.getFilePath());
        if (!Files.exists(src)) {
            throw new IllegalArgumentException("Failed XML file does not exist on disk: " + src.toAbsolutePath());
        }

        // Create new execution code
        String newCode = "AUTO-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(java.time.ZoneOffset.UTC).format(Instant.now());
        String tempSuiteName = "testng-failed-temp-" + newCode + ".xml";
        Path dest = Path.of(properties.getRepositoryPath(), tempSuiteName);

        try {
            Files.copy(src, dest);
        } catch (IOException e) {
            throw new RuntimeException("Failed to copy failed XML suite to framework folder", e);
        }

        Execution execution = new Execution();
        execution.setExecutionCode(newCode);
        execution.setExecutionType(ExecutionType.XML_SUITE);
        execution.setEnvironmentId(old.getEnvironmentId());
        execution.setModuleCode(old.getModuleCode());
        execution.setSuiteXmlPath(tempSuiteName);
        execution.setTriggeredBy(triggeredByUserId);
        execution.setStatus(ExecutionStatus.QUEUED);
        
        return repository.save(execution);
    }

    public List<ExecutionTestCase> getTestCases(Long id) {
        return testCaseRepository.findByExecutionIdWithTags(id);
    }

    public List<ExecutionArtifact> getArtifacts(Long id) {
        return artifactRepository.findByExecutionId(id);
    }

    public List<ExecutionLog> getLogs(Long id) {
        return logRepository.findByExecutionId(id);
    }

    public Map<String, Object> getSummary(Long id) {
        Execution e = repository.findById(id).orElseThrow();
        Map<String, Object> map = new HashMap<>();
        map.put("executionCode", e.getExecutionCode());
        map.put("status", e.getStatus());
        map.put("totalTests", e.getTotalTests());
        map.put("passed", e.getPassedTests());
        map.put("failed", e.getFailedTests());
        map.put("skipped", e.getSkippedTests());
        map.put("passRate", e.getPassRate());
        map.put("failRate", e.getFailRate());
        map.put("durationSeconds", e.getDurationSeconds());
        map.put("startTime", e.getStartTime());
        map.put("endTime", e.getEndTime());
        map.put("machineName", e.getMachineName());
        map.put("osName", e.getOsName());
        map.put("javaVersion", e.getJavaVersion());
        map.put("browserName", e.getBrowserName());
        map.put("finalReportPath", e.getFinalReportPath());
        return map;
    }

    public void updateState(Long id, String state) {
        Execution e = repository.findById(id).orElseThrow();
        ExecutionStatus status = ExecutionStatus.valueOf(state);
        e.setStatus(status);
        if (status == ExecutionStatus.RUNNING && e.getStartTime() == null) {
            e.setStartTime(Instant.now());
        } else if (status == ExecutionStatus.COMPLETED || status == ExecutionStatus.CANCELLED || status == ExecutionStatus.ERROR) {
            e.setEndTime(Instant.now());
            if (e.getStartTime() != null) {
                e.setDurationSeconds(java.time.Duration.between(e.getStartTime(), e.getEndTime()).toSeconds());
            }
        }
        repository.save(e);

        // Broadcast state update to frontend SSE clients
        ExecutionEventPayload payload = new ExecutionEventPayload();
        payload.setExecutionId(e.getExecutionCode());
        payload.setTimestamp(java.time.LocalDateTime.now());
        
        if (status == ExecutionStatus.RUNNING) {
            payload.setEventType(ExecutionEventType.EXECUTION_STARTING);
        } else {
            payload.setEventType(ExecutionEventType.SUITE_COMPLETED);
        }
        broadcastService.broadcast(e.getExecutionCode(), payload);
    }

    /**
     * Called when the Framework Runner's process has exited, regardless of whether it ever ran
     * a single test. In the normal case MPHIDB's listener already pushed SUITE_COMPLETED and
     * ExecutionEventService.finalizeExecution() already set a real terminal status (PASSED/
     * FAILED/PARTIAL), so this is a no-op. But if the run failed before TestNG ever started
     * (e.g. "mvn clean" itself failing on a permission error) no listener code runs at all, and
     * without this the execution — and ExecutionWorker.pollQueue()'s "at most one RUNNING at a
     * time" gate with it — would stay stuck on RUNNING forever.
     */
    public void markStaleIfStillRunning(Long id) {
        Execution e = repository.findById(id).orElseThrow();
        if (e.getStatus() != ExecutionStatus.RUNNING) {
            return;
        }
        e.setStatus(ExecutionStatus.ERROR);
        e.setEndTime(Instant.now());
        if (e.getStartTime() != null) {
            e.setDurationSeconds(java.time.Duration.between(e.getStartTime(), e.getEndTime()).toSeconds());
        }
        repository.save(e);

        ExecutionLog logRec = new ExecutionLog();
        logRec.setExecutionId(id);
        logRec.setLevel("ERROR");
        logRec.setMessage("No completion signal received within the stale-execution grace period (" + STALE_RUNNING_GRACE_PERIOD.toMinutes() + " min) — marked as ERROR so the execution queue isn't blocked.");
        logRec.setSource("SYSTEM");
        logRepository.save(logRec);

        ExecutionEventPayload payload = new ExecutionEventPayload();
        payload.setExecutionId(e.getExecutionCode());
        payload.setTimestamp(java.time.LocalDateTime.now());
        payload.setEventType(ExecutionEventType.SUITE_COMPLETED);
        broadcastService.broadcast(e.getExecutionCode(), payload);
    }

    // Sole path that force-terminates a stuck RUNNING execution. The Execution Manager used to
    // trigger this immediately whenever the framework runner's OS process exited — but that
    // signal fires independently of (and often before) the backend finishing its own event
    // processing for the same execution, so it raced legitimate slow-but-successful completions
    // and clobbered correct results with a bogus ERROR. Being purely time-based instead removes
    // the race entirely: a run that's still genuinely in progress is simply younger than the
    // grace period and left alone; only a run that's been stuck for a long time (runner died
    // before any SUITE_COMPLETED ever arrived — the original 2026-07-04 bug this replaces) gets
    // reaped.
    @Scheduled(fixedDelay = 60000)
    public void reapStaleRunningExecutions() {
        Instant cutoff = Instant.now().minus(STALE_RUNNING_GRACE_PERIOD);
        List<Execution> stale = repository.findByStatusAndStartTimeBefore(ExecutionStatus.RUNNING, cutoff);
        for (Execution e : stale) {
            log.warn("Execution {} has been RUNNING since {}, past the {} grace period — marking ERROR",
                    e.getId(), e.getStartTime(), STALE_RUNNING_GRACE_PERIOD);
            markStaleIfStillRunning(e.getId());
        }
    }
}
