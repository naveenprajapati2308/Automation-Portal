# Version 2.1 (Proposed) — Multi-Framework, Multi-Project Execution Architecture

> Status: **Not scheduled yet.** Saved here as a reference design for later — current priority
> stays on the single-project, single-framework (TestNG/MPHIDB) work. Revisit and add more
> suggestions here before actually building any of this.

## Context

The v1.4 integration work (Execution Center wired to admin-registered Modules, live event
pipeline, TestNG XML gap-fill parsing, etc.) proved the pipeline works end-to-end, but it also
exposed exactly how much of it is hardcoded to "one project, one framework (Maven+TestNG), one
runner instance":

- `FrameworkRunnerService.runMaven()` hardcodes the `mvn clean test -DsuiteXmlFile=...
  -Dusedefaultlisteners=true` command — there's no notion of "a different kind of runner."
- `ModuleEntity` has a `runnerType` column (added in v1.4), but nothing reads it yet — it's a
  seam, not a working switch.
- Execution Manager already has a `runner_registry` table + `RunnerRegistry`/`RunnerClient`/
  `QueueProcessor` — real multi-runner *infrastructure* exists — but `QueueProcessor.selectRunner()`
  just returns "the first IDLE runner, or the single default" (`execution-manager/.../QueueProcessor.java`).
  There's no concept of "which runner can handle this job's project/framework."
- `ExecutionJob` and `RunnerRegistry` have no `projectId`/`runnerType` columns to route on.
- `ModuleEntity`, `Execution`, `environments` all implicitly belong to "the one project" — there's
  no `Project` entity at all yet.
- The event contract (`POST /api/events/execution` with SUITE_STARTED/TEST_STARTED/.../
  SUITE_COMPLETED, consumed by `ExecutionEventService`) is already framework-agnostic — MPHIDB's
  `PortalApiClient.java` is just one implementation of it for Java/TestNG. This is the reusable
  part.

So the three future scenarios map to three different amounts of new work:

## Scenario 1 — More TestNG modules in MPHIDB (already solved, no new work)

Admin opens Module Management → Add Module → fills Name/Code/Suite XML/Report Path/Runner Type
(defaults to `MAVEN_TESTNG`) → it appears in Execution Center immediately. Nothing to build.

## Scenario 2 — A different framework (Playwright/Python/.NET), same project

Needs two things, both scoped and moderate:

### 2a. A written "Framework Integration Contract" (documentation, not code)
Formalize what `PortalApiClient.java` does today into a language-agnostic spec:
`POST {portalUrl}/api/events/execution` with header `X-API-Key`, JSON body
`{executionId, eventType, timestamp, data}`, event types SUITE_STARTED → TEST_STARTED →
TEST_PASSED/FAILED/SKIPPED → SCREENSHOT_CAPTURED/LOG_ENTRY → SUITE_COMPLETED, with the exact field
names `ExecutionEventService.processEvent()` reads for each type. Any new framework needs a thin
adapter that speaks this contract — a Playwright custom `Reporter`, a pytest `conftest.py` plugin
using `pytest_runtest_logreport`, or a .NET test listener. This is a one-time write-up
(`docs/framework-integration-contract.md`) that makes onboarding a new framework a documentation
exercise, not a Portal code change, for the *live event* half of the pipeline.

### 2b. Generalize the Framework Runner's command execution
Replace the hardcoded Maven command in `FrameworkRunnerService.runMaven()` with a
**runnerType → command template** lookup:
- `MAVEN_TESTNG`: `mvn clean test -DsuiteXmlFile={suite} -DexecutionId={executionId} -DportalUrl={portalUrl} -DportalApiKey={apiKey} -Dusedefaultlisteners=true`
- `PLAYWRIGHT_JS`: `npx playwright test {suite} --reporter=list` (+ env vars for executionId/portalUrl/apiKey)
- `PYTHON_PYTEST`: `pytest {suite} --portal-url={portalUrl} --portal-api-key={apiKey} --execution-id={executionId}`
- `DOTNET_NUNIT`: `dotnet test {suite} ...`

Concretely: `/runner/run`'s request body gains a `runnerType` field (`ExecutionManagerController`
→ `RunnerClient.triggerRun()` → passes it through); `FrameworkRunnerService` keeps a small
`Map<String, String>` of command templates (env-var configurable, so new types can be added
without a rebuild) and does placeholder substitution instead of the current fixed `command.add(...)`
sequence. The result-file "gap-fill" parser (`TestNGXmlParser`) stays TestNG-only for now — a new
parser (e.g. `PlaywrightJsonParser`) implementing the same `List<ExecutionTestCase> parse(...)`
shape gets added only when/if a second framework is actually onboarded; the live-event path
already carries the primary data, so a missing native parser is "less enrichment," not "broken."

**This is enough for one project that mixes frameworks on one host** (e.g. MPHIDB stays
Maven+TestNG, a new internal tool gets a Playwright suite, same machine/Runner has both Maven and
Node available). It is not yet true multi-project isolation — see Scenario 3.

