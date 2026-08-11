
ALTER TABLE users ADD COLUMN current_project_id BIGINT NULL,
    ADD CONSTRAINT fk_users_current_project FOREIGN KEY (current_project_id) REFERENCES projects(id);

-- Backfill: every existing non-SUPER_ADMIN user was mapped into the Default Workspace by V21.
UPDATE users u
JOIN project_users pu ON pu.user_id = u.id AND pu.status = 'ACTIVE'
JOIN projects p ON p.id = pu.project_id AND p.project_code = 'PRJ-000001'
SET u.current_project_id = p.id
WHERE u.role <> 'SUPER_ADMIN';
