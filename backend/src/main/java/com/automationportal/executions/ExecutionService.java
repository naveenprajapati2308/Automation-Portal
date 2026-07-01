package com.automationportal.executions;

import com.automationportal.config.PortalAutomationProperties;
import com.automationportal.events.LiveBroadcastService;
import com.automationportal.events.ExecutionEventPayload;
import com.automationportal.events.ExecutionEventType;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

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

    public Execution queue(RunExecutionRequest request) {
        Execution execution = new Execution();
        execution.setExecutionCode("AUTO-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(java.time.ZoneOffset.UTC).format(Instant.now()));
        execution.setExecutionType(request.executionType());
        execution.setEnvironmentId(request.environmentId());
        execution.setModuleCode(request.executionType() == ExecutionType.ALL_MODULES ? "ALL" : request.moduleCode());
        execution.setSuiteXmlPath(request.suiteXmlPath());
        execution.setTriggeredBy(1L); // Default admin user
        execution.setStatus(ExecutionStatus.QUEUED);
        return repository.save(execution);
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

    public Execution rerun(Long id) {
        Execution old = repository.findById(id).orElseThrow();
        RunExecutionRequest req = new RunExecutionRequest(
                old.getExecutionType(),
                old.getEnvironmentId(),
                old.getModuleCode(),
                old.getSuiteXmlPath()
        );
        return queue(req);
    }

    public Execution rerunFailed(Long id) {
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
        execution.setTriggeredBy(1L);
        execution.setStatus(ExecutionStatus.QUEUED);
        
        return repository.save(execution);
    }

    public List<ExecutionTestCase> getTestCases(Long id) {
        return testCaseRepository.findByExecutionId(id);
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
}
