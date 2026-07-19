package com.automationportal.dashboard;

import com.automationportal.common.ApiResponse;
import com.automationportal.executions.Execution;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(dashboardService.getSummary());
    }

    @GetMapping("/trends")
    public ApiResponse<List<Map<String, Object>>> trends(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.ok(dashboardService.getTrends(range));
    }

    @GetMapping("/module-health")
    public ApiResponse<List<Map<String, Object>>> moduleHealth(@RequestParam(defaultValue = "30d") String range) {
        return ApiResponse.ok(dashboardService.getModuleHealth(range));
    }

    @GetMapping("/recent-activity")
    public ApiResponse<List<Execution>> recentActivity() {
        return ApiResponse.ok(dashboardService.getRecentActivity());
    }

    @GetMapping("/failure-analysis")
    public ApiResponse<List<Map<String, Object>>> failureAnalysis(@RequestParam(defaultValue = "30d") String range) {
        return ApiResponse.ok(dashboardService.getFailureAnalysis(range));
    }

    @GetMapping("/slow-tests")
    public ApiResponse<List<Map<String, Object>>> slowTests(@RequestParam(defaultValue = "30d") String range) {
        return ApiResponse.ok(dashboardService.getSlowTests(range));
    }

    @GetMapping("/flaky-tests")
    public ApiResponse<List<Map<String, Object>>> flakyTests(@RequestParam(defaultValue = "30d") String range) {
        return ApiResponse.ok(dashboardService.getFlakyTests(range));
    }

    @GetMapping("/pass-rate-trend")
    public ApiResponse<List<Map<String, Object>>> passRateTrend(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.ok(dashboardService.getPassRateTrend(range));
    }

    @GetMapping("/duration-trend")
    public ApiResponse<List<Map<String, Object>>> durationTrend(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.ok(dashboardService.getDurationTrend(range));
    }

    @GetMapping("/heatmap")
    public ApiResponse<List<Map<String, Object>>> heatmap(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.ok(dashboardService.getRunHeatmap(range));
    }

    @GetMapping("/env-distribution")
    public ApiResponse<List<Map<String, Object>>> envDistribution(@RequestParam(defaultValue = "30d") String range) {
        return ApiResponse.ok(dashboardService.getEnvDistribution(range));
    }

    @GetMapping("/regression-alerts")
    public ApiResponse<List<Map<String, Object>>> regressionAlerts() {
        return ApiResponse.ok(dashboardService.getRegressionAlerts());
    }
}
