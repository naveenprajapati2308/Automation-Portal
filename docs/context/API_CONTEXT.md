# API Testing Platform — Session Context (MAIN FILE)

Read this file first in any new session before touching this project. It exists so
context survives across Claude Code sessions without re-deriving it from scratch.

This lives in `context/` together with its two companions:
- [PHASE_CONTEXT.md](PHASE_CONTEXT.md) — chronological log of every phase/fix with verification evidence (read for "why" and "what was tested")
- [PLAN_CONTEXT.md](PLAN_CONTEXT.md) — what to build next, in what order

## What this project is

A standalone, enterprise-grade API testing & automation platform (Postman /
Hoppscotch / Insomnia / Bruno-class): manual request builder + collections
(folders, variables, environments, import/export) for testing, plus a
separate automation side (base/regular APIs, chaining, scheduling,
validation, monitoring-via-dashboard). The original 40-section brief and the
`api-testing-platform-master-spec.md` v2 redesign are both in this folder as
historical specs — treat `PHASE_CONTEXT.md` as the source of truth for what
was actually built, since the implementation diverged from both specs in
small, deliberate, documented ways.

## Relationship to the Automation Portal (the repo this folder lives in)

**Currently fully independent.** It sits in this repo as a sibling folder to
`backend/`, `frontend/`, `execution-manager/`, etc. only for convenience of
co-location — it does **not** share code, auth, database, docker network, or
routes with the Automation Portal. Nothing in the main portal references this
folder and nothing here references the main portal.

**Future plan (not implemented, do not build yet):** the Automation Portal will
gain an "API Testing" tab that opens a dashboard backed by this project, the same
way its other modules work. When the user asks for that integration, expect to:
wire shared auth/SSO, possibly reverse-proxy this frontend behind the portal's
nginx, and align the two docker networks. Until explicitly asked, treat any such
wiring as out of scope.

## Non-negotiable architecture rule

**The browser must never call a target/external API directly.** Every HTTP
request the user builds is sent to this project's Spring Boot backend, which
executes it server-side (like `curl`, Python `requests`, or Postman's desktop
agent) and returns the result to React. Why: browsers enforce CORS as a
same-origin sandbox on *browser JS specifically*; curl/Python/Postman-desktop/
Spring Boot are not browsers and are never subject to it.

## Current status (2026-07-13) — both Tester and Automation sides functional and verified

### Automation side (schedules, chaining, validation) — unchanged since master-spec v2
- **Schema**: Flyway-owned (`db/migration/`, `ddl-auto: none`). Core tables:
  `api_module`, `base_api`, `regular_api`, `api_variable_binding`, `schedule`,
  `execution_history`, `api_validation_rule`, `validation_result`,
  `user_module_access` (RBAC placeholder, not enforced).
- **Execution engine** (`execution/`): all 7 methods, 5 body types, 3 auth
  types, timeout/redirect/SSL toggles, TTFB capture.
- **Base APIs** (`baseapi/`): cache strategies PER_CALL / CACHED_TTL (Redis) /
  SCHEDULED_REFRESH; response snapshot powers a field-picker; extractions
  become variable bindings.
- **Regular APIs + chaining** (`regularapi/`): `{{var}}` templates resolved
  via `DependencyExecutionService`; never sends an unresolved placeholder.
- **Scheduler** (`scheduling/`): SKIP LOCKED claim + bounded executor + retry
  backoff; load-tested with 2 instances / 51 schedules, 0 duplicates/drops.
- **History** (`history/`): masked secrets, deterministic status class, >50KB
  bodies gzip-offloaded (`BodyStore`, local disk today — MinIO-shaped
  interface for a future swap), daily retention job.
- **Validation** (`validation/`): JSONPath rules, auto-run per execution.
- Frontend pages: `/base-apis`, `/regular-apis`, `/scheduler`, `/history` (global,
  schedule-oriented), `/modules`, `/` (Dashboard: status donut, module filter,
  schedule health).

### Tester side (manual testing workspace) — rebuilt twice this session, now Postman-parity
Routes are a 3-level drill-down (Postman-style), NOT a single flat page:
- `/tester` → `TesterCollections.jsx` — pick a collection; file-based import
  here (drag/drop or browse `.json`/`.yaml`/`.yml`, multi-file, format
  auto-detected Postman vs OpenAPI/Swagger; paste-text is a fallback tab).
