# Automation Portal — Project Context (Master Reference)

> Purpose of this file: a single, factual, code-verified snapshot of what this project actually
> is and actually does, as of **2026-07-02**. It exists so that future conversations don't need
> to re-derive architecture from scratch — paste/reference this file for context, then layer new
> instructions on top of it. This document was built by reading every doc in `docs/` AND by
> directly inspecting the source of every service, so it reconciles "what was planned" with
> "what is actually built."
>
> **2026-07-02 update:** the original 2026-07-01 analysis below assumed several pipeline pieces
> were "real, not stubbed" based on reading the code alone. A follow-up session actually ran the
> full stack (MySQL + Backend + Execution Manager + Framework Runner) end-to-end against the real
> MPHIDB suite eight times in a row, fixing what broke each time, and found that the execution
> pipeline was in fact **completely dead** end-to-end due to one missing annotation, plus five
> more real bugs only a live run could surface. See §9 for the full account — read it before
> trusting any "this works" claim elsewhere in this file about the execution pipeline, since parts
> of §3/§5 below are now superseded by §9.

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

Core pipeline classes (status as verified by real E2E runs on 2026-07-02, see §9):
- `ExecutionWorker` — polls the queue every 5s, submits to Execution Manager, copies artifacts,
  and now also invokes `TestNGXmlParser` as a gap-fill merge (see §9). **Was completely inert
  until 2026-07-02** — `@EnableScheduling` was missing from `AutomationPortalApplication`, so its
  `@Scheduled` poll loop never ran and every execution sat at `QUEUED` forever. Now fixed.
