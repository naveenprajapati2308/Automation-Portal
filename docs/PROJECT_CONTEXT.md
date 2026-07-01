# Automation Portal — Project Context (Master Reference)

> Purpose of this file: a single, factual, code-verified snapshot of what this project actually
> is and actually does, as of **2026-07-01**. It exists so that future conversations don't need
> to re-derive architecture from scratch — paste/reference this file for context, then layer new
> instructions on top of it. This document was built by reading every doc in `docs/` AND by
> directly inspecting the source of every service, so it reconciles "what was planned" with
> "what is actually built." It is analysis only — no code was changed to produce it.

---

## 1. What This Project Is

The **Automation Portal** is an internal enterprise web application that acts as the control
center for an existing **Selenium + TestNG + Maven** UI test automation framework called
**MPHIDB**, which lives in a *separate* repository at `D:\New folder\MPHIDB` (own git repo, not
part of this one). MPHIDB tests a government land-records/GIS system (modules: Land, Survey,
GIS, Architect Empanelment).

The Portal does **not** replace MPHIDB's test code. It wraps it with:

- A web UI to trigger test runs (whole suite, a module, or a specific XML suite) per environment
  (QA / UAT / PreProd / Prod).
- A queueing/concurrency layer so runs don't collide.
- Live progress and results as tests execute (not just after they finish).
- A historical database of every execution, test case, screenshot, and log — enabling
  dashboards, trend charts, regression detection, and execution comparisons.
- Role-based user/admin management (enterprise, no self-registration).

The stated long-term vision (see `docs/1.2CR.md`) is explicitly **not** a "report viewer that
waits for a run to finish and parses HTML." It's meant to behave like an **event-driven
execution platform**: the framework pushes live events to the backend *while tests are running*,
and the dashboard updates in real time.

---

## 2. System Architecture

Five deployable units, orchestrated by `docker-compose.yml`, plus one external framework repo:

```
                    ┌─────────────────────────┐
                    │   React Frontend (SPA)   │  :5173 (dev) / :15173 (docker)
                    └────────────┬─────────────┘
                                 │ REST (JWT)
                                 ▼
                    ┌─────────────────────────┐
                    │  Portal Backend          │  :8080 (dev) / :18080 (docker)
                    │  Spring Boot 3 / Java 21 │──────┐
                    └────────────┬─────────────┘      │ reads
                                 │ POST /em/executions │
                                 ▼                     ▼
                    ┌─────────────────────────┐   ┌─────────┐
                    │  Execution Manager       │   │  MySQL  │  :13306 (docker) / :3306
                    │  (queue/concurrency)     │   │   8.4   │
                    │  :8090                   │   └─────────┘
                    └────────────┬─────────────┘
                                 │ POST /runner/run
                                 ▼
                    ┌─────────────────────────┐
                    │  Framework Runner        │  :9090
                    │  (shells out to Maven)   │
                    └────────────┬─────────────┘
                                 │ mvn test -DsuiteXmlFile=...
                                 ▼
                    ┌─────────────────────────┐
                    │  MPHIDB (external repo)  │  D:\New folder\MPHIDB
                    │  Selenium+TestNG+Extent  │
                    └────────────┬─────────────┘
                                 │ HTTP POST /api/events/execution
                                 │ (fire-and-forget, non-blocking)
                                 ▼
                    (back to Portal Backend — live event ingestion + SSE broadcast)

                    ┌─────────────────────────┐
                    │  Report Artifact Service │  :9091 (read-only file server)
                    └─────────────────────────┘
```

Also present but **not shipped/deployed**:

