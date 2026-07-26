package com.automationportal.perftesting.results;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardStatsDto {

    private long totalRuns;
    private long passedRuns;
    private long failedRuns;
    private long runningRuns;

    private long performanceTestCount;
    private long loadTestCount;
    private long testGroupCount;
    private long scheduledCount;

    private List<DailyCount> dailyRuns;

    @Data
    @Builder
    public static class DailyCount {
        private String date;
        private long value;
    }
}
