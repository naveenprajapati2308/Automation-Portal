-- Carries the resolved per-environment config (Environment.config_json plus
-- environment.code/name) alongside a queued job, so the Execution Manager and
-- Framework Runner can inject it into the Maven run as -D system properties
-- without either of them needing to know about the `environments` table.
ALTER TABLE execution_jobs ADD COLUMN env_config_json TEXT NULL;
