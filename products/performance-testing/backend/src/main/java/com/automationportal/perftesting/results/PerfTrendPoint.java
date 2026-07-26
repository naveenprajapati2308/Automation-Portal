package com.automationportal.perftesting.results;

// Day-by-day passed/failed counts — shape matches automation-portal's and
// api-testing's own /trend endpoints so the shared frontend ExecutionTrendChart
// component can consume all three without per-app reshaping.
public record PerfTrendPoint(String date, long passed, long failed) {
}
