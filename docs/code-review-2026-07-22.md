# Testrix Platform Code Review — 2026-07-22

Read-only audit. Nothing in this document has been fixed yet — this is the map for deciding what to fix first.

**Scope:** Automation Portal (backend + frontend), API Testing (backend + frontend), Platform shell / gateway / shared / GenAI.

**Method:** Five parallel read-only reviews, one per codebase area, each grepping for actual usage before flagging anything as dead. No files were modified.

**Scorecard:** 2 Critical · 8 High · 18 Medium · 8 Low security findings — plus ~40 unused-code items (including two entire orphaned services) and ~25 duplicate-code groups.

---

## 1. Security findings

### Critical — 2

**Super-admin account self-heals to a hardcoded password on every boot**
`config/DataSeeder.java:29-38, 41-57` (Automation Backend)
Seeds `superadmin@gmail.com` / `password` on first boot, then on **every subsequent boot** force-resets that account back to `SUPER_ADMIN` / `ACTIVE` / verified — even if an admin disabled or demoted it. Runs unconditionally in the deployed image, not gated to a dev/seed profile.

**Forgot-password returns the OTP directly in the response — full account takeover with just an email address**
`auth/AuthController.java:76-82` + `shell/components/auth/AuthPage.jsx:68-71, 165-171` (Automation Backend + Shell)
`/api/auth/forgot-password` is `permitAll` and returns the raw OTP in its JSON body; the shell then renders that OTP on-screen as "Your OTP Code." Production mail is console-only (`PORTAL_MAIL_CONSOLE_ONLY: "true"` in docker-compose), so no real email is ever sent — the attacker *is* the recipient. Knowing any user's email is sufficient to reset their password immediately via `/api/auth/reset-password`.

### High — 8

- **Same OTP-in-response pattern on email-change** — `profile/ProfileController.java:89-100` (Automation Backend). Lower impact (requires a session), but defeats the point of OTP verification the same way.
- **OTPs logged in plaintext at INFO level** — `auth/MailService.java:25-29` (Automation Backend). Fires whenever mail is console-only, which is the current production config.
- **Weak default JWT secret and shared API key are live in production** — `application.yml:41,47`, `execution-manager/application.yml:25` (Automation Backend). `docker-compose.yml` never sets `PORTAL_JWT_SECRET`, `PORTAL_EVENTS_API_KEY`, or `EM_PORTAL_API_KEY` — the committed placeholder values (`change-this-secret-to-a-long-production-grade-value...` and literal `shared-secret`) are what's actually running. Anyone who reads the repo can forge valid JWTs for any user or role.
- **Database root credentials hardcoded and in use** — `application.yml:13-14`, docker-compose (`SPRING_DATASOURCE_PASSWORD`, `EM_DB_PASS`) (Automation Backend). Plaintext `root`/`root`, committed and actually the credential used at runtime.
- **Unauthenticated arbitrary file read via path traversal** — `report-artifact-service/service/ReportArtifactService.java:99-100, 121-128` (Automation Backend). No `..`-containment check, unlike the correct pattern already used in `ScreenshotController.java:103-107`. The whole service also has zero authentication. Mitigated today by nginx not exposing port 9091 externally, but any already-compromised container on the docker network gets arbitrary file read for free.
- **MySQL published to the host with default root credentials** — `platform/docker-compose.yml:5-9` (Platform/Gateway). `MYSQL_ROOT_PASSWORD: root`, `MYSQL_ROOT_HOST: "%"`, port 3306 published to the host. The port exposure is a documented, deliberate decision — the weak credential behind it is not.
- **Saved Collection request credentials stored — and exported — in plaintext** — `collections/CollectionRequest.java:36-39`, `collections/PostmanExportService.java:151-175` (API Testing Backend). `configJson` has no `@Convert(EncryptedStringConverter)`, unlike the identical `authConfig` field on `BaseApi`/`RegularApi`. Every Basic/Bearer/API-key credential saved on a Tester/Postman-imported request sits in the DB unencrypted, and is re-emitted in plaintext on export.
- **Field-encryption key defaults to a hardcoded value with no override found anywhere in the repo** — `application.yml:45` (`apitesting.encryption.key`) (API Testing Backend). Defaults to base64 of `dev-only-key-change-in-prod-0001`; nothing in this repo sets `APITESTING_ENCRYPTION_KEY`. If this default reaches a real deployment, the encryption on `BaseApi`/`RegularApi.authConfig` is decorative.

### Medium — 18

