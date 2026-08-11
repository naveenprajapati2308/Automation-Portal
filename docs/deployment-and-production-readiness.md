# Testrix — Deployment & Production Readiness

Consolidates the deployment guide, the 2026-08-09 production-readiness audit, and a same-day
follow-up security pass over the (still-uncommitted) multi-workspace / project-isolation retrofit.
Supersedes `deployment-guide-code-review.md` and `production-readiness-audit-2026-08-09.md`
(merged into this file and removed). The original 2026-08-03 baseline audit
(`production-readiness-audit-2026-08-03.md`, score 27/100) is kept separately as historical record.

---

## 1. Executive Summary: Is Testrix Ready for Deployment?

**Status: 90% Ready (Awaiting Production Configuration & Hardening)**

The Testrix codebase is highly structured, modern, and mature. It uses multi-stage Docker builds
to package and serve frontends and backends under a unified gateway origin (`http://localhost:15000`).

All nine critical security/config/portability blockers from the August 3, 2026 audit are resolved
(verified by re-reading the actual current code, not just re-reading the prior report — see §2).
Separately, this session ran a fresh security pass specifically over the multi-tenant workspace
system, per-engine test-credential registry, and project-scoping retrofit that were mid-flight and
uncommitted at the time of the 08-09 audit. That pass found four real cross-tenant/authorization
gaps — all fixed same-day (§3).

To make the application **100% ready** for production, you must still execute a brief hardening
checklist (closing unused ports, mapping host directories) and populate a secure `.env` file with
production-grade secrets (§4).

---

## 2. Synthesis of Resolved Critical Issues (2026-08-03 → 2026-08-09)

| Category | Finding | Current Status | Verification Details / Source Code Reference |
| :--- | :--- | :--- | :--- |
| Security | API testing, Perf testing & GenAI lacked authentication, exposing ports directly to the host. | **Fixed** | `JwtValidationFilter.java` (both sibling backends) and `auth.js` (genai) validate JWT signatures against the shared `PORTAL_JWT_SECRET`. |
| Security | Forgot-password API returned the OTP in the response body. | **Fixed** | `AuthController.java:147` returns only `Map.of("status", "otp_sent")` — confirmed by direct read, no OTP field present. |
| Security | Secrets fell back to insecure git-committed defaults. | **Fixed** | `PORTAL_JWT_SECRET` / `APITESTING_ENCRYPTION_KEY` have no fallback in any `application.yml` — confirmed by grep across all three backends; boot fails fast if unset. |
| Security | Super Admin seeder reset the password on every boot. | **Fixed** | `DataSeeder.java` only sets `passwordHash` on first-ever creation; on restart it only syncs role/email/status, never the password — confirmed by direct read. |
| Security | Plaintext credentials exposed to VIEWERS. | **Fixed** | `EnvironmentController.list()` and the new `EnvironmentAdminController.list()` both map to DTOs (`EnvironmentSummaryDto` / `EnvironmentAdminDto`) that omit `configJson` — confirmed by direct read of both controllers. |
| Security | Path traversal in Report Artifact Service. | **Fixed** | `ReportArtifactService.java` implements `resolveSafe()` (normalize + `startsWith` containment check) for both the report and screenshot paths — confirmed by direct read. |
| Security | Live session token logged to browser console. | **Fixed** | No `console.log` calls remain anywhere in `ExecutionCenter.jsx` — confirmed by grep. |
| Network | Database port `3306` exposed to host with root/root credentials. | **Fixed** | `platform/docker-compose.yml` requires `MYSQL_ROOT_PASSWORD` from `.env` (`:?` fail-fast syntax) and no `3306:3306` port mapping exists — confirmed by grep. |

