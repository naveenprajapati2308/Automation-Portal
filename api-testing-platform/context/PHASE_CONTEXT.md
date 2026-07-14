# Phase Context — Master-Spec v2 Implementation Tracker

Tracks `api-testing-platform-master-spec.md` (the v2 redesign, which superseded
the original 18-phase brief on 2026-07-13). Statuses: ✅ DONE · 🟡 PARTIAL · ⬜ PENDING.

Companion files: [API_CONTEXT.md](API_CONTEXT.md) (what exists, how to run) ·
[PLAN_CONTEXT.md](PLAN_CONTEXT.md) (what's next).

## Read this first — quick-scan summary (2026-07-13, end of session)

Everything below this point is a **chronological evidence log** (every phase
and every bug fix, with what was tested and how). For a fast catch-up instead
of reading all of it, here's the TL;DR:

- Master-spec v2 (automation side: modules/base-regular APIs/chaining/
  scheduler/validation/dashboard) — **fully done**, load-tested, unchanged
  since it was built.
- Tester/Collections side went through **four follow-up correction rounds**
  in one session: (1) Part-1 gap-fill [per-request history, import/export,
  cookies], (2) navigation model rebuilt to a Postman-style drill-down after
  user said the flat-page version was wrong, (3) import/export bugs fixed
  [variables were the real "import broken" cause] + collection variables
  added, (4) folders + environments added on top. Read those sections below
  in order if you need the "why" behind any current file.
- **Last thing fixed**: Send was silently executing a stale saved config
  instead of the on-screen form for already-saved requests. Fixed and
  verified. No known open bugs as of this write-up.
- Nothing is mid-implementation. Next work items are a fresh start — see
  PLAN_CONTEXT.md's "Next candidates".

## Spec phases (§13)

| # | Phase | Status | Evidence |
|---|-------|--------|----------|
| 0 | Verification audit | ✅ DONE | B1–B7 all CONFIRMED live (7/7 methods, body/auth types echoed via httpbin, timeout/redirect/SSL toggles, CRUD round-trip, dashboard == DB counts). F1–F3 confirmed, F4 pagination exercised later by load-test volume. |
| 1 | Schema migration + backfill | ✅ DONE | Flyway `V1__core_schema.sql`; applied on existing dev DB (baseline v0) — 1 saved request → regular_api, 1 schedule, 20 history rows w/ computed status classes, legacy tables kept. |
| 2 | Module CRUD | ✅ DONE | `/api/v1/modules` tree/create/update/delete; cycle+conflict guards. |
| 3 | Base API CRUD + execute + tree + bindings | ✅ DONE | Snapshot stored on run; extraction `$.uuid → {{token}}` created via API. |
| 4 | Regular API + template resolution + dependency execution | ✅ DONE | `{{token}}` substituted into header, echoed back by httpbin; unresolved-placeholder guard returns clear error, never sends. CACHED_TTL: no chain row within TTL, exactly one CHAIN_DEPENDENCY row after expiry. |
| 5 | Scheduler redesign | ✅ DONE | SKIP LOCKED claim (pessimistic + lock-timeout -2), bounded pool, retry/backoff 30s/2m/10m, cron/weekly. 7-hour soak: 27 runs, locks released, retries exercised on real httpbin outage. |
| 6 | Response capture overhaul | ✅ DONE | TTFB captured; status classes computed at write; 1MB body → gzip offload (`api-testing/history/38.gz`), inline NULL; detail endpoint decompresses; daily retention job (90d). **Deviation**: local-gzip BodyStore instead of MinIO (main portal doesn't actually use MinIO — spec §12 assumption wrong); interface is object-store-shaped for a drop-in MinIO swap. |
| 7 | Validation engine | ✅ DONE | 5 rules (EQUALS/EXISTS/RANGE/TYPE_IS + failing EQUALS) evaluated per run; per-rule expected/actual persisted; overall pass on history row. |
| 8 | FE: Base API section + field picker | ✅ DONE | `pages/BaseApis.jsx` + `components/JsonTree.jsx` ("+ extract" per leaf). |
| 9 | FE: Dynamic Data tab | ✅ DONE | `pages/RegularApis.jsx` — bind variables from base APIs as chips, insert `{{var}}` anywhere. |
| 10 | FE: Scheduler grouping | ✅ DONE | Group-by Module / Cadence toggle. |
| 11 | FE: History detail view | ✅ DONE | Drawer: masked request, response body (incl. offloaded), TTFB/total, per-rule validation green/red. |
| 12 | FE: Dashboard enhancements | ✅ DONE | Status-class donut (validated palette), module filter, failing-schedules + next-runs widgets. |
| 13 | Load test | ✅ DONE | 2 instances (`docker-compose.loadtest.yml`), 51 × 1-min schedules, 7 min: 51×8 executions exactly (min=max=8), **0 duplicate claims, 0 drops**; 20s-slow target delayed nothing; the single <30s pair was the 30s-backoff retry after a real 5xx. Bounded executor sufficient — no broker needed. |
| 14 | Compose finalization | ✅ DONE | Redis wired (healthchecked), history-bodies volume, scheduler/history config externalized as env vars. |

## Extra requirement (spec footer)

| Item | Status | Notes |
|------|--------|-------|
| Collections + Postman import + switching in tester | ✅ DONE | `api_collection`/`collection_request`, `/api/v1/collections` (+`/import/postman`), tester toolbar: collection switcher, save-to-collection, import modal. Tester-only, not schedulable — as requested. |

## API Testing Workspace — Part 1 (manual testing, 2026-07-13)

User clarified scope after the master-spec build: the project has two parts.
**Part 1** = a polished manual API-testing workspace (Postman/Hoppscotch/Bruno/
Insomnia-class), scoped to the Tester + Collections area only — schedules are
explicitly **Part 2** (already built, but its own "schedule history" concept
is intentionally separate and will be refined later; do not conflate it with
the per-request history added here).

Review found real gaps in the existing Tester/Collections implementation vs
this scope, all now closed:

| Gap found | Fix | Evidence |
|---|---|---|
| Ad-hoc `/api/v1/execute` never tied a run back to its saved request (`apiId` always null) — no per-API history was possible | New `POST /api/v1/collections/{id}/requests/{reqId}/execute`; added `ExecutionHistory.ApiType.COLLECTION` | Ran a saved request 3×, `GET /history?apiType=COLLECTION&apiId=X` returned exactly those 3 rows, `apiName` populated |
| No per-request History UI (only the global History page existed) | `components/RequestHistoryTab.jsx` + workspace-level tabs **Request Builder / Response / History** in `RequestBuilder.jsx` (Tester page) | Tab wired to the new endpoint; global vs per-request vs (future) schedule history are three distinct, non-overlapping views |
| No Cookies view in the response | `ResponseViewer.jsx` parses `Set-Cookie` from `response.headers` client-side (no backend/schema change needed) | Verified against `postman-echo.com/cookies/set` — 4 cookies incl. `HttpOnly` attrs parsed and displayed |
| Import: Postman only, no OpenAPI/Swagger | `OpenApiImportService` (JSON + YAML via `jackson-dataformat-yaml`, OpenAPI 3.x + Swagger 2.0) | Imported a spec with a path param, query param w/ example, JSON request-body example, and a `bearerAuth` security scheme — all fields (method, URL, query param, bearer auth, JSON body) landed correctly |
| No export at all | `PostmanExportService`: Postman v2.1 JSON + native JSON, streamed as a file download (`Content-Disposition: attachment`) | Exported "Migrated Requests" (2 requests) → re-imported the file → 2 requests recreated identically |
| "Send" didn't read as a dedicated Run action | Renamed to **Run**; when a saved request is loaded it calls the tied-execute endpoint (recording history), otherwise falls back to the generic ad-hoc endpoint (shows as "ad-hoc" in the global History page, unchanged prior behavior) | — |

**Table naming reviewed**: `api_collection` / `collection_request` (existing)
were judged already correct/relevant — no rename performed.

**Explicitly out of scope for Part 1** (per user instruction, not built):
nested folders within a collection (collections themselves are the
organizational unit — "folders or collections" was satisfied by the latter);
multipart/binary bodies; auth beyond Basic/Bearer/API-Key.

### Follow-up correction (same day): navigation model was wrong

After the above, the user clarified the *navigation flow* was not what they
asked for — they wanted a Postman-style drill-down, not a single flat page
with dropdowns. Confirmed via two clarifying questions before writing code:
list shows **all saved requests, most-recently-run first** (never-run ones
still included), and it's **scoped to one collection at a time** (pick a
collection, then see its table) — not a merged cross-collection view.

Rebuilt as three routes instead of one page:
- `/tester` → `TesterCollections.jsx` — pick a collection (Postman-style
  entry point); also where Import (Postman/OpenAPI) now lives, since import
  creates a whole collection.
- `/tester/:collectionId` → `CollectionRequestsList.jsx` — table (API Name,
  Method, Path, Response Status, Last Run), sorted recent-first via a new
  backend field (`ExecutionHistoryRepository.findFirstByApiTypeAndApiIdOrderByExecutedAtDesc`,
  exposed as enriched fields on `GET /collections/{id}/requests`); Export
  (Postman/JSON) lives here since it's collection-level.
- `/tester/:collectionId/:requestId` (or `.../new`) → `RequestWorkspace.jsx` —
  the Hoppscotch-style builder, loaded via a new `GET
  /collections/{id}/requests/{requestId}` (route-driven, no more dropdown
  pickers). **History for this one API is a collapsible panel docked at the
  bottom** (`components/RequestHistoryPanel.jsx`), not a tab you switch away
  to — explicitly separate from the sidebar's global History page, which was
  not touched (confirmed via `git status`, still untracked/unmodified).

Both entry points (sidebar "API Tester" nav item and Dashboard's "API Test"
button) already pointed at `/tester`, so no change was needed there — they
automatically pick up the new landing page.

Verified: `GET /collections/1/requests` returns the never-executed request
sorted *after* the executed one, with `lastStatusCode`/`lastStatusClass`/
`lastExecutedAt` populated only for the run one; all four routes
(`/tester`, `/tester/1`, `/tester/1/1`, `/tester/1/new`) serve 200 through
nginx's SPA fallback.

### Import/Export bug fixes + Collection Variables (2026-07-13)

User reported import/export "not working correctly." Root-caused two real bugs
(not just missing UX) before touching code, using a realistic 2-level-nested
Postman sample with `{{baseUrl}}`-style variables:

| Bug found | Root cause | Fix |
|---|---|---|
| Every imported request using a Postman `{{variable}}` (near-universal in real collections) was broken on Send | The Tester side had **zero variable resolution** — only the separate Regular API/automation side supported `{{var}}` substitution. Imported URLs were stored with the literal `{{baseUrl}}` placeholder, which isn't a valid hostname. | Added **Collection Variables** (Postman's "collection variables" concept): `api_collection.variables` (V2 migration, JSON array of `{key,value,enabled}`), captured automatically from Postman's top-level `variable` array on import, resolved via `CollectionVariableResolver` before every tied execute — and **blocked with a clear error** (not a silent DNS failure) if a placeholder has no matching variable. Verified live against the real `mphousing.mp.gov.in` API: `{{baseUrl}}` resolved → real 200 response; an undefined `{{user}}` → clean "add it under this collection's Variables" error, never sent. |
| Downloaded export filename was garbled (`=?UTF-8?Q?...?=`) | Backend called `ContentDisposition.attachment().filename(name, UTF_8)`, which forces Spring to RFC-2047-encode the filename even though `sanitizeFilename()` had already made it plain ASCII. | Root-caused server-side: dropped the charset overload (`.filename(name)`) since the name is already ASCII-safe — header is now a plain `filename="MPHIDB_Real_Export.postman_collection.json"`. Frontend's parser also hardened to prefer `filename*=UTF-8''...` over a same-header RFC2047 form, as defense in depth. |

