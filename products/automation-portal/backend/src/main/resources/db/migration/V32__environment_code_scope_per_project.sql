-- environments.code was globally unique platform-wide, left over from before project_id existed
-- on this table. Found live: a second project's Automation Setup Wizard failed creating an
-- Environment coded "UAT" because MPHIDB already had one — the single most common environment
-- name on the platform, so this broke the wizard for close to every second project, not an edge
-- case. Code only needs to be unique within its own project.

ALTER TABLE environments DROP INDEX `code`;
ALTER TABLE environments ADD UNIQUE KEY `uk_environments_project_code` (`project_id`, `code`);
