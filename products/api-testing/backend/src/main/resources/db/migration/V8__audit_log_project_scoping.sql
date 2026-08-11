-- audit_log was left out of V7's project-scoping pass, so any authenticated
-- user could read every project's audit trail via GET /api/v1/audit.
ALTER TABLE audit_log ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_audit_project FOREIGN KEY (project_id) REFERENCES projects(id);

UPDATE audit_log SET project_id = 1 WHERE project_id IS NULL;

CREATE INDEX idx_audit_project ON audit_log(project_id);
