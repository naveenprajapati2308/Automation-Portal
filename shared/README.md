# Shared libraries

- `ui/` — @testrix/ui: theme tokens (theme.css), PlatformBar, AI chat panel,
  shared React components. Consumed by the shell and every product frontend.
- `platform-client/` — @testrix/platform-client: JS SDK for platform APIs
  (auth/session, current user, notifications, activity).
- `java/` — testrix-commons: Spring Boot starter for JWT validation, security
  config, error envelope, audit publishing. Consumed by every Java backend.

Populated in Phases 4–7 (docs/testrix-architecture-plan.md §7).
