package com.automationportal.dashboard;

import com.automationportal.executions.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
//import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final ExecutionRepository executionRepository;
    private final ExecutionTestCaseRepository testCaseRepository;

    public DashboardService(ExecutionRepository executionRepository,
            ExecutionTestCaseRepository testCaseRepository) {
        this.executionRepository = executionRepository;
        this.testCaseRepository = testCaseRepository;
    }

    public Map<String, Object> getSummary() {
        List<Execution> executions = executionRepository.findAll();

        long totalExecutions = executions.size();
        long totalTests = 0;
        long passedTests = 0;
        long failedTests = 0;
        long skippedTests = 0;
        long durationSum = 0;
        long durationCount = 0;

        String lastStatus = null;
        Instant latestTime = null;

        for (Execution e : executions) {
            if (e.getStatus() != ExecutionStatus.QUEUED && e.getStatus() != ExecutionStatus.RUNNING) {
                totalTests += e.getTotalTests();
                passedTests += e.getPassedTests();
                failedTests += e.getFailedTests();
                skippedTests += e.getSkippedTests();
                if (e.getDurationSeconds() != null && e.getDurationSeconds() > 0) {
                    durationSum += e.getDurationSeconds();
                    durationCount++;
                }
            }
            if (e.getCreatedAt() != null && (latestTime == null || e.getCreatedAt().isAfter(latestTime))) {
                latestTime = e.getCreatedAt();
                lastStatus = e.getStatus().toString();
            }
        }

        double passRate = totalTests > 0 ? (passedTests * 100.0) / totalTests : 0.0;
        double failRate = totalTests > 0 ? (failedTests * 100.0) / totalTests : 0.0;
        long avgDuration = durationCount > 0 ? durationSum / durationCount : 0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalExecutions", totalExecutions);
        summary.put("totalTests", totalTests);
        summary.put("passedTests", passedTests);
        summary.put("failedTests", failedTests);
        summary.put("skippedTests", skippedTests);
        summary.put("passRate", BigDecimal.valueOf(passRate).setScale(1, RoundingMode.HALF_UP));
        summary.put("failRate", BigDecimal.valueOf(failRate).setScale(1, RoundingMode.HALF_UP));
        summary.put("averageDuration", avgDuration);
        summary.put("lastExecutionStatus", lastStatus);

        return summary;
    }

    public List<Map<String, Object>> getTrends(String range) {
        Instant since = getSinceInstant(range);
        List<Execution> executions = executionRepository.findAll().stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(since))
                .sorted(Comparator.comparing(Execution::getCreatedAt))
                .collect(Collectors.toList());

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, List<Execution>> grouped = executions.stream()
                .collect(Collectors.groupingBy(e -> dtf.format(e.getCreatedAt().atZone(ZoneId.systemDefault()))));

        List<Map<String, Object>> trends = new ArrayList<>();
        List<String> sortedDates = new ArrayList<>(grouped.keySet());
        Collections.sort(sortedDates);

        for (String dateStr : sortedDates) {
            List<Execution> dayExecs = grouped.get(dateStr);
            long dayTests = 0;
            long dayPassed = 0;
            long dayFailed = 0;
            long daySkipped = 0;

            for (Execution e : dayExecs) {
                if (e.getStatus() != ExecutionStatus.QUEUED && e.getStatus() != ExecutionStatus.RUNNING) {
                    dayTests += e.getTotalTests();
                    dayPassed += e.getPassedTests();
                    dayFailed += e.getFailedTests();
                    daySkipped += e.getSkippedTests();
                }
            }

            double dayPassRate = dayTests > 0 ? (dayPassed * 100.0) / dayTests : 0.0;

            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("date", dateStr);
            dayMap.put("executions", dayExecs.size());
            dayMap.put("totalTests", dayTests);
            dayMap.put("passed", dayPassed);
            dayMap.put("failed", dayFailed);
            dayMap.put("skipped", daySkipped);
            dayMap.put("passRate", BigDecimal.valueOf(dayPassRate).setScale(1, RoundingMode.HALF_UP));
            trends.add(dayMap);
        }

        return trends;
    }

    public List<Map<String, Object>> getModuleHealth(String range) {
        Instant since = getSinceInstant(range);
        List<Execution> executions = executionRepository.findAll().stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(since))
                .collect(Collectors.toList());

        Map<String, List<Execution>> grouped = executions.stream()
                .filter(e -> e.getModuleCode() != null)
                .collect(Collectors.groupingBy(Execution::getModuleCode));

        List<Map<String, Object>> healthList = new ArrayList<>();

        for (Map.Entry<String, List<Execution>> entry : grouped.entrySet()) {
            String moduleCode = entry.getKey();
            List<Execution> moduleExecs = entry.getValue();

            long totalTests = 0;
            long passed = 0;
            long failed = 0;
            long skipped = 0;
            String lastStatus = "UNKNOWN";
            Instant latestTime = null;

            for (Execution e : moduleExecs) {
                if (e.getStatus() != ExecutionStatus.QUEUED && e.getStatus() != ExecutionStatus.RUNNING) {
                    totalTests += e.getTotalTests();
                    passed += e.getPassedTests();
                    failed += e.getFailedTests();
                    skipped += e.getSkippedTests();
                }
                if (e.getCreatedAt() != null && (latestTime == null || e.getCreatedAt().isAfter(latestTime))) {
                    latestTime = e.getCreatedAt();
                    lastStatus = e.getStatus().toString();
                }
            }

            double passRate = totalTests > 0 ? (passed * 100.0) / totalTests : 0.0;

            Map<String, Object> moduleMap = new HashMap<>();
            moduleMap.put("moduleCode", moduleCode);
            moduleMap.put("moduleName", getModuleName(moduleCode));
            moduleMap.put("totalTests", totalTests);
            moduleMap.put("passed", passed);
            moduleMap.put("failed", failed);
            moduleMap.put("skipped", skipped);
            moduleMap.put("passRate", BigDecimal.valueOf(passRate).setScale(1, RoundingMode.HALF_UP));
            moduleMap.put("lastExecutionStatus", lastStatus);
            healthList.add(moduleMap);
        }

        return healthList;
    }

    public List<Execution> getRecentActivity() {
        return executionRepository.findTop25ByOrderByCreatedAtDesc();
    }

    public List<Map<String, Object>> getFailureAnalysis(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = testCaseRepository.findFailureAnalysisRaw(since);

        List<Map<String, Object>> analysis = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> item = new HashMap<>();
            item.put("exceptionType", row[0]);
            item.put("count", row[1]);
            item.put("topTest", row[2]);
            item.put("latestExecution", row[3]);
            analysis.add(item);
        }

        // Sort by failure count desc
        analysis.sort((a, b) -> Long.compare((Long) b.get("count"), (Long) a.get("count")));
        return analysis;
    }

    public List<Map<String, Object>> getSlowTests(String range) {
        Instant since = getSinceInstant(range);
        List<ExecutionTestCase> raw = testCaseRepository.findSlowTestsRaw(since);

        List<Map<String, Object>> slow = new ArrayList<>();
        // Group by class and method name to get distinct slowest cases
        Set<String> uniqueKeys = new HashSet<>();
        for (ExecutionTestCase tc : raw) {
            String key = tc.getClassName() + "." + tc.getMethodName();
            if (uniqueKeys.add(key)) {
                Map<String, Object> item = new HashMap<>();
                item.put("methodName", tc.getMethodName());
                item.put("className", tc.getClassName());
                item.put("duration", tc.getDurationMs() != null ? tc.getDurationMs() / 1000.0 : 0.0);
                item.put("module", tc.getModuleCode());
                slow.add(item);
                if (slow.size() >= 10)
                    break;
            }
        }
        return slow;
    }

    public List<Map<String, Object>> getFlakyTests(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = testCaseRepository.findFlakyTestsRaw(since);
        List<Map<String, Object>> flaky = new ArrayList<>();

        for (Object[] row : raw) {
            String className = (String) row[0];
            String methodName = (String) row[1];
            long totalRuns = ((Number) row[2]).longValue();
            long failureCount = ((Number) row[3]).longValue();
            long passCount = ((Number) row[4]).longValue();
            long totalRetries = row[5] != null ? ((Number) row[5]).longValue() : 0L;
            String moduleCode = (String) row[6];

            if ((failureCount > 0 && passCount > 0) || totalRetries > 0) {
                Map<String, Object> item = new HashMap<>();
                item.put("methodName", methodName);
                item.put("className", className);
                item.put("totalRuns", totalRuns);
                item.put("failureCount", failureCount);
                item.put("retriesCount", totalRetries);
                double rate = totalRuns > 0 ? ((failureCount + totalRetries) * 100.0) / totalRuns : 0.0;
                item.put("flakinessRate", BigDecimal.valueOf(rate).setScale(1, RoundingMode.HALF_UP));
                item.put("module", moduleCode);
                flaky.add(item);
            }
        }

        flaky.sort((a, b) -> {
            int comp = Double.compare(Double.parseDouble(b.get("flakinessRate").toString()),
                    Double.parseDouble(a.get("flakinessRate").toString()));
            if (comp == 0) {
                return Long.compare((Long) b.get("totalRuns"), (Long) a.get("totalRuns"));
            }
            return comp;
        });

        return flaky;
    }

    public List<Map<String, Object>> getPassRateTrend(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = executionRepository.findDailyTrend(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("date", row[0] != null ? row[0].toString() : "");
            map.put("passRate",
                    row[1] != null
                            ? BigDecimal.valueOf(Double.parseDouble(row[1].toString())).setScale(2,
                                    RoundingMode.HALF_UP)
                            : BigDecimal.ZERO);
            map.put("failRate",
                    row[2] != null
                            ? BigDecimal.valueOf(Double.parseDouble(row[2].toString())).setScale(2,
                                    RoundingMode.HALF_UP)
                            : BigDecimal.ZERO);
            map.put("execCount", row[3] != null ? Long.parseLong(row[3].toString()) : 0L);
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> getDurationTrend(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = executionRepository.findDurationTrend(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("date", row[0] != null ? row[0].toString() : "");
            double avgDurationMs = row[1] != null ? Double.parseDouble(row[1].toString()) : 0.0;
            map.put("avgDuration", BigDecimal.valueOf(avgDurationMs / 1000.0).setScale(2, RoundingMode.HALF_UP));
            map.put("execCount", row[2] != null ? Long.parseLong(row[2].toString()) : 0L);
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> getRunHeatmap(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = executionRepository.findRunHeatmap(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("dow", row[0] != null ? Integer.parseInt(row[0].toString()) : 0);
            map.put("hour", row[1] != null ? Integer.parseInt(row[1].toString()) : 0);
            map.put("count", row[2] != null ? Long.parseLong(row[2].toString()) : 0L);
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> getEnvDistribution(String range) {
        Instant since = getSinceInstant(range);
        List<Object[]> raw = executionRepository.findEnvDistribution(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("envId", row[0]);
            map.put("count", row[1]);
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> getRegressionAlerts() {
        List<Execution> all = executionRepository.findAll();
        Map<String, List<Execution>> grouped = all.stream()
                .filter(e -> e.getModuleCode() != null && e.getStatus() != ExecutionStatus.QUEUED
                        && e.getStatus() != ExecutionStatus.RUNNING)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.groupingBy(Execution::getModuleCode));

        List<Map<String, Object>> alerts = new ArrayList<>();
        for (Map.Entry<String, List<Execution>> entry : grouped.entrySet()) {
            String moduleCode = entry.getKey();
            List<Execution> execs = entry.getValue();
            if (execs.size() >= 2) {
                Execution latest = execs.get(0);
                Execution previous = execs.get(1);
                if ((latest.getStatus() == ExecutionStatus.FAILED || latest.getStatus() == ExecutionStatus.PARTIAL)
                        && previous.getStatus() == ExecutionStatus.PASSED) {
                    Map<String, Object> alert = new HashMap<>();
                    alert.put("moduleCode", moduleCode);
                    alert.put("moduleName", getModuleName(moduleCode));
                    alert.put("latestExecutionCode", latest.getExecutionCode());
                    alert.put("latestExecutionId", latest.getId());
                    alert.put("previousExecutionCode", previous.getExecutionCode());
                    alert.put("previousExecutionId", previous.getId());
                    alert.put("passRate", latest.getPassRate());
                    alert.put("previousPassRate", previous.getPassRate());
                    alert.put("timestamp", latest.getCreatedAt() != null ? latest.getCreatedAt() : Instant.now());
                    alerts.add(alert);
                }
            }
        }
        return alerts;
    }

    private Instant getSinceInstant(String range) {
        int days = 7;
        if ("30d".equalsIgnoreCase(range))
            days = 30;
        else if ("90d".equalsIgnoreCase(range))
            days = 90;
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }

    private String getModuleName(String code) {
        if ("LAND".equalsIgnoreCase(code))
            return "Land Management";
        if ("SURVEY".equalsIgnoreCase(code))
            return "Survey Management";
        if ("GIS".equalsIgnoreCase(code))
            return "GIS System";
        if ("ARCHITECT".equalsIgnoreCase(code))
            return "Architect Empanelment";
        return code;
    }
}
