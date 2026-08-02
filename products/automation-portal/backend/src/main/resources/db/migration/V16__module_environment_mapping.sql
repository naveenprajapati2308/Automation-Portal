-- Phase 2 of the Execution Center redesign: Module -> Environment becomes an explicit,
-- per-combination relationship (with its own optional config/base URL/browsers/timeout
-- overrides) instead of the free-text `modules.env_codes` CSV column. This graduates the
-- CSV into a real join table, exactly as anticipated by V10's own comment ("can graduate
-- to a join table if per-project support ever needs it").
CREATE TABLE module_environments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_id BIGINT NOT NULL,
    environment_id BIGINT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    base_url VARCHAR(500) NULL,
    config_json TEXT NULL,
    browsers VARCHAR(255) NULL,
    timeout_minutes INT NULL,
    execution_params_json TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_module_environment UNIQUE (module_id, environment_id),
    CONSTRAINT fk_module_environments_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_module_environments_environment FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
);

-- Backfill: modules that had an explicit env_codes CSV get one row per matching environment.
INSERT INTO module_environments (module_id, environment_id, enabled)
SELECT m.id, e.id, TRUE
FROM modules m
JOIN environments e ON FIND_IN_SET(e.code, m.env_codes) > 0
WHERE m.env_codes IS NOT NULL AND m.env_codes <> '';

-- Backfill: modules with a NULL/blank env_codes ("all environments") get one row per
-- currently-active environment, materializing the old implicit default into explicit rows.
INSERT INTO module_environments (module_id, environment_id, enabled)
SELECT m.id, e.id, TRUE
FROM modules m
JOIN environments e ON e.active = TRUE
WHERE m.env_codes IS NULL OR m.env_codes = '';

ALTER TABLE modules DROP COLUMN env_codes;

-- Module-level "Configure Module Visibility" / "Configure Execution Permissions" (doc section 9).
-- visible=false hides a module from the normal Execution Center/Dashboard pickers without
-- disabling it outright (active=false remains the hard on/off switch).
-- allowed_roles is a CSV of UserRole names; NULL/blank means unrestricted.
ALTER TABLE modules
    ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN allowed_roles VARCHAR(255) NULL;
