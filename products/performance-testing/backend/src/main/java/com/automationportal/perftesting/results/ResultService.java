package com.automationportal.perftesting.results;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.common.SseEmitterManager;
import com.automationportal.perftesting.engine.K6ProcessRunner;
import com.automationportal.perftesting.engine.K6ScriptGenerator;
import com.automationportal.perftesting.loadtest.LoadTest;
import com.automationportal.perftesting.loadtest.LoadTestRepository;
import com.automationportal.perftesting.perftest.PerformanceTest;
import com.automationportal.perftesting.perftest.PerformanceTestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final PerfTestRunRepository runRepository;
    private final PerfMetricSampleRepository sampleRepository;
    private final PerformanceTestRepository performanceTestRepository;
    private final LoadTestRepository loadTestRepository;
    private final K6ScriptGenerator scriptGenerator;
    private final K6ProcessRunner processRunner;
    private final SseEmitterManager sseEmitterManager;

    @Transactional(readOnly = true)
    public Page<PerfTestRun> getRuns(TestType testType, RunStatus status, RunTrigger trigger, Pageable pageable) {
        return runRepository.findFiltered(testType, status, trigger, pageable);
    }

    @Transactional(readOnly = true)
    public PerfTestRun getRunDetails(Long id) {
        return runRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Performance Test Run not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public List<PerfMetricSample> getRunMetrics(Long runId) {
        // Ensure run exists
        if (!runRepository.existsById(runId)) {
            throw ApiException.notFound("Performance Test Run not found with ID: " + runId);
        }
        return sampleRepository.findByRunIdOrderBySampledAtAsc(runId);
    }

    @Transactional
    public PerfTestRun startPerformanceTest(Long testId, RunTrigger trigger) {
        PerformanceTest test = performanceTestRepository.findById(testId)
                .orElseThrow(() -> ApiException.notFound("Performance Test not found with ID: " + testId));

        if (!test.getIsActive()) {
            throw ApiException.badRequest("Cannot run an inactive performance test");
        }

        // Generate script
        String script = scriptGenerator.generatePerformanceTestScript(test);

        // Build Run record
        PerfTestRun run = PerfTestRun.builder()
                .testType(TestType.PERF)
                .testId(testId)
                .testName(test.getName())
                .runTrigger(trigger)
                .status(RunStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .build();

        run = runRepository.save(run);

        // Dispatch only after this transaction commits — launching the async k6
        // run any earlier risks the worker thread trying to update this row
        // before it's durably visible outside this transaction, which makes
        // Hibernate insert a second row instead of updating the first (see
        // K6ProcessRunner.runPerformanceTestAsync for the re-fetch-by-id half
        // of this fix).
        Long runId = run.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                processRunner.runPerformanceTestAsync(runId, test, script);
            }
        });

        return run;
    }

    @Transactional
    public PerfTestRun startLoadTest(Long testId, RunTrigger trigger) {
        LoadTest test = loadTestRepository.findById(testId)
                .orElseThrow(() -> ApiException.notFound("Load Test not found with ID: " + testId));

        if (!test.getIsActive()) {
            throw ApiException.badRequest("Cannot run an inactive load test");
        }

        // Generate script
        String script = scriptGenerator.generateLoadTestScript(test);

        // Build Run record
        PerfTestRun run = PerfTestRun.builder()
                .testType(TestType.LOAD)
                .testId(testId)
                .testName(test.getName())
                .runTrigger(trigger)
                .status(RunStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .build();

        run = runRepository.save(run);

        // See startPerformanceTest for why this waits for commit.
        Long runId = run.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                processRunner.runLoadTestAsync(runId, test, script);
            }
        });

        return run;
    }

    @Transactional
    public void abortRun(Long runId) {
        PerfTestRun run = runRepository.findById(runId)
                .orElseThrow(() -> ApiException.notFound("Performance Test Run not found with ID: " + runId));

        if (run.getStatus() != RunStatus.RUNNING) {
            throw ApiException.badRequest("Cannot abort a run that is not active");
        }

        // Kill active process
        processRunner.abort(runId);

        // Save status
        run.setStatus(RunStatus.ABORTED);
        run.setEndedAt(LocalDateTime.now());
        run.setErrorMessage("Execution aborted by user request");
        runRepository.save(run);

        // Notify client
        sseEmitterManager.sendRunError(runId, "Execution aborted by user");
    }
}
