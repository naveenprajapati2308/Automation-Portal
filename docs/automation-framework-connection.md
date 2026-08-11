# How a New Workspace Connects Its Automation Framework

> Written 2026-08-08 in response to a direct question: when a new workspace is approved, API
> Testing and Performance Testing "just work" — but what actually needs to happen for the
> Automation module to work, and what should a new workspace's "Framework" tab tell people?
> This file is the answer, and the in-app tab (`platform/shell/src/components/team/
> WorkspaceSettings.jsx` → "Framework Connection" panel) is a shorter, UI-facing summary of it.

---

## 1. Why Automation is different from API Testing / Performance Testing

When a new workspace is approved (`WorkspaceProvisioningService.approve()`), every requested
module — `API_TESTING`, `PERFORMANCE_TESTING`, `AUTOMATION_SELENIUM`, `AUTOMATION_PLAYWRIGHT` —
gets the *same* treatment: one `project_modules` row with `enabled = true`. Nothing else is
provisioned automatically for any of them. That's enough for API Testing and Performance Testing
because **all of their business data is created inside Testrix itself**:

- A project's collections, requests, environments, schedules (API Testing) and load-test plans,
  environments (Performance Testing) are just database rows scoped by `project_id` — the Project
  Admin creates them by clicking around the product's own UI. No external system, no file to
  connect, no credential handoff. "Data entry" *is* the onboarding.

Automation is fundamentally different: the thing that actually runs — Selenium/TestNG test code,
or a Playwright test suite — is **an external codebase**, not data inside Testrix. Enabling the
`AUTOMATION_SELENIUM` toggle for a workspace does not create anything for that workspace to run;
it only makes the *product* visible. The actual test code has to exist somewhere on disk that the
Framework Runner container can see, and today there is nowhere for a second workspace's code to
go — see §3.

---

## 2. The execution pipeline as it works today (one shared framework per engine)

```
React (Execution Center)
  │  POST /api/executions/run
  ▼
Portal Backend (ExecutionController / ExecutionWorker)
  │  ExecutionWorker.pollQueue() picks up QUEUED rows every 5s
  │  POST {EM_URL}/em/executions   { jobId, executionId, suiteXml, framework, browser, envConfigJson, ... }
  ▼
Execution Manager  (QueueProcessor, its OWN config: portal-backend-url + portal-api-key)
  │  enforces EM_MAX_CONCURRENT, injects the platform's callback URL + API key
  │  POST {runnerUrl}/runner/run   { executionId, suiteXml, portalUrl, apiKey, framework, browser, envConfig }
  ▼
Framework Runner (framework-runner/…/FrameworkRunnerService.java — plain Java HTTP server, :9090)
  │  framework == "PLAYWRIGHT"?  → runPlaywright()  : → runMaven()
  ▼
runMaven():  mvn clean test -DsuiteXmlFile=... -DexecutionId=... -DportalUrl=... \
             -DportalApiKey=... -Dusedefaultlisteners=true  [+ envConfig as -D flags]
             (cwd = frameworkPath, i.e. the Selenium/TestNG checkout)
runPlaywright(): npx playwright test <spec> --project=<browser> [--grep <tag>]
             env: PORTAL_URL, EXECUTION_ID, PORTAL_API_KEY, PORTAL_REQUESTED_BROWSER [+ envConfig]
             (cwd = playwrightFrameworkPath, i.e. the Playwright checkout)
  ▼
The external framework's own listener/reporter fires lifecycle events as the run progresses:
  POST {portalUrl}/api/events/execution     header: X-API-Key: <apiKey>
  body: { executionId, eventType, timestamp, data: {...} }
  eventType ∈ SUITE_STARTED | MODULE_STARTED | TEST_STARTED | TEST_PASSED | TEST_FAILED |
              TEST_SKIPPED | SCREENSHOT_CAPTURED | VIDEO_CAPTURED | LOG_ENTRY |
              MODULE_COMPLETED | SUITE_COMPLETED | EXECUTION_STARTING/PAUSED/RESUMED
  ▼
Portal Backend (ExecutionEventController → ExecutionEventService) persists + broadcasts over SSE
  GET /api/events/execution/{code}/stream  →  Execution Center's live monitor panel
  ▼
On SUITE_COMPLETED: Framework Runner → POST {EM_URL}/em/executions/{id}/completed → slot freed
```

**Where the actual test code lives** — two Docker bind mounts, defined once in
`products/automation-portal/docker-compose.yml`:

| Engine | Container path | Host path (env override) |
|---|---|---|
| Selenium/TestNG | `/app/framework` | `AUTOMATION_FRAMEWORK_REPO_PATH` (default `D:/New folder/MPHIDB`) |
| Playwright | `/app/playwright-framework` | `AUTOMATION_PLAYWRIGHT_PATH` (default `D:/playwright-js`) |

**Files the framework side must implement** (the "contract" any test codebase has to speak to
integrate with Testrix — confirmed from what the runner actually passes/expects, not guessed):

- Read `-DsuiteXmlFile` / `-DexecutionId` / `-DportalUrl` / `-DportalApiKey` (Maven/TestNG) or
  `PORTAL_URL` / `EXECUTION_ID` / `PORTAL_API_KEY` / `PORTAL_REQUESTED_BROWSER` env vars
  (Playwright) at process start.
- Push every lifecycle event listed above to `POST {portalUrl}/api/events/execution` with header
  `X-API-Key: {apiKey}`, fire-and-forget (must never block/fail the test run if Testrix is
  unreachable).
- For Maven/TestNG specifically: `-Dusedefaultlisteners=true` must stay on, or Surefire silently
  disables TestNG's native `test-output/testng-results.xml` writer that `TestNGXmlParser`
  depends on for the post-run gap-fill merge.
