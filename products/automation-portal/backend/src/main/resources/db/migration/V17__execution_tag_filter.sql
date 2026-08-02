ALTER TABLE executions ADD COLUMN tag_filter VARCHAR(255) NULL;
ALTER TABLE execution_jobs ADD COLUMN tag_filter VARCHAR(255) NULL;
