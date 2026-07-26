package com.automationportal.perftesting.volume;

import com.automationportal.perftesting.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VolumeTestService {
    private static final Logger log = LoggerFactory.getLogger(VolumeTestService.class);

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> runVolumeTest(VolumeTestConfig config) {
        String tableName = config.getTableName();
        String selectQuery = config.getSelectQuery();
        List<Integer> milestones = config.getMilestones();

        // 1. Sanity checks (prevent SQL injection)
        if (!tableName.matches("^[a-zA-Z0-9_]+$")) {
            throw ApiException.badRequest("Invalid table name structure: " + tableName);
        }

        // Check if table exists
        try {
            jdbcTemplate.execute("SELECT 1 FROM " + tableName + " LIMIT 1");
        } catch (Exception e) {
            throw ApiException.notFound("Table not found: " + tableName);
        }

        log.info("Starting volume testing on table: {}", tableName);
        List<Map<String, Object>> report = new ArrayList<>();

        try {
            // Ensure temporary benchmark structures are clean
            setupTempTable();

            // Run measurement at each milestone
            for (int milestone : milestones) {
                log.info("Seeding database to milestone: {} rows", milestone);
                seedToCount(milestone);

                log.info("Measuring select query performance at {} rows...", milestone);
                Map<String, Object> metrics = measureQuery(selectQuery);
                metrics.put("rowCount", milestone);
                report.add(metrics);
            }
        } finally {
            // Clean up temporary benchmark structures
            cleanupTempTable();
        }

        return report;
    }

    private void setupTempTable() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS perf_volume_test_temp");
        jdbcTemplate.execute("CREATE TABLE perf_volume_test_temp (" +
                "id INT AUTO_INCREMENT PRIMARY KEY," +
                "val_string VARCHAR(255)," +
                "val_int INT," +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                ")");
    }

    private void seedToCount(int targetCount) {
        // Query current count
        Integer currentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM perf_volume_test_temp", Integer.class);
        if (currentCount == null) currentCount = 0;

        int needed = targetCount - currentCount;
        if (needed <= 0) return;

        // Bulk insert using prepared batch statements
        String sql = "INSERT INTO perf_volume_test_temp (val_string, val_int) VALUES (?, ?)";
        int batchSize = 5000;

        jdbcTemplate.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (PreparedStatement ps = connection.prepareStatement(sql)) {
                int count = 0;
                for (int i = 0; i < needed; i++) {
                    ps.setString(1, "dummy_string_" + i);
                    ps.setInt(2, i);
                    ps.addBatch();
                    count++;

                    if (count % batchSize == 0 || i == needed - 1) {
                        ps.executeBatch();
                        ps.clearBatch();
                    }
                }
            }
            return null;
        });
    }

    private Map<String, Object> measureQuery(String query) {
        // Substitute the placeholder table name with our populated test table
        String targetQuery = query.replaceAll("(?i)\\bFROM\\s+[a-zA-Z0-9_]+", "FROM perf_volume_test_temp");

        List<Double> executionTimes = new ArrayList<>();
        int warmups = 3;
        int iterations = 10;

        // Warm up runs
        for (int i = 0; i < warmups; i++) {
            try {
                jdbcTemplate.queryForList(targetQuery);
            } catch (Exception ignored) {}
        }

        // Iteration runs
        for (int i = 0; i < iterations; i++) {
            long start = System.nanoTime();
            try {
                jdbcTemplate.queryForList(targetQuery);
                long elapsed = System.nanoTime() - start;
                executionTimes.add(elapsed / 1_000_000.0); // Convert to milliseconds
            } catch (Exception e) {
                throw ApiException.badRequest("Error executing select query: " + e.getMessage());
            }
        }

        Collections.sort(executionTimes);
        double avg = executionTimes.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double min = executionTimes.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = executionTimes.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        // P95 calculation
        int p95Index = (int) Math.ceil(0.95 * executionTimes.size()) - 1;
        double p95 = executionTimes.get(Math.max(0, p95Index));

        return Map.of(
                "p95Ms", p95,
                "avgMs", avg,
                "minMs", min,
                "maxMs", max
        );
    }

    private void cleanupTempTable() {
        try {
            jdbcTemplate.execute("DROP TABLE IF EXISTS perf_volume_test_temp");
        } catch (Exception ignored) {}
    }
}
