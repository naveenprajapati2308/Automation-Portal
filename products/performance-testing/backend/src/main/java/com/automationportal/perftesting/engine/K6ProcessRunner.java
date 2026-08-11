package com.automationportal.perftesting.engine;

import com.automationportal.perftesting.common.SseEmitterManager;
import com.automationportal.perftesting.engine.model.K6MetricLine;
import com.automationportal.perftesting.loadtest.LoadTest;
import com.automationportal.perftesting.perftest.PerformanceTest;
import com.automationportal.perftesting.results.*;
import com.automationportal.perftesting.drift.DriftDetector;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.GZIPOutputStream;

@Component
@RequiredArgsConstructor
public class K6ProcessRunner {
    private static final Logger log = LoggerFactory.getLogger(K6ProcessRunner.class);

    private final PerfTestRunRepository runRepository;
    private final PerfMetricSampleRepository sampleRepository;
    private final SseEmitterManager sseEmitterManager;
    private final ThresholdEvaluator thresholdEvaluator;
    private final DriftDetector driftDetector;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${perf.k6.output-dir:/tmp/k6-runs}")
    private String outputDir;

    @Value("${perf.k6.binary-path:k6}")
    private String k6BinaryPath;

    private final Map<Long, Process> activeProcesses = new ConcurrentHashMap<>();

    public void abort(Long runId) {
        Process p = activeProcesses.get(runId);
        if (p != null && p.isAlive()) {
            log.info("Aborting active process for run ID {}", runId);
            p.destroyForcibly();
            activeProcesses.remove(runId);
        }
    }

    // Takes the run ID, not the entity built by the caller's (still-open)
    // @Transactional method — that entity's row can lose the race against
    // this @Async thread's own persistence context and get inserted a
    // second time under a new identity. Re-fetching by ID here guarantees
    // this thread only ever operates on the row that's actually committed
    // (ResultService defers this dispatch until after that commit).
    @Async
    public void runPerformanceTestAsync(Long runId, PerformanceTest test, String scriptContent) {
        PerfTestRun run = runRepository.findById(runId)
                .orElseThrow(() -> new IllegalStateException("Performance Test Run not found with ID: " + runId));
        runProcess(run, test.getAssertions(), scriptContent, (ingestor) -> {
            List<ThresholdResult> thresholds = thresholdEvaluator.evaluatePerformanceTest(test, ingestor);
            List<AssertionResult> assertions = thresholdEvaluator.evaluateAssertions(test.getAssertions(), ingestor);
            boolean passed = thresholds.stream().allMatch(ThresholdResult::getPassed) &&
                             assertions.stream().allMatch(AssertionResult::getPassed);

            run.setThresholdResults(thresholds);
            run.setAssertionResults(assertions);
            run.setStatus(passed ? RunStatus.PASSED : RunStatus.FAILED);
        });
    }

    @Async
    public void runLoadTestAsync(Long runId, LoadTest test, String scriptContent) {
        PerfTestRun run = runRepository.findById(runId)
                .orElseThrow(() -> new IllegalStateException("Load Test Run not found with ID: " + runId));
        runProcess(run, test.getAssertions(), scriptContent, (ingestor) -> {
            List<ThresholdResult> thresholds = thresholdEvaluator.evaluateLoadTest(test, ingestor);
            List<AssertionResult> assertions = thresholdEvaluator.evaluateAssertions(test.getAssertions(), ingestor);
            boolean passed = thresholds.stream().allMatch(ThresholdResult::getPassed) &&
                             assertions.stream().allMatch(AssertionResult::getPassed);

            run.setThresholdResults(thresholds);
            run.setAssertionResults(assertions);
            run.setStatus(passed ? RunStatus.PASSED : RunStatus.FAILED);
        });
    }

