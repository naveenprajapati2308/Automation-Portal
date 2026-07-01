-- Flyway migration V4: Extend schema for TestNG Integration & System Info
ALTER TABLE executions
    ADD COLUMN suite_name VARCHAR(180) NULL,
    ADD COLUMN fail_rate DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN machine_name VARCHAR(120) NULL,
    ADD COLUMN os_name VARCHAR(100) NULL,
    ADD COLUMN java_version VARCHAR(40) NULL,
    ADD COLUMN browser_name VARCHAR(80) NULL;

ALTER TABLE execution_test_cases
    ADD COLUMN display_name VARCHAR(300) NULL,
    ADD COLUMN start_time TIMESTAMP NULL,
    ADD COLUMN end_time TIMESTAMP NULL,
    ADD COLUMN parameters TEXT NULL,
    ADD COLUMN stack_trace TEXT NULL,
    ADD COLUMN is_config_method BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE execution_artifacts
    ADD COLUMN size_bytes BIGINT NOT NULL DEFAULT 0;
