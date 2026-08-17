-- PRJ-000001 was seeded by V21 with the generic placeholder name 'Default Workspace'. It is in
-- fact the real MPHIDB pilot workspace (see the WorkspaceSettings/ProjectManagement UI and the
-- topbar workspace badge, which both render this row's `name` verbatim) — rename it so every
-- surface that displays it shows the real workspace name instead of the seed placeholder.
UPDATE projects SET name = 'MPHIDB' WHERE project_code = 'PRJ-000001' AND name = 'Default Workspace';
