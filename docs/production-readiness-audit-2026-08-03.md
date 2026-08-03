# Testrix Production Readiness Audit — 2026-08-03

**Scope:** automation-portal, api-testing, performance-testing, genai, shell, shared/ui, gateway
**Method:** 4 independent read-only reviews (Security, Backend code/API/DB, Frontend, Deployment/Config/Cleanup), cross-referenced. No files were modified during this audit.
**Findings:** 50 verified, file:line cited.

**Overall Score: 27 / 100 — Not ready for production**

Two of three backends and the AI service have no authentication of their own and are reachable directly on published host ports; a password-reset flow hands back the OTP in its response; the database root password is `root` with the port open to the host; and the Automation module is wired to a Windows developer's D: drive, so it cannot execute a single test on a Linux host. The underlying code is genuinely well-built — the gap is entirely in what's guarding it and what's portable.

---

## 1. Critical (must fix before deployment)

### 1. api-testing, performance-testing, and genai have no authentication of their own — and their ports are published straight to the host
- **Files:** `products/api-testing/backend/pom.xml`, `products/performance-testing/backend/pom.xml`, `products/genai/service/server.js`, `products/api-testing/docker-compose.yml:40-41`, `products/performance-testing/docker-compose.yml:27-28`, `products/genai/docker-compose.yml:11-12`
- **Issue:** Neither Java service declares `spring-boot-starter-security`; genai's Express app has no auth middleware. All three rely entirely on the gateway's `auth_request` check — which is trivially bypassed by hitting ports 8081 / 8082 / 3000 directly.
- **Impact:** Anyone who can reach those ports gets full unauthenticated CRUD on API Testing collections and credentials, Performance Testing data, and can burn paid LLM API keys through genai.
- **Fix:** Add Spring Security + JWT validation to both Java backends and auth middleware to genai; stop publishing these ports to the host in any non-dev compose file.
- *Confirmed independently by Security, Backend, and Deployment reviews.*

### 2. Password-reset OTP is returned directly in the API response, not just emailed
- **Files:** `automation-portal/backend/.../auth/AuthController.java:81`, `OtpService.java:27-38`
- **Issue:** `ApiResponse.ok(Map.of("status","otp_sent","otp", otp))` — the public, `permitAll` forgot-password endpoint hands the OTP straight back in the HTTP body.
- **Impact:** Anyone who knows a user's email — including an admin's — can read the OTP from the response and immediately reset that account's password. Complete bypass of the reset flow's security control.
- **Fix:** Never include the OTP in the response; deliver by email only, with no "console mode" shortcut reachable in production builds.

### 3. JWT signing secret and API-testing's encryption key are real, committed defaults — never overridden in deployment
- **Files:** `automation-portal/backend/.../application.yml:47`, `api-testing/backend/.../application.yml:45`
- **Issue:** `PORTAL_JWT_SECRET` falls back to `change-this-secret-to-a-long-production-grade-value-of-at-least-256-bits`; `APITESTING_ENCRYPTION_KEY` falls back to a base64 value that decodes to `dev-only-key-change-in-prod-0001`. Neither var is set in either product's docker-compose.yml.
- **Impact:** As currently deployed, anyone with repo access can forge a valid JWT for any user — including SUPER_ADMIN — and decrypt every credential api-testing has "encrypted."
- **Fix:** Make both mandatory environment variables with no insecure fallback — fail fast at startup if unset or still equal to the dev-marker default — and rotate both before deployment.
- *Confirmed independently by Security, Backend, and Deployment reviews.*

### 4. A default SUPER_ADMIN account reseeds itself on every boot, in every environment
- **File:** `automation-portal/backend/.../config/DataSeeder.java:12, 28-56`
- **Issue:** `DataSeeder implements CommandLineRunner` with no profile guard; it creates or reactivates `superadmin@gmail.com` / `password` on every single startup.
- **Impact:** A well-known, trivial super-admin credential exists in any fresh or reset production database from first boot.
- **Fix:** Gate behind `@Profile("!prod")` or require an env-supplied password for any production seed — never a fixed literal.
- *Confirmed independently by Security, Backend, and Deployment reviews.*

