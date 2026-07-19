# Testrix Platform — Architecture Analysis & Restructuring Plan

Status: PROPOSED (no code changed yet) · Date: 2026-07-19

---

## 1. Current Architecture Analysis

One git repo (`d:/Automation Portal`) currently holds three unrelated products plus four Automation micro-services:

| Component | Location | Stack | Auth | DB | Ports (host) |
|---|---|---|---|---|---|
| Automation Portal backend | `backend/` | Spring Boot 3.3.5, JPA, Flyway | **Full**: JWT (jjwt 0.12.6) + refresh tokens + OTP + Google OAuth2 + mail; roles SUPER_ADMIN/ADMIN/QA_LEAD/AUTOMATION_ENGINEER/VIEWER | MySQL `automation_portal` (3306) | 18080 |
| Execution manager | `execution-manager/` | Java | shares portal DB | ↑ | 8090 |
| Framework runner | `framework-runner/` | Java + Maven + Chrome | — | — | 9090 (mounts `D:/New folder/MPHIDB`) |
| Report artifact service | `report-artifact-service/` | Java | — | shared volume | 9091 |
| Automation Portal frontend | `frontend/` | React 18 + Vite + Bootstrap, hand-rolled **hash routing** (no react-router) | consumes portal JWT | — | 15173 |
| API Testing backend | `api-testing-platform/backend/` | Spring Boot 3.3.5, WebFlux, Redis, Flyway | **NONE** (no Spring Security at all; "placeholder identity until RBAC") | MySQL `api_testing_platform` (3307) + Redis | 8081 |
| API Testing frontend | `api-testing-platform/frontend/` | React **19** + Tailwind + react-router-dom + react-query + Monaco + chart.js | none | — | 15174 |
| GenAI chat | `GenAI/GenAI/Invoke/` | Node/Express 5 + Groq SDK + Tavily; separate Vite chatbot frontend | none | in-memory (node-cache) | 3000 · **UNTRACKED in git** |

Key observations:

1. **Two isolated docker-compose stacks** (root + `api-testing-platform/`), two MySQL containers, two networks. GenAI runs outside Docker entirely.
2. **Auth exists exactly once** — in the Automation backend — and it is complete and production-shaped. This is the natural seed for platform auth. Nothing else is secured.
3. **Admin console** (`frontend/src/components/admin/` — UserManagement, PortalConfig, ModuleManagement, EnvironmentsConfig, ApiCollection, InternalDocs, AdminDashboardOverview) lives inside the Automation frontend but manages *platform* concepts (users, roles).
4. **AI chat panel** in `frontend/src/components/layout/index.jsx` is already a placeholder branded "TESTRIX AI assistant" — literally waiting to be wired to the GenAI service.
5. **Frontend stacks diverge**: React 18/Bootstrap/hash-routing vs React 19/Tailwind/react-router. Merging them into one SPA would be a rewrite — explicitly out of scope. They must stay separate apps.
6. **No CORS/cookie sharing story**: each frontend talks to its own backend on different origins/ports.
7. `docs/` has a strong context-file culture; `api-testing-platform/context/` likewise. Preserve both.

---

## 2. Proposed Enterprise Architecture

**Pattern: monorepo of independent products behind a single reverse-proxy gateway, with a thin master platform (Testrix) owning identity, administration, navigation, notifications, and the AI assistant.**

- Products remain separately deployable full-stack apps (own SPA, own backend, own schema).
- Testrix is *not* a monolith that absorbs products — it is a **shell + platform core service**.
- One origin (`http://localhost:15100` locally, later `testrix.company.com`) fronted by nginx; all products live under path prefixes. Single origin ⇒ one JWT cookie ⇒ SSO for free, zero CORS.
- Cross-product data flows through small, explicit contracts (`/api/v1/summary`, platform SDK), never through shared tables.

