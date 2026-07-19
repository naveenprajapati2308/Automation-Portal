CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE environments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    base_url VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_suites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    module_id BIGINT,
    name VARCHAR(160) NOT NULL,
    suite_type VARCHAR(60) NOT NULL,
    xml_path VARCHAR(1000) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_suites_module FOREIGN KEY (module_id) REFERENCES modules(id)
);

CREATE TABLE executions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    execution_code VARCHAR(80) NOT NULL UNIQUE,
    execution_type VARCHAR(60) NOT NULL,
    status VARCHAR(40) NOT NULL,
    environment_id BIGINT NOT NULL,
    triggered_by BIGINT NOT NULL,
    module_code VARCHAR(60),
    suite_xml_path VARCHAR(1000),
    total_tests INT NOT NULL DEFAULT 0,
    passed_tests INT NOT NULL DEFAULT 0,
    failed_tests INT NOT NULL DEFAULT 0,
    skipped_tests INT NOT NULL DEFAULT 0,
    pass_rate DECIMAL(7,2) NOT NULL DEFAULT 0,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    duration_seconds BIGINT,
    final_report_path VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_executions_environment FOREIGN KEY (environment_id) REFERENCES environments(id),
    CONSTRAINT fk_executions_user FOREIGN KEY (triggered_by) REFERENCES users(id)
);

CREATE TABLE execution_queue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    execution_id BIGINT NOT NULL,
    status VARCHAR(40) NOT NULL,
    priority INT NOT NULL DEFAULT 5,
    locked_by VARCHAR(120),
    locked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_queue_execution FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE execution_test_cases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    execution_id BIGINT NOT NULL,
    module_code VARCHAR(60),
    suite_name VARCHAR(180),
    class_name VARCHAR(500),
    method_name VARCHAR(240),
    test_name VARCHAR(300),
    status VARCHAR(40) NOT NULL,
    failure_reason TEXT,
    exception_type VARCHAR(300),
    duration_ms BIGINT,
    screenshot_path VARCHAR(1000),
    log_path VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_cases_execution FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE execution_artifacts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    execution_id BIGINT NOT NULL,
    artifact_type VARCHAR(80) NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_artifacts_execution FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE execution_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    execution_id BIGINT NOT NULL,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_execution FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_created_at ON executions(created_at);
CREATE INDEX idx_test_cases_execution_status ON execution_test_cases(execution_id, status);
