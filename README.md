# Testrix

Unified enterprise testing platform. Testrix is the master platform that hosts
independent testing products and provides the shared services they consume
(authentication, administration, notifications, AI assistant, global dashboard).

**Architecture & roadmap → [docs/testrix-architecture-plan.md](docs/testrix-architecture-plan.md)**

## Workspace layout

```
platform/
  shell/            Testrix master frontend (global dashboard, admin, AI chat)
  core-service/     Platform backend (auth, users, admin, notifications)
products/
  automation-portal/   Selenium/TestNG automation portal (5 services + UI)
  api-testing/         API testing platform (backend + UI + Redis)
  genai/               AI assistant service (Express + Groq) + chatbot UI
  performance-testing/ Future product (scaffold)
shared/
  ui/                  @testrix/ui — theme tokens & shared components
  platform-client/     @testrix/platform-client — JS SDK for platform APIs
  java/                testrix-commons — shared Spring Boot starter (JWT etc.)
gateway/            nginx single-origin gateway (path routing, SSO cookie)
```

## Run

Whole platform (Docker Desktop required):

```
docker compose up -d --build
```

One product only — run the same command inside its `products/<name>/` folder.

| Product | UI | API |
|---|---|---|
| Automation Portal | http://localhost:15173 | http://localhost:18080 |
| API Testing | http://localhost:15174 | http://localhost:8081 |
| GenAI service | — | http://localhost:3000 |

## Product docs

- Automation Portal: [docs/](docs/) (architecture, setup, version history)
- API Testing: [products/api-testing/context/](products/api-testing/context/)