Deliberately rejected alternatives:
- **Single merged SPA** — rewrite, breaks "preserve existing functionality".
- **Module federation / micro-frontends** — heavy tooling for a solo-maintained platform; path-routed SPAs give 90% of the value at 10% of the cost. Can be revisited later without throwing anything away.
- **Multi-repo** — kills refactor velocity and shared-code ergonomics at this team size.

---

## 3. Recommended Folder Structure

```
testrix/                                  ← this repo, restructured via `git mv`
├── platform/
│   ├── shell/                            ← NEW: Testrix master frontend (React)
│   └── core-service/                     ← NEW: Spring Boot platform service
│                                            (auth, users, roles, admin, notifications,
│                                             activity, audit, dashboard aggregation)
├── products/
│   ├── automation-portal/
│   │   ├── backend/                      ← moved from /backend
│   │   ├── frontend/                     ← moved from /frontend
│   │   ├── execution-manager/
│   │   ├── framework-runner/
│   │   └── report-artifact-service/
│   ├── api-testing/
│   │   ├── backend/                      ← moved from /api-testing-platform/backend
│   │   ├── frontend/
│   │   └── context/                      ← keep context docs with the product
│   ├── genai/
│   │   ├── service/                      ← moved from /GenAI/GenAI/Invoke
│   │   └── frontend/                     ← its chatbot UI (eventually absorbed by shell panel)
│   └── performance-testing/              ← empty scaffold + README (future)
├── shared/
│   ├── ui/                               ← @testrix/ui: theme tokens (theme.css), chat panel,
│   │                                        DataTable/Panel/Field/Loader, nav components
│   ├── platform-client/                  ← @testrix/platform-client: JS SDK (auth, notifications,
│   │                                        activity, current-user) used by every frontend
│   └── java/testrix-commons/             ← Spring Boot starter: JWT validation filter,
│                                            security config, error envelope, audit publisher
├── gateway/
│   └── nginx.conf                        ← single entry point, path routing
├── docker-compose.yml                    ← ONE orchestration file (profiles per product)
├── docs/                                 ← platform docs (existing docs/ stays)
└── package.json                          ← npm workspaces root (frontends + shared JS)
```

`git mv` preserves history. Old `Automation Backup/`, `D:/Api`, etc. stay untouched outside the repo.

---

## 4. Frontend Architecture

- **Testrix Shell** (`platform/shell/`): new, small React 18 + Vite app. Owns: login page, global dashboard, product launcher sidebar, admin console, profile, notifications, AI chat panel, global search. Served at `/`.
- **Products keep their SPAs unchanged** except: Vite `base` set to their path prefix (`/automation/`, `/apitest/`), auth bootstrapping switched to the shared cookie/SDK, and a thin "platform bar" (product switcher + user menu + AI button) from `@testrix/ui`.
- **Navigation between products = real navigation** (href to `/automation/`), not client-side routing. Seamlessness comes from shared theme, shared top bar, and SSO — not from a single bundle.
- **Shared theme**: extract the existing `theme.css` token system (light default / dark toggle) into `@testrix/ui`; both Bootstrap and Tailwind apps consume the same CSS custom properties. Tailwind maps tokens via `tailwind.config.js`.
- React 18 vs 19 is fine because apps stay separate; `@testrix/ui` ships CSS + simple components with a permissive peerDependency range.

## 5. Backend Architecture

- **`platform/core-service`** (Spring Boot 3.3.x, seeded by extracting from Automation backend): `auth`, `users`, `profile`, `audit` packages move here nearly verbatim, plus new `notifications`, `activity`, `admin`, `aggregation` modules.
- **Product backends unchanged** in business logic; each adds `testrix-commons` starter for JWT *validation* (stateless — they never mint tokens, never see passwords).
- **GenAI service** stays Node; gains a JWT-verification middleware (same shared secret/JWKS) and moves behind the gateway at `/genai/`.
- Each product backend exposes two new platform contracts:
  - `GET /api/v1/summary` — dashboard numbers for the global dashboard
  - `GET/PUT /api/v1/admin/settings` — product settings schema+values for the central admin console

## 6. Module Boundaries