- Any environment-specific value (base URLs, credentials, captcha keys, …) arrives as extra `-D`
  flags / uppercase env vars from the Environment the run was launched against — read via the
  framework's own config layer (e.g. a `ConfigUtils`-style lookup that prefers a system property
  over its checked-in properties file). Reserved keys the framework must NOT reuse for its own
  config (the runner already owns them): `suitexmlfile, executionid, portalurl, openreport,
  usedefaultlisteners, portalapikey`.
- On the existing Selenium reference implementation (MPHIDB, a separate repo), this contract is
  implemented by `PortalApiClient.java` (event pusher), `ExtentReportManagerV2.java` /
  `Master_extent_report_v2.java` (TestNG listeners that call it), and `config-v2.properties`. The
  Playwright reference implementation is `tests/reporter/testrix-reporter.ts` (per
  `FrameworkRunnerService.java`'s own comments).

---

## 3. The actual gap: one shared framework connection for the whole platform

Even though `modules.project_id` exists in the schema (Phase 3 isolation — a Selenium module row
*is* tied to a specific project), the **physical code backing every project's Selenium module is
the exact same `D:/New folder/MPHIDB` checkout**, and every project's Playwright module is the
exact same `D:/playwright-js` checkout. There is only one bind mount per engine, set once in
`docker-compose.yml`, not one per project.

The credential side has the identical shape: `PORTAL_EVENTS_API_KEY` (backend) /
`EM_PORTAL_API_KEY` (execution manager) is **one shared secret for the entire platform** —
`ExecutionEventController.isValidApiKey()` checks "does this match the one constant," never "which
project does this key belong to." Any framework anywhere that knows the key can post events
against any execution code.

**Practical consequence for a second real workspace today:** their Selenium/Playwright test code
has nowhere isolated to go. The only way to onboard it today is to add their test suites as new
XML suites / spec folders *inside the same shared MPHIDB / playwright-js checkout* — workable for
a single organization, but not real multi-tenant isolation once a second, unrelated client
workspace needs to bring their own codebase (this was flagged independently in
`docs/production-readiness-audit-2026-08-03.md` as the Windows-`D:`-drive hardcoding finding).

---

## 4. Target design: per-project framework connections

This was discussed but never built (project memory:
`project_multiworkspace_framework_integration_design_2026-08-05`). Restated here as the concrete
design a "Framework" tab should point people toward:

1. **New `project_integrations` table**: `project_id, framework_type, repo_location,
   api_key_hash, created_at, revoked_at`. The API key itself becomes the differentiator — a
   callback's key resolves directly to its project, no shared-secret ambiguity.
2. **Key issuance at framework-registration time** (an extension of today's admin-only Manage
   Modules screen): generate the key once, show it once, hand it to the Project Admin as a small
   config file (e.g. `testrix-client.properties`: `apiKey`, `projectId`, `callbackUrl`) to drop
   into their framework repo. A one-time per-workspace step, not a per-run one.
3. **Replace the static bind mount with a per-project git clone/pull** into
   `/app/workspaces/{projectId}/` immediately before each run, using a repo URL + deploy
   credential stored in the same table. This is what actually lets unlimited workspaces' different
   codebases coexist on one Framework Runner — a static Docker bind mount fundamentally cannot.
4. **Execution Manager injects the triggering project's key + callback URL** into the
   Maven/Playwright process automatically at run time (it already injects *a* key/URL today —
   `QueueProcessor` → `RunnerClient.triggerRun()` — this is a lookup-by-project change, not a new
   mechanism), so `PortalApiClient`/`testrix-reporter.ts` need zero changes to pick it up.
5. **Migration safety**: keep today's single global key working as "project #1's key" so the
   current live pilot workspace doesn't break during rollout.

### What a new workspace should be told today (interim, until the above is built)

Until per-project connections exist, onboarding a new workspace's Automation code is a manual,
platform-admin-mediated step:

1. Project Admin requests Automation for their workspace (already possible — the module toggle).
2. Platform admin adds the workspace's test suites/specs into the shared MPHIDB (Selenium) or
   playwright-js (Playwright) checkout, and registers them as `Module` rows scoped to that
   `project_id` via Manage Modules.
3. The workspace's runs use the platform's single shared callback URL + API key (same one every
   other workspace uses) — there is no per-workspace secret to hand out yet.
4. This is safe only because, today, all onboarded workspaces are trusted/internal. It does **not**
   scale to an external client bringing their own codebase without further engineering (§4).

---

## 5. Implementation roadmap (if/when this gets picked up)

| Phase | Scope |
|---|---|
| 1 | `project_integrations` table + `EntityIdGeneratorService`-style key generation, surfaced read-only in Manage Modules |
| 2 | `ExecutionEventController`/EM lookup switched from one static key to a key→project resolution; existing global key kept working as project #1's key |
| 3 | Per-project git clone/pull replacing the static bind mount in Framework Runner, with repo URL + deploy credential per project |
| 4 | Project Admin self-service: generate/rotate their own key + download `testrix-client.properties` from Workspace Settings, no platform-admin step required |

Nothing above is built. This document and the in-app "Framework Connection" panel
(§6) exist to explain *today's* real behavior and *where* the design for closing this gap already
lives, not to claim it's done.

---

## 6. What the in-app "Framework Connection" tab shows

Added to `platform/shell/src/components/team/WorkspaceSettings.jsx`, visible whenever a workspace
has `AUTOMATION_SELENIUM` or `AUTOMATION_PLAYWRIGHT` enabled: a short, non-technical version of
§1–§3 above (how the connection works, what files the framework side needs, and the current
"shared platform connection, not yet per-workspace" limitation) so a Project Admin doesn't have to
find this doc to understand why there's no "generate my API key" button yet.
