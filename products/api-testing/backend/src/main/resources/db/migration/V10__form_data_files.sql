-- multipart/form-data body support: durable, project-scoped storage for uploaded
-- files so a File-type form-data row survives unattended (scheduled) execution
-- without a browser present to re-supply the bytes.
CREATE TABLE form_data_file (
    id VARCHAR(36) NOT NULL,
    project_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NULL,
    content_type VARCHAR(100) NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_form_data_file_project (project_id)
);

ALTER TABLE BASE_API_MASTER
    ADD COLUMN form_data LONGTEXT NULL;

ALTER TABLE API_MASTER
    ADD COLUMN form_data_template LONGTEXT NULL;