Also added, since they're standard Postman collection features the user
flagged as missing:
- **File-based import** (`TesterCollections.jsx`): drag-and-drop or browse for
  one or more `.json`/`.yaml`/`.yml` files (not paste-only), format
  auto-detected per file (Postman vs OpenAPI/Swagger) from content — no
  manual format selection needed unless detection fails. A "Paste Text" mode
  remains as a fallback.
- **Variables editor** on the collection page (`Braces` icon button) — reuses
  the existing `KeyValueEditor` component; imported variables show up
  pre-filled.
- **Duplicate/clone request** (`Copy` icon per row) — fetches the full config
  and re-POSTs it as `"{name} (copy)"`.
- Export (Postman + native JSON) now round-trips the collection's variables
  too (verified both formats contain the `variable`/`variables` array after
  re-export).

### Folders + Environments (2026-07-13)

User picked these two as the priority "missing Postman features" (multi-select
question, both selected). Built on top of the collection-variables work above:

- **Folders** (V3 migration: `collection_folder` self-referencing table +
  `collection_request.folder_id`): nested sub-folders inside one collection,
  full CRUD (`CollectionFolderController`), deleting a folder cascades to
  sub-folders but requests inside fall back to "Ungrouped" (FK `ON DELETE SET
  NULL`, not deleted). **Postman import now creates real folder records**
  (previously flattened into "Folder / Request" naming) — verified a 2-level
  nested sample produces an actual 2-level tree, and **export rebuilds the
  same nested Postman `item` structure** (not flattened) — round-tripped
  correctly. **OpenAPI import maps each operation's first `tags` entry to a
  folder** (real-world specs are almost always tagged), created on first use
  per unique tag.