- `TestNGXmlParser` — parses `testng-results.xml` into test cases/steps/tags/retries/screenshots.
  Was written correctly but **never called from anywhere** until 2026-07-02 (dead code) — now
  wired into `ExecutionWorker.copyExecutionArtifacts()` via a new `mergeTestNgXmlResults()` method.
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
- `POST /runner/run` builds and runs `mvn clean test -DsuiteXmlFile=... -DexecutionId=...
  -DportalUrl=... -DopenReport=false -Dusedefaultlisteners=true` against the MPHIDB checkout
  (mounted as a Docker volume), in a background thread; blocks on `process.waitFor()` and then
  calls back to the Execution Manager. `clean` and an explicit `deleteStaleTestOutput()` call
  (wipes `<frameworkPath>/test-output`, which lives outside Maven's `target/` so `clean` alone
  doesn't touch it) were added 2026-07-02 after a real run showed a previous suite's results
  bleeding into the next one. `-Dusedefaultlisteners=true` was also added that day — without it,
  Surefire's TestNG provider silently disables TestNG's own native XMLReporter and only its own
  JUnit-schema report gets written, which `TestNGXmlParser` can't read (see §9).
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
  is fetched via REST, some of it in `Promise.all` batches. **Correction as of 2026-07-02:**
  `ExecutionCenter.jsx` *does* consume SSE (`EventSource` on `/api/events/execution/{code}/
  stream`) for its live monitor panel — this was already true before the 2026-07-01 analysis, that
  analysis statement was inaccurate. What's still missing is SSE consumption *outside* Execution
  Center (e.g. Dashboard doesn't live-update).
- Remaining hardcoded/mock spots: Topbar's 3-item notification sample list (not wired to any
  backend — there is no notification system yet, matches the v1.3 "Notification Center" backlog
  item), `Dashboard.jsx`'s `standardModules` fallback table shape, `ExecutionCenter.jsx`'s
  `queueColumns` (structural, not data), and `ApiCollection.jsx` / `InternalDocs.jsx` which are
  intentionally static reference/documentation content, not business data.
- **2026-07-02 fixes** (see §9 for full detail): `ExecutionCenter.jsx`'s primary run picker was
  populated by scanning raw `.xml` files in the MPHIDB folder (`/runner/suites`), completely
  bypassing admin-registered Modules — fixed to use the `modules` prop (active modules only) as
  the primary picker, with the raw XML scan demoted to a collapsed "Advanced" option. The
  Pause/Resume button (cosmetic — no real pause capability anywhere in the stack) was removed;
  Cancel (real) stays. `LogsViewer.jsx`'s `TestLogDrawer` now shows `failureReason`/
  `exceptionType`/`stackTrace`/`screenshotPath` inline for failed tests, not just TestNG steps.
  The live progress bar had a real bug — `totalTests` was being incremented on every completed
  test instead of held at the expected count, so progress always read ~100%; fixed to seed from
  `SUITE_STARTED`'s `totalExpectedTests` and hold steady.

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
| `runner_type` on `modules` (default `MAVEN_TESTNG`) | V8 | Seam for future non-Maven/TestNG frameworks — not yet read by any dispatch logic, see §9/`docs/version2.1.md` |

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
   framework health dashboard, **real-time SSE streaming to the UI** (partially done — see the
   §5.5 correction; Execution Center has it, other pages don't), notification center, advanced
   filtering, historical analytics, role/permission UI, execution scheduler, configuration
   management, execution queue rework.
9. **v1.4** (`docs/version1.4.md`, content-identical duplicate of `docs/version1.1.3.md` which was
   already overwritten with v1.4 content but never renamed) — multi-project/multi-user/RBAC future
   scope, Execution Center integration completion. The integration-completion half was
   substantially executed on 2026-07-02 — see §9. The multi-project/RBAC half is still future
   scope, with an architecture design for it saved separately at `docs/version2.1.md` (not
   implemented, explicitly deferred until a real second project exists to build against).

**Read as a whole, the docs read like a live specification the project owner has been iterating**
**on with an AI assistant — later docs correct/refine earlier ones (`1.2CR.md` explicitly**
**overrides the batch-processing interpretation from `version1.1.1.md`). When in doubt about**
**intent, the most recent version doc wins over an older one.**

---

## 8. Known Gaps / Divergences (as of this analysis)

These are factual observations, not judgments — useful as a starting punch list whenever you're
ready to decide what to work on next:

1. ~~Frontend does not consume the SSE live-event stream~~ — **inaccurate as written**; see §5.5
   correction. `ExecutionCenter.jsx` does consume it. Other pages (Dashboard) still don't.
2. **Execution Manager `pause`/`resume` are state-only** — no corresponding capability exists
   in the Framework Runner to actually pause a running Maven/TestNG process. As of 2026-07-02 the
   Pause/Resume button was removed from `ExecutionCenter.jsx` (was presenting a capability that
   didn't exist); the backend stub endpoints were left alone as harmless dead code.
3. **`GET /api/logs` (LogController) is a dead stub** returning an empty list. Still true —
   `LogsViewer.jsx` gets its data from `/api/executions/{id}/test-cases` and
   `/api/test-cases/{id}/steps` instead, so this endpoint appears genuinely unused. Not touched.
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
8. **The execution pipeline was completely non-functional until 2026-07-02** (missing
   `@EnableScheduling`) — everything in §3's workflow description above was aspirational/
   as-designed, not as-verified, until that day. See §9 for the corrected, live-run-verified
   account.
9. **Framework Runner is still hardcoded to Maven/TestNG** — `ModuleEntity.runnerType` (V8) is a
   seam, not a working dispatch switch. No other framework type is actually runnable yet. Design
   for closing this gap (and for true multi-project support) is saved at `docs/version2.1.md`,
   explicitly not implemented.
10. **No per-project concurrency, no `Project` entity, no multi-runner routing by capability** —
    `QueueProcessor.selectRunner()` in `execution-manager/` just grabs the first IDLE runner or a
    single hardcoded default; `runner_registry` has no `project_id`/`runner_type` columns yet.
    Fine for the current one-project-one-framework deployment; would need the `docs/version2.1.md`
    work before a second project or framework could be safely onboarded.

---

## 9. Session Update — 2026-07-02: Execution Center Integration Completion (Real, Verified)

The user's ask was specific: make clicking "Run" actually go execution server → framework →
real file execution → real data, "not just status, every single thing you can get, into the
dashboard." That required going past code-reading into actually standing up the full stack
(throwaway MySQL container + Backend + Execution Manager + Framework Runner, all run natively,
not via docker-compose) and triggering real `MODULE`-type executions against the real MPHIDB
Land suite, iterating until the whole chain — including data correctness, not just "it ran" —
held up. Eight real runs, six real bugs found and fixed:

1. **`@EnableScheduling` was missing** from `AutomationPortalApplication` (`backend/src/main/
   java/com/automationportal/AutomationPortalApplication.java`). `ExecutionWorker.pollQueue()`
   (`@Scheduled(fixedDelay=5000)`) never ran — every execution sat at `QUEUED` forever. This alone
   meant the entire pipeline described in §3 was dead in practice, regardless of how correct the
   rest of the code was. (Execution Manager's own `QueueProcessor` already had
   `@EnableScheduling` on `ExecutionManagerApp` — only the main Portal Backend was missing it.)
2. **`testng-results.xml` path was wrong, and the file wasn't even being generated.**
   `application.yml`'s `portal.automation.result-files.testng-results` pointed at
   `test-output/testng-results.xml` — correct for a bare `java org.testng.TestNG` invocation, but
   this project's actual runner does `mvn test`, which routes through Surefire's TestNG provider.
   That provider (a) writes its own JUnit-schema report to `target/surefire-reports/`, not
   TestNG's native schema `TestNGXmlParser` expects, and (b) **disables TestNG's own default
   listeners (including its native XMLReporter) unless `-Dusedefaultlisteners=true` is passed** —
   so the file `TestNGXmlParser` needed didn't exist anywhere on disk at all until that flag was
   added. Fixed both: added the system property in `FrameworkRunnerService.runMaven()`, and
   corrected all four `result-files` paths in `application.yml` to `target/surefire-reports/...`.
3. **Stale `test-output/` contamination across runs.** That directory lives outside Maven's
   `target/`, so `mvn clean` never touches it; a previous unrelated suite's leftover
   `testng-results.xml` was bleeding into the current run's parsed data (confirmed: an "Architect
   Empanelment Tests" block showed up in a Land-only run's results). Fixed by explicitly deleting
   `<frameworkPath>/test-output` before every run (`FrameworkRunnerService.deleteStaleTestOutput()`).
4. **Duplicate `ExecutionTestCase` rows from a real race condition.** MPHIDB's `PortalApiClient`
   pushes lifecycle events fire-and-forget; a `TEST_STARTED` and its matching
   `TEST_PASSED/FAILED/SKIPPED` could land on two Tomcat threads close together, both querying
   "does a row exist for this test" before either's insert had committed. A `synchronized` block
   added *inside* `ExecutionEventService.processEvent()` (a `@Transactional` method) didn't fix
   it — Spring's transaction commits only when the method *returns to its caller*, which is after
   an in-method `synchronized` block has already released. Fix: moved the per-execution lock to
   `ExecutionEventController.receiveEvent()`, wrapping the whole call to
   `eventService.processEvent(payload)`, so the lock is held across the full commit.
5. **Execution-level totals were computed before the XML merge could correct them.**
   `ExecutionEventService.finalizeExecution()` tallied `totalTests`/`passedTests`/etc. from
   whatever the live event stream had captured, *then* called `executionWorker.
   copyExecutionArtifacts()` (which runs the `TestNGXmlParser` gap-fill merge and can flip a
   test case stuck on `RUNNING` — e.g. one whose terminal event never arrived — over to its real
   final `SKIP`/`FAIL` status). The execution-level summary never picked up that correction.
   Fixed by extracting the tally logic into `recomputeExecutionTotals()` and calling it twice:
   once immediately (fast UI feedback) and once again after the artifact/merge step.
6. **A separate timing race**: MPHIDB's listener pushes `SUITE_COMPLETED` from its
   `afterSuite`/`onFinish` hook, which fires *before* TestNG's native XMLReporter (enabled by fix
   #2) finishes writing `testng-results.xml` — that reporter runs as one of the very last steps of
   TestNG's own shutdown sequence, after all test listeners' hooks. `copyExecutionArtifacts()` was
   copying immediately on receiving that event and sometimes finding nothing yet. Fixed with a
   short bounded wait (`ExecutionWorker.waitForFile()`, up to 5s, polling every 500ms) for the
   source file before copying.

Also fixed as smaller, concrete gaps (not "bugs" exactly, but real inaccuracies):
- `execution.triggeredBy` was hardcoded to `1L` ("Default admin user") on every run regardless of
  who actually clicked Run. `ExecutionController` now resolves the real user via the existing
  `AuthenticatedUserService` and threads it through `ExecutionService.queue()/rerun()/
  rerunFailed()`.
- `SUITE_STARTED`'s payload field names didn't match what `ExecutionEventService` read:
  MPHIDB sends `hostname`, the backend was reading `machineName` (so `machineName` was always
  null); `javaVersion` was sent but never read at all. Both fixed. Also added: seed
  `execution.totalTests` from the payload's `totalExpectedTests` immediately on `SUITE_STARTED`,
  so the live progress bar has a real denominator from the start instead of reading "0/0" or (per
  the separate frontend bug fixed alongside this) a meaningless always-100%.

**Final verified run** (execution `AUTO-20260702123831`, Land module, real Selenium session
against the actual `godavari.mp.gov.in` QA target — confirmed reachable from a native Windows
Chrome process even though this sandbox's own `curl` could not reach it directly): `totalTests:
10, failedTests: 5, skippedTests: 5, passedTests: 0` — exactly matching Maven's own `Tests run:
10, Failures: 5, Skipped: 5` output. Every `ExecutionTestCase` row had correct status, duration,
exception type/message/stack trace (for failures), and screenshot path; `test_steps` and
`execution_test_case_tags` (both previously always-empty — `TestNGXmlParser` was dead code, see
point 1 in §5.1's correction above) were populated correctly; `/api/dashboard/summary` reflected
the same numbers. Test failures themselves were genuine Selenium/app issues (an expected UI
element wasn't found on the QA site) — unrelated to any Portal code, proof the pipeline correctly
captures real failure data, not just happy-path passes.

Frontend changes made alongside this (detailed in §5.5): Execution Center's run picker now uses
admin-registered Modules as primary (raw XML file scan demoted to a collapsed "Advanced" option);
Test Logs drawer shows exception/stack trace/screenshot inline for failed tests; the fake
Pause/Resume button was removed; `ModuleEntity` gained a `runnerType` column (V8 migration,
default `MAVEN_TESTNG`) as a not-yet-wired seam for future framework types.

All throwaway test infrastructure (Docker MySQL container, generated `backend/artifacts/`, test
executions in the DB) was torn down/cleaned after verification — `git status` reflects only real
source changes.

**Future scope, explicitly not built this session:** true multi-framework (Playwright/pytest/
.NET) and multi-project support. A full architecture design for that — `Project` entity, per-
project Runner routing via the already-existing but currently-unused `runner_registry` table,
new Admin screens (Projects, Runners), Execution Center project selector — is saved at
`docs/version2.1.md`, deliberately deferred until a real second project/framework needs
onboarding.

## 10. How to Use This Document

- Treat this as the **baseline mental model**. When you give new instructions, they add to or
  override specific sections here — they don't replace the whole architecture.
- This file is a snapshot from **2026-07-02**. Code moves faster than docs — if something here
  looks wrong when you next open the code, trust the code and update this file, don't argue with
  memory of this file. Note that §1–§9 were written from a code-reading-only pass on 2026-07-01
  and contain some claims later corrected by the live-run verification in §9 — where they
  conflict, §9 is the more trustworthy, ground-truth-tested account.
- This document intentionally does not enumerate every one of the ~70+ backend REST endpoints or
  every React component prop — for that level of detail, read the actual controller/component,
  since restating it here would just drift out of date. It gives you the map; the code is the
  territory.
