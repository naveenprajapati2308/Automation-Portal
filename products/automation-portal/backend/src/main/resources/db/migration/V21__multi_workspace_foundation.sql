

CREATE TABLE entity_id_sequences (
    prefix     VARCHAR(10) PRIMARY KEY,
    next_value BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE tenants (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_code VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A Project *is* a Workspace (doc uses both terms for the same isolation boundary) — carries both
-- business-ID facets (PRJ-/WS-) plus the requester-chosen human slug, per the approved plan.
CREATE TABLE projects (
    id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id                BIGINT NOT NULL,
    project_code             VARCHAR(20) NOT NULL UNIQUE,
    workspace_code           VARCHAR(20) NOT NULL UNIQUE,
    preferred_workspace_slug VARCHAR(60) NOT NULL UNIQUE,
    name                     VARCHAR(200) NOT NULL,
    description              VARCHAR(2000),
    backend_tech             VARCHAR(120),
    frontend_tech            VARCHAR(120),
    database_tech            VARCHAR(120),
    cicd_tool                VARCHAR(120),
    status                   VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE project_modules (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id  BIGINT NOT NULL,
    module_type VARCHAR(40) NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_modules_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT uq_project_modules UNIQUE (project_id, module_type)
);

-- The multi-project, multi-role membership table: one row per (project, user, role) grant. A user
-- can hold several rows across several projects, and several roles within one project.
CREATE TABLE project_users (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    role_id    BIGINT NOT NULL,
    status     VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_users_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_users_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_project_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT uq_project_users UNIQUE (project_id, user_id, role_id)
);

CREATE TABLE workspace_requests (
    id                        BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_name              VARCHAR(200) NOT NULL,
    organization_name         VARCHAR(200) NOT NULL,
    project_description       VARCHAR(2000),
    backend_tech              VARCHAR(120),
    frontend_tech             VARCHAR(120),
    database_tech             VARCHAR(120),
    cicd_tool                 VARCHAR(120),
    requested_modules         VARCHAR(500) NOT NULL,
    workspace_name            VARCHAR(200) NOT NULL,
    preferred_workspace_slug  VARCHAR(60) NOT NULL,
    project_manager_name      VARCHAR(120) NOT NULL,
    email                     VARCHAR(160) NOT NULL,
    phone                     VARCHAR(30),
    expected_team_size        INT,
    additional_notes          VARCHAR(2000),
    status                    VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    rejection_reason          VARCHAR(1000),
    reviewed_by               BIGINT,
    reviewed_at               TIMESTAMP NULL,
    resulting_project_id      BIGINT,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
    CONSTRAINT fk_workspace_requests_project FOREIGN KEY (resulting_project_id) REFERENCES projects(id)
);

-- Additive business-ID columns on existing tables. Nothing reads these yet, so adding them is
-- inert until a future feature needs them; nullable+unique is safe in MySQL (multiple NULLs allowed).
ALTER TABLE users ADD COLUMN business_id VARCHAR(20) UNIQUE;
ALTER TABLE roles ADD COLUMN business_id VARCHAR(20) UNIQUE;
ALTER TABLE environments ADD COLUMN business_id VARCHAR(20) UNIQUE;

-- ── Seed: single Phase-1 tenant ─────────────────────────────────────────────────────────────
INSERT INTO tenants (tenant_code, name, status) VALUES ('TEN-000001', 'MPSeDC', 'ACTIVE');
INSERT INTO entity_id_sequences (prefix, next_value) VALUES ('TEN', 2);

-- ── Seed: new project-level role catalog entries (existing QA_LEAD/AUTOMATION_ENGINEER/VIEWER
-- already present from V2) ──────────────────────────────────────────────────────────────────
INSERT INTO roles (code, name, description) VALUES
    ('PROJECT_ADMIN', 'Project Admin', 'Owns and administers a single project workspace'),
    ('MANUAL_TESTER', 'Manual Tester', 'Manual test execution and reporting'),
    ('API_TESTER', 'API Tester', 'API collection design and execution'),
    ('PERFORMANCE_ENGINEER', 'Performance Engineer', 'Load/performance test design and execution');

-- ── Backfill: default project holding all pre-existing data, so every current user keeps
-- working unchanged ─────────────────────────────────────────────────────────────────────────
INSERT INTO projects (tenant_id, project_code, workspace_code, preferred_workspace_slug, name, status)
SELECT id, 'PRJ-000001', 'WS-000001', 'default', 'Default Workspace', 'ACTIVE'
FROM tenants WHERE tenant_code = 'TEN-000001';
INSERT INTO entity_id_sequences (prefix, next_value) VALUES ('PRJ', 2), ('WS', 2);

INSERT INTO project_modules (project_id, module_type, enabled)
SELECT p.id, m.module_type, TRUE
FROM projects p
CROSS JOIN (
    SELECT 'AUTOMATION_SELENIUM' AS module_type UNION ALL
    SELECT 'AUTOMATION_PLAYWRIGHT' UNION ALL
    SELECT 'API_TESTING' UNION ALL
    SELECT 'PERFORMANCE_TESTING'
) m
WHERE p.project_code = 'PRJ-000001';

-- Map every existing non-SUPER_ADMIN ACTIVE user into the default project with an equivalent role.
INSERT INTO project_users (project_id, user_id, role_id)
SELECT p.id, u.id, r.id
FROM users u
JOIN projects p ON p.project_code = 'PRJ-000001'
JOIN roles r ON r.code = CASE u.role WHEN 'ADMIN' THEN 'PROJECT_ADMIN' ELSE u.role END
WHERE u.role <> 'SUPER_ADMIN' AND u.status = 'ACTIVE';

-- ── Backfill business_id for pre-existing rows, numbered to match their internal id ─────────
UPDATE users SET business_id = CONCAT('USR-', LPAD(id, 6, '0')) WHERE business_id IS NULL;
UPDATE roles SET business_id = CONCAT('ROL-', LPAD(id, 6, '0')) WHERE business_id IS NULL;
UPDATE environments SET business_id = CONCAT('ENV-', LPAD(id, 6, '0')) WHERE business_id IS NULL;

INSERT INTO entity_id_sequences (prefix, next_value) SELECT 'USR', COALESCE(MAX(id), 0) + 1 FROM users;
INSERT INTO entity_id_sequences (prefix, next_value) SELECT 'ROL', COALESCE(MAX(id), 0) + 1 FROM roles;
INSERT INTO entity_id_sequences (prefix, next_value) SELECT 'ENV', COALESCE(MAX(id), 0) + 1 FROM environments;

CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_project_users_project ON project_users(project_id, status);
CREATE INDEX idx_workspace_requests_status ON workspace_requests(status);