    private void runProcess(PerfTestRun run, List<com.automationportal.perftesting.perftest.Assertion> assertions, String scriptContent, ResultEvaluator evaluator) {
        Long runId = run.getId();
        File tempScript = null;
        File gzippedOutputFile = null;
        GZIPOutputStream gzipOutputStream = null;
        BufferedWriter gzipWriter = null;

        try {
            // 1. Create output directory if not exists
            Files.createDirectories(Paths.get(outputDir));

            // 2. Write k6 script to temp file
            tempScript = File.createTempFile("k6-" + runId + "-", ".js", new File(outputDir));
            try (FileWriter fw = new FileWriter(tempScript, StandardCharsets.UTF_8)) {
                fw.write(scriptContent);
            }

            // 3. Prepare gzipped output log file
            gzippedOutputFile = new File(outputDir, "run-" + runId + "-metrics.json.gz");
            gzipOutputStream = new GZIPOutputStream(new FileOutputStream(gzippedOutputFile));
            gzipWriter = new BufferedWriter(new OutputStreamWriter(gzipOutputStream, StandardCharsets.UTF_8));

            log.info("Starting k6 load run {} with script: {}", runId, tempScript.getAbsolutePath());

            // Update run status in DB
            run.setStartedAt(LocalDateTime.now());
            run.setStatus(RunStatus.RUNNING);
            runRepository.save(run);

            // 4. Invoke k6 binary via ProcessBuilder
            // -o json=- streams metric points to stdout, -q suppresses standard text reports
            ProcessBuilder pb = new ProcessBuilder(
                    k6BinaryPath, "run",
                    "--out", "json=-",
                    "--quiet",
                    tempScript.getAbsolutePath()
            );
            pb.redirectErrorStream(true); // capture stderr into stdout stream

            Process process = pb.start();
            activeProcesses.put(runId, process);
            MetricIngestor ingestor = new MetricIngestor(runId, run.getProjectId(), sseEmitterManager, sampleRepository);

            // Read process output line by line
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Write raw line to gzipped run log
                    gzipWriter.write(line);
                    gzipWriter.newLine();

                    // Parse JSON metric lines
                    if (line.startsWith("{") && line.endsWith("}")) {
                        try {
                            K6MetricLine metric = mapper.readValue(line, K6MetricLine.class);
                            ingestor.ingest(metric);
                        } catch (Exception e) {
                            // Ignored: might be standard log messages or non-JSON stderr prints
                        }
                    }
                }
            }

            int exitCode = process.waitFor();
            gzipWriter.flush();
            gzipWriter.close(); // closing zip output stream

            ingestor.finish();

            log.info("k6 run {} finished with exit code {}", runId, exitCode);

            // 5. Populate final run metrics
            run.setEndedAt(LocalDateTime.now());
            run.setK6ExitCode(exitCode);
            run.setRawOutputPath(gzippedOutputFile.getAbsolutePath());
            run.setTotalRequests(ingestor.getTotalRequests());
            run.setErrorCount(ingestor.getErrorCount());
            run.setErrorRatePct(ingestor.getTotalRequests() > 0 
                ? ((double) ingestor.getErrorCount() / ingestor.getTotalRequests()) * 100.0 
                : 0.0);

            List<Double> durations = ingestor.getAllDurations();
            if (!durations.isEmpty()) {
                run.setP50Ms(MetricIngestor.calculatePercentile(durations, 50.0));
                run.setP75Ms(MetricIngestor.calculatePercentile(durations, 75.0));
                run.setP90Ms(MetricIngestor.calculatePercentile(durations, 90.0));
                run.setP95Ms(MetricIngestor.calculatePercentile(durations, 95.0));
                run.setP99Ms(MetricIngestor.calculatePercentile(durations, 99.0));
                run.setMaxMs(ingestor.getMaxMs());
                run.setMinMs(ingestor.getMinMs());
                run.setAvgMs(ingestor.getAvgMs());
            } else {
                run.setP50Ms(0.0);
                run.setP75Ms(0.0);
                run.setP90Ms(0.0);
                run.setP95Ms(0.0);
                run.setP99Ms(0.0);
                run.setMaxMs(0.0);
                run.setMinMs(0.0);
                run.setAvgMs(0.0);
            }

            run.setRequestsPerSec(ingestor.getRequestsPerSec());
            run.setPeakVus(ingestor.getPeakVus());

            // 6. Evaluate thresholds and assertions
            evaluator.evaluate(ingestor);

            runRepository.save(run);

            try {
                driftDetector.checkDrift(run);
            } catch (Exception e) {
                log.error("Failed to run drift detection for run ID {}", runId, e);
            }

            sseEmitterManager.sendRunComplete(runId, run.getProjectId(), run);

        } catch (Exception ex) {
            log.error("Error executing k6 run {}", runId, ex);
            run.setStatus(RunStatus.ERROR);
            run.setEndedAt(LocalDateTime.now());
            run.setErrorMessage(ex.getMessage());
            runRepository.save(run);
            sseEmitterManager.sendRunError(runId, run.getProjectId(), ex.getMessage());

            // Clean up files in case of crash
            try {
                if (gzipWriter != null) gzipWriter.close();
            } catch (Exception ignored) {}
        } finally {
            activeProcesses.remove(runId);
            // 7. Cleanup temp javascript file
            if (tempScript != null && tempScript.exists()) {
                try {
                    Files.delete(tempScript.toPath());
                } catch (Exception ignored) {}
            }
        }
    }

    private interface ResultEvaluator {
        void evaluate(MetricIngestor ingestor);
    }
}
