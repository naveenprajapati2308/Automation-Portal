-- Threads test_engines.framework_path through to Execution Manager / Framework Runner dispatch,
-- so a job for an engine-linked module runs against that engine's own project-specific framework
-- directory (under PROJECT_FRAMEWORKS_ROOT) instead of always falling back to the one static,
-- shared FRAMEWORK_PATH/PLAYWRIGHT_FRAMEWORK_PATH checkout. NULL means unchanged legacy behavior.
ALTER TABLE execution_jobs ADD COLUMN framework_path VARCHAR(500) NULL;
