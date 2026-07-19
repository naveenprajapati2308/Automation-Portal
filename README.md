# Testrix — Unified Testing Platform

Testrix is the master platform that hosts three independent testing products
behind **one URL, one login and one database server**:

- **Automation Portal** — Selenium/TestNG suite execution, reports, screenshots, logs
- **API Testing** — API collections, scheduling, execution history, groups
- **GenAI** — AI assistant (Groq LLM + web search) powering the platform chat

Everything runs in Docker and is reached through a single gateway.

## How to run

```
docker compose up -d --build
```

Then open **http://localhost:15000** — sign in with your Automation Portal
account. That one login works across the whole platform (shared session).

| URL | What it is |
|---|---|
| http://localhost:15000/ | Testrix dashboard (product cards, live stats, AI chat) |
| http://localhost:15000/automation/ | Automation Portal UI |
| http://localhost:15000/apitest/ | API Testing UI |

## Architecture

```
Browser ──► testrix-gateway (nginx :15000)
             │  /            → Testrix shell (login + platform dashboard)
             │  /automation/ → Automation UI      /automation/api → automation backend
             │  /apitest/    → API Testing UI     /apitest/api    → api-testing backend  [JWT enforced]
             │  /genai/      → GenAI service                                             [JWT enforced]
             │  /health/*    → product health checks
             │
             ├─► automation-portal-backend :8080 ──► execution-manager ──► framework-runner (Chrome)
             │        │                                    │
             │        └────────► testrix-mysql ◄───────────┘        automation-report-artifacts
             │                    (3 schemas)
             ├─► api-testing-backend :8080 ──► testrix-mysql + api-testing-redis
             └─► testrix-genai :3000 (Groq + Tavily)
```

**Authentication.** The automation backend is the identity provider (JWT +
refresh tokens + OTP + Google OAuth). The Testrix shell logs in against it and
stores the session in localStorage (key `automationPortalAuth`) — the same key
every UI on this origin reads, which is what makes it single sign-on. The
gateway enforces the JWT for API Testing and GenAI via nginx `auth_request`
(each request is validated against `/api/auth/me` before being proxied), so
**no API on the platform is reachable without a valid login**.

**Database.** One MySQL container (`testrix-mysql`, host port 3306, root/root)
with three schemas: `automation_portal`, `api_testing_platform`, and
`testrix_platform` (reserved for platform-level tables). Local dumps live in
`.backups/` (git-ignored).

**Exposed host ports.** Only three: `15000` (gateway — the platform),
`18080` (automation backend, needed for the Google OAuth redirect; all its
endpoints require JWT anyway) and `3306` (MySQL for DB tools). Every other
service (api backend, genai, execution-manager, framework-runner,
report-artifacts, redis) is reachable only inside the Docker network.

## Folder structure

```
platform/
  shell/               Testrix master frontend (login, dashboard, AI chat)
  docker-compose.yml   testrix-mysql + testrix-gateway
  mysql-init/          creates the 3 schemas on first boot
products/
  automation-portal/   backend, frontend, execution-manager, framework-runner,
                       report-artifact-service + its compose file
  api-testing/         backend, frontend, context docs + its compose file
  genai/               service (Express + Groq) and standalone chatbot UI
shared/
  ui/theme.css         design tokens used by the shell and the automation UI
gateway/
  nginx.conf           all routing + auth rules      Dockerfile builds the three UIs
docker-compose.yml     root orchestration (compose include of the four files above)
docs/                  architecture plan + product version history
```

## Development notes

- The Vite dev ports (5170 shell, 5173 automation, 5174 api) exist **only for
  `npm run dev`** on a single frontend; they are not part of the deployed
  platform. Production UIs are always built into the gateway image and served
  from :15000.
- Frontends are built with `VITE_BASE=/automation/` / `/apitest/`; API calls
  and SSE streams are prefixed via `import.meta.env.BASE_URL` (see
  `frontend/src/api.js` and `src/api/client.js`).
- Shell scripts must stay LF — `.gitattributes` enforces this (a CRLF checkout
  once broke the framework-runner image).
- Rebuild just one piece: `docker compose up -d --build testrix-gateway`
  (UIs/nginx), `... automation-portal-backend`, etc.

## Rollback

- Git tag `pre-testrix` = the repo before the platform migration.
- Old MySQL volumes (`automation_portal_mysql_data`,
  `api_testing_platform_mysql_data`) still exist untouched, plus SQL dumps in
  `.backups/`.

## Remaining roadmap

1. Merge execution-manager + report-artifact-service into the automation
   backend (framework-runner must stay separate — it hosts Chrome + Maven).
2. Extract auth/users into a dedicated platform core-service using the
   `testrix_platform` schema; move the admin console into the shell.
3. Product summary endpoints for richer cross-product dashboards; notifications.
4. Performance Testing product (same shape as api-testing).