### 5. Shared MySQL root password is the literal word "root", and the port is open to the host
- **Files:** `platform/docker-compose.yml:7-10`, every product's DB env vars (e.g. `automation-portal/docker-compose.yml:19-20`)
- **Issue:** `MYSQL_ROOT_PASSWORD: root`, `MYSQL_ROOT_HOST: "%"`, `ports: "3306:3306"` — and every backend connects as `root`/`root`, none sourced from an `.env` file.
- **Impact:** Anyone reaching host:3306 gets unrestricted root access to every product's data and stored credentials — including the plaintext ones below — in one connection.
- **Fix:** Generated root password via a gitignored `.env`, remove the `%` host wildcard, stop publishing 3306, move each backend to a least-privilege service account.
- *Confirmed independently by Security and Deployment reviews.*

### 6. Environment credentials are stored as plaintext and served in full to any logged-in user, not just admins
- **Files:** `automation-portal/backend/.../environments/EnvironmentController.java:31-34`, `modules/ModuleController.java:55-65`, `environments/EnvironmentEntity.java:18-20`
- **Issue:** `GET /api/environments` and `GET /api/modules/{id}/environments` both return the full `configJson` column (target-environment logins, captcha keys) unencrypted, and neither route is admin-restricted — broader than the previously-known, deliberately-deferred finding from 2026-07-29.
- **Impact:** Any VIEWER-level account can pull every test environment's live credentials in cleartext.
- **Fix:** Restrict both endpoints to SUPER_ADMIN, or strip `configJson` from the response DTO (as `ModuleController.environmentOptions()` already correctly does elsewhere); encrypt the column at rest.

### 7. Unauthenticated path traversal in the report-artifact service
- **File:** `automation-portal/report-artifact-service/.../service/ReportArtifactService.java:121-128`
- **Issue:** The screenshots artifact path takes a `subPath` straight from the URL and resolves it with no `.normalize()` or containment check — the service itself has no authentication at all.
- **Impact:** `../../` sequences let any container on the docker network — including the framework-runner, which already runs with `SYS_ADMIN` — read arbitrary files inside the container.
- **Fix:** Normalize and verify path containment before serving, matching the correct pattern api-testing's own `LocalGzipBodyStore.resolve()` already uses.

### 8. The entire Automation module is wired to a Windows developer's D: drive — it cannot run on a Linux host at all
- **Files:** `automation-portal/docker-compose.yml:36, 40, 96-97`, `automation-portal/backend/.../application.yml:51-52`
- **Issue:** Test-framework source is bind-mounted from `D:/New folder/MPHIDB` and `D:/playwright-js` — both the docker volume and the application config's literal default path.
- **Impact:** Not a security gap — a functional one. On any Linux production host these paths don't exist, so the Automation product cannot execute a single test.
- **Fix:** Bake the framework source into the image, or populate a CI-managed volume, instead of a bind mount tied to one machine.

### 9. The live session token is written to the browser console on every execution run
- **File:** `automation-portal/frontend/.../execution/ExecutionCenter.jsx:358-359`
- **Issue:** `console.log("Connecting to SSE stream:", url)` logs the SSE URL including the raw access token as a query parameter, every time a run starts.
- **Impact:** Anyone with devtools access — a browser extension, a screen-share, a bug-report screenshot — can lift a live session token.
- **Fix:** Remove the log line, or strip the token before logging the path.

---

## 2. High Priority (fix soon after launch blockers)

