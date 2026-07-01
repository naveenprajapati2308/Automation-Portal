# Release Notes — v1.1.3

## Dashboard Enhancements & API Collection Page

Version 1.1.3 introduces visual metrics dashboards, an executable Module Analytics table directly on the Dashboard, Swagger UI embedding inside the Administrative Area, and clean version branding updates.

---

### Added

1. **Dashboard Premium Metrics Cards:**
   - Replaced default KPI metrics with **5 premium dark-themed cards** displaying detailed statistics for the last run:
     - **Last Test Summary:** Total tests, Passed, Failed, and Skipped test counts.
     - **Last Execution Started:** Date and start time of the last run.
     - **Last Execution Ended:** Date and end time of the last run.
     - **Last Duration:** Total runtime formatted as `hh:mm:ss Hour`.
     - **Last Total Accuracy:** Visual percentage display with an inline **SVG circular progress ring** showing the proportion of tests passed.
   - Fallback protection handles new/empty environments gracefully.

2. **Executable Module Analytics Table:**
   - Redesigned the table layout to align columns: `MODULE`, `TOTAL`, `PASSED`, `FAILED`, `SKIPPED`, `ACCURACY`, and `RUN`.
   - Added a **Run Module** button to each row.
   - Added an **Environment select dropdown** and **Run All Modules** button in the section header.
   - Integrated these buttons directly with the backend `/api/executions/run` API.

3. **Super Admin API Collection (Swagger UI) Page:**
   - Added an **API Collection** menu item to the Admin Sidebar (below Documentation).
   - Embedded the backend's interactive Swagger UI inside a responsive iframe within the admin layout.
   - Implemented dynamic backend port detection (proxies correctly whether running via Docker Compose on port `15173`/`18080` or via a local Vite dev server on port `5173`/`8080`).
   - Restricted access exclusively to the `SUPER_ADMIN` role via the workspace authentication gate.

---

### Removed / Cleaned

1. **Version Subtitle Branding:**
   - Removed the `Security Foundation v1.1` version subtitle from the brand logo section in the standard sidebar layout to keep branding clean and neutral.
   - Cleaned the default notice state message in the `App` component state.

---

### Verification
- Production build was successfully verified with `npm run build` (0 warnings/errors).
- Development server execution was verified on `http://localhost:5173/`.
