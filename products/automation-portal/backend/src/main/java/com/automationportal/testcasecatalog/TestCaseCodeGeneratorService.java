package com.automationportal.testcasecatalog;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Structural mirror of ExecutionIdGeneratorService (executions package), but for permanent test
 * case codes rather than daily-reset execution codes: TC-&lt;frameworkShortCode&gt;-&lt;moduleCode&gt;-&lt;seq&gt;
 * (e.g. TC-SL-EMP_ARCH-000001), backed by a per-(module_code, framework_code) row in
 * test_case_id_sequence, incremented via the same atomic "INSERT ... ON DUPLICATE KEY UPDATE
 * last_seq = LAST_INSERT_ID(last_seq + 1)" upsert. No date component — unlike an execution ID, a
 * catalog code is a permanent identifier and must never change once issued. Runs in its own
 * REQUIRES_NEW transaction so an issued code is never handed back even if the caller's own
 * surrounding work later fails/rolls back (same accepted small-gap tradeoff as the execution ID
 * generator). Only called for a genuinely new identity — TestCaseCatalogService checks for an
 * existing catalog row first, so routine re-runs of already-catalogued tests never consume a
 * sequence number.
 */
@Service
public class TestCaseCodeGeneratorService {
    private static final String DEFAULT_FRAMEWORK_CODE = "GEN";

    private final JdbcTemplate jdbcTemplate;

    public TestCaseCodeGeneratorService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String next(String moduleCode, String frameworkShortCode) {
        String module = moduleCode.trim().toUpperCase();
        String fwCode = (frameworkShortCode == null || frameworkShortCode.isBlank())
                ? DEFAULT_FRAMEWORK_CODE : frameworkShortCode.trim().toUpperCase();

        jdbcTemplate.update(
                "INSERT INTO test_case_id_sequence (module_code, framework_code, last_seq) " +
                        "VALUES (?, ?, LAST_INSERT_ID(1)) " +
                        "ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)",
                module, fwCode);
        long seq = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        return String.format("TC-%s-%s-%06d", fwCode, module, seq);
    }
}
