# Automation Portal v1.1.0 — Security Foundation

## Scope

Version 1.1.0 establishes the full identity and API security foundation for the portal.
This is an **internal enterprise application** — users cannot self-register.

Key objectives:
- JWT authentication with refresh token rotation
- Admin-only user creation and management
- Forgot / Reset / Change password with OTP (inline display, no SMTP required)
- Profile management with image upload
- Role-based navigation and menu visibility
- Audit logs for all identity events

---

## No Self-Registration

There is **no public registration endpoint or UI**. All user accounts are created by the Super Admin
via the Admin Dashboard. Attempting to access protected routes without authentication redirects to Login.

---

## Default Super Admin

```text
Email / Username : superadmin@gmail.com
Password         : password
Role             : SUPER_ADMIN
```

This account is seeded automatically on first startup if it does not exist (`DataSeeder.java`).

---

## Role Structure

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full access + Admin Dashboard, User Management, Role Management, Access Management |
| `ADMIN` | Operational access — no user management |
| `QA_LEAD` | Portal features — no admin |
| `AUTOMATION_ENGINEER` | Portal features — no admin |
| `VIEWER` | Read-only portal access |

---

## Dashboard Visibility Rules

**All users** see: Dashboard, Execution Center, Reports Center, Test Logs, Screenshots, Environments, Profile

**SUPER_ADMIN only** additionally sees:
- Admin Dashboard (top navigation section)
- User Management
- Role Management
- Access Management
- Admin badge in top-right of the navigation bar

---

## User Management (Admin Dashboard)

Only accessible to `SUPER_ADMIN`. Features:

| Action | Endpoint |
|---|---|
| List users | `GET /api/admin/users` |
| Get user | `GET /api/admin/users/{id}` |
| Create user | `POST /api/admin/users` |
| Update user | `PUT /api/admin/users/{id}` |
| Disable user | `PUT /api/admin/users/{id}/disable` |
| Enable user | `PUT /api/admin/users/{id}/enable` |
| Reset password | `POST /api/admin/users/{id}/reset-password` |
| Assign role | `PUT /api/admin/users/{id}/role` |

All `/api/admin/**` endpoints are restricted by `SecurityConfig` to `ROLE_SUPER_ADMIN`.

---

## Backend Structure

| Package | Purpose |
|---|---|
| `auth` | Login, JWT, refresh tokens, OTP, password flows, Google OAuth2 |
| `profile` | Profile update, email change, image upload, audit log view |
| `users` | User entity, repository, `UserManagementController` (admin), DTOs |
| `audit` | Audit log entity, service, repository |
| `config` | Spring Security configuration, static resource mapping, `DataSeeder` |

---

## Frontend Structure

| File | Purpose |
|---|---|
| `api.js` | Token storage, authenticated API wrapper, refresh token retry, all API calls |
| `App.jsx` | Auth gate → protected shell with role-based nav, Admin Dashboard, User Management, Profile, OTP display |
| `styles.css` | Full design system: sidebar, topbar, tables, modals, profile avatar, OTP reveal box |

---

## JWT Flow

1. User logs in with `username` (or email) and `password`.
2. Backend validates BCrypt password and verifies `ACTIVE` + `emailVerified` status.
3. Backend returns `accessToken` + `refreshToken` + user profile.
4. React stores the session in `localStorage`.
5. All protected API calls include `Authorization: Bearer <accessToken>`.
6. On 401, the frontend auto-retries using `/api/auth/refresh` (token rotation).
7. Logout revokes the refresh token.

---

## OTP — Inline Static Display

OTPs are generated server-side and stored BCrypt-hashed in `otp_verifications` table.

In the current configuration (`PORTAL_MAIL_CONSOLE_ONLY=true`), the raw OTP is returned
directly in the API response and **displayed inline in the UI** in a highlighted box.

For production with real SMTP:
```properties
PORTAL_MAIL_CONSOLE_ONLY=false
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=yourpassword
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
PORTAL_MAIL_FROM=no-reply@yourcompany.com
```

---

## Profile Image Upload