- **execution-manager has no authentication of any kind** — `em/api/ExecutionManagerController.java` (Automation Backend). Job submission, cancel/pause/resume, runner registration all wide open on the docker network.
- **framework-runner has no auth and logs the shared secret in plaintext** — `runner/FrameworkRunnerService.java:177` (Automation Backend). `/runner/run|cancel|suites` unauthenticated; full Maven command line including `-DportalApiKey=<secret>` printed to container logs.
- **Outbound job requests logged with the API key included** — `em/runner/RunnerClient.java:40` (Automation Backend).
- **XML parser has no XXE hardening** — `executions/TestNGXmlParser.java:31-33` (Automation Backend). `DocumentBuilderFactory` with no `disallow-doctype-decl`/external-entity restriction.
- **No role-based authorization beyond `/api/admin/**`** — `config/SecurityConfig.java:71-72`, `environments/EnvironmentController.java:30-68`, `portal/PortalConfigController.java:23-34`, `executions/ExecutionController.java` (Automation Backend). Zero `@PreAuthorize`/`@Secured` anywhere — a Viewer has Admin's power everywhere else.
- **Server-side request to an admin-configurable URL, settable by any authenticated user** — `environments/EnvironmentHealthService.java:52-59` (Automation Backend). Stored-SSRF-adjacent, compounds the missing-authorization finding above.
- **JWT accepted via `?token=` query parameter** — `auth/JwtAuthenticationFilter.java:38` (Automation Backend). Necessary for `EventSource` (can't set headers), but leaks tokens into access/proxy logs and browser history.
- **Refresh tokens stored in plaintext** — `auth/RefreshToken.java:15`, `auth/RefreshTokenService.java:24-30` (Automation Backend). Passwords are correctly BCrypt-hashed; refresh tokens aren't.
- **Profile image upload trusts client-supplied Content-Type only** — `profile/ProfileController.java:60-70` (Automation Backend). No magic-byte validation.
- **Request/response bodies stored unencrypted — including login payloads** — `history/ExecutionHistory.java`, `history/ExecutionHistoryService.java:153-179` (API Testing Backend). Header masking exists but doesn't extend to body content.
- **User-supplied regex in validation rules has no timeout — ReDoS** — `validation/ValidationEngine.java:70-71, 114-126` (API Testing Backend).
- **Artifact uploads reachable with no authentication** — `gateway/nginx.conf:38-44` (Platform/Gateway). Unlike `/apitest/api/` and `/genai/`, no `auth_request` here.
- **`/automation/api/` not gated at the gateway layer, unlike its sibling products** — `gateway/nginx.conf:16` (Platform/Gateway). May be covered by the backend's own Spring Security filter — worth confirming rather than assuming.
- **No security headers anywhere in the gateway** — `gateway/nginx.conf` (Platform/Gateway). No `X-Frame-Options`/CSP `frame-ancestors`, no HSTS, no `Referrer-Policy`, no `X-Content-Type-Options`.
- **No rate limiting on login or OTP endpoints** — `gateway/nginx.conf` (Platform/Gateway). Compounds the critical OTP finding — a 4-6 digit OTP with no throttling is trivially brute-forceable.
- **Environment "secret" values are only cosmetically masked** — `environments/EnvironmentView.jsx` (~line 41-198) (Automation Frontend). Real values already sit in React state/DOM regardless of the "Show values" toggle.
- **Access token logged to the browser console** — `execution/ExecutionCenter.jsx:220` (Automation Frontend). `console.log` of an SSE URL that embeds the raw JWT.
- **Bearer token passed via SSE URL query string** — `dashboard/Dashboard.jsx:121-123`, `execution/ExecutionCenter.jsx:218-219` (Automation Frontend). Known `EventSource` limitation, but still lands in logs/history.

### Low — 8

- **Password policy inconsistent across two endpoints** — `auth/AuthController.java:116-124` vs `users/UserManagementController.java:191-195` (Automation Backend).
- **Swagger/OpenAPI fully public** — `config/SecurityConfig.java:63-65` (Automation Backend). More consequential given the missing role checks above.
- **Unescaped `String.format` JSON construction** — `runner/RunnerClient.java:28-31`, `executions/ExecutionWorker.java:163-166` (Automation Backend). Latent, not currently reachable.
- **`server_tokens` not disabled** — `gateway/nginx.conf` (Platform/Gateway). nginx version disclosure.
- **Wildcard CORS on the GenAI service** — `genai/service/server.js:8` (Platform/GenAI). Low impact — container isn't host-exposed.
- **Session tokens in localStorage, platform-wide** — shell + both products' API clients. Deliberate cross-product SSO pattern, flagged for awareness.
- **Bearer token / API key fields shown unmasked** — `components/AuthEditor.jsx:22, 26-27` (API Testing Frontend). Only the Basic-auth password field is masked.
- **"Secrets masked" label trusts backend redaction with no client-side check** — `pages/History.jsx:253`, `components/RequestHistoryPanel.jsx:97` (API Testing Frontend).

---

## 2. Unused / dead code

### Platform / Shell / Gateway / GenAI
- **The entire `products/genai/frontend/` directory is orphaned.** No Dockerfile build stage produces it, no nginx location serves it.
- `shell/components/layout/index.jsx:33-36` — 10 of 15 imported lucide icons in `NAV_ICON_MAP` are dead; sub-menu items render as plain text with no icon lookup.
- `shell/components/shared/Loader.jsx` + `loader.css` — not dead, but a needless reimplementation (see Duplicates).

### Automation Portal Backend
- **The entire `report-artifact-service` is deployed and unused** — its config URL is never read by anything else in the stack.
- Orphaned `roles`/`user_roles` tables from an abandoned RBAC design — `db/migration/V2__security_identity_foundation.sql:13-27,62-72`. No `Role` entity/repo exists.
- `em/runner/RunnerClient.java:71-85` — `checkHealth()` never called.
- `em/repository/ExecutionJobRepository.java:10,12` — `findByStateOrderBySubmittedAtAsc()`, `findByExecutionId()` never called.
- `em/repository/RunnerRegistryRepository.java:8` — `findByStatus()` never called.
- `logs/LogController.java:11-14` — permanent no-op stub, always returns `[]`.
- `application-dev.yml:7` — stale, points at pre-restructuring DB name `automation_portal` instead of `testrix_platform`.
- `application.yml:51`, `runner/FrameworkRunnerService.java:67` — hardcoded local dev path `D:/New folder/MPHIDB`.
- `report-artifact-service/service/ReportArtifactService.java:39` — hardcoded path referencing an even older product name.

### Automation Portal Frontend
- **Three entire dead dashboard components** — `DurationSparkline.jsx`, `RegressionAlerts.jsx`, `RunHeatmap.jsx` — paired with 5 unused `api.js` methods.
- **A coherent unused admin/profile/auth-self-service surface** — all 11 `api.admin*` methods, plus `profile`/`updateProfile`/`uploadProfileImage`/`auditLogs`/`requestEmailChange`/`verifyEmailChange`/`forgotPassword`/`resetPassword`/`changePassword`/`me`/`configurations`/`updateConfiguration`/`compareLatest`. Reads as a feature set superseded wholesale by the shell/SSO restructuring, never removed.
- `components/shared/Field.jsx` — never imported.
- `components/shared/index.jsx:6,36` — `Metric`, `ExecutionTable` exported, never imported.
- `App.jsx:30` — `Placeholder` imported, never referenced.
- `App.jsx:6-7,41` — `LayoutDashboard`/`KeyRound` icons dead in `ICON_MAP`.
- `App.jsx:60` — `TOAST_TONES.warning` never triggered.
- **~150+ dead CSS classes in `styles.css`** — old standalone login/OTP screens, old profile page, user-management admin screen, admin panel shell, old confirm-modal, access-denied screen, internal API-docs viewer, old dashboard KPI-card skin, an AI chat widget not rendered anywhere.
- `execution.css:275-337` — `.xc-metrics`/`.xc-metric*`/`.xc-runcode`/`.xc-eye-btn`, leftover from an earlier queue-row design.

### API Testing Backend
- `collections/CollectionFolderRepository.java:11` — `findByParentFolderId()` never called.
- `history/ExecutionHistory.java:104-108` — `dnsTimeMs`, `connectTimeMs` never set, always `null`.
- `scheduling/SchedulerProperties.java:16` — `defaultMaxRetries` never read; `Schedule.maxRetries` has its own hardcoded default of 3.
- `baseapi/ApiVariableBinding.java:32-36` — `targetLocation`/`targetKey` set once, never read (possibly reserved for a future feature).

### API Testing Frontend
- **4 unused npm dependencies** — `framer-motion`, `class-variance-authority`, `clsx`, `tailwind-merge`.

---

## 3. Duplicate code

### Platform / Shell / Gateway
- `Loader.jsx`/`loader.css` duplicated wholesale between `shell/components/shared/` and `shared/ui/` — already drifted (missing a `border-radius`). `AuthPage.jsx:4` is the only consumer using the wrong copy.
- Theme storage key `'portal-theme'` hardcoded independently in `shared/ui/theme-sync.js:2` and `shell/components/layout/index.jsx:320,326` — no shared constant.
- `gateway/nginx.conf:29-36,38-44` — `/automation/uploads/` and `/uploads/` are near-identical proxy blocks, consolidatable.

### Automation Portal Backend
- API-key validation duplicated: `executions/ExecutionController.java:23-28` and `events/ExecutionEventController.java:20-21,44`.
- `updateRunnerStatus(url, status)` byte-for-byte duplicated: `em/api/ExecutionManagerController.java:281-291` and `em/runner/QueueProcessor.java:178-188`.
- `logToDb(...)` byte-for-byte duplicated: `executions/ExecutionWorker.java:431-442` and `events/ExecutionEventService.java:413-424`.
- Password-strength validation duplicated with diverging rules (see Low-severity security finding above).
- Module-code-to-display-name mapping hardcoded independently twice instead of using `ModuleRepository`: `executions/TestNGXmlParser.java:237-245` and `dashboard/DashboardService.java:406-416`.
- `auth/GoogleOAuth2SuccessHandler.java:27` — instantiates its own `BCryptPasswordEncoder` instead of injecting the bean from `SecurityConfig.java:82-84`.
- Identical hand-rolled CORS-wildcard response helpers in `runner/FrameworkRunnerService.java:322-334` and `report-artifact-service/service/ReportArtifactService.java:220-232`.

### Automation Portal Frontend
- **Delete-confirmation modal copy-pasted 3×** — `ExecutionCenter.jsx:661-680`, `ReportsCenter.jsx:400-419`, `ScreenshotsGallery.jsx:335-354`. One copy has a live bug: `ExecutionCenter.jsx` uses CSS classes only actually defined in `reports.css`, working by accident.
- Execution-comparison result UI reimplemented 3× — `ComparePage.jsx:118-229`, `ReportsCenter.jsx:331-393`, `ExecutionDetailPage.jsx:599-644`.
- `formatDuration` duplicated verbatim: `ExecutionDetailPage.jsx:127-133` and `ReportsCenter.jsx:104-110`.
- Total/Passed/Failed/Skipped stat-tile pattern hand-built twice: `Dashboard.jsx:300-323` and `ExecutionDetailPage.jsx:237-254`. The unused `Metric` component looks like an earlier attempt at this.
- Native `window.confirm`/`alert` used inconsistently alongside the app's own `Modal`/toast system, across 7 files.
- The same pass/fail/skip color convention re-encoded independently 3× — `EnvDistribution.jsx`'s `ENV_COLORS`, `TrendChart.jsx`'s `SERIES`, inline in `Dashboard.jsx`.

### API Testing Backend
- `BaseApiController` and `RegularApiController` share a near-identical CRUD/audit-wrapper skeleton.
- `parseBodyType(String)` byte-for-byte identical in `baseapi/BaseApiExecutionService.java:113-120` and `regularapi/DependencyExecutionService.java:258-265`.
- Same JSON parse/serialize try-catch pattern in `common/RequestConfigMapper.java:20-27,29-36` and `collections/CollectionVariableResolver.java:31-38`.
- The `{{var}}` placeholder regex and substitution logic implemented twice independently — `regularapi/DependencyExecutionService.java:45,194-249` and `collections/CollectionVariableResolver.java:27,66-113`.
- "Strip sensitive/heavy fields before returning list rows" block copy-pasted between `history/HistoryController.java:44-52` and `group/GroupController.java:289-295`.
- Pagination boilerplate repeated identically 3× with no shared helper — `HistoryController`, `AuditController`, `GroupController`.

### API Testing Frontend
- `prettyJson()` duplicated 4× under different names — `GroupsPanel.jsx`, `History.jsx`, `RequestHistoryPanel.jsx`, `RegularApis.jsx` (as `pretty()`).
- `fmtSize`/`formatSize` duplicated 3× — `ResponseViewer.jsx`, `History.jsx`, `RequestHistoryPanel.jsx`.
- `safeParse(s, fallback)` duplicated verbatim — `BaseApis.jsx:318-325` and `RegularApis.jsx:478-485`.
- `Section`/`Row`/`TimingCell` drawer trio duplicated near-verbatim — `History.jsx:310-339` and `RequestHistoryPanel.jsx:120-148` (plus a partial 4th variant `Meta` in `GroupsPanel.jsx`).
- `pages/Modules.jsx:94-101` reimplements `flattenModules` locally instead of importing the existing export from `BaseApis.jsx:327-334`.
- `flattenFolders` duplicated verbatim — `RequestWorkspace.jsx:19-26` and `CollectionRequestsList.jsx:38-45`.
- `ResponseViewer.jsx` and `RequestHistoryPanel.jsx` each carry a local status-color implementation instead of importing `lib/statusColors.js`.
- No `danger` variant on the shared `Button` component — every Delete button re-implements the same inline destructive styling.

---

*Produced by five parallel read-only reviews (one per codebase area), each independently grepping for actual usage before flagging anything as dead. No files were modified.*
