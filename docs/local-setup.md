# Local Setup

## Prerequisites

Installed on this machine:

- Java 21
- Maven 3.9.16
- Node 20
- npm 10

You still need MySQL installed/running locally.

## MySQL Setup

Install MySQL Community Server if it is not already installed.

After MySQL is running, create the database:

```sql
CREATE DATABASE automation_portal;
```

The backend currently expects:

```text
host: localhost
port: 3306
database: automation_portal
username: root
password: root
```

If your MySQL password is different, update:

```text
backend/src/main/resources/application.yml
```

Change:

```yaml
spring:
  datasource:
    username: root
    password: root
```

## Backend

From:

```text
D:\Automation Portal\backend
```

Run:

```powershell
mvn spring-boot:run
```

First startup will create tables through Flyway and seed:

- Super Admin user
- QA/UAT/PreProd/Prod environments
- Land/Survey/GIS modules

Default login seed:

```text
username/email: superadmin@gmail.com
password: password
```

Users cannot self-register in v1.1.0. Create all other accounts from the
Super Admin-only Admin Dashboard after login.

## Frontend

From:

```text
D:\Automation Portal\frontend
```

Run:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend uses plain JavaScript/JSX files, not TypeScript.

## Automation Repository Integration

Do not move or edit the existing automation framework yet.

For Phase 2, provide the path to your automation repository. The backend property to configure will be:

```yaml
portal:
  automation:
    repository-path: "D:/path/to/your/automation/project"
```

Expected Maven command pattern:

```powershell
mvn clean test -DsuiteXmlFile={suiteXml}
```

We will adapt this after inspecting your real framework structure.
