-- =====================================================================
-- V1: Master-spec core schema (modules, base/regular APIs, bindings,
-- schedules, execution history, validation, collections) + backfill
-- from the legacy flat model (saved_requests / api_schedules /
-- execution_records). Legacy tables are kept, never dropped.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Legacy shells: created empty on a fresh DB so the backfill SELECTs
-- below always have a source table to read from.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  config_json LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  method VARCHAR(10) NOT NULL,
  name VARCHAR(200) NOT NULL,
  updated_at DATETIME(6) DEFAULT NULL,
  url VARCHAR(2000) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_schedules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at DATETIME(6) NOT NULL,
  enabled BIT(1) NOT NULL,
  every_minutes INT NOT NULL,
  frequency ENUM('DAILY','EVERY_MINUTES','HOURLY') NOT NULL,
  last_run_at DATETIME(6) DEFAULT NULL,
  last_status_code INT DEFAULT NULL,
  last_success BIT(1) DEFAULT NULL,
  name VARCHAR(200) NOT NULL,
  next_run_at DATETIME(6) DEFAULT NULL,
  saved_request_id BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS execution_records (
  id BIGINT NOT NULL AUTO_INCREMENT,
  duration_ms BIGINT NOT NULL,
  error_message VARCHAR(1000) DEFAULT NULL,
  executed_at DATETIME(6) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_name VARCHAR(200) DEFAULT NULL,
  saved_request_id BIGINT DEFAULT NULL,
  size_bytes BIGINT NOT NULL,
  source ENUM('MANUAL','SCHEDULED') NOT NULL,
  status_code INT DEFAULT NULL,
  success BIT(1) NOT NULL,
  url VARCHAR(2000) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_exec_records_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Modules (self-referencing tree)
-- ---------------------------------------------------------------------
CREATE TABLE api_module (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  parent_module_id BIGINT NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT fk_module_parent FOREIGN KEY (parent_module_id) REFERENCES api_module(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Collections (tester-side grouping, Postman-import target)
-- ---------------------------------------------------------------------
CREATE TABLE api_collection (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE collection_request (
  id BIGINT NOT NULL AUTO_INCREMENT,
  collection_id BIGINT NOT NULL,
  name VARCHAR(200) NOT NULL,
  seq INT NOT NULL DEFAULT 0,
  method VARCHAR(10) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  config_json LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_collection_request (collection_id, seq),
  CONSTRAINT fk_colreq_collection FOREIGN KEY (collection_id) REFERENCES api_collection(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Base APIs (supplier calls: token fetch, lookups)
-- ---------------------------------------------------------------------
CREATE TABLE base_api (
  id BIGINT NOT NULL AUTO_INCREMENT,
  module_id BIGINT NULL,
  name VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  headers LONGTEXT NULL,
  body_type VARCHAR(20) NULL,
  body TEXT NULL,
  auth_type VARCHAR(20) NULL,
  auth_config LONGTEXT NULL,             -- AES/GCM encrypted at rest
  timeout_ms INT NOT NULL DEFAULT 15000,
  cache_strategy VARCHAR(20) NOT NULL DEFAULT 'PER_CALL',
  cache_ttl_seconds INT NULL,
  last_executed_at DATETIME(6) NULL,
  last_response_snapshot LONGTEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_base_api_module (module_id),
  CONSTRAINT fk_baseapi_module FOREIGN KEY (module_id) REFERENCES api_module(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Regular APIs (the APIs under test; templates may contain {{vars}})
-- ---------------------------------------------------------------------
CREATE TABLE regular_api (
  id BIGINT NOT NULL AUTO_INCREMENT,
  module_id BIGINT NULL,
  name VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url_template VARCHAR(2048) NOT NULL,
  headers_template LONGTEXT NULL,
  query_params_template LONGTEXT NULL,
  body_type VARCHAR(20) NULL,
  body_template TEXT NULL,
  auth_type VARCHAR(20) NULL,
  auth_config LONGTEXT NULL,             -- AES/GCM encrypted at rest
  is_dynamic BIT(1) NOT NULL DEFAULT 0,
  timeout_ms INT NOT NULL DEFAULT 15000,
  follow_redirects BIT(1) NOT NULL DEFAULT 1,
  verify_ssl BIT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_regular_api_module (module_id),
  CONSTRAINT fk_regapi_module FOREIGN KEY (module_id) REFERENCES api_module(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Variable bindings.
--  * regular_api_id NULL  = extraction definition on a Base API
--    ("this JSONPath is available as {{variable_name}}")
--  * regular_api_id set   = a Regular API consuming that variable
-- ---------------------------------------------------------------------
CREATE TABLE api_variable_binding (
  id BIGINT NOT NULL AUTO_INCREMENT,
  regular_api_id BIGINT NULL,
  base_api_id BIGINT NOT NULL,
  source_json_path VARCHAR(500) NOT NULL,
  variable_name VARCHAR(100) NOT NULL,
  target_location VARCHAR(20) NOT NULL DEFAULT 'TEMPLATE',
  target_key VARCHAR(200) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_binding (regular_api_id, base_api_id, variable_name),
  KEY idx_binding_base (base_api_id),
  CONSTRAINT fk_binding_regular FOREIGN KEY (regular_api_id) REFERENCES regular_api(id) ON DELETE CASCADE,
  CONSTRAINT fk_binding_base FOREIGN KEY (base_api_id) REFERENCES base_api(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Schedules (distributed-lock ready)
-- ---------------------------------------------------------------------
CREATE TABLE schedule (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  regular_api_id BIGINT NOT NULL,
  frequency_type VARCHAR(20) NOT NULL,   -- EVERY_X_MIN | HOURLY | DAILY | WEEKLY | CRON
  frequency_value VARCHAR(50) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  next_run_at DATETIME(6) NOT NULL,
  last_run_at DATETIME(6) NULL,
  last_run_status VARCHAR(20) NULL,      -- SUCCESS | FAILED | TIMEOUT
  locked_by VARCHAR(100) NULL,
  locked_until DATETIME(6) NULL,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_due (status, next_run_at),
  CONSTRAINT fk_schedule_regular FOREIGN KEY (regular_api_id) REFERENCES regular_api(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Execution history (api_id nullable: ad-hoc tester runs have no saved API)
-- ---------------------------------------------------------------------
CREATE TABLE execution_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  api_type VARCHAR(10) NOT NULL,         -- BASE | REGULAR
  api_id BIGINT NULL,
  api_name VARCHAR(200) NULL,
  module_id BIGINT NULL,
  schedule_id BIGINT NULL,
  triggered_by VARCHAR(20) NOT NULL,     -- MANUAL | SCHEDULE | CHAIN_DEPENDENCY

  request_method VARCHAR(10) NOT NULL,
  request_url VARCHAR(2048) NOT NULL,
  request_headers LONGTEXT NULL,         -- secrets masked before persist
  request_body LONGTEXT NULL,

  response_status_code INT NULL,
  response_status_class VARCHAR(10) NULL, -- 2xx|3xx|4xx|5xx|ERROR|TIMEOUT
  response_headers LONGTEXT NULL,
  response_body_inline LONGTEXT NULL,
  response_body_object_key VARCHAR(500) NULL,
  response_size_bytes BIGINT NULL,

  dns_time_ms INT NULL,
  connect_time_ms INT NULL,
  ttfb_ms INT NULL,
  total_time_ms BIGINT NOT NULL,

  validation_passed BIT(1) NULL,          -- null = no active rules evaluated
  error_message VARCHAR(1000) NULL,
  executed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (id),
  KEY idx_api (api_type, api_id, executed_at),
  KEY idx_module_time (module_id, executed_at),
  KEY idx_schedule (schedule_id, executed_at),
  KEY idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Validation rules + per-execution results
-- ---------------------------------------------------------------------
CREATE TABLE api_validation_rule (
  id BIGINT NOT NULL AUTO_INCREMENT,
  api_type VARCHAR(10) NOT NULL,
  api_id BIGINT NOT NULL,
  json_path VARCHAR(500) NOT NULL,
  operator VARCHAR(20) NOT NULL,         -- EQUALS|NOT_EQUALS|CONTAINS|REGEX|EXISTS|TYPE_IS|RANGE
  expected_value VARCHAR(1000) NULL,
  is_active BIT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_rule_api (api_type, api_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE validation_result (
  id BIGINT NOT NULL AUTO_INCREMENT,
  execution_history_id BIGINT NOT NULL,
  rule_id BIGINT NOT NULL,
  passed BIT(1) NOT NULL,
  actual_value VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_valresult_exec (execution_history_id),
  CONSTRAINT fk_valresult_exec FOREIGN KEY (execution_history_id) REFERENCES execution_history(id) ON DELETE CASCADE,
  CONSTRAINT fk_valresult_rule FOREIGN KEY (rule_id) REFERENCES api_validation_rule(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- RBAC placeholder for future Automation Portal integration
-- ---------------------------------------------------------------------
CREATE TABLE user_module_access (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(100) NOT NULL,
  module_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_module (user_id, module_id),
  CONSTRAINT fk_uma_module FOREIGN KEY (module_id) REFERENCES api_module(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Backfill from the legacy flat model (no-ops on a fresh DB)
-- =====================================================================

-- Saved requests -> Regular APIs (IDs preserved so schedules/history map 1:1)
INSERT INTO regular_api (id, name, method, url_template, headers_template,
                         query_params_template, body_type, body_template,
                         auth_type, is_dynamic, timeout_ms, follow_redirects,
                         verify_ssl, created_at, updated_at)
SELECT id, name, method, url,
       JSON_EXTRACT(config_json, '$.headers'),
       JSON_EXTRACT(config_json, '$.queryParams'),
       JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.bodyType')),
       JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.body')),
       JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.auth.type')),
       0,
       COALESCE(JSON_EXTRACT(config_json, '$.timeoutMs'), 15000),
       1, 1, created_at, COALESCE(updated_at, created_at)
FROM saved_requests;

-- Legacy schedules -> new schedule table
INSERT INTO schedule (name, regular_api_id, frequency_type, frequency_value,
                      status, next_run_at, last_run_at, last_run_status, created_at)
SELECT s.name, s.saved_request_id,
       CASE s.frequency WHEN 'EVERY_MINUTES' THEN 'EVERY_X_MIN' ELSE s.frequency END,
       CASE s.frequency WHEN 'EVERY_MINUTES' THEN CAST(s.every_minutes AS CHAR) ELSE NULL END,
       CASE WHEN s.enabled = 1 THEN 'ACTIVE' ELSE 'PAUSED' END,
       COALESCE(s.next_run_at, NOW(6)),
       s.last_run_at,
       CASE WHEN s.last_success IS NULL THEN NULL
            WHEN s.last_success = 1 THEN 'SUCCESS' ELSE 'FAILED' END,
       s.created_at
FROM api_schedules s
WHERE EXISTS (SELECT 1 FROM regular_api r WHERE r.id = s.saved_request_id);

-- Legacy execution records -> execution_history
INSERT INTO execution_history (api_type, api_id, api_name, triggered_by,
                               request_method, request_url,
                               response_status_code, response_status_class,
                               response_size_bytes, total_time_ms,
                               error_message, executed_at)
SELECT 'REGULAR', r.saved_request_id, r.request_name,
       CASE r.source WHEN 'SCHEDULED' THEN 'SCHEDULE' ELSE 'MANUAL' END,
       r.method, r.url, r.status_code,
       CASE
         WHEN r.status_code IS NULL THEN 'ERROR'
         WHEN r.status_code BETWEEN 200 AND 299 THEN '2xx'
         WHEN r.status_code BETWEEN 300 AND 399 THEN '3xx'
         WHEN r.status_code BETWEEN 400 AND 499 THEN '4xx'
         WHEN r.status_code BETWEEN 500 AND 599 THEN '5xx'
         ELSE 'ERROR'
       END,
       r.size_bytes, r.duration_ms, r.error_message, r.executed_at
FROM execution_records r;

-- Saved requests also become a default collection for the tester
INSERT INTO api_collection (name, description)
SELECT 'Migrated Requests', 'Auto-migrated from the legacy saved-requests model'
FROM DUAL
WHERE EXISTS (SELECT 1 FROM saved_requests);

INSERT INTO collection_request (collection_id, name, seq, method, url, config_json, created_at, updated_at)
SELECT (SELECT MAX(id) FROM api_collection WHERE name = 'Migrated Requests'),
       sr.name, sr.id, sr.method, sr.url, sr.config_json, sr.created_at, COALESCE(sr.updated_at, sr.created_at)
FROM saved_requests sr
WHERE EXISTS (SELECT 1 FROM api_collection WHERE name = 'Migrated Requests');