| Concern | Owner | Rule |
|---|---|---|
| Identity, sessions, roles, users | Testrix core | Products may only *read* identity from the JWT |
| Administration UI + platform config | Testrix shell/core | Product settings surfaced via each product's admin API |
| Notifications, activity, audit sink | Testrix core | Products publish events; never store platform events locally |
| AI assistant | GenAI service via Testrix | Products deep-link/context-pass only |
| Test execution, suites, reports | Automation Portal | Testrix never imports its internals |
| Collections, schedules, API runs | API Testing | Same |
| Theme, shared components | `shared/ui` | Products never fork theme tokens |

## 7. Shared Component Strategy

npm workspaces at repo root. `@testrix/ui` (theme.css, PlatformBar, AiChatPanel, DataTable, Panel, Field, Loader, toast) and `@testrix/platform-client` (login/refresh/logout, `getCurrentUser()`, `notify()`, `trackActivity()`, summary fetchers). Extraction order: theme tokens first (pure CSS, zero risk), then chat panel, then the generic components already duplicated between apps. Java side: `testrix-commons` published to the local Maven reactor (parent pom at repo root).

## 8. Authentication Architecture

- Core service issues **JWT access token + refresh token as httpOnly cookies scoped to `/`** on the single gateway origin ⇒ every product receives them automatically. (Current localStorage-bearer flow in Automation frontend migrates to cookie; a compatibility window can support both.)
- Products validate the JWT with the shared filter (shared HS256 secret initially; upgrade path: RS256 + JWKS endpoint on core service so products never hold the signing key).
- Google OAuth2, OTP flows, mail — all move with the auth package, unchanged.
- Roles stay platform-level; add a `product_permissions` table later for per-product RBAC (API Testing's "RBAC-ready" columns already anticipate this).
- API Testing backend gets security **for the first time** — greenfield, no migration pain.

## 9. Navigation Architecture

Gateway path map (single origin):

```
/                → Testrix shell (dashboard, admin, profile, login)
/automation/     → Automation Portal SPA        /automation/api/  → its backend
/apitest/        → API Testing SPA              /apitest/api/     → its backend
/perf/           → Performance Testing (future)
/genai/          → GenAI chat API
/api/platform/   → Testrix core-service
```

Shell sidebar = Dashboard · Products (Automation / API Testing / Performance) · AI Assistant · Administration · Settings · Profile. Products render the shared PlatformBar for the way back.

## 10. Cross-Product Communication

- **Dashboard aggregation**: core service fans out to each product's `/summary` server-side with a 30–60 s cache and per-product timeout; a dead product renders as "unavailable", never breaks the dashboard.
- **Events** (activity feed, notifications): products POST to `/api/platform/events` (fire-and-forget). Later upgrade: Redis pub/sub (Redis is already in the stack) for live toasts via the existing SSE/live-event pattern from the Automation dashboard.
- **No shared database tables between products. Ever.**

## 11. API Gateway

**nginx** (already used in every frontend container) — one new small container, no new technology. Handles path routing, cookie passthrough, WebSocket/SSE upgrade for live events. Spring Cloud Gateway is *not* needed now; revisit only if you need per-route rate limiting/auth offload.

## 12. Database Organization

One MySQL 8.4 container, **three schemas** (schema-per-product — cuts RAM vs today's two containers):

- `testrix_platform` — users, refresh_tokens, otp_verification, roles, notifications, activity, platform audit, feature flags, product registry
- `automation_portal` — everything else it has today (minus user/auth tables after migration)
- `api_testing_platform` — unchanged (Flyway continues: V6+…)

User-table migration is the only cross-schema data move: Flyway migration in core service creates the schema; one-time script copies `users`/`refresh_tokens`/OTP rows; Automation keeps a `user_id` reference only. Redis stays (shared instance, DB index per product).

## 13. Shared Services Architecture

Provided by core service from day one: AuthN/AuthZ, user management, audit sink, notifications, activity. Phase-later: global search (fan-out like summary), file service, analytics, feature flags, license/quota. Error-handling and logging conventions ship in `testrix-commons` (Java) and `@testrix/platform-client` (JS).

## 14–16. Migration Strategy, Refactoring & Dependency Restructuring

**Principles: `git mv` (history preserved) · one verifiable phase at a time · every phase ends with all products running · no big-bang rewrite.**

- Refactoring is almost entirely *moving*, not rewriting: auth/users/audit packages relocate to core service; admin components relocate to shell; theme.css relocates to shared/ui; GenAI relocates to products/genai.
- Root `package.json` (npm workspaces) + root parent `pom.xml` (Maven reactor: core-service, testrix-commons, product backends).
- Compose consolidates into one file with `profiles:` (`platform`, `automation`, `apitest`, `genai`) so you can still start one product alone.
- Hardcoded URLs (`FRONTEND_URL`, `PORTAL_*_URL`, `D:/New folder/MPHIDB`) become env-driven in one `.env`.

## 17. Step-by-Step Implementation Roadmap

**Phase 0 — Safety (½ day):** commit GenAI (currently untracked), tag `pre-testrix`, create `testrix-restructure` branch. Full DB dumps of both MySQL volumes.

**Phase 1 — Physical restructure (1 day):** `git mv` everything into the target tree. Fix docker-compose build contexts and Dockerfile paths only. **Verify: both stacks + GenAI run exactly as before.** No behavior change.

**Phase 2 — Unified orchestration + gateway (1–2 days):** one docker-compose, one network, one MySQL (import both dumps as schemas), nginx gateway container, Vite `base` per product. **Verify: everything reachable under one origin via path prefixes; old ports still published during transition.**

**Phase 3 — Core service + shell (3–5 days):** scaffold `platform/core-service` by extracting auth/users/profile/audit from Automation backend; `testrix_platform` schema + user data migration; scaffold `platform/shell` with login, sidebar, profile, placeholder dashboard. Automation backend temporarily trusts the same JWT secret so nothing breaks mid-phase. **Verify: login via shell, land on Automation with SSO.**

**Phase 4 — Secure the products (2–3 days):** `testrix-commons` starter; JWT validation in API Testing backend (first-ever auth there — its audit `executing user` columns finally get real values) and GenAI service. Shared cookie flow replaces localStorage bearer in Automation frontend. **Verify: unauthenticated requests rejected on every product.**

**Phase 5 — Central administration (2–3 days):** move admin components from Automation frontend into shell; user management now calls core service; product settings via each product's `/admin/settings`. Delete Automation's admin workspace. **Verify: all admin flows from Testrix only.**

**Phase 6 — Global dashboard + AI (2–3 days):** `/summary` endpoints in both product backends; aggregation in core service; shell global dashboard (product cards + platform stats). Wire the existing TESTRIX chat placeholder to GenAI through the gateway; move panel into `@testrix/ui` so every product gets it. **Verify: dashboard shows live numbers from both products; chat answers.**

**Phase 7 — Shared polish + future products (ongoing):** theme tokens to `@testrix/ui`, PlatformBar in product frontends, notifications + activity feed, `products/performance-testing` scaffold generated from the API Testing shape.

Rollback per phase: revert commit range; DB dumps restore Phase 2/3 data moves.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Vite `base`/asset paths break under prefixes | Phase 2 keeps old ports published until gateway verified |
| User-table migration loses sessions | Migrate refresh tokens too; force re-login as acceptable fallback |
| API Testing suddenly requires auth breaks its scheduler | Scheduler runs in-process (no HTTP self-calls) — verify in Phase 4; system principal for internal jobs if needed |
| React 18/19 conflicts in workspaces | npm workspaces isolate per-app node_modules; shared/ui keeps loose peer ranges |
| GenAI has no tests/auth | Verify-first: JWT middleware + smoke test before exposure through gateway |
| Framework runner host mount (`D:/New folder/MPHIDB`) | Move to `.env` variable in Phase 2 |
