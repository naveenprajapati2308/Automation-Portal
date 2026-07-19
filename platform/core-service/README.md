# Testrix Core Service (planned — Phase 3)

Platform backend (Spring Boot). Owns identity and platform-wide services:
auth (JWT + refresh + OTP + Google OAuth2), users & roles, central admin,
notifications, activity feed, audit sink, dashboard aggregation.

Seeded by extracting the `auth`, `users`, `profile`, `audit` packages from
products/automation-portal/backend — see docs/testrix-architecture-plan.md §5.
Database: `testrix_platform` schema (§12).
