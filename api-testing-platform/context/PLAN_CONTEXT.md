# Plan Context — What To Build Next

[API_CONTEXT.md](API_CONTEXT.md) has the current-state summary.
[PHASE_CONTEXT.md](PHASE_CONTEXT.md) has the full chronological log with
verification evidence. This file lists what comes after — nothing below is
in-progress; all of it needs a go-ahead before starting.

## Guiding rules (unchanged, do not violate)

1. Browser NEVER calls target APIs — all execution stays in the Spring Boot engine.
2. Independent from the Automation Portal until the user explicitly asks.
3. Work in verified increments; show evidence — don't claim done without testing live.
4. Read back existing code before assuming a feature is missing (several
   "bugs" this session were verify-first, not rewrite-first).

## Part 1 vs Part 2 (user's framing, 2026-07-13) — both done, evolved past original scope

- **Part 1** = manual API Testing Workspace (Tester/Collections). Done, and
  significantly extended past the original ask across several follow-up
  rounds: per-request history (bottom-docked panel), Postman+OpenAPI import
  (file-based, multi-file), Postman+native JSON export, cookies view,
  Postman-style drill-down navigation (collection picker → requests table →
  workspace), collection variables, **folders** (real nested tree, not name-
  flattening), and **environments** (Dev/QA/Prod variable sets). A real
  Send-executes-stale-config bug was found and fixed along the way.
- **Part 2** = enterprise automation (schedules, base/regular API chaining,
  monitoring) — built as the master-spec v2 work. The user flagged that
  "schedule history" as a UI/UX concept needs its own definition later —
  don't assume the existing global `/history` page's schedule-filter view is
  the final design for that; ask before changing it.

## Next candidates (in rough priority order — confirm with user before starting)

1. **Security (one coherent unit)**: Spring Security + JWT (mirror main
   portal's jjwt 0.12.x for future SSO), enforce `user_module_access` RBAC
   (VIEWER/EDITOR/ADMIN per module), audit log, rate limiting. Do not add the
   dependency before its config.
2. **Request-level scripts**: Postman pre-request/test scripts — currently
   imported collections silently drop any `event`/`script` blocks. User was
   asked about this as a priority option and did NOT pick it (picked Folders
   + Environments instead), so it's explicitly still open, not rejected.
3. **Execution-engine gaps**: multipart/file-upload + binary bodies, cookie
   jar (request-side, distinct from the response Cookies view already built),
   Digest auth; response download button.
4. **Reports/exports**: history CSV/Excel export, PDF run reports, comparison
   reports; baseline-diff mode (spec §7 optional) — schema already stores full
   responses.
5. **Code generator**: curl / Python requests / Java WebClient / JS fetch from
   a request config (pure backend transform + UI button).
6. **Monitoring view**: per-schedule uptime/latency percentiles/downtime
   markers (the schedule already IS the monitor; this is a read-model + page).
7. **Hardening**: unit/integration tests (Testcontainers), code-split
   Monaco/Chart.js (bundle >500KB, grows every session), MinIO BodyStore impl
   if central storage is wanted.

## Future Automation Portal integration (ONLY when user says so)

Portal gets an "API Testing" tab opening this dashboard (admin-portal
pattern). Expected wiring: reverse-proxy this frontend under the portal's
nginx (e.g. `/api-testing/`), shared JWT (same secret/issuer — package naming
and jjwt alignment were chosen for this), join `automation_portal_network` or
merge compose files. Keep the `api_testing_platform` MySQL schema separate.

## Known deviations from the master spec (flagged, accepted)

- BodyStore is local-gzip on a docker volume, not MinIO — the spec assumed the
  main portal already runs MinIO; it does not. Interface + key format are
  object-store-shaped so a MinIO impl is a drop-in swap.
- `api_variable_binding.regular_api_id` is nullable: NULL rows are extraction
  definitions on a Base API (the "+ extract" step), non-NULL rows are a
  Regular API's consumption of that variable. Substitution is template-driven
  (`{{var}}` anywhere), so `target_location/target_key` are informational.
- `execution_history.api_id` is nullable for ad-hoc tester runs.
- No RabbitMQ/ShedLock: hand-rolled SKIP LOCKED claim + bounded executor met
  the load-test DoD (spec §5 explicitly sanctions this path).