- **Environments** (V3: `collection_environment` table + `api_collection.
  active_environment_id`): named, switchable variable sets (Dev/QA/Prod) —
  distinct from the always-on collection variables. Full CRUD +
  `PATCH .../environments/active` to switch. At execution time the active
  environment's values **override** collection variables on key conflict
  (`CollectionVariableResolver.merge`, environment wins — mirrors Postman's
  precedence). Verified live: same request with `{{host}}` failed
  (NXDOMAIN) against a deliberately-wrong collection variable, then
  succeeded (200) once a "Prod" environment with the correct `host` was
  activated, then failed again after deactivating — proving the override
  and the fallback both work, not just one direction.
- Frontend: `CollectionRequestsList.jsx` now renders a real recursive folder
  tree (collapsible sections, "+ New Folder"/"+ New sub-folder", per-row
  "move to folder" dropdown, duplicate now preserves folderId) instead of a
  flat table; an Environments selector (top bar) + management modal
  (create/edit/delete, reuses `KeyValueEditor`); `RequestWorkspace.jsx` got a
  folder picker next to the name field so saving assigns/reassigns a folder
  directly from the workspace.
- `CollectionSummary` (the `/collections` list endpoint) now also returns
  `activeEnvironmentId` so the frontend can show the active environment name
  without an extra round-trip.

