# API Testing Platform

Standalone enterprise API testing & automation platform (future module of the
Automation Portal, fully independent today).

**Start here → [context/API_CONTEXT.md](context/API_CONTEXT.md)** — the main
session-context file (what this is, architecture rule, how to run). Companions:
[context/PHASE_CONTEXT.md](context/PHASE_CONTEXT.md) (phase tracker) and
[context/PLAN_CONTEXT.md](context/PLAN_CONTEXT.md) (roadmap).

Quick run: `docker compose up --build` → UI at http://localhost:15174

## Phase 2 additions (see context/phase2context.md)

- **Execution groups** (`api_group`, module-wise or time-wise NOW/DAILY/WEEKLY):
  Regular APIs are assigned from the Regular APIs → Groups tab or the
  Scheduler → Groups view. A group run executes every member in order through
  the same pipeline as manual/scheduled runs (Base APIs → variable injection →
  Regular API), records an `api_group_execution` row with health
  (passed/total), and links every API run back via
  `execution_history.group_execution_id` + a shared `correlation_id`.
- **Group scheduling**: `schedule.target_type = API | GROUP` — a schedule can
  run a whole group; SUCCESS requires every member to pass.
- **History extensions**: cookies, content type, status message, injected
  variables (masked), start/end timestamps, correlation id, executing user
  (RBAC-ready), plus filters for HTTP method, date range and group run; the
  History tab has an Executions view and a Group Runs view.
- **Dashboard extensions**: API/module/group inventory, fastest & slowest API,
  module-wise statistics, live scheduler status (running jobs, queue size),
  group health.
- **Audit log** (`audit_log` + `/api/v1/audit`): who created/updated/deleted
  APIs, bindings, schedules and groups (placeholder identity until RBAC).
- **Base APIs in collections**: a Base API can be copied into a tester
  collection (`POST /api/v1/base-apis/{id}/add-to-collection/{collectionId}`).

All schema changes ship as Flyway migrations:
`V4__api_groups_history_audit.sql` (purely additive — existing schedules and
history keep working) and `V5__rename_tables_to_master_spec.sql` (renames the
core tables to the master-spec names).

### Core table names (master spec)

| Spec name             | Holds                                             |
|-----------------------|---------------------------------------------------|
| API_MASTER            | Regular APIs                                      |
| BASE_API_MASTER       | Base APIs                                         |
| MODULE_MASTER         | Modules                                           |
| API_EXECUTION_HISTORY | Every execution incl. parsed response fields      |
| API_SCHEDULE          | Schedules (API or GROUP target)                   |
| API_GROUP             | Execution groups (module-wise / time-wise)        |
| API_GROUP_MEMBER      | Group membership                                  |
| API_GROUP_EXECUTION   | Group runs with health                            |
| BASE_API_MAPPING      | Base→Regular variable bindings (JSONPath mapping) |

`API_RESPONSE` from the spec is deliberately merged into
`API_EXECUTION_HISTORY` (status, headers, cookies, body, timing live on the
history row) per spec §4 — store only what is needed, no duplication and no
extra join on every history read.
