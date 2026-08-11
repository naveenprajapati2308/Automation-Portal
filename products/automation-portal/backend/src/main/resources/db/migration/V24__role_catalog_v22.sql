-- docs/version2.2.md role hierarchy: add TECH_LEAD, retire MANUAL_TESTER / API_TESTER /
-- PERFORMANCE_ENGINEER (not part of the confirmed catalog: PROJECT_ADMIN, QA_LEAD, TECH_LEAD,
-- AUTOMATION_ENGINEER, VIEWER). The three retired codes share identical v1 permissions with
-- AUTOMATION_ENGINEER, so any live grant is remapped there rather than dropped.

INSERT INTO roles (code, name, description)
VALUES ('TECH_LEAD', 'Tech Lead', 'Workspace operational access, same as Automation Engineer for v1');

UPDATE roles SET business_id = CONCAT('ROL-', LPAD(id, 6, '0')) WHERE code = 'TECH_LEAD';
UPDATE entity_id_sequences SET next_value = (SELECT COALESCE(MAX(id), 0) + 1 FROM roles) WHERE prefix = 'ROL';

-- Drop any retired-role grant that would collide with an existing AUTOMATION_ENGINEER grant for
-- the same (project_id, user_id) — uq_project_users forbids two rows with the same pair once the
-- UPDATE below runs both onto the same role_id.
DELETE pu_old FROM project_users pu_old
JOIN roles r_old ON r_old.id = pu_old.role_id
JOIN roles r_new ON r_new.code = 'AUTOMATION_ENGINEER'
JOIN project_users pu_existing
    ON pu_existing.project_id = pu_old.project_id
   AND pu_existing.user_id = pu_old.user_id
   AND pu_existing.role_id = r_new.id
WHERE r_old.code IN ('MANUAL_TESTER', 'API_TESTER', 'PERFORMANCE_ENGINEER');

UPDATE project_users pu
JOIN roles r_old ON r_old.id = pu.role_id
JOIN roles r_new ON r_new.code = 'AUTOMATION_ENGINEER'
SET pu.role_id = r_new.id
WHERE r_old.code IN ('MANUAL_TESTER', 'API_TESTER', 'PERFORMANCE_ENGINEER');

DELETE FROM roles WHERE code IN ('MANUAL_TESTER', 'API_TESTER', 'PERFORMANCE_ENGINEER');
