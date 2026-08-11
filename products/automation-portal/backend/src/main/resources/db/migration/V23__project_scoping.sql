

ALTER TABLE modules ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_modules_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE environments ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_environments_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE executions ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_executions_project FOREIGN KEY (project_id) REFERENCES projects(id);

UPDATE modules SET project_id = 1 WHERE project_id IS NULL;
UPDATE environments SET project_id = 1 WHERE project_id IS NULL;
UPDATE executions SET project_id = 1 WHERE project_id IS NULL;

CREATE INDEX idx_modules_project ON modules(project_id);
CREATE INDEX idx_environments_project ON environments(project_id);
CREATE INDEX idx_executions_project ON executions(project_id);