- `/tester/:collectionId` → `CollectionRequestsList.jsx` — table (API Name,
  Method, Path, Response Status, Last Run), **sorted most-recently-run
  first**; renders a real recursive **folder tree** (collapsible, new
  folder/sub-folder, per-row move-to-folder dropdown); top bar has an
  **Environments selector** (switch active env) + management modal, a
  **Variables** modal (collection-level `{{key}}` values), and an **Export**
  menu (Postman / native JSON, both folder- and variable-preserving).
- `/tester/:collectionId/:requestId` (or `.../new`) → `RequestWorkspace.jsx` —
  Hoppscotch-style builder (Parameters/Body/Headers/Authorization tabs) + a
  `ResponseViewer` (Pretty/Raw/Headers/**Cookies**) + a **bottom-docked,
  collapsible `RequestHistoryPanel`** showing only this request's own runs —
  deliberately separate from the sidebar's global `/history` page (schedule-
  oriented; do not conflate the two). Has a folder picker next to the name
  field. **Send always re-syncs the current on-screen form to the DB before
  executing** (critical fix, see below) — never runs a stale saved config.

Backend collections subsystem (`collections/` package):
- `api_collection` (+ `variables` JSON, + `active_environment_id`),
  `collection_folder` (self-referencing tree), `collection_environment`
  (named variable sets), `collection_request` (+ `folder_id`).
- `CollectionVariableResolver`: resolves `{{key}}` against collection
  variables merged with the active environment (environment overrides on
  conflict); blocks execution with a clear error if any placeholder is still
  unresolved — never sends a literal `{{var}}` to DNS.
- `PostmanImportService`: real nested folders (not flattened names),
  captures the collection-level `variable` array.
- `OpenApiImportService` (JSON + YAML via jackson-dataformat-yaml): maps each
  operation's first tag to a folder.
- `PostmanExportService`: rebuilds the same nested folder structure on
  export (verified round-trip), includes variables in both Postman and
  native JSON formats.
- Execution is tied via `POST /collections/{id}/requests/{reqId}/execute` →
  records to `execution_history` with `ApiType.COLLECTION` — gives every
  saved request its own history, independent of the global/schedule history.

**Key bug fixed this session**: `RequestWorkspace.jsx`'s Send used to call
the tied execute endpoint directly for already-saved requests, which
re-reads config from the DB — so switching the method dropdown (or any
field) without clicking "Update" first would silently execute the old saved
version. Fixed: Send now always `PUT`s current form state before executing.

Deliberately deferred (do not add without being asked):
- Spring Security / JWT + RBAC enforcement.
- Multipart/file-upload/binary bodies, cookie jar (request-side), Digest/OAuth2 auth.
- Code generator, CSV/Excel/PDF export, MinIO BodyStore, RabbitMQ.
- Request-level pre-request/test scripts (Postman scripts are imported-and-ignored, not executed or stored).

## Key decisions made and why

- **Package/groupId**: `com.automationportal.apitesting` (backend) — eases a
  future monorepo merge without a package rename.
- **Ports** (never collide with the main portal's): MySQL `3307`, backend
  `8081`, frontend dev `5174` / docker `15174`.
- **Docker network/volumes**: `api_testing_platform_network` /
  `api_testing_platform_mysql_data` — fully distinct from the main portal's.

## How to run

Docker (full stack):
```
cd api-testing-platform
docker compose up --build
```
Frontend at http://localhost:15174, backend at http://localhost:8081.

Local dev (no Docker):
```
cd backend && mvn spring-boot:run        # http://localhost:8080
cd frontend && npm install && npm run dev # http://localhost:5174 (proxies /api to 8080)
```
Do not run this backend and the main portal's backend locally (non-Docker) at
the same time — both default to host port 8080 outside of Docker's port mapping.

Scheduler load test overlay (`docker-compose.loadtest.yml`) spins up a second
backend instance for distributed-lock testing — see PHASE_CONTEXT.md Phase 13.

## Next step

No pending approval gate — building has been proceeding on direct request,
each increment verified live before moving on (see PHASE_CONTEXT.md for the
full evidence trail). Check PLAN_CONTEXT.md's "Next candidates" list for
what's queued; nothing is currently in-progress or half-done.
