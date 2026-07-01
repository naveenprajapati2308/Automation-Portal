-- ============================================================
-- V6: Execution Manager and Portal Extensions Schema
-- Adds support for browser version, machine IP, queue jobs,
-- runner registry, and portal configurations.
-- ============================================================

-- ── 1. Extensions to executions table ──────────────────────────────
ALTER TABLE executions
    ADD COLUMN browser_version VARCHAR(50) NULL,
    ADD COLUMN machine_ip      VARCHAR(50) NULL;

-- ── 2. Portal Configuration Table ──────────────────────────────────
CREATE TABLE portal_configs (
    config_key   VARCHAR(100) PRIMARY KEY,
    config_value VARCHAR(2000) NOT NULL,
    description  VARCHAR(500) NULL,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed some default portal configs
INSERT INTO portal_configs (config_key, config_value, description) VALUES
('em.max_concurrent', '1', 'Maximum concurrent executions allowed by Execution Manager'),
('em.timeout_minutes', '120', 'Execution job timeout in minutes before marking as error'),
('em.heartbeat_seconds', '30', 'Heartbeat check interval for runner in seconds'),
('portal.events.api-key', 'shared-secret', 'Shared secret API key for framework event verification');

-- ── 3. Execution Jobs Table (DB-backed queue) ─────────────────────
CREATE TABLE execution_jobs (
    job_id          VARCHAR(100) PRIMARY KEY,
    execution_id    BIGINT NOT NULL,
    suite_xml       VARCHAR(255) NOT NULL,
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    state           VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    queue_position  INT NOT NULL DEFAULT 0,
    max_retries     INT NOT NULL DEFAULT 0,
    retry_count     INT NOT NULL DEFAULT 0,
    timeout_minutes INT NOT NULL DEFAULT 120,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP NULL DEFAULT NULL,
    completed_at    TIMESTAMP NULL DEFAULT NULL,
    assigned_runner VARCHAR(255) NULL DEFAULT NULL,
    submitted_by    VARCHAR(255) NULL DEFAULT NULL
);

CREATE INDEX idx_execution_jobs_state ON execution_jobs(state);
CREATE INDEX idx_execution_jobs_exec  ON execution_jobs(execution_id);

-- ── 4. Runner Registry Table ───────────────────────────────────────
CREATE TABLE runner_registry (
    runner_id      VARCHAR(100) PRIMARY KEY,
    runner_name    VARCHAR(255) NOT NULL,
    runner_url     VARCHAR(255) NOT NULL,
    status         VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
