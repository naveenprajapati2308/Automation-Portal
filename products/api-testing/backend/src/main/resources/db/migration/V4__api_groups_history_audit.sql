-- =====================================================================
-- V4: Execution groups (module-wise / time-wise), group executions with
-- health, history observability extensions (correlation id, injected
-- variables, cookies, start/end), schedule group targets, and audit log.
-- Purely additive — existing rows, schedules and history remain valid.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Groups: named execution sets of Regular APIs. MODULE groups mirror a
-- module; TIME groups carry an execution cadence (NOW / DAILY / WEEKLY).
-- ---------------------------------------------------------------------
CREATE TABLE api_group (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  group_type VARCHAR(10) NOT NULL,        -- MODULE | TIME
  module_id BIGINT NULL,                  -- set for MODULE groups
  time_frequency VARCHAR(20) NULL,        -- NOW | DAILY | WEEKLY (TIME groups)
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_name (name),
  KEY idx_group_module (module_id),
  CONSTRAINT fk_group_module FOREIGN KEY (module_id) REFERENCES api_module(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE api_group_member (
  id BIGINT NOT NULL AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  regular_api_id BIGINT NOT NULL,
  seq INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_member (group_id, regular_api_id),
  KEY idx_member_api (regular_api_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id) REFERENCES api_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_member_api FOREIGN KEY (regular_api_id) REFERENCES regular_api(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Group executions: one row per group run (manual or scheduled). Health
-- = passed/total. Individual API runs link back via
-- execution_history.group_execution_id.
-- ---------------------------------------------------------------------
CREATE TABLE api_group_execution (
  id BIGINT NOT NULL AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  correlation_id VARCHAR(64) NOT NULL,
  triggered_by VARCHAR(20) NOT NULL,      -- MANUAL | SCHEDULE
  schedule_id BIGINT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING | SUCCESS | PARTIAL | FAILED
  total_apis INT NOT NULL DEFAULT 0,
  passed_apis INT NOT NULL DEFAULT 0,
  failed_apis INT NOT NULL DEFAULT 0,
  health_percent DOUBLE NULL,
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  finished_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_groupexec_group (group_id, started_at),
  KEY idx_groupexec_correlation (correlation_id),
  CONSTRAINT fk_groupexec_group FOREIGN KEY (group_id) REFERENCES api_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- History observability extensions (spec §4/§5 + observability):
-- correlation/group linkage, injected variables (masked), cookies,
-- content type, status message, wall-clock start/end, executing user.
-- ---------------------------------------------------------------------
ALTER TABLE execution_history
  ADD COLUMN group_id BIGINT NULL AFTER schedule_id,
  ADD COLUMN group_execution_id BIGINT NULL AFTER group_id,
  ADD COLUMN correlation_id VARCHAR(64) NULL AFTER group_execution_id,
  ADD COLUMN executed_by VARCHAR(100) NULL AFTER correlation_id,
  ADD COLUMN injected_variables LONGTEXT NULL AFTER request_body,
  ADD COLUMN response_status_message VARCHAR(100) NULL AFTER response_status_class,
  ADD COLUMN response_content_type VARCHAR(255) NULL AFTER response_status_message,
  ADD COLUMN response_cookies LONGTEXT NULL AFTER response_headers,
  ADD COLUMN started_at DATETIME(6) NULL AFTER executed_at,
  ADD COLUMN finished_at DATETIME(6) NULL AFTER started_at,
  ADD KEY idx_group_execution (group_execution_id),
  ADD KEY idx_correlation (correlation_id),
  ADD KEY idx_method (request_method);

-- ---------------------------------------------------------------------
-- Schedules may now target a group instead of a single API. Existing
-- rows keep working: target_type defaults to 'API'.
-- ---------------------------------------------------------------------
-- Drop/re-add the FK around the nullability change: MySQL rejects MODIFY on
-- a column participating in a foreign key on some versions/configurations.
ALTER TABLE schedule DROP FOREIGN KEY fk_schedule_regular;
ALTER TABLE schedule
  MODIFY regular_api_id BIGINT NULL,
  ADD COLUMN target_type VARCHAR(10) NOT NULL DEFAULT 'API' AFTER name,
  ADD COLUMN group_id BIGINT NULL AFTER regular_api_id,
  ADD CONSTRAINT fk_schedule_regular FOREIGN KEY (regular_api_id) REFERENCES regular_api(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_schedule_group FOREIGN KEY (group_id) REFERENCES api_group(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- Audit trail: who created/edited/deleted APIs, schedules, groups and
-- Base API mappings. performed_by carries a placeholder until RBAC.
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(40) NOT NULL,       -- BASE_API | REGULAR_API | SCHEDULE | GROUP | BINDING | MODULE
  entity_id BIGINT NULL,
  action VARCHAR(20) NOT NULL,            -- CREATE | UPDATE | DELETE | EXECUTE | PAUSE | RESUME
  performed_by VARCHAR(100) NOT NULL DEFAULT 'system',
  details VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
