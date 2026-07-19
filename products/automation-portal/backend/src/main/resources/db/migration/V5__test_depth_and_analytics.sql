-- ============================================================
-- V5: Test Depth & Analytics Schema
-- Adds: test_steps, tags, execution_test_case_tags
--       retries column on execution_test_cases
--       precomputed analytics columns on executions
-- ============================================================

-- ── 1. Retries counter on test cases (flaky detection) ────────────────────
ALTER TABLE execution_test_cases
    ADD COLUMN retries INT NOT NULL DEFAULT 0;

-- ── 2. Precomputed aggregate columns on executions (instant-read analytics) ─
ALTER TABLE executions
    ADD COLUMN total_duration_ms   BIGINT          NOT NULL DEFAULT 0,
    ADD COLUMN pass_percentage     DECIMAL(7, 2)   NOT NULL DEFAULT 0.00,
    ADD COLUMN fail_percentage     DECIMAL(7, 2)   NOT NULL DEFAULT 0.00;

-- Back-fill pass_percentage and fail_percentage from existing data
UPDATE executions
SET
    total_duration_ms = COALESCE(duration_seconds * 1000, 0),
    pass_percentage   = CASE WHEN total_tests > 0 THEN ROUND((passed_tests  * 100.0) / total_tests, 2) ELSE 0 END,
    fail_percentage   = CASE WHEN total_tests > 0 THEN ROUND((failed_tests * 100.0) / total_tests, 2) ELSE 0 END;

-- ── 3. Test Steps table ───────────────────────────────────────────────────
CREATE TABLE test_steps (
    id               BIGINT       PRIMARY KEY AUTO_INCREMENT,
    test_case_id     BIGINT       NOT NULL,
    step_name        VARCHAR(500) NOT NULL,
    status           VARCHAR(40)  NOT NULL,
    duration_ms      BIGINT       NOT NULL DEFAULT 0,
    error_message    TEXT         NULL,
    stack_trace      TEXT         NULL,
    step_order       INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_step_test_case FOREIGN KEY (test_case_id)
        REFERENCES execution_test_cases(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_steps_test_case ON test_steps(test_case_id);
CREATE INDEX idx_test_steps_status    ON test_steps(status);

-- ── 4. Tags table ─────────────────────────────────────────────────────────
CREATE TABLE tags (
    id   BIGINT       PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE INDEX idx_tags_name ON tags(name);

-- ── 5. Test case ↔ tag mapping (many-to-many) ─────────────────────────────
CREATE TABLE execution_test_case_tags (
    test_case_id BIGINT NOT NULL,
    tag_id       BIGINT NOT NULL,

    PRIMARY KEY (test_case_id, tag_id),

    CONSTRAINT fk_tc_tag_test_case FOREIGN KEY (test_case_id)
        REFERENCES execution_test_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_tc_tag_tag FOREIGN KEY (tag_id)
        REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_tc_tags_test_case ON execution_test_case_tags(test_case_id);
CREATE INDEX idx_tc_tags_tag       ON execution_test_case_tags(tag_id);

-- ── 6. Indexes to power the new analytics queries ─────────────────────────
-- Pass-rate trend by date (28-day daily chart)
CREATE INDEX idx_executions_created_status ON executions(created_at, status);
-- Environment distribution pie
CREATE INDEX idx_executions_env            ON executions(environment_id, created_at);
-- Duration trend
CREATE INDEX idx_executions_duration       ON executions(created_at, total_duration_ms);
-- Failure grouping by exception type
CREATE INDEX idx_tc_exception_status       ON execution_test_cases(exception_type, status);
-- Retry / flaky leaderboard
CREATE INDEX idx_tc_retries               ON execution_test_cases(retries);