1. **Profile image upload trusts the client's Content-Type header and keeps the original file extension** — `ProfileController.java:63-78`. Spoofed-header SVG/HTML upload is a stored-XSS path. Sniff actual bytes; force a fixed safe extension.
2. **No security headers anywhere in the stack** — gateway/nginx.conf and every product's frontend nginx.conf. No CSP/X-Frame-Options/X-Content-Type-Options/HSTS. Add once at the gateway.
3. **Execution-event webhook key defaults to the literal "shared-secret"** — `application.yml:41`, `ExecutionEventController.java:44`. Mandatory env var, no fallback.
4. **JWT accepted via URL query parameter** — `JwtAuthenticationFilter.java:37-39`. Leaks into browser history/proxy/access logs. Remove the fallback.
5. **Public report/screenshot routes use sequential, enumerable execution IDs with no auth** — `SecurityConfig.java:59-61`, `ReportController.java:64-119`. Replace with an unguessable token if public linking must stay.
6. **Exception handling is inconsistent — one backend leaks raw error text** — automation-portal has no catch-all handler at all; performance-testing echoes `ex.getMessage()` to clients; api-testing's pattern (log detail server-side, generic message out) is correct and should be the standard.
7. **API response shape is inconsistent across the three backends** — automation-portal/performance-testing wrap in `ApiResponse<T>`, api-testing returns raw entities. Pick one envelope platform-wide.
8. **Dashboard service re-aggregates full execution history on every request, no caching** — `DashboardService.java:40, 125, 182, 484`; `getRegressionAlerts` has no date filter at all. Push filtering into repository queries; add short-TTL caching.
9. **Request validation markedly weaker in automation-portal than its siblings** — 57% of `@RequestBody` params validated vs. 90%+ elsewhere. Add `@Valid` + Bean Validation to admin/config endpoints and the event webhook.
10. **A debug script with real hardcoded credentials is committed at the repo root** — `verify-tab-switch.js`. Delete it or move under a gitignored dev-scripts folder.
11. **No root-level `.env.example` or deployment documentation** exists anywhere. Add one enumerating every secret/credential env var referenced across compose files.
12. **In-memory SSE subscriber registries will silently break under horizontal scaling** — `LiveBroadcastService.java:20,26`, `SseEmitterManager.java:20,23`. Document single-instance-only, or back with Redis pub/sub before scaling out.
13. **`DataTable.jsx` is duplicated between shell and automation-portal and has now drifted** — automation-portal's copy gained sticky-column support the shell's copy never got. Move into shared/ui.
14. **Zero React error boundaries across all four apps** — every product renders inside a shell iframe; one uncaught exception currently blanks the whole panel. Highest-leverage single frontend fix.
15. **Three fully-built dashboard components are dead code** — `DurationSparkline.jsx`, `RunHeatmap.jsx`, `RegressionAlerts.jsx`, never imported anywhere. Wire in or delete.

---

## 3. Medium Priority (real debt, schedule it)

1. genai has wildcard CORS and no rate limiting (`server.js:8`).
2. Sensitive credentials stored as plaintext columns in performance-testing (`auth_value` in `perf_virtual_user`, `perf_performance_test`, `perf_load_test`) — second independent instance of the credential-storage pattern.
3. Missing index for date-filtered dashboard analytics queries on `execution_test_cases` (failure analysis / slow-test / flaky-test).
4. Blocking file I/O executed inside a DB transaction on the execution-event webhook request thread (`ExecutionEventService.java`).
5. Hand-built JSON via `String.format` without escaping — a quote character would break the payload (`ExecutionWorker.java:190-194`).
6. Several list endpoints (collections, groups, regular APIs, module admin) return unbounded `findAll()` results with no pagination.
7. No shared Java library across the three backends — `ApiResponse<T>` duplicated verbatim, exception handling reinvented per service.
8. Nearly every container runs as root — only framework-runner drops privileges.
9. Healthcheck coverage is inconsistent — execution-manager, framework-runner, report-artifacts, genai-service have none.
10. No graceful shutdown configured in any of the four `application.yml` files.
11. `docker-compose.loadtest.yml` references services/networks that no longer exist — would fail outright as documented.
12. Orphaned per-product frontend Dockerfiles/nginx.conf unused by any compose file — dead build config.
13. Uncommitted dev-specific Vite proxy port (`127.0.0.1:18080`) sits in automation-portal's `vite.config.js` while siblings document `8080`.
14. A private viewport-centering hook duplicates one already in shared/ui (`shared/index.jsx:106-139` vs `useViewportBounds.js`).
15. The shared Modal's close button has no accessible name — propagates to nearly every modal in two of the four apps.
16. automation-portal lost its themed `ConfirmDialog` but kept the dead CSS for it, falls back to unstyled native `window.confirm()`.
17. `LogsViewer.jsx` recomputes filter/count arrays on every render instead of `useMemo` (already used two lines below in the same file).

---

## 4. Low Priority (worth noting, not urgent)

1. New admin resync endpoint has no frontend caller yet — by design, documented as a manual escape hatch.
2. genai's in-memory chat history has no size cap.
3. Broad `catch(Exception)` swallowing throughout automation-portal's worker classes masks recoverable-vs-unrecoverable distinctions.
4. `-DskipTests` baked into 4 of 6 Java image builds — confirm CI runs tests separately.
5. genai's `.env` with live LLM API keys sits in plaintext on disk (correctly gitignored) — confirm production uses a real secrets manager.
6. Folder-organization convention differs between products (feature-based vs. type-based) — no canonical doc either way.
7. Execution form state threaded through 17 props from `App.jsx` into `ExecutionCenter`.
8. `genai/frontend` is an unbuilt Vite scaffold with no shell integration, theming, or shared/ui usage.
9. Minor import-style inconsistency: shell re-exports `hierarchyRows.js` instead of importing shared/ui directly.