- Endpoint: `POST /api/profile/image` (multipart)
- Images saved to: `artifacts/profiles/` (configurable via `PORTAL_PROFILES_DIR`)
- Served at: `/uploads/profiles/<filename>`
- No auth required to view image URLs (public static resources)
- Preview shown immediately on selection (before upload via `URL.createObjectURL`)

---

## Public APIs

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/google/login-url
GET  /uploads/**
GET  /actuator/health
GET  /v3/api-docs/**
GET  /swagger-ui/**
```

---

## Protected APIs (require JWT)

```text
POST /api/auth/logout
POST /api/auth/change-password
GET  /api/auth/me
GET  /api/profile
PUT  /api/profile
POST /api/profile/image
POST /api/profile/email-change/request
POST /api/profile/email-change/verify
GET  /api/profile/audit-logs
GET  /api/dashboard/**
GET  /api/environments
GET  /api/modules
GET  /api/executions
POST /api/executions/run
```

---

## Admin-Only APIs (require SUPER_ADMIN role)

```text
GET    /api/admin/users
GET    /api/admin/users/{id}
POST   /api/admin/users
PUT    /api/admin/users/{id}
PUT    /api/admin/users/{id}/disable
PUT    /api/admin/users/{id}/enable
POST   /api/admin/users/{id}/reset-password
PUT    /api/admin/users/{id}/role
```

---

## Audit Actions Tracked

| Action | Trigger |
|---|---|
| `LOGIN` | Successful login |
| `LOGOUT` | Logout |
| `FAILED_LOGIN` | Failed login attempt |
| `OTP_SENT` | OTP generated for forgot-password or email-change |
| `PASSWORD_CHANGE` | User changes own password |
| `PASSWORD_RESET` | Password reset via OTP |
| `EMAIL_CHANGE` | Email changed via OTP |
| `PROFILE_UPDATE` | Profile fields or image updated |
| `USER_CREATE` | Admin creates a user |
| `USER_UPDATE` | Admin updates a user |
| `USER_DISABLE` | Admin disables a user |
| `USER_ENABLE` | Admin enables a user |
| `USER_PASSWORD_RESET` | Admin resets a user's password |
| `ROLE_CHANGE` | Admin assigns a new role |

---

## Database Schema

Flyway migrations:

- `V1__initial_schema.sql` — Core tables: users, environments, modules, executions, etc.
- `V2__security_identity_foundation.sql` — Security tables: roles, user_roles, refresh_tokens, otp_verifications, audit_logs + user profile columns

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | jdbc:mysql://localhost:3306/automation_portal | Database URL |
| `PORTAL_JWT_SECRET` | (change in production) | JWT signing key |
| `PORTAL_JWT_EXPIRATION_MINUTES` | 30 | Access token TTL |
| `PORTAL_JWT_REFRESH_EXPIRATION_DAYS` | 14 | Refresh token TTL |
| `PORTAL_FRONTEND_URL` | http://localhost:15173 | CORS allowed origin |
| `PORTAL_MAIL_CONSOLE_ONLY` | true | Show OTP on screen instead of emailing |
| `PORTAL_PROFILES_DIR` | artifacts/profiles | Profile image storage folder |

---

## Docker

```powershell
docker compose up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:15173 |
| Backend  | http://localhost:18080 |
| Swagger  | http://localhost:18080/swagger-ui/index.html |

---

## Release Notes — v1.1.0

### Added
- JWT access token + refresh token rotation + logout revocation
- Forgot password / Reset password via OTP (inline display)
- Change password (authenticated)
- Profile management: name, mobile, designation, organization
- Profile image upload with preview (local disk storage, served as static resource)
- Email change via OTP (inline display)
- Audit logs visible in Profile → Activity Logs
- **Admin Dashboard** — visible only to `SUPER_ADMIN`
- **User Management** — create, edit, disable/enable, role assign, password reset (SUPER_ADMIN only)
- Role-based navigation: SUPER_ADMIN sees additional admin section in sidebar
- Super Admin badge in topbar
- RBAC roles: SUPER_ADMIN, ADMIN, QA_LEAD, AUTOMATION_ENGINEER, VIEWER
- All portal APIs secured with JWT
- Spring Security route protection

### Removed
- Self-registration UI and API (no public sign-up)
- Register tab from authentication page
- `/api/auth/register` and `/api/auth/verify-registration` endpoints
