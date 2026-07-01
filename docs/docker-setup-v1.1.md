# Docker Setup for Version 1.1

This setup keeps Version 1.0 source code and UI intact while running the portal with Docker-managed services.

## Containers

- `automation-portal-mysql`
- `automation-portal-backend`
- `automation-portal-frontend`

## Ports

- Frontend UI: `http://localhost:15173`
- Backend API: `http://localhost:18080`
- MySQL: `localhost:13306`

The backend still listens on port `8080` inside Docker. It is exposed as `18080` on the host to avoid conflict with other local Docker projects.

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
