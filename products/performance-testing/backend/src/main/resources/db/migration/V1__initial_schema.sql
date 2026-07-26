-- CREATE VIRTUAL USER TABLE
CREATE TABLE perf_virtual_user (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    auth_type       ENUM('NONE','BEARER','BASIC','API_KEY') NOT NULL DEFAULT 'NONE',
    auth_value      TEXT            COMMENT 'Token or base64 credentials — masked in API responses',
    auth_key_name   VARCHAR(100)    COMMENT 'Header/param name for API_KEY type (e.g. X-Api-Key)',
    auth_key_in     ENUM('HEADER','QUERY') COMMENT 'Where to place API_KEY',
    headers         JSON            COMMENT '[{"key":"X-Tenant","value":"acme"}]',
    query_params    JSON            COMMENT '[{"key":"page","value":"1"}]',
    body_template   TEXT            COMMENT 'JSON body with {{placeholder}} variables',
    variables       JSON            COMMENT '[{"key":"userId","value":"123","masked":false}]',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE PERFORMANCE TEST TABLE
CREATE TABLE perf_performance_test (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    target_type             ENUM('URL','SAVED_API') NOT NULL DEFAULT 'URL',
    target_url              VARCHAR(2000),
    http_method             ENUM('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS') NOT NULL DEFAULT 'GET',
    request_headers         JSON            COMMENT '[{"key":"Content-Type","value":"application/json"}]',
    request_body            TEXT,
    auth_type               ENUM('NONE','BEARER','BASIC','API_KEY') NOT NULL DEFAULT 'NONE',
    auth_value              TEXT,
    auth_key_name           VARCHAR(100),
    auth_key_in             ENUM('HEADER','QUERY'),
    timeout_ms              INT             NOT NULL DEFAULT 10000,
    follow_redirects        BOOLEAN         NOT NULL DEFAULT TRUE,
    iterations              INT             NOT NULL DEFAULT 100    COMMENT 'Total requests to fire',
    think_time_ms           INT             NOT NULL DEFAULT 1000   COMMENT 'Wait between iterations',
    threshold_p50_ms        INT,
    threshold_p75_ms        INT,
    threshold_p90_ms        INT,
    threshold_p95_ms        INT,
    threshold_p99_ms        INT,
    threshold_max_ms        INT,
    threshold_error_rate_pct DOUBLE         COMMENT 'e.g. 1.0 = max 1% errors allowed',
    threshold_min_rps       DOUBLE          COMMENT 'minimum requests/sec required',
    assertions              JSON            COMMENT '[{"type":"STATUS","operator":"EQ","value":"200"},{"type":"BODY_CONTAINS","value":"success"},{"type":"JSON_PATH","path":"$.status","operator":"EQ","value":"ok"}]',
    schedule_cron           VARCHAR(100)    COMMENT 'CRON expression, null = manual only',
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE LOAD TEST TABLE
CREATE TABLE perf_load_test (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    target_type             ENUM('URL','SAVED_API') NOT NULL DEFAULT 'URL',
    target_url              VARCHAR(2000),
    http_method             ENUM('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS') NOT NULL DEFAULT 'GET',
    request_headers         JSON,
    request_body            TEXT,
    auth_type               ENUM('NONE','BEARER','BASIC','API_KEY') NOT NULL DEFAULT 'NONE',
    auth_value              TEXT,
    auth_key_name           VARCHAR(100),
    auth_key_in             ENUM('HEADER','QUERY'),
    timeout_ms              INT             NOT NULL DEFAULT 10000,
    stages                  JSON            NOT NULL,
    vu_assignments          JSON,
    threshold_p95_ms        INT,
    threshold_p99_ms        INT,
    threshold_error_rate_pct DOUBLE,
    threshold_min_rps       DOUBLE,
    assertions              JSON,
    schedule_cron           VARCHAR(100),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE TEST GROUPS
CREATE TABLE perf_test_group (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    run_strategy    ENUM('SEQUENTIAL','PARALLEL') NOT NULL DEFAULT 'SEQUENTIAL',
    stop_on_failure BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'SEQUENTIAL only',
    schedule_cron   VARCHAR(100),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE perf_test_group_member (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    group_id        BIGINT          NOT NULL,
    test_type       ENUM('PERF','LOAD') NOT NULL,
    test_id         BIGINT          NOT NULL COMMENT 'FK to perf_performance_test or perf_load_test',
    sequence_order  INT             NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (group_id) REFERENCES perf_test_group(id) ON DELETE CASCADE,
    INDEX idx_group_id (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE SCHEDULES TABLE
CREATE TABLE perf_test_schedule (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    target_type     ENUM('PERF_TEST','LOAD_TEST','GROUP') NOT NULL,
    target_id       BIGINT          NOT NULL,
    cron_expression VARCHAR(100)    NOT NULL,
    timezone        VARCHAR(50)     NOT NULL DEFAULT 'Asia/Kolkata',
    is_enabled      BOOLEAN         NOT NULL DEFAULT TRUE,
    last_run_at     TIMESTAMP,
    next_run_at     TIMESTAMP,
    last_status     ENUM('PASSED','FAILED','RUNNING','ABORTED','NEVER_RUN') NOT NULL DEFAULT 'NEVER_RUN',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_next_run (next_run_at, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE PERFORMANCE RUN RESULTS
CREATE TABLE perf_test_run (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    test_type           ENUM('PERF','LOAD','GROUP','VOLUME') NOT NULL,
    test_id             BIGINT          NOT NULL,
    run_trigger         ENUM('MANUAL','SCHEDULED') NOT NULL DEFAULT 'MANUAL',
    status              ENUM('RUNNING','PASSED','FAILED','ABORTED','ERROR') NOT NULL DEFAULT 'RUNNING',
    started_at          TIMESTAMP,
    ended_at            TIMESTAMP,
    duration_sec        INT             GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, started_at, ended_at)) STORED,
    total_requests      BIGINT          NOT NULL DEFAULT 0,
    error_count         BIGINT          NOT NULL DEFAULT 0,
    error_rate_pct      DOUBLE          NOT NULL DEFAULT 0,
    p50_ms              DOUBLE,
    p75_ms              DOUBLE,
    p90_ms              DOUBLE,
    p95_ms              DOUBLE,
    p99_ms              DOUBLE,
    max_ms              DOUBLE,
    avg_ms              DOUBLE,
    min_ms              DOUBLE,
    requests_per_sec    DOUBLE,
    peak_vus            INT,
    threshold_results   JSON            COMMENT '[{"name":"p(95)<500","value":312.4,"passed":true}]',
    assertion_results   JSON            COMMENT '[{"type":"STATUS","expected":"200","actual":"200","passed":true}]',
    k6_exit_code        INT,
    raw_output_path     VARCHAR(500)    COMMENT 'path to gzipped k6 JSON output',
    error_message       TEXT            COMMENT 'error if status=ERROR',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_test_type_id (test_type, test_id),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE METRIC SAMPLES TABLE
CREATE TABLE perf_metric_sample (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    run_id          BIGINT          NOT NULL,
    sampled_at      TIMESTAMP       NOT NULL,
    vus             INT             NOT NULL DEFAULT 0,
    rps             DOUBLE          NOT NULL DEFAULT 0,
    p95_ms          DOUBLE,
    avg_ms          DOUBLE,
    min_ms          DOUBLE,
    max_ms          DOUBLE,
    error_rate      DOUBLE          NOT NULL DEFAULT 0,
    total_requests  BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (run_id) REFERENCES perf_test_run(id) ON DELETE CASCADE,
    INDEX idx_run_sampled (run_id, sampled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE DRIFT ALERTS TABLE
CREATE TABLE perf_drift_alert (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    run_id              BIGINT          NOT NULL,
    test_type           ENUM('PERF','LOAD') NOT NULL,
    test_id             BIGINT          NOT NULL,
    current_p95_ms      DOUBLE          NOT NULL,
    baseline_p95_ms     DOUBLE          NOT NULL,
    drift_pct           DOUBLE          NOT NULL,
    severity            ENUM('WARNING','CRITICAL') NOT NULL,
    is_acknowledged     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (run_id) REFERENCES perf_test_run(id),
    INDEX idx_test (test_type, test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
