# Docker Setup for Version 1.1

This setup keeps Version 1.0 source code and UI intact while running the portal with Docker-managed services.

## Containers

- `automation-portal-mysql`
- `automation-portal-backend`
- `automation-portal-frontend`

## Ports

- Frontend UI: `http://localhost:15173`
- Backend API: `http://localhost:18080`
- MySQL: `localhost:3306`

The backend still listens on port `8080` inside Docker. It is exposed as `18080` on the host to avoid conflict with other local Docker projects.

MySQL's host port was changed from the original `13306` offset to `3306` (2026-07-03) — the
default `application.yml` datasource URL is hardcoded to `localhost:3306`, and the project's
day-to-day workflow runs Backend/Execution Manager/Framework Runner/Report Artifact Service
natively against a dockerized MySQL, not the full docker-compose stack. Matching the port removed
a recurring "Connection refused" trap. If you ever need to run MySQL alongside another local
project that also claims 3306, override it back with `docker run -p <free-port>:3306 ...` (not
`docker compose`) and point `application.yml`/`application-dev.yml` at that port.

## Persistent Volumes

- `automation_portal_mysql_data`: MySQL database files
- `automation_portal_backend_logs`: Spring Boot log files
- `automation_portal_reports`: report artifacts
- `automation_portal_screenshots`: screenshot artifacts

These volumes remain after containers restart.

## Start

From the project root:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:15173
```

## Stop

```powershell
docker compose down
```

Use this only if you intentionally want to remove persisted portal data:

```powershell
docker compose down -v
```
