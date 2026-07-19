-- =====================================================================
-- V5: Rename core tables to the master-spec names (phase2context.md):
--   API_MASTER, BASE_API_MASTER, MODULE_MASTER, API_EXECUTION_HISTORY,
--   API_SCHEDULE, API_GROUP, API_GROUP_EXECUTION, BASE_API_MAPPING.
-- RENAME TABLE preserves data, indexes and foreign keys.
-- API_RESPONSE is intentionally NOT a separate table: response fields
-- live inside API_EXECUTION_HISTORY (spec §4 — store only what is
-- needed, avoid duplication and an extra join on every history read).
-- Case-only renames go through a _TMP hop so the migration also works
-- on case-insensitive filesystems.
-- =====================================================================

RENAME TABLE regular_api          TO API_MASTER;
RENAME TABLE base_api             TO BASE_API_MASTER;
RENAME TABLE api_module           TO MODULE_MASTER;
RENAME TABLE execution_history    TO API_EXECUTION_HISTORY;
RENAME TABLE schedule             TO API_SCHEDULE;
RENAME TABLE api_variable_binding TO BASE_API_MAPPING;

RENAME TABLE api_group           TO API_GROUP_TMP;
RENAME TABLE API_GROUP_TMP       TO API_GROUP;
RENAME TABLE api_group_execution TO API_GROUP_EXECUTION_TMP;
RENAME TABLE API_GROUP_EXECUTION_TMP TO API_GROUP_EXECUTION;
RENAME TABLE api_group_member    TO API_GROUP_MEMBER_TMP;
RENAME TABLE API_GROUP_MEMBER_TMP TO API_GROUP_MEMBER;
