package com.automationportal.perftesting.engine;

import com.automationportal.perftesting.common.SseEmitterManager;
import com.automationportal.perftesting.engine.model.K6MetricLine;
import com.automationportal.perftesting.results.PerfMetricSample;
import com.automationportal.perftesting.results.PerfMetricSampleRepository;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class MetricIngestor {
    private static final Logger log = LoggerFactory.getLogger(MetricIngestor.class);

    private final Long runId;
    private final SseEmitterManager sseEmitterManager;
    private final PerfMetricSampleRepository sampleRepository;

    // Time-series aggregation state (5-second windows)
    private final long intervalMs = 5000L;
    private long currentWindowStart = 0L;

    // Metrics within the current 5-second window
    private final List<Double> windowDurations = Collections.synchronizedList(new ArrayList<>());
    private int windowVus = 0;
    private int windowRequests = 0;
    private int windowErrors = 0;

    // Global aggregators for final summary
    @Getter private final List<Double> allDurations = new ArrayList<>();
    @Getter private int peakVus = 0;
    @Getter private long totalRequests = 0;
    @Getter private long errorCount = 0;
    @Getter private double avgMs = 0.0;
    @Getter private double minMs = Double.MAX_VALUE;
    @Getter private double maxMs = 0.0;
    @Getter private double requestsPerSec = 0.0;

    @Getter private final Map<String, long[]> checksMap = new ConcurrentHashMap<>(); // [0] = passes, [1] = failures

    private Instant runStartInstant;

    public MetricIngestor(Long runId, SseEmitterManager sseEmitterManager, PerfMetricSampleRepository sampleRepository) {
        this.runId = runId;
        this.sseEmitterManager = sseEmitterManager;
        this.sampleRepository = sampleRepository;
        this.runStartInstant = Instant.now();
    }

    public synchronized void ingest(K6MetricLine line) {
        if ("Point".equalsIgnoreCase(line.getType())) {
            processPoint(line);
        } else if ("Summary".equalsIgnoreCase(line.getType())) {
            processSummary(line);
        }
    }

    private void processPoint(K6MetricLine line) {
        String metricName = line.getMetric();
        K6MetricLine.MetricData data = line.getData();
        if (data == null) return;

        long timestamp = parseTimestamp(data.getTime());
        if (currentWindowStart == 0L) {
            currentWindowStart = timestamp - (timestamp % intervalMs);
        }

        // If the point belongs to a new window, flush the current window first
        if (timestamp >= currentWindowStart + intervalMs) {
            flushWindow();
            currentWindowStart = timestamp - (timestamp % intervalMs);
        }

        double val = data.getValue() != null ? data.getValue() : 0.0;

        if ("http_req_duration".equalsIgnoreCase(metricName)) {
            windowDurations.add(val);
            allDurations.add(val);
            totalRequests++;
            windowRequests++;

            if (val > maxMs) maxMs = val;
            if (val < minMs) minMs = val;
            avgMs = ((avgMs * (allDurations.size() - 1)) + val) / allDurations.size();

        } else if ("vus".equalsIgnoreCase(metricName)) {
            int vuCount = (int) val;
            windowVus = vuCount;
            if (vuCount > peakVus) {
                peakVus = vuCount;
            }

        } else if ("http_req_failed".equalsIgnoreCase(metricName)) {
            if (val > 0) {
                windowErrors++;
                errorCount++;
            }
        } else if ("checks".equalsIgnoreCase(metricName)) {
            if (data.getTags() != null && data.getTags().containsKey("check")) {
                String checkName = data.getTags().get("check");
                long[] counts = checksMap.computeIfAbsent(checkName, k -> new long[2]);
                if (val > 0) {
                    counts[0]++; // passed
                } else {
                    counts[1]++; // failed
                }
            }
        }
    }

    private void flushWindow() {
        if (windowRequests == 0 && windowVus == 0) {
            return;
        }

        double p95 = calculatePercentile(windowDurations, 95.0);
        double avg = windowDurations.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double min = windowDurations.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = windowDurations.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double rps = windowRequests / (intervalMs / 1000.0);
        double errorRate = windowRequests > 0 ? (double) windowErrors / windowRequests : 0.0;

        PerfMetricSample sample = PerfMetricSample.builder()
                .runId(runId)
                .sampledAt(LocalDateTime.ofInstant(Instant.ofEpochMilli(currentWindowStart), ZoneId.systemDefault()))
                .vus(windowVus)
                .rps(rps)
                .p95Ms(p95)
                .avgMs(avg)
                .minMs(min)
                .maxMs(max)
                .errorRate(errorRate)
                .totalRequests((long) windowRequests)
                .build();

        try {
            sampleRepository.save(sample);
            sseEmitterManager.sendRunMetric(runId, sample);
        } catch (Exception e) {
            log.error("Failed to save and broadcast metric sample for run ID {}", runId, e);
        }

        // Clear window variables
        windowDurations.clear();
        windowRequests = 0;
        windowErrors = 0;
    }

    private void processSummary(K6MetricLine line) {
        // k6 emits final summary at the end. We can flush any remaining samples.
        flushWindow();

        // Calculate total elapsed duration
        long durationMs = Instant.now().toEpochMilli() - runStartInstant.toEpochMilli();
        if (durationMs > 0) {
            requestsPerSec = (double) totalRequests / (durationMs / 1000.0);
        }
    }

    public void finish() {
        flushWindow();
        long durationMs = Instant.now().toEpochMilli() - runStartInstant.toEpochMilli();
        if (durationMs > 0 && requestsPerSec == 0.0) {
            requestsPerSec = (double) totalRequests / (durationMs / 1000.0);
        }
        if (minMs == Double.MAX_VALUE) {
            minMs = 0.0;
        }
    }

    private long parseTimestamp(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return Instant.now().toEpochMilli();
        }
        try {
            return Instant.parse(timeStr).toEpochMilli();
        } catch (Exception e) {
            return Instant.now().toEpochMilli();
        }
    }

    public static double calculatePercentile(List<Double> values, double percentile) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        List<Double> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int index = (int) Math.ceil(percentile / 100.0 * sorted.size()) - 1;
        index = Math.max(0, Math.min(index, sorted.size() - 1));
        return sorted.get(index);
    }
}
