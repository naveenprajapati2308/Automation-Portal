-

ALTER TABLE MODULE_MASTER ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_module_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE api_collection ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_collection_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE BASE_API_MASTER ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_baseapi_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE API_MASTER ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_regularapi_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE API_SCHEDULE ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_schedule_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE API_EXECUTION_HISTORY ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_history_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE API_GROUP ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_group_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE API_GROUP_EXECUTION ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_groupexec_project FOREIGN KEY (project_id) REFERENCES projects(id);

UPDATE MODULE_MASTER SET project_id = 1 WHERE project_id IS NULL;
UPDATE api_collection SET project_id = 1 WHERE project_id IS NULL;
UPDATE BASE_API_MASTER SET project_id = 1 WHERE project_id IS NULL;
UPDATE API_MASTER SET project_id = 1 WHERE project_id IS NULL;
UPDATE API_SCHEDULE SET project_id = 1 WHERE project_id IS NULL;
UPDATE API_EXECUTION_HISTORY SET project_id = 1 WHERE project_id IS NULL;
UPDATE API_GROUP SET project_id = 1 WHERE project_id IS NULL;
UPDATE API_GROUP_EXECUTION SET project_id = 1 WHERE project_id IS NULL;

CREATE INDEX idx_module_project ON MODULE_MASTER(project_id);
CREATE INDEX idx_collection_project ON api_collection(project_id);
CREATE INDEX idx_baseapi_project ON BASE_API_MASTER(project_id);
CREATE INDEX idx_regularapi_project ON API_MASTER(project_id);
CREATE INDEX idx_schedule_project ON API_SCHEDULE(project_id);
CREATE INDEX idx_history_project ON API_EXECUTION_HISTORY(project_id);
CREATE INDEX idx_group_project ON API_GROUP(project_id);
CREATE INDEX idx_groupexec_project ON API_GROUP_EXECUTION(project_id);
