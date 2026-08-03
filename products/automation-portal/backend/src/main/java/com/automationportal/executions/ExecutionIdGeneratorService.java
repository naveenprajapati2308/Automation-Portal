package com.automationportal.executions;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Single centralized source of execution IDs, in the format AUTO-&lt;FrameworkCode&gt;-&lt;yyyyMMdd&gt;-&lt;seq&gt;
 * (e.g. AUTO-SL-20260802-0001) — readable and traceable to a framework and day, replacing the old
 * opaque "AUTO-&lt;timestamp&gt;-&lt;random&gt;" format. The framework code itself is never hardcoded here;
 * callers resolve it from FrameworkRegistry (or their own product's equivalent config), so a new
 * framework needs no change to this class.
 * <p>
 * The sequence is per (frameworkCode, calendar date), stored as one row per combination in
 * execution_id_sequence, and incremented via a single atomic "INSERT ... ON DUPLICATE KEY UPDATE
 * last_seq = LAST_INSERT_ID(last_seq + 1)" upsert — the standard MySQL idiom for a gap-free,
 * race-free named counter (the row-level lock the upsert takes serializes concurrent callers, so
 * two executions queued in the same instant can never receive the same number). Runs in its own
 * REQUIRES_NEW transaction so a once-issued sequence number is never handed back out even if the
 * caller's own surrounding work later fails/rolls back.
 */
@Service
public class ExecutionIdGeneratorService {
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String DEFAULT_CODE = "GEN";

    private final JdbcTemplate jdbcTemplate;

    public ExecutionIdGeneratorService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String next(String frameworkCode) {
        String code = (frameworkCode == null || frameworkCode.isBlank())
                ? DEFAULT_CODE : frameworkCode.trim().toUpperCase();
        String today = DATE_FMT.format(LocalDate.now());

        jdbcTemplate.update(
                "INSERT INTO execution_id_sequence (framework_code, seq_date, last_seq) " +
                        "VALUES (?, ?, LAST_INSERT_ID(1)) " +
                        "ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)",
                code, today);
        long seq = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        return String.format("AUTO-%s-%s-%04d", code, today, seq);
    }
}