- `loveable.ai/automation-hub/` — a separate React 19 + TypeScript + TanStack Router + shadcn/ui
  project built with Lovable.ai. **Explicitly a UI/UX design reference only** (per
  `docs/version1.1.0.md`: *"you have to take reference from this only for ui and some component
  only do not change blindly"*). Not wired to any backend, not part of docker-compose.
- `loveable.ai/report/MasterReport2.html` — a real Extent-style HTML report used as a reference
  for what raw test data is available to build dashboards from.

### Ports summary

| Service | Dev port | Docker port | Tech |
|---|---|---|---|
| Frontend | 5173 | 15173 | React (JS/JSX, Vite, no TypeScript) |
| Portal Backend | 8080 | 18080 | Spring Boot 3, Java 21, JPA/Hibernate, Flyway |
| Execution Manager | 8090 | 8090 | Spring Boot (JPA-backed queue broker) |
| Framework Runner | 9090 | 9090 | Plain Java `com.sun.net.httpserver` (no Spring) |
| Report Artifact Service | 9091 | 9091 | Plain Java `com.sun.net.httpserver` (no Spring) |
| MySQL | 3306 | 13306 | MySQL 8.4 |

---

## 3. End-to-End Execution Workflow (as actually implemented)

```
User clicks "Run" in Execution Center (React)
  → POST /api/executions/run  (Portal Backend)
  → Execution row created, status = QUEUED
  → ExecutionWorker (Spring @Scheduled, polls every 5s) picks it up
  → POST /em/executions           (Execution Manager)
  → QueueProcessor (@Scheduled every 5s) respects EM_MAX_CONCURRENT (default 1)
  → when a slot is free: POST /runner/run   (Framework Runner)
  → Framework Runner shells out:
        mvn test -DsuiteXmlFile=<suite>.xml -DexecutionId=... -DportalUrl=... -DopenReport=false
        (working dir = MPHIDB checkout, mounted as a Docker volume)
  → TestNG executes; MPHIDB's v2 listeners (ExtentReportManagerV2 / Master_extent_report_v2)
    fire PortalApiClient calls for every lifecycle event:
        SUITE_STARTED, MODULE_STARTED, TEST_STARTED, TEST_PASSED, TEST_FAILED,
        TEST_SKIPPED, SCREENSHOT_CAPTURED, LOG_ENTRY, MODULE_COMPLETED, SUITE_COMPLETED
  → each event: POST {portalUrl}/api/events/execution  (X-API-Key header, 5s timeout,
    fire-and-forget — never blocks the test run if the Portal is down)
  → Portal Backend's ExecutionEventController/Service persists it immediately and
    broadcasts it over SSE (LiveBroadcastService) to GET /api/events/execution/{code}/stream
  → On SUITE_COMPLETED: Framework Runner notifies Execution Manager
    (POST /em/executions/{id}/completed) → concurrency slot released → next queued job starts
  → ExecutionWorker copies artifacts (reports/screenshots/logs) into
    artifacts/executions/<execution_code>/
  → TestNGXmlParser re-parses testng-results.xml as a gap-fill / structured source of truth
    for execution_test_cases, test_steps, tags
  → Report Artifact Service serves the copied HTML report / XML / screenshots read-only
  → User clicks "View Report" → Reports Center → Report Artifact Service
```

**Important nuance**: the backend *has* a working SSE broadcast endpoint for live events, but —
per the frontend agent's findings — **the React frontend does not currently consume it**
(no `EventSource`/WebSocket usage anywhere in `frontend/src`). The dashboard/execution center
still work by polling REST endpoints on demand. So the live-event pipe is real end-to-end from
MPHIDB → Backend → SSE endpoint, but the last mile (SSE → UI) is not wired up yet. This is the
single biggest gap between the "event-driven platform" vision in `docs/1.2CR.md` and the current
UI.

---

## 4. Repository Map

```
Automation Portal/                     (this repo)
  backend/                             Spring Boot 3 / Java 21 — main API, DB owner
  execution-manager/                   Spring Boot — queue/concurrency broker (:8090)
  framework-runner/                    Plain Java HTTP server — shells out to Maven (:9090)
  report-artifact-service/             Plain Java HTTP server — read-only file server (:9091)
  frontend/                            React (JS/JSX) SPA, Vite build, Nginx-served in Docker
  loveable.ai/automation-hub/          UI/UX reference project only (Lovable.ai output) — NOT deployed
  loveable.ai/report/MasterReport2.html  Sample Extent report used as a data-shape reference
  docs/                                All planning/spec/version docs (chronological, see §8)
  docker-compose.yml                   Orchestrates all 5 services + MySQL
  seed.sql                             DB seed data

D:\New folder\MPHIDB\                  (SEPARATE git repo — the actual automation framework)
  MPHIDB.xml, land.xml, Emp_Arch.xml, test.xml       — v1 (original) TestNG suites, untouched
  MPHIDB-v2.xml, land-v2.xml, Emp_Arch-v2.xml, ...   — v2 suites, used by the Portal integration
  pom.xml (v1, dummy runner) / pom-v2.xml (v2, real Portal runner)
  src/main/java/runner/ModuleRunnerServer.java       — old dummy runner, kept as backup
  src/main/java/runner/FrameworkRunnerService.java   — active runner used by the Portal
  src/test/java/utilities/PortalApiClient.java       — fire-and-forget event pusher
  src/test/java/utilities/RetryAnalyzer.java         — TestNG retry support
  src/test/java/ReportManager/ExtentReportManagerV2.java, Master_extent_report_v2.java
                                                       — v2 listeners with Portal event hooks
  testData/config-v2.properties                       — portal.url / portal.api.key / etc.
```

---

## 5. Service-by-Service Status

### 5.1 Portal Backend (`backend/`) — the system of record

Java 21, Spring Boot 3, MySQL via JPA/Hibernate, Flyway migrations (`V1`…`V7`), JWT auth with
refresh-token rotation, optional Google OAuth2.

Packages: `auth`, `users`, `audit`, `executions`, `events` (SSE), `dashboard`, `modules`,
`environments`, `profile`, `config`, `reports`, `screenshots`, `common`, `logs`.

Core pipeline classes, all real (not stubbed):
- `ExecutionWorker` — polls the queue every 5s, submits to Execution Manager, copies artifacts.
- `TestNGXmlParser` — parses `testng-results.xml` into test cases/steps/tags/retries/screenshots.
- `ExecutionEventController` / `ExecutionEventService` / `LiveBroadcastService` — live event
  ingestion (`POST /api/events/execution`, API-key validated) and SSE broadcast
  (`GET /api/events/execution/{code}/stream`).
- `DashboardService` — pass-rate trends, module health, heatmaps, flaky/slow test detection,
  regression alerts — all SQL-backed, not mocked.
- `DataSeeder` — seeds `superadmin@gmail.com` / `password`, default environments (QA/UAT/
  PreProd/Prod), default modules (Land, Architect Empanelment) on first boot.

Only known stub: `LogController.GET /api/logs` returns an empty list — dead endpoint,
`LogsViewer.jsx` on the frontend evidently gets logs some other way (via execution logs, not
this global endpoint) or this route is unused.

Full endpoint surface is large (auth, admin/users, admin/modules, environments, executions,
events, dashboard×12, reports, screenshots, compare, profile, portal-config) — see the backend
package docstrings/controllers directly for the authoritative list; this file intentionally
doesn't restate all ~70 endpoints to avoid drifting out of sync with the code.

### 5.2 Execution Manager (`execution-manager/`) — queue broker, port 8090

Spring Boot + JPA. Real, working concurrency control:
- `QueueProcessor` (`@Scheduled`, every 5s) enforces `EM_MAX_CONCURRENT` (default 1) and
  dispatches queued jobs to the Framework Runner via `RunnerClient`.
- Timeout enforcement: jobs running longer than `EM_TIMEOUT_MINUTES` (default 120) are
  force-terminated.
- `POST /em/executions/{id}/pause` and `/resume` exist but are **state-only stubs** — they flip
  a DB status flag without actually telling the Framework Runner to pause/resume anything
  (and the Framework Runner has no pause/resume support to call anyway — see 5.3).
- Does **not** shell out to Maven itself — it's purely an HTTP broker in front of the runner(s).

### 5.3 Framework Runner (`framework-runner/`) — port 9090

Not a Spring app — a small standalone Java process using `com.sun.net.httpserver`. This is the
thing that actually runs Maven:
- `POST /runner/run` builds and runs `mvn test -DsuiteXmlFile=... -DexecutionId=... -DportalUrl=...
  -DopenReport=false` against the MPHIDB checkout (mounted as a Docker volume), in a background
  thread; blocks on `process.waitFor()` and then calls back to the Execution Manager.
- `GET /runner/health`, `/runner/status`, `/runner/suites`, `POST /runner/cancel` all implemented.
- **No `/runner/pause` or `/runner/resume`** — these are referenced in the docs' API contract
  but don't exist in code. Only a single Maven process at a time per runner instance (no
  internal concurrency — that's the Execution Manager's job across multiple runner instances).

