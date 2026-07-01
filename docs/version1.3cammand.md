Automation Portal v1.3.0 - Advanced Features & Deep Analytics Plan

Scope

Version 1.3.0 builds on top of the solid, production-ready foundation delivered in v1.2.0.

Version 1.3.0 focuses on:

Deep analytics capabilities
Real-time execution feedback
Global search across the entire portal
Framework health monitoring
Notification center
Failure analysis page
Advanced filtering everywhere

These features were identified during v1.2.0 planning but deliberately deferred to keep v1.2.0 focused on core integration.

Prerequisite

Version 1.2.0 must be fully complete and stable before starting v1.3.0.

─────────────────────────────────────────────────────────────
FEATURE 1 — Global Search (Deferred from v1.2, Section 5)
─────────────────────────────────────────────────────────────

Create a unified search experience across the entire portal.

One search bar (in the Topbar) that can find:

  - Test Case (by name, method, class)
  - Module
  - Execution (by code, suite name)
  - User
  - Environment
  - Browser
  - Build
  - Report
  - Logs

Implementation:

Backend:
  - Create /api/search?q={query}&types={comma-separated types} endpoint
  - SearchController.java
  - SearchService.java that queries multiple repositories and aggregates results
  - Each result should have: type, id, title, subtitle, link target

Frontend:
  - Upgrade Topbar search input to be fully functional
  - Show a dropdown/panel with categorized results
  - Keyboard navigation (arrow keys, enter to navigate, escape to close)
  - Recent searches (stored in localStorage)
  - Debounced search (300ms)
  - Show result count per category

─────────────────────────────────────────────────────────────
FEATURE 2 — Failure Analysis Page (Deferred from v1.2, Section 9)
─────────────────────────────────────────────────────────────

Create a dedicated Failure Analysis page accessible from the sidebar.

Page should show:

  Failure Summary Cards:
    - Total failures today
    - Total failures this week
    - Most failed test case
    - Most failed module
    - New failures (appeared for first time)

  Failure Table:
    - Test Case Name
    - Module
    - Failure Reason (exception type)
    - Stack Trace (expandable)
    - Screenshot (thumbnail, click to expand)
    - Retry Count
    - Occurrence Count
    - Last Seen
    - First Seen

  Similar Failures Grouping:
    - Group failures by exception type
    - Show how many tests share the same root cause
    - Color-code by severity

  Stack Trace Viewer:
    - Full stack trace in a styled modal
    - Syntax highlighted
    - Copy to clipboard button

Backend:
  - Create /api/failure-analysis endpoints
  - FailureAnalysisController.java
  - FailureAnalysisService.java
  - Aggregate from ExecutionTestCase.exceptionType and stackTrace fields

─────────────────────────────────────────────────────────────
FEATURE 3 — Framework Health Dashboard (Deferred from v1.2, Section 11)
─────────────────────────────────────────────────────────────

Create a dedicated Framework Health section inside the Admin Dashboard.

Show health metrics:
  - Java Version (read from system-info.json or execution metadata)
  - Selenium Version (read from pom.xml or execution metadata)
  - TestNG Version
  - Chrome Version
  - ChromeDriver Version
  - Framework Version (from pom.xml or execution metadata)
  - Last Successful Execution (date + code)
  - Last Failed Execution (date + code)
  - Average Execution Duration (last 30 days)
  - Success Rate (last 30 days)
  - Total Executions (all time)
  - Active Environments Count
  - Active Modules Count

Status Indicators:
  - Green = Healthy
  - Yellow = Warning (e.g., execution not run in 7 days)
  - Red = Critical (e.g., last 3 executions all failed)

Backend:
  - Create /api/admin/framework-health endpoint
  - FrameworkHealthController.java
  - FrameworkHealthService.java
  - Read data from: executions table, system_info stored during execution, pom.xml parsing

─────────────────────────────────────────────────────────────
FEATURE 4 — Real-Time Execution Streaming (Deferred from v1.2, Section 12)
─────────────────────────────────────────────────────────────

