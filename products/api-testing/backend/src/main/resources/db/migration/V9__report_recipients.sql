-- Execution reports: who to email after a scheduled/group run, and whether
-- the report email has gone out for a given run.
ALTER TABLE API_SCHEDULE
    ADD COLUMN recipients VARCHAR(500) NULL,
    ADD COLUMN created_by_email VARCHAR(150) NULL,
    ADD COLUMN report_email_sent_at TIMESTAMP NULL;

ALTER TABLE API_GROUP_EXECUTION
    ADD COLUMN report_email_sent_at TIMESTAMP NULL,
    ADD COLUMN triggered_by_email VARCHAR(150) NULL;
