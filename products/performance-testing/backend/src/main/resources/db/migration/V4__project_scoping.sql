

ALTER TABLE perf_virtual_user ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_vu_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_performance_test ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_perftest_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_load_test ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_loadtest_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_test_group ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_testgroup_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_test_schedule ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_perfschedule_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_test_run ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_perfrun_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE perf_drift_alert ADD COLUMN project_id BIGINT NULL,
    ADD CONSTRAINT fk_drift_project FOREIGN KEY (project_id) REFERENCES projects(id);

UPDATE perf_virtual_user SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_performance_test SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_load_test SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_test_group SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_test_schedule SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_test_run SET project_id = 1 WHERE project_id IS NULL;
UPDATE perf_drift_alert SET project_id = 1 WHERE project_id IS NULL;

CREATE INDEX idx_vu_project ON perf_virtual_user(project_id);
CREATE INDEX idx_perftest_project ON perf_performance_test(project_id);
CREATE INDEX idx_loadtest_project ON perf_load_test(project_id);
CREATE INDEX idx_testgroup_project ON perf_test_group(project_id);
CREATE INDEX idx_perfschedule_project ON perf_test_schedule(project_id);
CREATE INDEX idx_perfrun_project ON perf_test_run(project_id);
CREATE INDEX idx_drift_project ON perf_drift_alert(project_id);
