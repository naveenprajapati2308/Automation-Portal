package com.automationportal.perftesting.drift;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.results.PerfTestRun;
import com.automationportal.perftesting.results.PerfTestRunRepository;
import com.automationportal.perftesting.results.RunStatus;
import com.automationportal.perftesting.security.CurrentProjectService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DriftDetector {
    private static final Logger log = LoggerFactory.getLogger(DriftDetector.class);

    private final PerfDriftAlertRepository alertRepository;
    private final PerfTestRunRepository runRepository;
    private final CurrentProjectService currentProjectService;

    @Value("${perf.drift.warning-threshold-pct:10}")
    private double warningThresholdPct;

    @Value("${perf.drift.critical-threshold-pct:25}")
    private double criticalThresholdPct;

    @Transactional
    public void checkDrift(PerfTestRun currentRun) {
        if (currentRun.getStatus() != RunStatus.PASSED || currentRun.getP95Ms() == null) {
            return;
        }

        log.info("Running drift detection for run ID {}", currentRun.getId());

        // Fetch last 30 passed runs (excluding current run) to establish baseline
        // PageRequest of 0, 30 ordered by createdAt desc
        List<PerfTestRun> pastRuns = runRepository.findByTestTypeAndTestIdOrderByCreatedAtDesc(
                currentRun.getTestType(), currentRun.getTestId())
                .stream()
                .filter(r -> r.getStatus() == RunStatus.PASSED && !r.getId().equals(currentRun.getId()))
                .limit(30)
                .collect(Collectors.toList());

        // We need at least 5 runs to establish a valid performance baseline
        if (pastRuns.size() < 5) {
            log.info("Insufficient run history (found {} passed runs, need at least 5) to establish baseline for test ID {}",
                    pastRuns.size(), currentRun.getTestId());
            return;
        }

        // Calculate baseline P95 average
        double sum = pastRuns.stream()
                .mapToDouble(r -> r.getP95Ms() != null ? r.getP95Ms() : 0.0)
                .sum();
        double baselineP95 = sum / pastRuns.size();

        if (baselineP95 <= 0) return;

        double currentP95 = currentRun.getP95Ms();
        double driftPct = ((currentP95 - baselineP95) / baselineP95) * 100.0;

        log.info("Test ID {} Run ID {} current P95: {}ms, baseline P95: {}ms, drift: {}%",
                currentRun.getTestId(), currentRun.getId(), currentP95, baselineP95, driftPct);

        if (driftPct >= warningThresholdPct) {
            Severity severity = driftPct >= criticalThresholdPct ? Severity.CRITICAL : Severity.WARNING;

            PerfDriftAlert alert = PerfDriftAlert.builder()
                    .runId(currentRun.getId())
                    .testType(currentRun.getTestType())
                    .testId(currentRun.getTestId())
                    .projectId(currentRun.getProjectId())
                    .currentP95Ms(currentP95)
                    .baselineP95Ms(baselineP95)
                    .driftPct(driftPct)
                    .severity(severity)
                    .isAcknowledged(false)
                    .build();

            alertRepository.save(alert);
            log.warn("Performance DRIFT ALERT created for run ID {}: {}% degradation detected!",
                    currentRun.getId(), String.format("%.2f", driftPct));
        }
    }

    @Transactional(readOnly = true)
    public List<PerfDriftAlert> getUnacknowledgedAlerts() {
        return alertRepository.findByProjectIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(currentProjectService.requireProjectId());
    }

    @Transactional
    public void acknowledgeAlert(Long id) {
        PerfDriftAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Drift alert not found with ID: " + id));
        if (!currentProjectService.requireProjectId().equals(alert.getProjectId())) {
            throw ApiException.notFound("Drift alert not found with ID: " + id);
        }
        alert.setIsAcknowledged(true);
        alertRepository.save(alert);
    }
}