---

## 5. Security Findings — Synthesis

Six of the nine Critical findings are security issues, spanning network exposure, secret management, authentication, authorization, and input handling. automation-portal has a real Spring Security stack and generally applies it correctly, but that stack was never extended to api-testing, performance-testing, or genai, and several of automation-portal's own endpoints (environment credentials, the OTP response, the artifact path resolver) fall outside what its own security config was built to guard.

**Security posture: 15 / 100.** As deployed from these compose files, there is effectively no working authentication boundary anywhere in the stack — every Critical item above is independently sufficient for full compromise, and several stack together.

---

## 6. Performance Findings — Synthesis

No correctness bugs — every performance finding is a scaling concern currently invisible at Testrix's data volume, which will surface as execution history grows. The dashboard's full-table in-memory aggregation is the one worth prioritizing since it's on the platform's most frequently hit read path.

**Performance posture: 64 / 100.** Unbounded dashboard aggregation, one N+1 pattern in artifact copying, a missing index, and unmemoized frontend filters — all real, none urgent at current scale.

---

## 7. Code Quality Findings — Synthesis

The strongest area of the review. automation-portal's backend was independently described as "the most mature of the three... thoughtful, well-commented code explaining why non-obvious decisions were made," and the frontend was independently called "noticeably better shape than a codebase with this many incremental redesigns typically is." The debt that exists is concentrated and structural — three backends built independently and integrated later, so response envelopes, exception handling, and credential-storage patterns were each reinvented two or three times with visible drift, rather than any one part being poorly written.

- **Backend: 68 / 100** — mature domain model, thoughtful comments; weakest link is cross-service consistency, not any single service's internals.
- **Frontend: 74 / 100** — clean lifecycle handling, consistent shared/ui adoption in most places.

**Specifically verified as done right:**
- SSE subscriptions and `setInterval`/`setTimeout` timers correctly cleaned up on unmount across Dashboard, ExecutionCenter, LoadTests, RunHistory, Scheduler.
- No `.bak`/`.old`/`.orig` files anywhere in the tree; `.gitignore` correctly excludes `node_modules`, build output, env files.
- The Test Case Catalog backfill runner is a properly idempotent, DB-guarded one-time job — not demo-data seeding.
- api-testing's exception-handling pattern (log full detail server-side, generic message to the client) is the correct model — the other two backends should match it.
- Multi-stage Docker builds are used correctly everywhere they're used at all.

---

## 8. Deployment Readiness Assessment

Every blocker in this category is a configuration or compose-file problem, not an architecture problem — mostly a day or two of focused work: mandatory env vars with no insecure fallback, one missing Spring Security dependency added twice, one path-normalization call, and moving the Automation framework source out of a personal bind mount.

**Deployment posture: 38 / 100.** A public-facing deploy from these files as-is would ship an open database, open backend APIs, and one entire product that can't execute — alongside root-user containers, inconsistent healthchecks, and no graceful shutdown as secondary hardening gaps.

---

## 9. Overall Production Readiness Score

Weighted, not averaged — a critical security or functional blocker makes the platform not-ready regardless of how well-built the code underneath it is.

| Domain | Score | Weight |
|---|---|---|
| Security | 15/100 | 40% |
| Deployment | 38/100 | 30% |
| Backend code quality | 68/100 | 15% |
| Frontend code quality | 74/100 | 15% |
| **Overall** | **27/100** | — |

**Overall score: 27 / 100 — Not ready for production.**

Close the nine Critical items and this number moves fast — the underlying architecture and code quality (68-74/100 on their own) are genuinely production-grade. What's missing isn't better code; it's the guardrails around the code that already exists: authentication on two backends and one service, mandatory secrets with no fallback, encrypted credential storage, and a portable path for the Automation framework's source. None of the nine require a redesign.

---

## Roadmap (per user's plan)

1. Complete this production readiness review — **done**.
2. Resolve all safe production issues (no breaking changes) — **next**.
3. Re-test to ensure no regressions.
4. Implement the Workspace Management feature.
5. Final regression testing.
6. Deploy the first production-ready version of Testrix.

*Compiled from 4 independent read-only codebase reviews. No files were modified during this audit. Interactive version: https://claude.ai/code/artifact/1938d424-a81b-4a4e-9f29-9678f3c7f3d8*