### 5.4 Report Artifact Service (`report-artifact-service/`) — port 9091

Also a standalone `com.sun.net.httpserver` process, read-only. Every endpoint in the design doc
is implemented: `/artifacts/list`, `/artifacts/{code}/report`, `/emailable`, `/xml`,
`/screenshots`, `/screenshots/{filename}`, `/logs/console`. Root directory resolved from
`ARTIFACTS_ROOT` env var (falls back to local dev paths). No stubs found.

### 5.5 Frontend (`frontend/`) — React SPA (JS/JSX, not TypeScript)

Structure: `components/{admin,auth,dashboard,environments,execution,layout,logs,profile,
reports,screenshots,shared}/`, plus root `App.jsx`, `api.js`, `constants.js`.

- Shared layout is real: a single `PortalLayout` (sidebar + topbar + content) is used
  everywhere, including inside the separate `AdminWorkspace` — the "layout inconsistency
  between Dashboard/Admin/Profile" bug called out in `docs/version1.1.0.md` appears to already
  be fixed in the current code.
- Role-based nav: normal users get an 8-item `USER_NAV`; `SUPER_ADMIN` additionally sees an
  "Administration" entry that opens a fully separate `AdminWorkspace` (9 sub-pages: Dashboard,
  Users, Environments, Config, Modules, Roles, Access, Docs, API Collection).