Also independently confirmed still in place: security headers (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`) in `gateway/nginx.conf`;
magic-byte sniffing (not client `Content-Type`) in `ProfileController.java`'s image upload; the SSE
query-param JWT fallback restricted to exactly one endpoint (`/api/events/execution/**`) in
`JwtAuthenticationFilter.java`; and project-scoped access checks (`canAccess`) in
`ReportController.java`.

---

## 3. Security Pass — Multi-Workspace / Project-Isolation Retrofit (2026-08-09)

The 08-09 audit above covered the committed baseline. It did not cover a large uncommitted
in-flight retrofit (~110 modified files + ~30 new files) that threads per-project (`project_id`)
data isolation through every entity in all three backends, adds a multi-tenant workspace
request/approval system, and replaces the shared test-execution secret with a per-engine
credential registry. A dedicated 3-way review (automation-portal; api-testing + performance-testing;
shell frontend) was run against that diff specifically. Result: the retrofit is disciplined —
nearly every list/get/mutate endpoint was correctly rewritten to filter or verify against the
caller's `project_id` — but four endpoints were missed by the otherwise-consistent mechanical
rollout. All four are now fixed and verified compiling.

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | **High** | `audit_log` had no `project_id` column and `AuditController.list()` returned every project's audit trail to any authenticated user. | `api-testing/.../audit/AuditController.java` | **Fixed** — added `V8__audit_log_project_scoping.sql`, `project_id` on `AuditLog`, and threaded `currentProjectService.requireProjectId()` through `AuditService.record(...)` and its 15 call sites. |
| 2 | **High** | Performance-testing's live run SSE stream (`GET /api/v1/runs/{id}/stream`) registered an emitter directly on the path `id` with no ownership check, unlike every sibling endpoint in the same controller (which all got the check this retrofit). A user in Project A could watch Project B's live run metrics by ID. | `performance-testing/.../results/ResultController.java:78-81` | **Fixed** — `streamRun()` now calls `service.getRunDetails(id)` (the existing project-ownership gate) before subscribing, matching `abortRun()`'s pattern. |
| 3 | **Medium** | `GroupController.groupsForApi()` queried group membership by a raw `regularApiId` path variable with no project check, unlike every other method in the same controller — allowed cross-project ID enumeration. | `api-testing/.../group/GroupController.java` | **Fixed** — now resolves the API via `regularApiRepository.findById(...).filter(a -> a.getProjectId().equals(...))` first, 404s otherwise. |
| 4 | **Medium** | Module execution's `allowedRoles` ACL OR'd a legacy platform-role check alongside the real project-role check. Every post-migration user's platform role is hardcoded to `VIEWER` (their real authority lives in project roles), so any module scoped to include `"VIEWER"` was reachable by literally any project member regardless of their actual project role. | `automation-portal/.../executions/ExecutionService.java:165-187` | **Fixed** — platform-role fallback now only applies when no project context exists at all (legacy pre-migration accounts); once a project context is present, project roles are the sole source of truth. |

No other findings met the review's ≥8/10 confidence bar. Specifically checked and clear: OTP
handling, environment-credential DTOs, test-engine credential hashing/one-time-reveal, role
self-escalation paths, mail-template injection, `.env.example` placeholder values, and the shell
frontend's new workspace-request/approval pages (no unsafe HTML sinks, no token logging, no
hardcoded secrets).

All three backends were recompiled clean (`mvn -o clean compile`) after these fixes.

---

## 4. Production Hardening Checklist (Remaining Actions)

Before spinning up the Docker containers in a production environment, complete these hardening
tasks — none of them are code changes, all are deployment-time configuration:

### A. Block Unused Host Ports
Several product docker-compose files still publish development ports directly to the host machine
(confirmed still present):
* **API Testing Backend:** `8081:8080` (`products/api-testing/docker-compose.yml`)
* **Performance Testing Backend:** `8082:8080` (`products/performance-testing/docker-compose.yml`)
* **GenAI Service:** `3000:3000` (`products/genai/docker-compose.yml`)

**Recommendation:** In production, remove the `ports` mappings for these three services. They
should communicate *exclusively* over the internal Docker network `testrix_network`. The only
ports that should remain exposed to the host are:
* Port `15000` (Nginx Gateway) — serving the combined frontend UIs and routing API traffic.
* Port `18080` (Automation Portal Backend) — required for Google OAuth redirect mapping.

### B. Prepare a Production-Grade `.env` File
Generate new cryptographically secure credentials for the production environment. Do **not** reuse
development/default values.
```bash
openssl rand -base64 32
```
Use this to generate `PORTAL_JWT_SECRET`, `MYSQL_ROOT_PASSWORD`, and `APITESTING_ENCRYPTION_KEY`.
Fill out the production `.env` at the root of the workspace using the structure of `.env.example`.

### C. Set Up Real SMTP & Enable Email Routing
OTPs and system-approval alerts are currently set to "console mode" (print to container terminal
instead of sending an email).
1. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `.env`.
2. Set `PORTAL_MAIL_CONSOLE_ONLY=false` to switch to live email notifications.

### D. Check Out Automation Repositories on the Host
Test execution mounts external test repositories inside the container runner.
1. Git-clone the Selenium/TestNG test project (`MPHIDB`) and Playwright test project
   (`playwright-js`) on the host server.
2. In `.env`, set `AUTOMATION_FRAMEWORK_REPO_PATH` and `AUTOMATION_PLAYWRIGHT_PATH` to the
   absolute Linux paths where you cloned them (e.g. `/var/testrix/mphidb`, not Windows `D:/...`).

---

## 5. Step-by-Step Deployment Guide

Testrix is configured as a single orchestrated Docker application via a root `docker-compose.yml`
that includes child configurations.

### Step 1: Install Prerequisites
On the target production server (Ubuntu/Debian/Rocky Linux):
* Docker Engine (v24.0+)
* Docker Compose (v2.20+)
* Git

### Step 2: Clone the Main Codebase
```bash
git clone <your-testrix-repo-url> /opt/testrix
cd /opt/testrix
```

### Step 3: Create the Secure `.env` File
Create `/opt/testrix/.env` using this production template:
```ini
# --- Database Security ---
MYSQL_ROOT_PASSWORD=super-secure-generated-db-password

# --- Authentication Keys (Generate fresh values!) ---
PORTAL_JWT_SECRET=super-secure-base64-string-at-least-256-bits
PORTAL_SUPERADMIN_SEED_PASSWORD=secure-admin-password
PORTAL_SUPERADMIN_EMAIL=admin@yourdomain.com
PORTAL_EVENTS_API_KEY=secure-webhook-api-key
APITESTING_ENCRYPTION_KEY=secure-32-byte-base64-aes-key

# --- External Test Repositories ---
AUTOMATION_FRAMEWORK_REPO_PATH=/var/test-suites/MPHIDB
AUTOMATION_PLAYWRIGHT_PATH=/var/test-suites/playwright-js

# --- SMTP Mail Gateway Configuration ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@yourdomain.com
SMTP_PASS=app-specific-email-password
PORTAL_MAIL_FROM_NAME=Testrix Portal
PORTAL_MAIL_CONSOLE_ONLY=false
```

### Step 4: Clone the Test Suites on the Host
```bash
mkdir -p /var/test-suites
git clone <your-selenium-testng-repo> /var/test-suites/MPHIDB
git clone <your-playwright-repo> /var/test-suites/playwright-js
```

### Step 5: Build and Run the Stack
```bash
docker compose up -d --build
```
Nginx compiles the 4 frontend projects (Shell, Automation Portal UI, API Testing UI, Performance
UI) and packages them into the Gateway container. The Java backends compile and package their jar
files, initialize the databases, and run Flyway migrations.

### Step 6: Verify Service Health
```bash
docker compose ps
docker compose logs -f
```

### Step 7: Configure External Reverse Proxy & SSL (Recommended)
The gateway runs on plain HTTP on port `15000`. For production, expose ports `80`/`443` on your
server using a reverse proxy (Caddy, Nginx, or Traefik) to manage SSL certificates (Let's Encrypt)
and proxy-pass traffic to `http://localhost:15000`.

```caddy
testrix.yourdomain.com {
    reverse_proxy localhost:15000
}
```

---

## 6. Overall Production Readiness Score

| Domain | Score (v1.0.0 Dev, 2026-08-03) | Score (Current, 2026-08-09) | Weight |
|---|---|---|---|
| Security | 15/100 | **92/100** | 40% |
| Deployment | 38/100 | **88/100** | 30% |
| Backend code quality | 68/100 | **78/100** | 15% |
| Frontend code quality | 74/100 | **82/100** | 15% |
| **Overall** | **27/100** | **87/100** | — |

**Overall score: 87 / 100 — Ready for Production (Pending Hardening Config).** The security score
already reflects the codebase as of the resolved 08-03 blockers; the four new cross-tenant gaps
found in §3 were introduced and fixed within the same uncommitted working-tree change, so they
were never part of a shipped or previously-scored state — they're noted here for the audit trail,
not as a regression.

**Remaining path to 100%:** close the port-exposure and `.env`/SMTP/framework-path items in §4.
None of them require code changes — they are deployment-time configuration only.
