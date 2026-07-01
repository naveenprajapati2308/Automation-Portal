package com.automationportal.executions;

import com.automationportal.config.PortalAutomationProperties;
import com.automationportal.modules.ModuleEntity;
import com.automationportal.modules.ModuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class ExecutionWorker {
    private static final Logger log = LoggerFactory.getLogger(ExecutionWorker.class);

    private final ExecutionRepository executionRepository;
    private final ExecutionArtifactRepository artifactRepository;
    private final ExecutionLogRepository logRepository;
    private final PortalAutomationProperties properties;
    private final ModuleRepository moduleRepository;
    private final HttpClient httpClient;

    @Value("${portal.execution-manager.url:http://localhost:8090}")
    private String executionManagerUrl;

    public ExecutionWorker(ExecutionRepository executionRepository,
                           ExecutionArtifactRepository artifactRepository,
                           ExecutionLogRepository logRepository,
                           PortalAutomationProperties properties,
                           ModuleRepository moduleRepository) {
        this.executionRepository = executionRepository;
        this.artifactRepository = artifactRepository;
        this.logRepository = logRepository;
        this.properties = properties;
        this.moduleRepository = moduleRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Scheduled(fixedDelay = 5000)
    public void pollQueue() {
        // Enforce sequential execution: if there's any running execution, wait
        List<Execution> runningList = executionRepository.findByStatus(ExecutionStatus.RUNNING);
        if (!runningList.isEmpty()) {
            return;
        }

        // Find the oldest queued execution
        List<Execution> queuedList = executionRepository.findByStatus(ExecutionStatus.QUEUED);
        if (queuedList.isEmpty()) {
            return;
        }

        // Pick the oldest queued execution
        Execution execution = queuedList.get(0);
        processExecution(execution);
    }

    public void cancelExecution(Long id) {
        Execution execution = executionRepository.findById(id).orElse(null);
        if (execution == null) return;

        log.info("Requesting cancellation of execution {} from Execution Manager", id);
        try {
            String jobId = execution.getExecutionCode();
            String url = executionManagerUrl + "/em/executions/" + jobId + "/cancel";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .timeout(Duration.ofSeconds(5))
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .thenAccept(res -> log.info("Cancel request sent to Execution Manager. Status: {}", res.statusCode()));

            execution.setStatus(ExecutionStatus.CANCELLED);
            execution.setEndTime(Instant.now());
            executionRepository.save(execution);
            logToDb(id, "INFO", "Execution was cancelled and termination requested from Execution Manager", "SYSTEM");
        } catch (Exception e) {
            log.error("Failed to call Execution Manager cancel API for execution: {}", id, e);
        }
    }

    private void processExecution(Execution execution) {
        Long execId = execution.getId();

        // 1. Resolve suite XML and name
        String xmlFileName = "MPHIDB.xml";
        String suiteName = "Master Automation Suite";
        String suiteReport = "reports/MasterReport2.html";

        if (execution.getExecutionType() == ExecutionType.ALL_MODULES) {
            PortalAutomationProperties.SuiteInfo suite = properties.getSuites().get("all");
            if (suite != null) {
                xmlFileName = suite.getXml();
                suiteName = suite.getName();
                suiteReport = suite.getReport() != null ? suite.getReport() : suiteReport;
            }
        } else if (execution.getExecutionType() == ExecutionType.MODULE) {
            String mod = execution.getModuleCode();
            // Primary: look up module in DB by code
            java.util.Optional<ModuleEntity> moduleOpt = mod != null
                    ? moduleRepository.findByCode(mod.toUpperCase())
                    : java.util.Optional.empty();
            if (moduleOpt.isPresent() && moduleOpt.get().getXmlFile() != null) {
                ModuleEntity m = moduleOpt.get();
                xmlFileName = m.getXmlFile();
                suiteName = m.getName() + " Suite";
                if (m.getReportPath() != null) suiteReport = m.getReportPath();
            } else {
                // Fallback: application.yml suites map
                String suiteKey = mod != null ? mod.toLowerCase() : "";
                PortalAutomationProperties.SuiteInfo suite = properties.getSuites().get(suiteKey);
                if (suite != null) {
                    xmlFileName = suite.getXml();
                    suiteName = suite.getName();
                    if (suite.getReport() != null) suiteReport = suite.getReport();
                }
            }
        } else if (execution.getExecutionType() == ExecutionType.XML_SUITE) {
            xmlFileName = execution.getSuiteXmlPath();
            suiteName = "Custom XML Suite: " + xmlFileName;
            suiteReport = resolveReportPathForXml(xmlFileName);
        }

        execution.setSuiteName(suiteName);
        execution.setSuiteXmlPath(xmlFileName);
        
        // Submit to Execution Manager enqueuing
        log.info("Submitting execution {} to Execution Manager...", execution.getExecutionCode());
        try {
            String url = executionManagerUrl + "/em/executions";
            // Map request payload matching EM ExecutionJob entity
            String jsonPayload = String.format(
                    "{\"jobId\":\"%s\",\"executionId\":%d,\"suiteXml\":\"%s\",\"priority\":\"MEDIUM\",\"maxRetries\":0,\"timeoutMinutes\":120,\"submittedBy\":\"admin\"}",
                    execution.getExecutionCode(), execution.getId(), xmlFileName
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 || response.statusCode() == 202) {
                // Change status to RUNNING to block local poll queue from picking it up again
                execution.setStatus(ExecutionStatus.RUNNING);
                execution.setStartTime(Instant.now());
                executionRepository.save(execution);

                logToDb(execId, "INFO", "Successfully submitted execution to Execution Manager. Awaiting callback...", "SYSTEM");
            } else {
                log.error("Execution Manager rejected execution submission: {} - {}", response.statusCode(), response.body());
                execution.setStatus(ExecutionStatus.ERROR);
                executionRepository.save(execution);
                logToDb(execId, "ERROR", "Failed to submit execution to Execution Manager. Code: " + response.statusCode(), "SYSTEM");
            }
        } catch (Exception e) {
            log.error("Exception submitting execution to Execution Manager", e);
            execution.setStatus(ExecutionStatus.ERROR);
            executionRepository.save(execution);
            logToDb(execId, "ERROR", "Exception calling Execution Manager: " + e.getMessage(), "SYSTEM");
        }
    }

    private String resolveReportPathForXml(String xmlFileName) {
        if (xmlFileName == null) return "reports/MasterReport2.html";
        // Look up from DB first
        return moduleRepository.findAll().stream()
                .filter(m -> xmlFileName.equals(m.getXmlFile()) && m.getReportPath() != null)
                .findFirst()
                .map(ModuleEntity::getReportPath)
                .orElseGet(() -> xmlFileName.toLowerCase().contains("emp_arch")
                        ? "reports/MasterReport.html"
                        : "reports/MasterReport2.html");
    }

    public void copyExecutionArtifacts(Execution execution) {
        try {
            String repoPath = properties.getRepositoryPath();
            String artifactsRoot = properties.getArtifactsRoot();
            String executionCode = execution.getExecutionCode();

            // Resolve suite report: prefer DB lookup by module code, then by xml file
            String suiteReport = "reports/MasterReport2.html";
            if (execution.getModuleCode() != null) {
                suiteReport = moduleRepository.findByCode(execution.getModuleCode().toUpperCase())
                        .filter(m -> m.getReportPath() != null)
                        .map(ModuleEntity::getReportPath)
                        .orElseGet(() -> resolveReportPathForXml(execution.getSuiteXmlPath()));
            } else {
                suiteReport = resolveReportPathForXml(execution.getSuiteXmlPath());
            }

            Path artifactBaseDir = Path.of(artifactsRoot, "executions", executionCode);
            Files.createDirectories(artifactBaseDir.resolve("reports"));
            Files.createDirectories(artifactBaseDir.resolve("xml"));
            Files.createDirectories(artifactBaseDir.resolve("screenshots"));
            Files.createDirectories(artifactBaseDir.resolve("logs"));

            // Copy files
            copyArtifacts(repoPath, artifactBaseDir.toString(), executionCode, suiteReport);
            
            // Save console log artifact if it exists
            File consoleLogFile = artifactBaseDir.resolve("logs/console.log").toFile();
            if (consoleLogFile.exists()) {
                saveArtifactRecord(execution.getId(), "CONSOLE_LOG", consoleLogFile);
            }
            
            // Update final report path in execution
            File copiedReport = artifactBaseDir.resolve(suiteReport).toFile();
            if (!copiedReport.exists()) {
                String reportBaseName = Path.of(suiteReport).getFileName().toString();
                copiedReport = artifactBaseDir.resolve("reports").resolve(reportBaseName).toFile();
            }
            if (copiedReport.exists()) {
                Path relative = Path.of(artifactsRoot).toAbsolutePath().relativize(copiedReport.toPath().toAbsolutePath());
                execution.setFinalReportPath(relative.toString().replace("\\", "/"));
                executionRepository.save(execution);
            }
            
            log.info("Artifacts successfully copied for execution: {}", executionCode);
        } catch (Exception e) {
            log.error("Failed to copy artifacts for execution: {}", execution.getExecutionCode(), e);
        }
    }

    private void copyArtifacts(String repoPath, String targetDir, String executionCode, String suiteReport) {
        try {
            for (Map.Entry<String, String> entry : properties.getResultFiles().entrySet()) {
                String type = entry.getKey();
                String relPath = entry.getValue();

                File src = new File(repoPath, relPath);
                if (!src.exists()) continue;

                File dest;
                String artifactType;
                if ("testng-results".equals(type)) {
                    dest = new File(targetDir, "xml/testng-results.xml");
                    artifactType = "TESTNG_RESULTS_XML";
                } else if ("testng-failed".equals(type)) {
                    dest = new File(targetDir, "xml/testng-failed.xml");
                    artifactType = "TESTNG_FAILED_XML";
                } else if ("emailable-report".equals(type)) {
                    dest = new File(targetDir, "reports/emailable-report.html");
                    artifactType = "EMAILABLE_REPORT";
                } else if ("index-report".equals(type)) {
                    dest = new File(targetDir, "reports/index.html");
                    artifactType = "TESTNG_HTML_REPORT";
                } else if ("screenshots".equals(type)) {
                    copyDirectory(src, new File(targetDir, "screenshots"), executionCode, "SCREENSHOT");
                    continue;
                } else if ("logs".equals(type)) {
                    copyDirectory(src, new File(targetDir, "logs"), executionCode, "FRAMEWORK_LOG");
                    continue;
                } else {
                    continue;
                }

                Files.copy(src.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING);
                saveArtifactRecord(executionRepository.findByExecutionCode(executionCode).get(0).getId(), artifactType, dest);
            }

            File extentReportSrc = new File(repoPath, suiteReport);
            if (extentReportSrc.exists()) {
                String reportBaseName = Path.of(suiteReport).getFileName().toString();
                File extentReportDest = new File(targetDir, "reports/" + reportBaseName);
                Files.copy(extentReportSrc.toPath(), extentReportDest.toPath(), StandardCopyOption.REPLACE_EXISTING);
                saveArtifactRecord(executionRepository.findByExecutionCode(executionCode).get(0).getId(), "EXTENT_REPORT", extentReportDest);
            }

        } catch (Exception e) {
            log.error("Error copying artifacts", e);
        }
    }

    private void copyDirectory(File source, File destination, String executionCode, String artifactType) throws IOException {
        if (source.isDirectory()) {
            if (!destination.exists()) {
                destination.mkdirs();
            }
            File[] files = source.listFiles();
            if (files != null) {
                for (File file : files) {
                    copyDirectory(file, new File(destination, file.getName()), executionCode, artifactType);
                }
            }
        } else {
            Files.copy(source.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING);
            Long execId = executionRepository.findByExecutionCode(executionCode).get(0).getId();
            saveArtifactRecord(execId, artifactType, destination);
        }
    }

    private void saveArtifactRecord(Long executionId, String type, File file) {
        try {
            ExecutionArtifact artifact = new ExecutionArtifact();
            artifact.setExecutionId(executionId);
            artifact.setArtifactType(type);
            artifact.setFileName(file.getName());
            
            Path relative = Path.of(properties.getArtifactsRoot()).toAbsolutePath().relativize(file.toPath().toAbsolutePath());
            artifact.setFilePath(relative.toString().replace("\\", "/"));
            
            String mime = Files.probeContentType(file.toPath());
            artifact.setMimeType(mime != null ? mime : "application/octet-stream");
            artifact.setSizeBytes(file.length());

            artifactRepository.save(artifact);
        } catch (Exception e) {
            log.error("Failed to save artifact record", e);
        }
    }

    private void logToDb(Long executionId, String level, String message, String source) {
        try {
            ExecutionLog logRec = new ExecutionLog();
            logRec.setExecutionId(executionId);
            logRec.setLevel(level);
            logRec.setMessage(message);
            logRec.setSource(source);
            logRepository.save(logRec);
        } catch (Exception e) {
            log.error("Failed to write log to DB", e);
        }
    }
}
