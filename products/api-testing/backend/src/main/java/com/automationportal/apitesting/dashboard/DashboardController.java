package com.automationportal.apitesting.dashboard;

import com.automationportal.apitesting.baseapi.BaseApiRepository;
import com.automationportal.apitesting.group.ApiGroupExecution;
import com.automationportal.apitesting.group.ApiGroupExecutionRepository;
import com.automationportal.apitesting.group.ApiGroupRepository;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryRepository;
import com.automationportal.apitesting.module.ApiModuleRepository;
import com.automationportal.apitesting.regularapi.RegularApiRepository;
import com.automationportal.apitesting.scheduling.Schedule;
import com.automationportal.apitesting.scheduling.ScheduleRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * All dashboard data comes from the database (plus live executor gauges for
 * scheduler status) — no hardcoded values.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ExecutionHistoryRepository historyRepository;
    private final ScheduleRepository scheduleRepository;
    private final RegularApiRepository regularApiRepository;
    private final BaseApiRepository baseApiRepository;
    private final ApiModuleRepository moduleRepository;
    private final ApiGroupRepository groupRepository;
    private final ApiGroupExecutionRepository groupExecutionRepository;
    @Qualifier("scheduleWorkerExecutor")
    private final ThreadPoolTaskExecutor workerExecutor;

    @Data
    @Builder
    public static class Summary {
        private long totalExecutions;
        private long passed;               // 2xx/3xx AND validation not failed
        private long failed;
        private double successRate;
        private double avgDurationMs;
        private Map<String, Long> statusClassBreakdown; // 2xx/3xx/4xx/5xx/ERROR/TIMEOUT
        private long activeSchedules;
        private long totalSchedules;
        private List<ScheduleHealth> failingSchedules;
        private List<ScheduleHealth> nextRuns;

        // Inventory (whole platform, not windowed)
        private long totalRegularApis;
        private long totalBaseApis;
        private long totalModules;
        private long totalGroups;

        // Windowed extremes and per-API failure counts
        private ApiSpeed fastestApi;
        private ApiSpeed slowestApi;
        private long failedRegularExecutions;
        private long failedBaseExecutions;

        private List<ModuleStat> moduleStats;
        private SchedulerStatus schedulerStatus;
        private List<GroupHealth> groupHealth;
    }

    public record ScheduleHealth(Long id, String name, String lastRunStatus, String nextRunAt) { }

    public record ApiSpeed(String apiName, double avgMs, long executions) { }

    public record ModuleStat(Long moduleId, String moduleName, long executions, long passed, long failed, double avgMs) { }

    /** Live gauges from the shared worker pool + running group executions. */
    public record SchedulerStatus(int activeWorkers, int poolSize, int queueSize, long runningGroupExecutions) { }

    public record GroupHealth(Long groupId, String name, String status, Double healthPercent,
                              int passedApis, int failedApis, String lastRunAt) { }

    @Data
    @Builder
    public static class TrendPoint {
        private String date;
        private long passed;
        private long failed;
    }

    /** Windowed to the last `days` (default 30) so numbers reflect recent behavior. */
    @GetMapping("/summary")
    public Summary summary(@RequestParam(required = false) Long moduleId,
                           @RequestParam(defaultValue = "30") int days) {
        Instant since = Instant.now().minus(Math.min(days, 365), ChronoUnit.DAYS);
        List<ExecutionHistory> window = moduleId == null
                ? historyRepository.findByExecutedAtAfter(since)
                : historyRepository.findByExecutedAtAfterAndModuleId(since, moduleId);

        long passed = window.stream().filter(DashboardController::isPassed).count();
        long failed = window.size() - passed;
        double avg = window.stream().mapToLong(ExecutionHistory::getTotalTimeMs).average().orElse(0);

        Map<String, Long> breakdown = new LinkedHashMap<>();
        for (String cls : List.of("2xx", "3xx", "4xx", "5xx", "ERROR", "TIMEOUT")) {
            breakdown.put(cls, 0L);
        }
        window.forEach(h -> breakdown.merge(
                h.getResponseStatusClass() == null ? "ERROR" : h.getResponseStatusClass(), 1L, Long::sum));

        List<ScheduleHealth> failing = scheduleRepository
                .findByStatusAndLastRunStatus(Schedule.Status.ACTIVE, Schedule.RunStatus.FAILED)
                .stream().map(DashboardController::toHealth).toList();
        List<ScheduleHealth> next = scheduleRepository
                .findTop10ByStatusOrderByNextRunAtAsc(Schedule.Status.ACTIVE)
                .stream().map(DashboardController::toHealth).toList();

        return Summary.builder()
                .totalExecutions(window.size())
                .passed(passed)
                .failed(failed)
                .successRate(window.isEmpty() ? 0 : Math.round(passed * 1000.0 / window.size()) / 10.0)
                .avgDurationMs(Math.round(avg))
                .statusClassBreakdown(breakdown)
                .activeSchedules(scheduleRepository.countByStatus(Schedule.Status.ACTIVE))
                .totalSchedules(scheduleRepository.count())
                .failingSchedules(failing)
                .nextRuns(next)
                .totalRegularApis(regularApiRepository.count())
                .totalBaseApis(baseApiRepository.count())
                .totalModules(moduleRepository.count())
                .totalGroups(groupRepository.count())
                .fastestApi(apiSpeed(window, true))
                .slowestApi(apiSpeed(window, false))
                .failedRegularExecutions(countFailed(window, ExecutionHistory.ApiType.REGULAR))
                .failedBaseExecutions(countFailed(window, ExecutionHistory.ApiType.BASE))
                .moduleStats(moduleStats(window))
                .schedulerStatus(schedulerStatus())
                .groupHealth(groupHealth())
                .build();
    }

    @GetMapping("/trend")
    public List<TrendPoint> trend(@RequestParam(required = false) Long moduleId,
                                  @RequestParam(defaultValue = "7") int days) {
        int window = Math.min(Math.max(days, 1), 90);
        Instant since = Instant.now().minus(window, ChronoUnit.DAYS);
        List<ExecutionHistory> records = moduleId == null
                ? historyRepository.findByExecutedAtAfter(since)
                : historyRepository.findByExecutedAtAfterAndModuleId(since, moduleId);

        Map<LocalDate, List<ExecutionHistory>> byDay = records.stream()
                .collect(Collectors.groupingBy(h -> h.getExecutedAt().atZone(ZoneOffset.UTC).toLocalDate()));

        List<TrendPoint> out = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = window - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            List<ExecutionHistory> dayRecords = byDay.getOrDefault(day, List.of());
            out.add(TrendPoint.builder()
                    .date(day.toString())
                    .passed(dayRecords.stream().filter(DashboardController::isPassed).count())
                    .failed(dayRecords.stream().filter(h -> !isPassed(h)).count())
                    .build());
        }
        return out;
    }

    // ------------------------------------------------------------------

    private static boolean isPassed(ExecutionHistory h) {
        boolean httpOk = "2xx".equals(h.getResponseStatusClass()) || "3xx".equals(h.getResponseStatusClass());
        boolean validationOk = h.getValidationPassed() == null || h.getValidationPassed();
        return httpOk && validationOk;
    }

    private static ScheduleHealth toHealth(Schedule s) {
        return new ScheduleHealth(s.getId(), s.getName(),
                s.getLastRunStatus() == null ? null : s.getLastRunStatus().name(),
                s.getNextRunAt() == null ? null : s.getNextRunAt().toString());
    }

    /** Fastest/slowest saved API by average duration over the window. */
    private static ApiSpeed apiSpeed(List<ExecutionHistory> window, boolean fastest) {
        Map<String, List<ExecutionHistory>> byApi = window.stream()
                .filter(h -> h.getApiName() != null)
                .collect(Collectors.groupingBy(ExecutionHistory::getApiName));
        Comparator<ApiSpeed> byAvg = Comparator.comparingDouble(ApiSpeed::avgMs);
        return byApi.entrySet().stream()
                .map(e -> new ApiSpeed(e.getKey(),
                        Math.round(e.getValue().stream().mapToLong(ExecutionHistory::getTotalTimeMs).average().orElse(0)),
                        e.getValue().size()))
                .min(fastest ? byAvg : byAvg.reversed())
                .orElse(null);
    }

    private static long countFailed(List<ExecutionHistory> window, ExecutionHistory.ApiType type) {
        return window.stream().filter(h -> h.getApiType() == type && !isPassed(h)).count();
    }

    private List<ModuleStat> moduleStats(List<ExecutionHistory> window) {
        Map<Long, String> moduleNames = moduleRepository.findAll().stream()
                .collect(Collectors.toMap(m -> m.getId(), m -> m.getName()));
        Map<Long, List<ExecutionHistory>> byModule = window.stream()
                .filter(h -> h.getModuleId() != null)
                .collect(Collectors.groupingBy(ExecutionHistory::getModuleId));
        return byModule.entrySet().stream()
                .map(e -> {
                    long modulePassed = e.getValue().stream().filter(DashboardController::isPassed).count();
                    return new ModuleStat(e.getKey(),
                            moduleNames.getOrDefault(e.getKey(), "(deleted)"),
                            e.getValue().size(), modulePassed, e.getValue().size() - modulePassed,
                            Math.round(e.getValue().stream().mapToLong(ExecutionHistory::getTotalTimeMs).average().orElse(0)));
                })
                .sorted(Comparator.comparingLong(ModuleStat::executions).reversed())
                .toList();
    }

    private SchedulerStatus schedulerStatus() {
        var pool = workerExecutor.getThreadPoolExecutor();
        return new SchedulerStatus(pool.getActiveCount(), pool.getPoolSize(), pool.getQueue().size(),
                groupExecutionRepository.findByStatus(ApiGroupExecution.Status.RUNNING).size());
    }

    private List<GroupHealth> groupHealth() {
        return groupRepository.findAllByOrderByUpdatedAtDesc().stream()
                .limit(10)
                .map(g -> {
                    ApiGroupExecution last = groupExecutionRepository.findFirstByGroupIdOrderByStartedAtDesc(g.getId());
                    return new GroupHealth(g.getId(), g.getName(),
                            last == null ? null : last.getStatus().name(),
                            last == null ? null : last.getHealthPercent(),
                            last == null ? 0 : last.getPassedApis(),
                            last == null ? 0 : last.getFailedApis(),
                            last == null ? null : last.getStartedAt().toString());
                })
                .toList();
    }
}