## Scenario 3 — Multiple projects, each with its own framework (the real future-scope item)

This is what `docs/version1.4.md` already calls out as future scope, and it's the natural next
foundation once there's actually a second project to onboard. Needs:

### New `Project` entity
`projects` table: `id, code, name, description, active`. New Flyway migration, new
`ProjectEntity`/`ProjectRepository`/`ProjectController` + `ProjectAdminController`, mirroring the
existing `modules` package structure exactly.

### Thread `project_id` through the entities that are currently implicitly single-project
- `modules.project_id` FK — every module belongs to one project.
- `environments.project_id` FK — Project A's "QA" and Project B's "QA" are different base URLs.
- `executions.project_id` (denormalized, for fast filtering) or derive via module → project.
- `execution_manager`'s `execution_jobs.project_id` + `runner_registry.project_id` (or a
  `supported_project_codes` list, since one Runner instance could in principle serve more than one
  project if they share a toolchain) — this is what lets `QueueProcessor.selectRunner()` actually
  filter ("give me an IDLE runner that serves project X and runnerType Y") instead of blindly
  grabbing the first IDLE one or a single hardcoded default.

### One Framework Runner deployment per project (operationally)
Because `FrameworkRunnerService.frameworkPath` is a single static working directory per runner
process, you can't safely have one Runner juggle two unrelated checked-out repos (path collisions,
conflicting toolchains, concurrent Maven+npm in the same directory). The right model: **each
project gets its own Framework Runner instance/container**, pointed at that project's checkout via
its own `FRAMEWORK_PATH`/`runnerType` env vars, and it registers itself into the already-existing
`runner_registry` table (extended with `project_id`/`runner_type` columns) — either by a manual
admin action or via a heartbeat/self-registration call to `POST /em/runners/register` (endpoint
already exists, just needs the new fields). The Execution Manager then dispatches each job to a
runner that actually matches its project, instead of every job racing for "the one runner."

### Per-project concurrency
Today `EM_MAX_CONCURRENT` is one global counter. A long Selenium run on Project A shouldn't starve
Project B's short Playwright smoke run. `QueueProcessor` should track running-job counts per
project (or per runner) rather than one global number.

### Super Admin's new/extended screens
This directly answers "what does the admin configure/see for a new project+framework":

1. **Projects** (new admin page) — list/add/edit/deactivate. Fields: Code, Name, Description,
   Active. This becomes the top-level thing everything else hangs off.
2. **Runners** (new admin page, surfaces the already-existing `runner_registry` table) — list of
   registered Framework Runner instances: name, URL, status (IDLE/BUSY/OFFLINE), last heartbeat,
   which Project + Runner Type it serves. Super Admin registers a new Runner here after ops stands
   up the container (or it self-registers and just needs to be *assigned* a project here).
3. **Environments** (existing page, extend) — add a Project selector; environments become scoped
   per project instead of global.
4. **Modules** (existing page, extend) — add a required Project selector at the top of the form; the
   Runner Type dropdown (already added in v1.4) now actually matters since it picks the command
   template. Suite/report path fields stay as-is (their meaning — "what to hand the runner" —
   already generalizes fine across frameworks).
5. **Execution Center** (user-facing, extend) — a Project selector at the top, above the existing
   Module dropdown; selecting a project filters the module list to that project's modules only.
   For a single-project deployment (today's state) this selector can default to the one project
   and stay hidden/collapsed, so nothing changes visually until a second project actually exists.

### RBAC seam (not building now, just noting the shape)
`docs/version1.4.md` already lists "project-wise access, role-based access control" as future
scope. Once `Project` exists as a first-class entity, that future work becomes a straightforward
`user_project_roles(user_id, project_id, role)` join table — Scenario 3 is the prerequisite
foundation for that, not a detour from it.

## Suggested sequencing (when this is actually picked up)

1. Write `docs/framework-integration-contract.md` (Scenario 2a) — cheap, unblocks anyone building
   a new framework adapter immediately, no Portal code change.
2. Generalize `FrameworkRunnerService` to runnerType→command-template dispatch (Scenario 2b) —
   moderate, makes "a second framework on the same project" real.
3. Only when a second *project* actually needs onboarding: build the `Project` entity + thread
   `project_id` through modules/environments/jobs/runners + the two new admin screens + Execution
   Center's project selector (Scenario 3). Doing this before there's a real second project to
   validate against risks guessing wrong about what fields/filters are actually needed.

## Open items to add more suggestions to before building

- [ ] Should `ModuleEntity.xmlFile` be renamed to something framework-neutral (e.g.
      `suite_reference`) once a second runner type is real, or is reusing the existing column fine?
- [ ] Should per-project concurrency limits be admin-configurable per project, or a single new
      global default that applies per-project?
- [ ] Does a Runner instance ever need to serve more than one project (shared toolchain), or is
      "one Runner = one project" a safe simplifying assumption to start with?
- [ ] Where does the Playwright/pytest/.NET adapter code itself live — a template repo the Portal
      team publishes, or written fresh per project?
