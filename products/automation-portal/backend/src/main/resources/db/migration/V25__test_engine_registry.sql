-- docs/version2.3.md (Plan 2): Test Engine Registry — replaces the single global shared secret
-- (portal.events.api-key / em.portal-api-key) with a per-engine, per-project identity and
-- credential. See docs/test-engine-integration-architecture.md for the full design.

CREATE TABLE test_engines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id VARCHAR(32) NOT NULL UNIQUE,
    project_id BIGINT NOT NULL,
    engine_type VARCHAR(30) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    deployment_type VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
    endpoint VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    last_heartbeat_at TIMESTAMP NULL,
    created_by_user_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_engines_project FOREIGN KEY (project_id) REFERENCES projects(id),
    INDEX idx_test_engines_project (project_id)
);

CREATE TABLE test_engine_credentials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_engine_id BIGINT NOT NULL,
    credential_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    CONSTRAINT fk_test_engine_credentials_engine FOREIGN KEY (test_engine_id) REFERENCES test_engines(id),
    INDEX idx_test_engine_credentials_engine (test_engine_id)
);

ALTER TABLE modules ADD COLUMN test_engine_id BIGINT NULL,
    ADD CONSTRAINT fk_modules_test_engine FOREIGN KEY (test_engine_id) REFERENCES test_engines(id);

ALTER TABLE executions ADD COLUMN test_engine_id BIGINT NULL,
    ADD CONSTRAINT fk_executions_test_engine FOREIGN KEY (test_engine_id) REFERENCES test_engines(id);

-- Execution Manager's own table (separate Spring context, no JPA awareness of test_engines) —
-- denormalized business_id string, not a FK, since EM only needs a non-null presence check to
-- decide whether to withhold the legacy global credential at dispatch time.
ALTER TABLE execution_jobs ADD COLUMN test_engine_code VARCHAR(32) NULL;
