# Automation Portal Version 1.0 Architecture

## Recommendation

Use a separate repository-style portal with:

- React frontend using JavaScript/JSX
- Spring Boot backend
- MySQL database
- Existing Selenium + TestNG + Maven framework as an external execution engine
- Local runner integration in the next phase

Spring Boot is the right primary backend because the automation framework is already Java-based. It reduces integration effort, keeps Maven/TestNG execution natural, and is easier for a Java automation team to maintain long term.

## Repository Strategy

Recommended option: separate portal repository.

Current structure:

```text
Automation Portal/
  backend/
  frontend/
  docs/
```

Your Selenium framework should remain in its own repository. The portal should integrate through configured paths, execution APIs, generated artifacts, and structured result files.

## System Architecture

```text
React Frontend
  |
  | REST APIs
  v
Spring Boot Backend
  |
  | JPA/Flyway
  v
MySQL
  |
  | configured automation repository path
  v
Runner Integration Layer
  |
  | mvn clean test -DsuiteXmlFile=...
  v
Existing Selenium + TestNG Framework
  |
  | artifacts
  v
Reports, screenshots, logs, TestNG XML, custom result JSON
```

## Version 1.0 Scope

Included now:

- Portal folder structure
- Spring Boot backend skeleton
- MySQL Flyway schema
- Admin/user/profile-ready model
- Environments: QA, UAT, PreProd, Prod
- Modules: Land, Survey, GIS
- Execution records and queue-ready status
- Dashboard APIs
- Report/log/screenshot API placeholders
- React portal shell
- Execution Center controls
- Reports Center strategy view

Not included yet:

- Real Maven execution
- TestNG XML parsing
- Custom listener JSON ingestion
- Live WebSocket monitoring
- Full JWT enforcement
- File streaming for reports/screenshots

## Database Design

Core tables created in `backend/src/main/resources/db/migration/V1__initial_schema.sql`:

- `users`
- `environments`
- `modules`
- `test_suites`
- `executions`
- `execution_queue`
- `execution_test_cases`
- `execution_artifacts`
- `execution_logs`

## API Design

Current Version 1.0 endpoints:

```text
POST /api/auth/login
GET  /api/auth/me

GET  /api/dashboard/summary

GET  /api/environments
GET  /api/modules

POST /api/executions/run
GET  /api/executions
GET  /api/executions/{id}

GET  /api/reports
GET  /api/reports/strategy

GET  /api/logs
GET  /api/screenshots
```

Future execution endpoints:

```text
POST /api/executions/run/all
POST /api/executions/run/module/{moduleCode}
POST /api/executions/run/suite
POST /api/executions/run/smoke
POST /api/executions/run/regression
POST /api/executions/{id}/cancel
POST /api/executions/{id}/rerun-failed
```

## Execution Flow

Version 1.0 queues execution metadata only:

```text
User selects run type
  -> Backend creates execution record
  -> Status becomes QUEUED
  -> Dashboard/history can display it
```

Phase 2 will add:

```text
Queued execution
  -> Local runner starts Maven command
  -> Existing framework runs TestNG XML
  -> Runner collects artifacts
  -> Parser stores structured results
  -> Portal updates dashboard/report/history
```

## Report Parsing Strategy

Do not parse Extent HTML as the primary source.

Recommended enterprise source order:

1. Custom JSON generated from TestNG listeners
2. TestNG XML output as a secondary/fallback source
3. Existing `test-output` XML files for compatibility
4. Extent HTML, `emailable-report.html`, and `index.html` for display only

Reason:

Extent HTML is dynamic presentation output. It can change by theme, version, script rendering, and report configuration. Structured JSON from listeners is stable, database-friendly, and can power historical analytics.

## Local Deployment Strategy

Version 1.0 is local only:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8080
MySQL:    localhost:3306
```

Docker, Jenkins, remote runners, and cloud execution should wait until the local execution flow is stable.

## Security Design

Version 1.0:

- BCrypt password hashing
- Login endpoint
- User roles in database: Admin, Tech Lead, Manager, Developer
- Profile-ready user model

Next security hardening:

- Real JWT signing filter
- Role-based API access
- Refresh tokens
- Audit logs
- Prod execution approval

## Scaling Plan

Start with a modular monolith:

```text
React JavaScript/JSX + Spring Boot + MySQL + local runner
```

Then evolve to:

- WebSocket live monitoring
- Multiple runner agents
- Queue workers
- Object storage for artifacts
- Jenkins integration
- Dockerized runners
- Selenium Grid
- Cloud execution
- AI failure analysis
- Flaky test detection
- Test stability metrics
- Defect integration
- Self-healing locator insights
