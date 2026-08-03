package com.automationportal.config;

import com.automationportal.executions.Execution;
import com.automationportal.executions.ExecutionRepository;
import com.automationportal.executions.ExecutionStatus;
import com.automationportal.testcasecatalog.TestCaseCatalogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * One-time historical sync of the test case catalog (see testcasecatalog package) from existing
 * execution_test_cases rows, reusing TestCaseCatalogService.syncTestCasesForExecution verbatim -
 * no separate upsert logic. Runs at most once across the app's lifetime (guarded by
 * test_case_catalog_backfill_status), not on every boot, since a full history rescan would
 * otherwise become an unbounded startup cost as execution history grows. Sequential ascending
 * order matters: it makes each catalog row's last-known status end up reflecting the
 * chronologically latest execution, exactly as if live sync had always been running.
 * TestCaseCatalogAdminController exposes a manual re-sync escape hatch via resync().
 */
@Component
public class TestCaseCatalogBackfillRunner implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(TestCaseCatalogBackfillRunner.class);

    private final ExecutionRepository executionRepository;
    private final TestCaseCatalogService testCaseCatalogService;
    private final JdbcTemplate jdbcTemplate;

    public TestCaseCatalogBackfillRunner(ExecutionRepository executionRepository,
            TestCaseCatalogService testCaseCatalogService, JdbcTemplate jdbcTemplate) {
        this.executionRepository = executionRepository;
        this.testCaseCatalogService = testCaseCatalogService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // The marker row doesn't exist until the first backfill completes (V20 creates the table
        // empty, not pre-seeded) - INSERT IGNORE guarantees id=1 exists before the check below,
        // without needing a second migration or touching the already-applied V20.
        jdbcTemplate.update("INSERT IGNORE INTO test_case_catalog_backfill_status (id) VALUES (1)");

        Boolean alreadyDone = jdbcTemplate.queryForObject(
                "SELECT completed_at IS NOT NULL FROM test_case_catalog_backfill_status WHERE id = 1", Boolean.class);
        if (Boolean.TRUE.equals(alreadyDone)) {
            log.info("Test case catalog backfill already completed - skipping.");
            return;
        }
        int processed = runBackfill();
        log.info("Test case catalog backfill complete: processed {} executions", processed);
    }

    /** Manual escape hatch (TestCaseCatalogAdminController): clears the marker and re-runs inline. */
    public int resync() {
        jdbcTemplate.update("UPDATE test_case_catalog_backfill_status SET completed_at = NULL WHERE id = 1");
        int processed = runBackfill();
        log.info("Test case catalog manual resync complete: processed {} executions", processed);
        return processed;
    }

    private int runBackfill() {
        List<Execution> all = executionRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"));
        int processed = 0;
        for (Execution execution : all) {
            if (execution.getStatus() == ExecutionStatus.QUEUED || execution.getStatus() == ExecutionStatus.RUNNING) {
                continue;
            }
            try {
                testCaseCatalogService.syncTestCasesForExecution(execution);
                processed++;
            } catch (Exception e) {
                log.error("Failed to backfill test case catalog for execution {}", execution.getExecutionCode(), e);
            }
        }

        jdbcTemplate.update(
                "INSERT INTO test_case_catalog_backfill_status (id, completed_at, executions_processed) " +
                        "VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE completed_at = VALUES(completed_at), " +
                        "executions_processed = VALUES(executions_processed)",
                Timestamp.from(Instant.now()), processed);
        return processed;
    }
}
