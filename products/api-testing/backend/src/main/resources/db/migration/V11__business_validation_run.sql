-- Business Validation Check: on-demand (never scheduled) runs that strip fields
-- flagged business-required from a saved request and record whether the backend
-- actually enforces each one. Project-scoped like every other table here.
CREATE TABLE business_validation_run (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    api_type VARCHAR(20) NOT NULL,
    api_id BIGINT NOT NULL,
    total_required INT NOT NULL,
    enforced_count INT NOT NULL,
    response_status_code INT NULL,
    field_results LONGTEXT NULL,
    triggered_by_email VARCHAR(150) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_bvr_lookup (project_id, api_type, api_id, created_at)
);