- `api.js` wraps ~50 backend endpoints across auth/profile/admin/dashboard/executions/reports/
  screenshots/compare — matches the backend surface closely.
- **No SSE/WebSocket consumption** anywhere (confirmed by grep) — see the note in §3. All data
  is fetched via REST, some of it in `Promise.all` batches.
- Remaining hardcoded/mock spots: Topbar's 3-item notification sample list (not wired to any
  backend — there is no notification system yet, matches the v1.3 "Notification Center" backlog
  item), `Dashboard.jsx`'s `standardModules` fallback table shape, `ExecutionCenter.jsx`'s
  `queueColumns` (structural, not data), and `ApiCollection.jsx` / `InternalDocs.jsx` which are
  intentionally static reference/documentation content, not business data.

### 5.6 MPHIDB — external automation framework (`D:\New folder\MPHIDB`)

This is the most important finding of this analysis: **the framework integration plan in
`docs/framworkv1.md` — which explicitly says "Do NOT start framework changes until the portal
v1.2.0 core is stable" — has already been substantially implemented**, via a parallel `-v2` set
of files that coexist with the untouched originals:

| Planned file | Status |
|---|---|
| `PortalApiClient.java` | **Done** — pushes all documented event types, fire-and-forget, reads config-v2.properties as fallback |
| `FrameworkRunnerService.java` | **Done** — replaces `ModuleRunnerServer.java` (kept as backup); active runner |
| `RetryAnalyzer.java` | **Done** |
| `ExtentReportManager.java` modifications | **Not modified** — instead, a parallel `ExtentReportManagerV2.java` was created with the Portal calls, leaving the original untouched |
| `Master_extent_report.java` modifications | Same pattern — `Master_extent_report_v2.java` created instead |
| `ScreenShotUtil.java` modification | `ScreenShotUtilV2.java` created instead |
| `config.properties` additions | `config-v2.properties` created instead, with `portal.url`, `portal.api.key`, `execution.id`, `tester.name`, `framework.version`, `environment.name` |
| `pom.xml` additions | `pom-v2.xml` created instead (points `exec-maven-plugin` at `FrameworkRunnerService`; original `pom.xml` still points at the old dummy runner) |
| New XML suites | `MPHIDB-v2.xml`, `land-v2.xml`, `Emp_Arch-v2.xml`, `test-v2.xml` alongside the originals |

In short: rather than editing the original files in place (which the doc's own "must not
change" rules technically forbade for the listener/report files, but allowed additive edits to
for config/pom), the actual approach taken was **full duplication into a `-v2` track**, which is
even more conservative than the plan asked for. The v1 files (`MPHIDB.xml`, `pom.xml`,
`ExtentReportManager.java`, `config.properties`) are fully preserved as a standalone/backward-
compatible mode. Framework Runner intentionally maps every run request to the `-v2` suite/pom
pair.

### 5.7 loveable.ai/automation-hub — design reference only

React 19 + TypeScript + TanStack Router/Start + shadcn/ui (Radix) + Tailwind 4 + Recharts. Has
its own login/admin/dashboard mockup with a `kpi-card.tsx` and `activity-timeline.tsx` worth
borrowing visual patterns from (gradient hover lines, semantic tone system, severity-coded
timeline). It is **not** connected to this project's backend and should not be treated as
shippable code — only as inspiration, per explicit prior instruction from the project owner.

---

## 6. Database Schema (MySQL, Flyway `V1`–`V7`)

| Table | Introduced | Purpose |
|---|---|---|
| `users`, `environments`, `modules`, `test_suites`, `executions`, `execution_test_cases`, `execution_artifacts` | V1 | Core foundation |
| `refresh_tokens`, `otp_verifications` + user profile columns | V2 | JWT/security foundation |
| SUPER_ADMIN role + seed | V3 | RBAC bootstrap |
| `execution_logs`, `audit_logs`, `portal_config`, `test_steps`, `tags`, `execution_test_case_tags` | V4 | Extended schema |
| `retries` col, `total_duration_ms`, `pass_percentage`, `fail_percentage` | V5 | Analytics depth |
| `machine_name`, `os_name`, `java_version`, `browser_name`, `browser_version`, `machine_ip` on `executions` | V6 | Execution Manager + system-info integration |
| `xml_file`, `report_path` on `modules` | V7 | Suite/module mapping |

