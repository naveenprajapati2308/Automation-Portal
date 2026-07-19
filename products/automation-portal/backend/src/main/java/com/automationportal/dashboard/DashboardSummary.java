package com.automationportal.dashboard;

import java.math.BigDecimal;

public record DashboardSummary(
    long totalExecutions,
    BigDecimal passRate,
    BigDecimal failRate,
    long queuedExecutions,
    long runningExecutions
) {
}
