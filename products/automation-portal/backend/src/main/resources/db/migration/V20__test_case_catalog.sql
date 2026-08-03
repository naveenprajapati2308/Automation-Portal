-- Permanent, execution-independent inventory of test cases per (product, module_code, framework).
-- Running the same test 1000 times still creates 1000 execution_test_cases rows (unchanged) but
-- exactly ONE row here. Identity = (product, module_code, framework, class_name, method_name,
-- test_name) — the same class/method/test tuple ExecutionEventService already uses to dedupe
-- retries within a single execution, plus a forward-looking "product" discriminator (always
-- 'AUTOMATION' today) so API Testing/Performance Testing can extend this same table later without
-- a schema migration to reconcile separately-shaped catalogs (testrix_platform is one shared DB
-- across all three product backends).
CREATE TABLE test_case_catalog (
    id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_case_code           VARCHAR(120)  NOT NULL,
    identity_hash            CHAR(64)      NOT NULL,
    product                  VARCHAR(20)   NOT NULL DEFAULT 'AUTOMATION',
    module_code              VARCHAR(60)   NOT NULL,
    framework                VARCHAR(50)   NOT NULL,
    class_name               VARCHAR(500)  NOT NULL,
    method_name              VARCHAR(240)  NOT NULL,
    test_name                VARCHAR(300)  NOT NULL,
    display_name             VARCHAR(300),
    active                   BOOLEAN       NOT NULL DEFAULT TRUE,
    first_seen_execution_id  BIGINT,
    last_seen_execution_id   BIGINT,
    last_status              VARCHAR(40),
    last_run_at              TIMESTAMP NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_test_case_catalog_code UNIQUE (test_case_code),
    CONSTRAINT uq_test_case_catalog_identity UNIQUE (identity_hash)
);

CREATE INDEX idx_test_case_catalog_module_framework ON test_case_catalog(product, module_code, framework);

-- Per (module_code, framework) counter backing TC-<fwCode>-<moduleCode>-000001 codes. Same atomic
-- "INSERT ... ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)" idiom as
-- execution_id_sequence/ExecutionIdGeneratorService. No date component: a catalog code is a
-- permanent identifier, not a daily-reset run label, so the counter never resets.
CREATE TABLE test_case_id_sequence (
    module_code    VARCHAR(60) NOT NULL,
    framework_code VARCHAR(10) NOT NULL,
    last_seq       BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (module_code, framework_code)
);

-- Permanent link from one execution's result row back to its catalog identity — lets a test
-- case's full execution history be fetched via an indexed FK-style lookup instead of re-deriving
-- identity by a 4/5-column string match every time. No DB-level FK constraint: ExecutionService's
-- existing hard-delete-execution path removes execution_test_cases rows outright, and this column
-- must never block that.
ALTER TABLE execution_test_cases ADD COLUMN test_case_catalog_id BIGINT NULL;
CREATE INDEX idx_execution_test_cases_catalog ON execution_test_cases(test_case_catalog_id);

-- Single-row marker so the historical backfill (TestCaseCatalogBackfillRunner) runs exactly once
-- across the app's lifetime instead of rescanning all execution history on every boot.
CREATE TABLE test_case_catalog_backfill_status (
    id                    TINYINT PRIMARY KEY DEFAULT 1,
    completed_at          TIMESTAMP NULL,
    executions_processed  INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_test_case_catalog_backfill_single_row CHECK (id = 1)
);