Instead of waiting for the full suite to complete, stream live updates.

Implementation using Server-Sent Events (SSE):

  Backend:
    - Add /api/executions/{id}/stream endpoint (SSE)
    - Stream ExecutionLog entries in real-time as they are written
    - Send events: log-entry, status-change, test-result, execution-complete
    - ExecutionStreamController.java

  Frontend:
    - Use EventSource API (native browser SSE support)
    - Live log terminal in ExecutionDetailPage
    - Show: Running... → TC001 Passed → TC002 Passed → TC003 Failed → Complete
    - Auto-scroll log terminal
    - Pause/resume scroll button
    - Filter log level (INFO / ERROR / WARN)
    - Real-time test counter update (Passed: 3, Failed: 1, Running...)
    - Live progress bar showing % complete based on expected test count

─────────────────────────────────────────────────────────────
FEATURE 5 — Notification Center (Deferred from v1.2, Section 14)
─────────────────────────────────────────────────────────────

Add a full notification system to the portal.

Notification Types:
  - Execution Completed (PASS or FAIL)
  - New Failure Detected
  - Long-Running Execution Alert (exceeds threshold)
  - Report Generated
  - Parser Failure / Error

Notification Bell (Header):
  - Badge count showing unread notifications
  - Click to open notification panel
  - Mark as read / Mark all as read
  - Dismiss individual notifications
  - Notification history (last 100)

Backend:
  - Notifications table in DB
  - NotificationService.java (createNotification, markRead, listUnread)
  - NotificationController.java
  - Trigger notifications from ExecutionWorker on status change
  - /api/notifications endpoint (GET list, PUT mark-read, DELETE)

Frontend:
  - NotificationBell component in Topbar
  - NotificationPanel slide-out
  - Real-time badge update (poll every 30 seconds or use SSE)
  - Toast notifications for new events (already partially implemented — enhance)

─────────────────────────────────────────────────────────────
FEATURE 6 — Advanced Filtering Everywhere (Deferred from v1.2, Section 6)
─────────────────────────────────────────────────────────────

Every table in the application should have complete, advanced filtering.

Standard Filters for all tables:
  - Date Range (From / To date picker)
  - Status (multi-select checkboxes)
  - Module (multi-select)
  - Browser
  - Environment
  - Build
  - Executor / User
  - Tags
  - Priority

Apply advanced filters to:
  - Execution Center table
  - Reports Center table
  - Screenshots Gallery
  - Logs Viewer
  - Failure Analysis table
  - Admin User Management table

Implementation:
  - Create a reusable FilterBar component
  - Support URL query params for shareable filtered views
  - Save filter presets per user (localStorage)
  - Clear all filters button
  - Active filter chips display

─────────────────────────────────────────────────────────────
FEATURE 7 — Historical Analytics Enhancement (Deferred from v1.2, Section 8)
─────────────────────────────────────────────────────────────

Make the Dashboard analytics much more powerful.

Add analytics views:
  - Weekly Pass Rate chart (last 4 weeks)
  - Monthly Execution Count bar chart (last 6 months)
  - Average Execution Time trend line
  - Failure Trend graph (increasing / decreasing failures)
  - Browser Distribution trend over time
  - Environment Distribution trend over time
  - Module Success Rate comparison radar chart
  - Top 10 Most Failing Tests (all time)
  - Top 10 Slowest Tests (all time)

Date range selectors:
  - Today
  - Last 7 Days (default)
  - Last 30 Days
  - Last 90 Days
  - Last 6 Months
  - Custom Range (date picker)

Export analytics data:
  - Export charts as PNG
  - Export underlying data as CSV

─────────────────────────────────────────────────────────────
FEATURE 8 — Role Management & Permissions UI (Admin Panel Gap)
─────────────────────────────────────────────────────────────

The admin panel currently has only User Management.

Add full Role Management and Access Control UI:

Role Management page:
  - List all roles (SUPER_ADMIN, ADMIN, QA_LEAD, AUTOMATION_ENGINEER, VIEWER)
  - Role descriptions
  - Assign role to user (already in User Management — improve it)
  - Role permission matrix (what each role can do)

