package com.automationportal.perftesting.results;

import com.automationportal.perftesting.group.TestGroupRepository;
import com.automationportal.perftesting.loadtest.LoadTestRepository;
import com.automationportal.perftesting.perftest.PerformanceTestRepository;
import com.automationportal.perftesting.schedule.PerfTestScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PerfTestRunRepository runRepository;
    private final PerformanceTestRepository perfTestRepository;
    private final LoadTestRepository loadTestRepository;
    private final TestGroupRepository testGroupRepository;
    private final PerfTestScheduleRepository scheduleRepository;

    /** Global Date Range Filter token vocabulary — mirrors automation-portal's DashboardService.getSinceInstant. */
    private static LocalDateTime sinceFor(String range) {
        if (range == null) return LocalDateTime.now().minusDays(7);
        return switch (range.toLowerCase()) {
            case "today" -> LocalDate.now().atStartOfDay();
            case "30d" -> LocalDateTime.now().minusDays(30);
            case "90d" -> LocalDateTime.now().minusDays(90);
            default -> LocalDateTime.now().minusDays(7);
        };
    }

    public DashboardStatsDto getStats(String range) {
        List<PerfTestRun> allRuns = runRepository.findAll();
        LocalDateTime since = sinceFor(range);
        List<PerfTestRun> runs = allRuns.stream()
                .filter(r -> r.getCreatedAt() != null && !r.getCreatedAt().isBefore(since))
                .collect(Collectors.toList());

        long total = runs.size();
        long passed = runs.stream().filter(r -> r.getStatus() == RunStatus.PASSED).count();
        long failed = runs.stream().filter(r -> r.getStatus() == RunStatus.FAILED).count();
        long running = runs.stream().filter(r -> r.getStatus() == RunStatus.RUNNING).count();

        // Daily run counts for last 20 days
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/dd");
        List<DashboardStatsDto.DailyCount> dailyRuns = IntStream.range(0, 20)
                .mapToObj(i -> LocalDate.now().minusDays(19 - i))
                .map(date -> {
                    String label = date.format(fmt);
                    long count = allRuns.stream()
                            .filter(r -> r.getCreatedAt() != null &&
                                    r.getCreatedAt().toLocalDate().equals(date))
                            .count();
                    return DashboardStatsDto.DailyCount.builder().date(label).value(count).build();
                })
                .collect(Collectors.toList());

        long scheduledCount = scheduleRepository.countByIsEnabled(true);

        return DashboardStatsDto.builder()
                .totalRuns(total)
                .passedRuns(passed)
                .failedRuns(failed)
                .runningRuns(running)
                .performanceTestCount(perfTestRepository.count())
                .loadTestCount(loadTestRepository.count())
                .testGroupCount(testGroupRepository.count())
                .scheduledCount(scheduledCount)
                .dailyRuns(dailyRuns)
                .build();
    }

    /** Day-by-day passed/failed counts for the Global Date Range Filter's Execution Trend chart. */
    public List<PerfTrendPoint> getTrend(String range) {
        int days = daysFor(range);
        List<PerfTestRun> allRuns = runRepository.findAll();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate today = LocalDate.now();

        List<PerfTrendPoint> out = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            List<PerfTestRun> dayRuns = allRuns.stream()
                    .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().toLocalDate().equals(day))
                    .toList();
            long passed = dayRuns.stream().filter(r -> r.getStatus() == RunStatus.PASSED).count();
            long failed = dayRuns.stream().filter(r -> r.getStatus() == RunStatus.FAILED).count();
            out.add(new PerfTrendPoint(day.format(dateFmt), passed, failed));
        }
        return out;
    }

    private static int daysFor(String range) {
        if (range == null) return 7;
        return switch (range.toLowerCase()) {
            case "today" -> 1;
            case "30d" -> 30;
            case "90d" -> 90;
            default -> 7;
        };
    }
}
