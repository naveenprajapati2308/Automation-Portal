package com.automationportal.perftesting.engine;

import com.automationportal.perftesting.loadtest.LoadTest;
import com.automationportal.perftesting.perftest.Assertion;
import com.automationportal.perftesting.perftest.PerformanceTest;
import com.automationportal.perftesting.results.AssertionResult;
import com.automationportal.perftesting.results.ThresholdResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class ThresholdEvaluator {

    public List<ThresholdResult> evaluatePerformanceTest(PerformanceTest test, MetricIngestor ingestor) {
        List<ThresholdResult> results = new ArrayList<>();
        List<Double> durations = ingestor.getAllDurations();

        if (test.getThresholdP50Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 50.0);
            results.add(new ThresholdResult("p(50) < " + test.getThresholdP50Ms() + "ms", actual, actual < test.getThresholdP50Ms()));
        }
        if (test.getThresholdP75Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 75.0);
            results.add(new ThresholdResult("p(75) < " + test.getThresholdP75Ms() + "ms", actual, actual < test.getThresholdP75Ms()));
        }
        if (test.getThresholdP90Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 90.0);
            results.add(new ThresholdResult("p(90) < " + test.getThresholdP90Ms() + "ms", actual, actual < test.getThresholdP90Ms()));
        }
        if (test.getThresholdP95Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 95.0);
            results.add(new ThresholdResult("p(95) < " + test.getThresholdP95Ms() + "ms", actual, actual < test.getThresholdP95Ms()));
        }
        if (test.getThresholdP99Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 99.0);
            results.add(new ThresholdResult("p(99) < " + test.getThresholdP99Ms() + "ms", actual, actual < test.getThresholdP99Ms()));
        }
        if (test.getThresholdMaxMs() != null) {
            double actual = ingestor.getMaxMs();
            results.add(new ThresholdResult("max < " + test.getThresholdMaxMs() + "ms", actual, actual < test.getThresholdMaxMs()));
        }
        if (test.getThresholdErrorRatePct() != null) {
            double actualPct = ingestor.getTotalRequests() > 0 
                ? ((double) ingestor.getErrorCount() / ingestor.getTotalRequests()) * 100.0 
                : 0.0;
            results.add(new ThresholdResult("Error Rate < " + test.getThresholdErrorRatePct() + "%", actualPct, actualPct < test.getThresholdErrorRatePct()));
        }
        if (test.getThresholdMinRps() != null) {
            double actualRps = ingestor.getRequestsPerSec();
            results.add(new ThresholdResult("RPS >= " + test.getThresholdMinRps(), actualRps, actualRps >= test.getThresholdMinRps()));
        }

        return results;
    }

    public List<ThresholdResult> evaluateLoadTest(LoadTest test, MetricIngestor ingestor) {
        List<ThresholdResult> results = new ArrayList<>();
        List<Double> durations = ingestor.getAllDurations();

        if (test.getThresholdP95Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 95.0);
            results.add(new ThresholdResult("p(95) < " + test.getThresholdP95Ms() + "ms", actual, actual < test.getThresholdP95Ms()));
        }
        if (test.getThresholdP99Ms() != null) {
            double actual = MetricIngestor.calculatePercentile(durations, 99.0);
            results.add(new ThresholdResult("p(99) < " + test.getThresholdP99Ms() + "ms", actual, actual < test.getThresholdP99Ms()));
        }
        if (test.getThresholdErrorRatePct() != null) {
            double actualPct = ingestor.getTotalRequests() > 0 
                ? ((double) ingestor.getErrorCount() / ingestor.getTotalRequests()) * 100.0 
                : 0.0;
            results.add(new ThresholdResult("Error Rate < " + test.getThresholdErrorRatePct() + "%", actualPct, actualPct < test.getThresholdErrorRatePct()));
        }
        if (test.getThresholdMinRps() != null) {
            double actualRps = ingestor.getRequestsPerSec();
            results.add(new ThresholdResult("RPS >= " + test.getThresholdMinRps(), actualRps, actualRps >= test.getThresholdMinRps()));
        }

        return results;
    }

    public List<AssertionResult> evaluateAssertions(List<Assertion> assertions, MetricIngestor ingestor) {
        List<AssertionResult> results = new ArrayList<>();
        Map<String, long[]> checksMap = ingestor.getChecksMap();

        if (assertions == null || assertions.isEmpty()) {
            return results;
        }

        for (int i = 0; i < assertions.size(); i++) {
            Assertion ass = assertions.get(i);
            String checkKey = "assertion_" + i;
            long[] counts = checksMap.get(checkKey);

            if (counts != null) {
                long passedCount = counts[0];
                long failedCount = counts[1];
                long total = passedCount + failedCount;
                boolean passed = failedCount == 0 && total > 0;

                String desc = buildAssertionDescription(ass);
                results.add(AssertionResult.builder()
                        .type(ass.getType())
                        .expected(desc)
                        .actual("Passed: " + passedCount + ", Failed: " + failedCount)
                        .passed(passed)
                        .build());
            } else {
                // Not executed or not recorded
                results.add(AssertionResult.builder()
                        .type(ass.getType())
                        .expected(buildAssertionDescription(ass))
                        .actual("Not executed")
                        .passed(false)
                        .build());
            }
        }

        return results;
    }

    private String buildAssertionDescription(Assertion ass) {
        StringBuilder sb = new StringBuilder();
        sb.append(ass.getType());
        if (ass.getKey() != null && !ass.getKey().isBlank()) {
            sb.append(" [").append(ass.getKey()).append("]");
        }
        if (ass.getPath() != null && !ass.getPath().isBlank()) {
            sb.append(" [").append(ass.getPath()).append("]");
        }
        if (ass.getOperator() != null && !ass.getOperator().isBlank()) {
            sb.append(" ").append(ass.getOperator());
        }
        if (ass.getValue() != null && !ass.getValue().isBlank()) {
            sb.append(" ").append(ass.getValue());
        }
        return sb.toString();
    }
}
