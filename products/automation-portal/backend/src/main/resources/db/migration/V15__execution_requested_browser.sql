-- V15: Browser becomes a real pre-execution choice (previously only descriptive/observed via
-- browser_name/browser_version, populated after the fact from live SUITE_STARTED events).
-- Kept deliberately distinct from those columns so a mismatch between what was requested and
-- what actually ran is visible rather than silently overwritten.
ALTER TABLE executions ADD COLUMN requested_browser VARCHAR(50) NULL;
ALTER TABLE execution_jobs ADD COLUMN browser VARCHAR(50) NULL;