### Bug fix: Send ran stale saved config, not the on-screen form (2026-07-13)

User reported: changed an existing saved request's method from GET to POST in
the dropdown, clicked Send — it still executed as GET. Root cause: for an
*existing* saved request, `RequestWorkspace.jsx`'s `run()` called the tied
`/collections/{id}/requests/{reqId}/execute` endpoint directly, which
re-reads the config from the **database** — any unsaved edits in the form
(method, URL, body, headers, auth) were invisible to it unless "Update" had
been clicked first. Only the "new request" path auto-saved before executing;
the "existing request" path didn't sync at all. Fixed: `run()` now always
`PUT`s the current form state to the saved request immediately before calling
execute (for both new and existing), so Send is guaranteed to run exactly
what's visible in the builder, matching Postman's behavior. Verified by
reproducing the exact scenario — save as GET, switch dropdown to POST without
clicking Update, hit Send — httpbin's echo confirmed `"method": "POST"` was
actually sent.

## Phase 2 — Enterprise features (context/phase2context.md, 2026-07-14)

Implemented the phase2context.md brief on top of everything above. All schema
changes are additive Flyway migrations; existing schedules/history kept working
throughout (verified live — V4 migrated the existing dev DB cleanly).

| Feature | Status | Evidence |
|---|---|---|
| Execution groups (module-wise + time-wise NOW/DAILY/WEEKLY) | ✅ DONE | `group/` package: `ApiGroup`/`ApiGroupMember`/`ApiGroupExecution` + `GroupController` (CRUD, membership, drill-down) + `GroupExecutionService`. Assigned from Regular APIs → Groups tab and Scheduler → Groups view. |
| Group execution (Group → Base → Regular per member → result → health) | ✅ DONE | Reuses `DependencyExecutionService` — manual/scheduled/group share ONE pipeline. Manual runs on the bounded worker pool (non-blocking). Verified: manual + scheduled group runs both SUCCESS/100% health; failing base → group FAILED/0%, root cause ("Connection refused") surfaced on the base row + dependency error on the regular row. |
| Group scheduling | ✅ DONE | `schedule.target_type = API\|GROUP`; `ScheduleWorker.runGroupTarget`; SUCCESS requires every member pass. Verified: DAILY group schedule picked up by poller, ran SUCCESS, advanced next_run. |
| Observability: shared correlationId across a chain | ✅ DONE | Base run + regular run in one group share `correlation_id` (verified MATCHES); logged w/ executionId/scheduleId/groupExecutionId. `ExecutionContext` DTO threads it through. |
| History extensions | ✅ DONE | New cols: cookies, content type, status message, injected variables (masked), started/finished, correlation id, group linkage, executed_by (RBAC-ready). Filters added: HTTP method, date range, groupExecutionId. History tab has Executions + Group Runs views. |
| Dashboard extensions | ✅ DONE | API/module/group totals, fastest/slowest API, module-wise stats, live scheduler status (running jobs, queue size), group health — all from DB. |
| Audit log | ✅ DONE | `audit_log` + `AuditService` + `/api/v1/audit`; records create/update/delete/execute/pause/resume of APIs, bindings, schedules, groups. Placeholder identity ("system") until RBAC. |
| Base API → collection | ✅ DONE | `POST /base-apis/{id}/add-to-collection/{collectionId}` copies a Base API into a tester collection as a runnable request. |

