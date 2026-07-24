# API Testing Platform — Master Implementation Specification (v2)

**Target repo:** `d:\Automation Portal\api-testing-platform\`
**Stack:** Spring Boot 3.3.5 / Java 21 / MySQL 8.4 (backend) · React 19 + Vite + Tailwind (frontend) · Docker Compose
**Package root:** `com.automationportal.apitesting`

This document is written to be handed directly to a coding agent (or used by you as a working checklist). It is organized so implementation can proceed **top to bottom, phase by phase**, without breaking what already works. Do not skip Phase 0.

---

## 0. How To Use This Document

1. **Phase 0 is mandatory first.** Nothing described as "already built" in the original brief should be trusted until it is re-verified against the running code. Treat every item in Phase 0 as `UNVERIFIED` until proven otherwise with actual evidence (code reference, a real HTTP call, or a DB row).
2. Work phase by phase. Each phase has a **Definition of Done (DoD)**. Do not start phase N+1 until phase N's DoD is met.
3. Every new table, endpoint, and UI element below is a *target design*, not a rewrite mandate — if equivalent functionality already exists, adapt it rather than duplicating it.
4. The non-negotiable architecture rule from the original build **still applies and is not up for renegotiation**:
   > The browser never calls a target API directly. React only builds the request config and sends it to Spring Boot; the backend executes it server-side and returns the result.

---

## 1. Why This Redesign (context for the agent)

The platform currently treats every saved API as a flat, self-contained object: one URL, one set of static headers, one static body, executed either manually or by a simple 15-second polling scheduler. That model breaks down for three real requirements:

- **Auth tokens expire.** A Bearer token saved into a header today is wrong tomorrow. Someone has to fetch a fresh token before the real call runs — every time, automatically.
- **Scheduling must survive scale.** A naive "poll every 15s and run whatever is due" loop works for a demo with two schedules. It does not work once there are hundreds of schedules, and it will actively double-run or drop jobs the moment there is more than one backend instance (which is the normal outcome of scaling for load).
- **Testing platforms are judged on traceability.** Every professional tool in this class (Postman, Hoppscotch, Insomnia, ReadyAPI) lets you see, per run: what was actually sent, what came back, how long it took, and whether the response matched what you expected. That's currently missing — history exists, but it's an execution log, not a testing record.

The redesign below solves these three problems and organizes the platform around a concept most enterprise QA teams already think in: **modules → base APIs → regular APIs → schedules → validated history.**

---

## 2. Phase 0 — Verification Audit (run this before writing any new code)

Go through each claim below. For each, mark `CONFIRMED`, `PARTIAL`, or `MISSING`, and record the evidence (file/class name, endpoint tested, or DB query run).

### Backend
| # | Claim | How to verify |
|---|---|---|
| B1 | `POST /api/v1/execute` supports all 7 HTTP methods | Hit the endpoint with GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS against a dummy API and confirm each returns a structured result, not just a 501/exception |
| B2 | Query params, headers, 4 body types, 3 auth types are all wired end-to-end | Send one request per body type and one per auth type; inspect the actual outbound request (e.g. via a request-bin/echo endpoint) to confirm the platform sent what the UI configured |
| B3 | Timeout, redirect-follow toggle, SSL-verify toggle work | Test against a slow endpoint (timeout), a redirect endpoint (toggle both ways), and a self-signed/invalid-cert endpoint (toggle both ways) |
| B4 | Saved Requests CRUD | Create, list, update, delete via API; confirm DB rows change accordingly |
| B5 | Schedules CRUD + background runner auto-executes due schedules every 15s | Create a 1-minute schedule, watch it fire without manual trigger, confirm `last_run`/`next_run` update |
| B6 | Every manual **and** scheduled run is recorded to History | Run one manually, let one schedule fire, confirm both appear in the history table with a `triggered_by` distinction |
| B7 | Dashboard stats (totals, success rate, avg response time, 7-day trend) are computed from real data, not placeholders | Cross-check the numbers shown against a manual `COUNT`/`AVG` query on the history table |

### Frontend
| # | Claim | How to verify |
|---|---|---|
| F1 | Dashboard has stat tiles, trend chart, recent runs, "API Test" and "Schedule API Test" buttons | Visual check + click-through |
| F2 | API Tester has Params/Body(Monaco)/Headers/Auth tabs, response viewer, save/load | Build a request end-to-end using only the UI, save it, reload the page, load it back |
| F3 | Scheduler page: create/pause/resume/delete, shows last & next run | Full CRUD click-through |
| F4 | History page: paged table of all executions | Confirm pagination actually paginates (not just rendering everything and hiding it) |

**Output of this phase:** a short status table (not code) confirming what's real. Anything marked `PARTIAL` or `MISSING` gets folded into the relevant phase below instead of being assumed fixed.

**DoD:** Every row above has a verified status and evidence. No new schema/code changes made yet.

---

## 3. Target Data Model

This replaces the current flat "saved request" model with a Base API / Regular API split, adds module grouping, adds validation, and extends history. Written as MySQL DDL intent — translate to your JPA entities / Flyway migrations.

```sql
-- Module = folder/grouping unit (Login, Dashboard, Analytics, ...), supports nesting
CREATE TABLE api_module (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  parent_module_id BIGINT NULL REFERENCES api_module(id),
  description VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Base API = a "supplier" call whose response is used to feed Regular APIs (token fetch, lookup, etc.)
CREATE TABLE base_api (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_id BIGINT NULL REFERENCES api_module(id),
  name VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  headers JSON,
  body_type VARCHAR(20),
  body TEXT,
  auth_type VARCHAR(20),
  auth_config JSON,           -- encrypted at rest, see Section 12
  timeout_ms INT DEFAULT 15000,
  cache_strategy VARCHAR(20) NOT NULL DEFAULT 'PER_CALL', -- PER_CALL | CACHED_TTL | SCHEDULED_REFRESH
  cache_ttl_seconds INT NULL,  -- used when cache_strategy = CACHED_TTL (e.g. token valid for 3600s)
  last_executed_at DATETIME NULL,
  last_response_snapshot JSON NULL,  -- last raw response, used to power the "pick fields" UI
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Regular API = the actual API under test. May depend on 0..N base APIs for dynamic values.
CREATE TABLE regular_api (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_id BIGINT NULL REFERENCES api_module(id),
  name VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url_template VARCHAR(2048) NOT NULL,      -- may contain {{variableName}} placeholders
  headers_template JSON,                     -- values may contain {{variableName}}
  body_type VARCHAR(20),
  body_template TEXT,                        -- may contain {{variableName}}
  auth_type VARCHAR(20),
  auth_config JSON,
  is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_ms INT DEFAULT 15000,
  follow_redirects BOOLEAN DEFAULT TRUE,
  verify_ssl BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- The binding that makes a Regular API dynamic: which Base API feeds which placeholder
CREATE TABLE api_variable_binding (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  regular_api_id BIGINT NOT NULL REFERENCES regular_api(id) ON DELETE CASCADE,
  base_api_id BIGINT NOT NULL REFERENCES base_api(id),
  source_json_path VARCHAR(500) NOT NULL,   -- e.g. $.data.access_token
  variable_name VARCHAR(100) NOT NULL,      -- e.g. accessToken  -> used as {{accessToken}}
  target_location ENUM('HEADER','BODY','QUERY_PARAM','URL_PATH') NOT NULL,
  target_key VARCHAR(200) NOT NULL,         -- e.g. "Authorization" for a header
  UNIQUE KEY uq_binding (regular_api_id, variable_name)
);

-- Schedules now point at a Regular API (which may itself resolve Base APIs at run time)
CREATE TABLE schedule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  regular_api_id BIGINT NOT NULL REFERENCES regular_api(id) ON DELETE CASCADE,
  frequency_type VARCHAR(20) NOT NULL,   -- EVERY_X_MIN | HOURLY | DAILY | WEEKLY | CRON
  frequency_value VARCHAR(50),           -- e.g. "15" for every 15 min, or a cron expression
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | PAUSED | DISABLED
  next_run_at DATETIME NOT NULL,
  last_run_at DATETIME NULL,
  last_run_status VARCHAR(20) NULL,      -- SUCCESS | FAILED | TIMEOUT
  -- distributed-lock columns (see Section 5)
  locked_by VARCHAR(100) NULL,
  locked_until DATETIME NULL,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_due (status, next_run_at)
);

-- Every execution — manual, scheduled, or fired as a base-API dependency resolution
CREATE TABLE execution_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  api_type ENUM('BASE','REGULAR') NOT NULL,
  api_id BIGINT NOT NULL,               -- FK to base_api or regular_api depending on api_type
  module_id BIGINT NULL,
  schedule_id BIGINT NULL REFERENCES schedule(id),
  triggered_by ENUM('MANUAL','SCHEDULE','CHAIN_DEPENDENCY') NOT NULL,

  -- what was actually sent (secrets masked, see Section 12)
  request_method VARCHAR(10) NOT NULL,
  request_url VARCHAR(2048) NOT NULL,
  request_headers JSON,
  request_body TEXT,

  -- what came back
  response_status_code INT NULL,
  response_status_class VARCHAR(10) NULL,   -- 2xx | 3xx | 4xx | 5xx | ERROR | TIMEOUT
  response_headers JSON,
  response_body_inline TEXT NULL,           -- populated when body <= size threshold (see Section 7)
  response_body_object_key VARCHAR(500) NULL, -- populated when offloaded to MinIO
  response_size_bytes INT NULL,

  -- timing
  dns_time_ms INT NULL,
  connect_time_ms INT NULL,
  ttfb_ms INT NULL,
  total_time_ms INT NOT NULL,

  error_message VARCHAR(1000) NULL,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_api (api_type, api_id, executed_at),
  INDEX idx_module_time (module_id, executed_at),
  INDEX idx_schedule (schedule_id, executed_at)
);

-- Validation rules attached to a Regular (or Base) API
CREATE TABLE api_validation_rule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  api_type ENUM('BASE','REGULAR') NOT NULL,
  api_id BIGINT NOT NULL,
  json_path VARCHAR(500) NOT NULL,       -- $.data.status
  operator VARCHAR(20) NOT NULL,         -- EQUALS | NOT_EQUALS | CONTAINS | REGEX | EXISTS | TYPE_IS | RANGE
  expected_value VARCHAR(1000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Result of running validation rules against one execution
CREATE TABLE validation_result (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  execution_history_id BIGINT NOT NULL REFERENCES execution_history(id) ON DELETE CASCADE,
  rule_id BIGINT NOT NULL REFERENCES api_validation_rule(id),
  passed BOOLEAN NOT NULL,
  actual_value VARCHAR(1000),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reserved for when this connects into the main Automation Portal's auth (not active yet, but modeled now
-- to avoid a breaking migration later — matches the "integration-ready, no shared auth today" constraint)
CREATE TABLE user_module_access (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(100) NOT NULL,   -- external id, no FK today since there's no shared user table yet
  module_id BIGINT NOT NULL REFERENCES api_module(id),
  role VARCHAR(20) NOT NULL,       -- VIEWER | EDITOR | ADMIN
  UNIQUE KEY uq_user_module (user_id, module_id)
);
```

**Notes:**
- `frequency_type` includes `WEEKLY` and `CRON` now, to directly support the "daily / weekly module-wise grouping" requirement (0.2) — grouping schedules by cadence is a query on this column, not a new subsystem.
- `api_variable_binding.target_location = URL_PATH` is included so a base-API-derived value (e.g. a user ID) can be substituted into the URL itself, not just headers/body.
- `user_module_access` exists so that when this platform is later wired into the main Automation Portal's auth, you're adding a foreign key, not inventing a table.

**DoD:** Migration scripts written (Flyway `V{n}__*.sql` recommended given you're already on MySQL 8.4), applied cleanly to a fresh DB and to a copy of the current dev DB, all existing saved requests/schedules/history backfilled into the new tables (write a one-time migration, don't discard existing verified test data).

---

## 4. Base API ↔ Regular API Dynamic Chaining (item 3)

**The flow, precisely:**

1. User creates a **Base API** (e.g. "Fetch Auth Token") — a normal request definition (method, URL, headers, body, auth).
2. User runs it once from the UI. The platform stores the raw JSON response (`last_response_snapshot`) and renders it as an expandable tree.
3. User clicks fields in that tree to mark them as **extractable variables** (e.g. clicking `data.access_token` creates a binding with `source_json_path = $.data.access_token` and prompts for a `variable_name`, e.g. `accessToken`).
4. When building a **Regular API**, the user toggles "Use dynamic data," picks a Base API, and can now insert `{{accessToken}}` into any header value, the body, or the URL.
5. **At execution time** (manual or scheduled), the engine:
   a. Resolves the Regular API's dependency graph (which Base APIs it needs).
   b. For each Base API dependency, checks `cache_strategy`:
      - `PER_CALL`: always executes the Base API fresh, right before the Regular API.
      - `CACHED_TTL`: reuses the last successful result if `now - last_executed_at < cache_ttl_seconds` (this is the token case — don't refetch a token that's still valid for another 50 minutes); otherwise refreshes.
      - `SCHEDULED_REFRESH`: Base API has its own schedule that keeps a fresh value on hand; Regular API just reads the latest cached value, never blocks on a live call.
   c. Extracts each bound variable via JSONPath from the (possibly cached) Base API response.
   d. Substitutes `{{variableName}}` tokens in the Regular API's URL/headers/body templates.
   e. Executes the fully-resolved Regular API request.
   f. Records **both** executions in `execution_history` — the Base API run gets `triggered_by = CHAIN_DEPENDENCY`, the Regular API run gets its normal trigger reason — so the user can always see "the token came from run #4821."
6. **Failure handling:** if a Base API dependency fails to resolve (network error, missing field, expired and unrefreshable), the Regular API execution is marked `FAILED` with a clear `error_message` like `"Dependency 'accessToken' could not be resolved: Base API 'Fetch Auth Token' returned 401"` — it must never silently send a request with an unresolved `{{accessToken}}` literal in it.

Where cached values live: Redis (`base_api:{id}:cache`, TTL = `cache_ttl_seconds`), not the DB, since this is hot-path, ephemeral data. Falls back to the DB's `last_response_snapshot` only as a cold-start source, never as the primary read path.

**DoD:** A Regular API depending on a token-issuing Base API with `CACHED_TTL` runs correctly on a schedule for at least 3 consecutive cycles, reusing the cached token within TTL and transparently refreshing once it expires — verified by inspecting `execution_history` and confirming the `CHAIN_DEPENDENCY` row only appears when a refresh actually happened.

---

## 5. Scheduler Redesign for Scale (item 0.1)

**Problem with the current design:** an in-process loop polling every 15 seconds works for one backend instance and a handful of schedules. It fails in three ways once you scale: (a) if you ever run 2+ backend containers behind a load balancer for availability, both instances will find the same due schedule and run it twice; (b) executing the HTTP call synchronously on the scheduler's own thread means one slow/hanging target API stalls the polling loop for everything else; (c) there's no backpressure — if 500 schedules come due in the same 15-second tick, firing 500 outbound HTTP calls at once is a self-inflicted DDoS on your own backend (and possibly on the target APIs).

**Target design:**

1. **Claim, don't just read.** The poller selects due schedules using row-level locking so two instances can never grab the same one:
   ```sql
   SELECT id FROM schedule
   WHERE status = 'ACTIVE' AND next_run_at <= NOW()
   ORDER BY next_run_at
   LIMIT 200
   FOR UPDATE SKIP LOCKED;
   ```
   Immediately set `locked_by = <instance-id>`, `locked_until = NOW() + 60s` in the same transaction. This is the same pattern used by libraries like **ShedLock** — using ShedLock directly (Spring integration, MySQL-backed lock provider) is the pragmatic choice here instead of hand-rolling it, given you're already on Spring Boot.

2. **Decouple claiming from executing.** The poller's only job is to claim due schedules and push a lightweight message (`schedule_id`) onto a queue. Use a **bounded `ThreadPoolTaskExecutor`** (simplest, no new infra) if you want to stay single-broker for now, or **RabbitMQ** if you already anticipate needing durable retry/dead-lettering. Given the current stack has no message broker yet, start with the bounded executor + DB-backed retry columns (`retry_count`, `max_retries` already in the schema above) — introduce RabbitMQ only if load testing (Phase 13) shows the in-process queue isn't enough. Don't add infrastructure you haven't proven you need yet.

3. **Bound concurrency with backpressure.** The executor pool size should be a config value (`scheduler.max-concurrent-executions`, start at e.g. 20), so 500 due schedules don't turn into 500 simultaneous outbound calls — they queue and drain at a controlled rate.

4. **Per-target rate limiting.** Optionally, a simple token-bucket per target host (`resilience4j-ratelimiter` is already Spring-friendly) prevents the platform from hammering a single external API even if many schedules point at it.

5. **Retry with backoff, then dead-letter.** On failure, increment `retry_count`, set `next_run_at = NOW() + backoff(retry_count)` (e.g. exponential: 30s, 2m, 10m), up to `max_retries`. After that, mark `last_run_status = 'FAILED'` and leave `status = 'ACTIVE'` for its normal next cycle (don't auto-disable a recurring schedule just because one run failed).

6. **Release the lock.** After execution (success or terminal failure), clear `locked_by`/`locked_until` and compute the new `next_run_at` based on `frequency_type`/`frequency_value`.

7. **Stateless instances.** All coordination lives in MySQL (locks) and optionally Redis (rate limits, base-API caches) — never in in-memory instance state — so horizontal scaling is just adding another container behind the load balancer, with zero code change.

**Config surface to expose (application.yml):**
```yaml
scheduler:
  poll-interval-ms: 15000
  claim-batch-size: 200
  max-concurrent-executions: 20
  lock-lease-seconds: 60
  default-max-retries: 3
```

**DoD:** Run 2 backend containers against the same DB with 50 active 1-minute schedules for 15 minutes; confirm via `execution_history` that every schedule ran exactly once per cycle (no doubles, no drops), and that a deliberately-slow target API (e.g. a 30s delay endpoint) does not delay other schedules' on-time execution.

---

## 6. Response Capture & Storage Optimization (items 4, 5, 6)

**Timing to capture per execution** (populate what your HTTP client exposes — Apache HttpClient 5 / Java 11+ `HttpClient` both expose enough of this via instrumentation; if full DNS/connect/TTFB breakdown isn't available from your current client, capture `total_time_ms` unconditionally and the finer-grained fields as best-effort/nullable):
- `total_time_ms` (mandatory, wall-clock request start → response fully read)
- `dns_time_ms`, `connect_time_ms`, `ttfb_ms` (best-effort)

**Response classification (item 0.4):** derive `response_status_class` deterministically from `response_status_code`:
| Code range | Class |
|---|---|
| 200–299 | `2xx` |
| 300–399 | `3xx` |
| 400–499 | `4xx` |
| 500–599 | `5xx` |
| connection refused / DNS failure / SSL error | `ERROR` |
| exceeded `timeout_ms` | `TIMEOUT` |

This field is what powers dashboard breakdowns ("94% 2xx, 4% 4xx, 2% timeout") — compute it once at write time, don't recompute from raw codes on every dashboard query.

**Storage optimization — don't let history bloat the DB:**
- Inline (`response_body_inline`, TEXT column) only when the response body is **≤ 50 KB** (config: `history.inline-body-max-bytes`).
- Above that, gzip the body and upload it to MinIO/S3 (which you already use in the main portal — reuse the same client/bucket-naming convention: `api-testing/history/{execution_id}.gz`), and store only `response_body_object_key` in the DB.
- Always mask secrets before storing headers/body — see Section 12.
- **Retention policy:** a scheduled cleanup job (daily) deletes `execution_history` rows (and their MinIO objects) older than a configurable window, default 90 days, configurable per module via `api_module` (add a `retention_days` column if you want per-module control; otherwise a single global setting is fine to start).
- Add the indexes shown in the schema (`idx_api`, `idx_module_time`, `idx_schedule`) — history tables are the fastest-growing table in this system and will be queried by API, by module, and by schedule constantly from the dashboard.

**DoD:** Execute 100 requests against endpoints returning bodies both under and over 50KB; confirm small ones land inline and large ones land in MinIO with the DB row staying small; confirm the retention job actually deletes old rows and their MinIO objects on a dry run against test data.

---

## 7. API Validator (item 0.3)

**Concept:** the user defines expected-response assertions once per API (Base or Regular); every subsequent execution auto-runs them and records pass/fail.

**Rule types (`api_validation_rule.operator`):**
- `EQUALS` / `NOT_EQUALS` — exact value match at a JSON path
- `CONTAINS` — substring/array-contains
- `REGEX` — pattern match
- `EXISTS` — field presence, regardless of value
- `TYPE_IS` — e.g. field must be a number/string/array/boolean
- `RANGE` — numeric field between two bounds (store as `"min,max"` in `expected_value`, or add explicit columns if you prefer typed storage)

**Execution flow:** after every run that returns a parseable body, the engine loads active rules for that API, evaluates each via a JSONPath library (`com.jayway.jsonpath:json-path` — a natural fit here since Base API variable extraction already needs JSONPath, so this is one dependency serving two features), and writes one `validation_result` row per rule. The execution's overall pass/fail (surfaced on the History and Dashboard views) is simply "all active rules passed."

**Baseline mode (optional but valuable, and cheap to add given the schema already stores full responses):** let the user "Save current response as baseline" on a Base or Regular API; a lightweight structural diff (ignoring known-volatile fields like timestamps/IDs, which the user should be able to flag as "ignore in diff") against that baseline can run alongside explicit rules, surfaced as "response shape changed" warnings distinct from hard rule failures.

**DoD:** Define 3 rules on a Regular API (one `EQUALS`, one `EXISTS`, one `RANGE`), run it 5 times against a target that fails one rule on the 3rd run, confirm `validation_result` correctly reflects pass/fail per run and the UI surfaces the failure clearly.

---

## 8. Module-Wise Grouping (items 0.2, 7)

- Modules are a simple self-referencing tree (`api_module.parent_module_id`) — e.g. `Login` and `Login > OTP Flow`.
- Every Base API, Regular API, and (transitively, via its API) Schedule and History row is taggable with a `module_id`.
- **Grouping views to build:**
  - Sidebar tree (Login / Dashboard / Analytics / Ungrouped) for browsing Base + Regular APIs.
  - Scheduler page: group-by toggle — **by module** or **by cadence** (Daily / Weekly / Hourly / Every X min), satisfying item 0.2 directly since `frequency_type` already carries this.
  - History and Dashboard: filter/breakdown by module.
- `user_module_access` (already in the schema) is there for when you're ready to gate who can view/edit/run APIs per module — not required for the current single-operator usage, but present now so it's a config change later, not a migration.

**DoD:** Create 3 modules with a mix of Base/Regular APIs and schedules across them; confirm the Scheduler page can toggle between "grouped by module" and "grouped by cadence" and both render correctly; confirm Dashboard can filter to a single module and all stats (success rate, avg time, trend) recompute for just that module.

---

## 9. API Contracts (new/changed endpoints)

```
# Modules
GET    /api/v1/modules                       (tree)
POST   /api/v1/modules
PUT    /api/v1/modules/{id}
DELETE /api/v1/modules/{id}

# Base APIs
GET    /api/v1/base-apis?moduleId=
POST   /api/v1/base-apis
PUT    /api/v1/base-apis/{id}
DELETE /api/v1/base-apis/{id}
POST   /api/v1/base-apis/{id}/execute          (also refreshes last_response_snapshot)
GET    /api/v1/base-apis/{id}/response-tree    (for the field-picker UI)
POST   /api/v1/base-apis/{id}/bindings         (create a variable binding)

# Regular APIs
GET    /api/v1/regular-apis?moduleId=
POST   /api/v1/regular-apis
PUT    /api/v1/regular-apis/{id}
DELETE /api/v1/regular-apis/{id}
POST   /api/v1/regular-apis/{id}/execute       (resolves dependencies, runs validation, records history)
GET    /api/v1/regular-apis/{id}/bindings

# Schedules  (extend existing)
GET    /api/v1/schedules?moduleId=&groupBy=module|cadence
POST   /api/v1/schedules
PATCH  /api/v1/schedules/{id}/pause
PATCH  /api/v1/schedules/{id}/resume
DELETE /api/v1/schedules/{id}

# History  (extend existing)
GET    /api/v1/history?apiType=&apiId=&moduleId=&status=&from=&to=&page=&size=
GET    /api/v1/history/{id}                    (full detail: request/response/timing/validation results)

# Validation
GET    /api/v1/validation-rules?apiType=&apiId=
POST   /api/v1/validation-rules
DELETE /api/v1/validation-rules/{id}

# Dashboard  (extend existing)
GET    /api/v1/dashboard/summary?moduleId=      (totals, success rate, avg time, status-class breakdown)
GET    /api/v1/dashboard/trend?moduleId=&days=7
```

---

## 10. Frontend UX Spec

- **New "Base APIs" section** (sidebar, parallel to the existing "API Tester"): same request-builder UX (Params/Body/Headers/Auth tabs) plus a **response tree panel** after execution — each leaf node has a "+ Extract as variable" affordance that names the variable and records the binding.
- **Regular API builder gets a "Dynamic Data" tab**: pick one or more Base APIs, see their available extracted variables as chips, drag/insert `{{variableName}}` into any header value, the body (Monaco autocomplete for `{{`), or the URL.
- **Scheduler page**: add a group-by segmented control (Module / Cadence), keep existing pause/resume/last-next-run UI per row.
- **History page**: row detail view now shows request sent, response received, timing waterfall (DNS/connect/TTFB/total where available), and validation rule results (green/red per rule) — this is the "testing record," not just a log line.
- **Dashboard**: add a status-class donut (2xx/3xx/4xx/5xx/ERROR/TIMEOUT), a module filter dropdown, and a "schedule health" widget (schedules currently failing, next N runs due).

---

## 11. Security & Secrets (applies across everything above)

- `auth_config` on `base_api` / `regular_api` (tokens, API keys, basic-auth passwords) must be **encrypted at rest** — Spring's `@Convert` with a Jasypt or AES/GCM-based `AttributeConverter` is sufficient; don't store secrets in plaintext JSON columns.
- `execution_history.request_headers` / `request_body`: mask known-sensitive header names (`Authorization`, `X-Api-Key`, `Cookie`, etc.) before persisting — store `Bearer ****1234` style, not the full token, even though this is your own history table. History rows will outlive the token's validity and get exported/screenshared eventually; don't make that a leak vector.
- Never log full secret values, including in application logs during scheduler execution or error messages.

---

## 12. Docker / Infra Changes

- Add **Redis** to `docker-compose.yml` if not already present — needed for Base API TTL caching (Section 4) and, if load testing shows it's needed, rate limiting (Section 5).
- MinIO — reuse the instance/bucket pattern already established in the main Automation Portal; keep this platform's bucket separate (`api-testing-history`) to preserve its current "no shared infra" independence while staying consistent in tooling.
- No new broker (RabbitMQ/Kafka) at this stage — see Section 5's reasoning; keep the compose file lean until load testing proves it's necessary.
- Ensure all new services (Redis) are on the same isolated Docker network already used by this platform, still non-colliding with the main Automation Portal's ports/network per the existing "integration-ready but independent" rule.

---

## 13. Phased Build Sequence

| Phase | Scope | Depends on |
|---|---|---|
| 0 | Verification audit (Section 2) | — |
| 1 | Schema migration: modules, base_api, regular_api, bindings, extended execution_history, validation tables; backfill existing data | 0 |
| 2 | Backend: Module CRUD + filtering support in existing endpoints | 1 |
| 3 | Backend: Base API CRUD + execute + response-tree + bindings CRUD | 1 |
| 4 | Backend: Regular API CRUD + template resolution engine + dependency execution (Section 4) | 3 |
| 5 | Backend: Scheduler redesign — SKIP LOCKED claiming, bounded executor, retry/backoff (Section 5) | 4 |
| 6 | Backend: Response capture overhaul — timing, status classification, MinIO offload, retention job (Section 6) | 4 |
| 7 | Backend: Validation engine — rule CRUD, auto-run on execution, results storage (Section 7) | 4, 6 |
| 8 | Frontend: Base API section + response-tree field picker | 3 |
| 9 | Frontend: Regular API "Dynamic Data" tab | 4, 8 |
| 10 | Frontend: Scheduler grouping (module/cadence) | 5, 8 |
| 11 | Frontend: History detail view (request/response/timing/validation) | 6, 7 |
| 12 | Frontend: Dashboard enhancements (status donut, module filter, schedule health) | 6 |
| 13 | Load test: simulate 200–1000 concurrent due schedules across 2 backend instances; tune pool sizes, decide if a real broker is needed | 5 |
| 14 | Docker Compose finalization (Redis wired in, retention job scheduled, config values externalized) | all above |

---

## 14. Non-Functional Targets

- Scheduler must correctly handle **≥ 500 active schedules** with **zero duplicate or dropped executions** across 2 backend instances (Phase 13 is the proof).
- No single execution history write should block the scheduler's claim loop — execution stays on the worker pool, never the poller thread.
- DB row size for `execution_history` stays small regardless of target API response size (enforced by the 50KB inline threshold + MinIO offload).
- All new tables indexed for the query patterns the UI actually uses (by-API, by-module, by-schedule, all time-ordered) — listed explicitly in Section 3.
- Every secret at rest is encrypted; every secret in a history record is masked.

---

## 15. Assumptions Made (flag if wrong)

- You're fine introducing **Redis** as new infrastructure (you already use it in your other project, inverseStory, so this should be familiar).
- You want to **avoid adding a message broker (RabbitMQ/Kafka)** until load testing proves the in-process bounded executor isn't enough — this keeps the compose file simple for a single-operator tool today.
- MinIO offload threshold of 50KB and retention of 90 days are reasonable starting defaults — both are config values, not hardcoded, so adjust freely.
- `user_module_access` / RBAC is **modeled but not enforced** yet, matching the "integration-ready, not yet integrated" status of the whole platform.
## also develop the functionality for the collection such as have in different platform according in my application according to my application as well as functionality to imort collections switching between the collection when user only test api not schedular (option for now )

# can design different tables if needed .