Roles: `SUPER_ADMIN`, `ADMIN`, `QA_LEAD`, `AUTOMATION_ENGINEER`, `VIEWER`. No self-registration —
all accounts created by SUPER_ADMIN via Admin Dashboard. Default seed:
`superadmin@gmail.com` / `password`.

---

## 7. Version History Trail (chronological, from `docs/`)

1. **v1.0** (`architecture-v1.md`) — foundation: portal shell, Flyway schema, queue-only
   execution (no real Maven invocation yet), local-only deployment.
2. **v1.1.0** (`version1.1.0.md`, `version1.1cammand.md`, `version-1.1-security-foundation.md`)
   — real JWT+refresh auth, OTP flows, admin user management as a separate secured workspace,
   dashboard becomes DB-backed (not just placeholders). Layout-consistency bug called out and
   (per current code) fixed.
3. **`1.2CR.md`** — the architecture correction: rejects "batch parse reports after the fact,"
   mandates event-driven live execution instead. This is the design doc that produced the
   `docs/framworkv1.md` contract and the `events`/SSE backend package.
4. **`framworkv1.md`** — the full MPHIDB-side integration contract (event types, endpoints,
   system-properties contract). Now substantially implemented (§5.6).
5. **v1.1.1** (`version1.1.1.md`) — broader integration/DB design plan (execution worker,
   artifact storage layout, TestNG parser, dashboard/report/comparison APIs) — implemented.
6. **v1.1.3** (`version1.1.3.md`) — dashboard premium KPI cards, executable module analytics
   table, Swagger UI embedded in admin ("API Collection" page — matches
   `ApiCollection.jsx` found in frontend).
7. **v1.2.0** (`1.2CR.md`'s sibling `version1.2cammand.md`) — full audit + UI/UX consistency
   pass, dynamic-data mandate, table standards (pagination/search/sort/filter everywhere),
   report parser service, standardized per-execution artifact folder, plugin-style dashboard
   widgets.
8. **v1.3.0** (`version1.3cammand.md`, planned/deferred) — global search, failure analysis page,
   framework health dashboard, **real-time SSE streaming to the UI** (still the biggest gap —
   see §3/§5.5), notification center, advanced filtering, historical analytics, role/permission
   UI, execution scheduler, configuration management, execution queue rework.

**Read as a whole, the docs read like a live specification the project owner has been iterating**
**on with an AI assistant — later docs correct/refine earlier ones (`1.2CR.md` explicitly**
**overrides the batch-processing interpretation from `version1.1.1.md`). When in doubt about**
**intent, the most recent version doc wins over an older one.**

---

## 8. Known Gaps / Divergences (as of this analysis)

These are factual observations, not judgments — useful as a starting punch list whenever you're
ready to decide what to work on next:

1. **Frontend does not consume the SSE live-event stream** the backend already exposes
   (`/api/events/execution/{code}/stream`). This is the core "batch vs. live" architecture gap
   relative to the `1.2CR.md` vision.
2. **Execution Manager `pause`/`resume` are state-only** — no corresponding capability exists
   in the Framework Runner to actually pause a running Maven/TestNG process.
3. **`GET /api/logs` (LogController) is a dead stub** returning an empty list.
4. **Notification Center is entirely absent** — Topbar shows 3 hardcoded sample notifications;
   this matches the v1.3 backlog (not yet started), so it's an expected gap, not a bug.
5. **Global Search, Failure Analysis page, Framework Health dashboard, Role/Access Management
   UI, Execution Scheduler, Configuration Management UI** — all explicitly deferred to v1.3 per
   `version1.3cammand.md`; none are implemented yet.
6. **MPHIDB framework integration is further along than the docs assume.** `framworkv1.md`
   says not to start it until Portal v1.2.0 is stable, but the `-v2` track is already fully
   built. Worth confirming with the project owner whether this was intentional early work or
   needs to be reconciled with the current portal version.
7. **`loveable.ai/automation-hub` is unused as running code** — it's reference-only per explicit
   instruction; don't treat its presence as "half-migrated" work.

---

## 9. How to Use This Document

- Treat this as the **baseline mental model**. When you give new instructions, they add to or
  override specific sections here — they don't replace the whole architecture.
- This file is a snapshot from **2026-07-01**. Code moves faster than docs — if something here
  looks wrong when you next open the code, trust the code and update this file, don't argue with
  memory of this file.
- This document intentionally does not enumerate every one of the ~70+ backend REST endpoints or
  every React component prop — for that level of detail, read the actual controller/component,
  since restating it here would just drift out of date. It gives you the map; the code is the
  territory.