Access Management page:
  - Show what permissions each role has
  - Permission categories: Executions, Reports, Screenshots, Logs, Admin Panel
  - Read-only permission matrix table (editable in v1.4+)

─────────────────────────────────────────────────────────────
FEATURE 9 — Execution Scheduler (Admin Panel Gap)
─────────────────────────────────────────────────────────────

Allow scheduling automatic executions.

Scheduler page in Admin Panel:
  - Create scheduled jobs (cron-based)
  - Schedule fields: Suite XML, Environment, Module, Cron expression
  - Enable / Disable schedules
  - Next run time display
  - Last run result display
  - Run history for each schedule

Backend:
  - ScheduledJob entity + repository
  - ScheduleController.java
  - ScheduleService.java
  - Use Spring @Scheduled or Quartz Scheduler
  - Trigger ExecutionWorker when schedule fires

─────────────────────────────────────────────────────────────
FEATURE 10 — Configuration Management (Admin Panel Gap)
─────────────────────────────────────────────────────────────

Create a Configuration Management page in the Admin Panel.

Configuration categories:

  Framework Settings:
    - Repository Path (editable)
    - Maven Command (editable)
    - Artifacts Root (editable)
    - Suite definitions (add / edit / remove)
    - Result file paths (editable)

  Portal Settings:
    - JWT expiration (display)
    - Mail settings (display, not editable via UI)
    - Frontend URL (display)

  Environment Management (enhance existing):
    - Add / Edit / Delete environments
    - Set environment as default
    - Environment variables / properties per environment

Backend:
  - ConfigurationController.java
  - Read from application.yml
  - Write to a database-backed config table (for runtime changes)
  - Changes should be applied without restart where possible

─────────────────────────────────────────────────────────────
FEATURE 11 — Execution Queue Rework (Noted as unsatisfactory in v1.2 planning)
─────────────────────────────────────────────────────────────

The current Execution Queue implementation is basic and not satisfying.

Fully redesign the Execution Queue page:

  Queue section:
    - Visual queue with drag-and-drop priority (future: v1.4)
    - Show position in queue
    - Estimated wait time
    - Cancel from queue

  Running section:
    - Live progress bar
    - Live elapsed time counter
    - Live test counters (Running: TC001...)
    - Cancel running execution
    - Force stop button

  Completed section:
    - Recent completions (last 10)
    - Quick summary (Pass / Fail count)
    - Click to view details

  Status filters:
    - Queued | Running | Completed | Cancelled | Failed | Error

  Auto-refresh:
    - Poll every 5 seconds while any execution is RUNNING or QUEUED
    - Stop polling when nothing is active

─────────────────────────────────────────────────────────────
IMPORTANT NOTES FOR v1.3 IMPLEMENTATION
─────────────────────────────────────────────────────────────

Do NOT start v1.3 until v1.2.0 is fully stable and deployed.

v1.3.0 priority order (high to low):

  HIGH:
    - Execution Queue Rework (Feature 11) — unsatisfactory in current state
    - Failure Analysis Page (Feature 2) — critical for debugging
    - Real-Time Streaming (Feature 4) — best UX improvement
    - Global Search (Feature 1) — major usability

  MEDIUM:
    - Notification Center (Feature 5)
    - Advanced Filtering (Feature 6)
    - Historical Analytics (Feature 7)
    - Framework Health Dashboard (Feature 3)

  LOW:
    - Role Management UI (Feature 8)
    - Execution Scheduler (Feature 9)
    - Configuration Management (Feature 10)

─────────────────────────────────────────────────────────────
DEFERRED TO v1.4 and beyond
─────────────────────────────────────────────────────────────

  Version Awareness (mentioned in v1.2 plan, marked "no need till v6")
  CI/CD Integration (Jenkins, GitHub Actions, GitLab CI, Azure DevOps) — marked v1.5
  Permission matrix editing
  Drag-and-drop queue priority
  Video recording integration (already folder placeholder exists in v1.2 execution folder structure)