### Table rename to master-spec names (V5, 2026-07-14)

User's spec listed specific table names. Renamed via `V5__rename_tables_to_master_spec.sql`
(RENAME TABLE preserves data/FKs): `regular_api`→**API_MASTER**, `base_api`→
**BASE_API_MASTER**, `api_module`→**MODULE_MASTER**, `execution_history`→
**API_EXECUTION_HISTORY**, `schedule`→**API_SCHEDULE**, `api_variable_binding`→
**BASE_API_MAPPING**; groups already **API_GROUP**/**API_GROUP_EXECUTION**
(+API_GROUP_MEMBER). `API_RESPONSE` deliberately NOT a separate table — response
fields live in API_EXECUTION_HISTORY (spec §4: no duplication, no extra join).
Entity `@Table` names updated; added `TablePreservingNamingStrategy` +
`hibernate.naming.physical-strategy` so Hibernate stops lowercasing the explicit
uppercase names (Linux MySQL is case-sensitive — this bit us once: app booted but
scheduler query hit `api_schedule` doesn't-exist until the strategy was added).

### Robustness + security hardening (2026-07-14)

- **`GlobalExceptionHandler`** (@RestControllerAdvice): every error → uniform
  `{timestamp,status,message}`. Validation→first field msg, malformed JSON→400,
  FK/duplicate→409 friendly, unexpected→generic (stack trace only in server log).
- **Frontend axios interceptor** (`api/client.js`): network failure (backend
  restarting) → synthetic `{message}` so UI shows a clear reason, not bare "failed".
- **URL scheme guard** (`ExecutionEngineService.validateScheme`): only http(s)
  executes — `file://`/`gopher://`/`ftp://` blocked (SSRF/local-file read). The
  platform executes arbitrary URLs by design, so URLs themselves are NOT blocked.
- **Timeout clamp**: 100ms–120s, so no request pins a worker thread forever.
- Security sweep passed: SQLi payload stored literally (all JPA parameterized,
  zero native SQL), secrets AES-256-GCM at rest + masked in history, body-store
  path-traversal confined, React auto-escapes (no dangerouslySetInnerHTML/eval).

### DB state at session end (2026-07-14)

All dummy/test operational data wiped — `MODULE_MASTER`/`API_MASTER`/
`BASE_API_MASTER`/`API_EXECUTION_HISTORY`/`API_SCHEDULE`/`API_GROUP*`/
`BASE_API_MAPPING`/`audit_log` all **0 rows**. The **5 real collections**
(MPHIDB, Cms Api, CMS_API, inverse_story, Laravel-local-mphb) were KEPT — verify
with user before touching those. Ready to start adding real APIs next session.

## Still deferred (need explicit go-ahead)

- Security: JWT + RBAC enforcement (`user_module_access` modeled only; audit
  `performed_by` + history `executed_by` columns ready for real identities).
- Kafka: NOT present; DB-claim scheduler already gives queue-based fail-safe
  processing and scales via backend replicas. phase2context.md's Kafka notes
  (rollback strategy, partitions) apply only if a broker is later introduced.
- Multipart/binary bodies, cookie jar, Digest/OAuth2/AWS auth.
- Code generator, export (CSV/Excel/PDF), baseline-diff mode (§7 optional).
- MinIO BodyStore impl, RabbitMQ (proven unnecessary at current load).
- Per-target rate limiting (resilience4j) — spec marked optional.
