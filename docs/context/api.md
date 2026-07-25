 UI/UX Improvements & Platform Stability (High Priority)

Implement the following improvements across the entire Testrix platform. These are mandatory UX fixes and should be applied consistently without breaking any existing functionality.

---

## 1. Scroll Behavior

Currently, when a page has little or no content, the page can still be scrolled, leaving a large empty area at the bottom.

### Expected Behavior

- The page should scroll **only when the content exceeds the viewport height**.
- If the content fits within the viewport, **scrolling must be completely disabled**.
- There should never be unnecessary blank space below the content.
- Every module should follow the same scrolling behavior.

---

## 2. Modal Behavior

Although the current modal implementation is improved, verify every modal in the application.

Requirements:

- Open smoothly.
- Close smoothly.
- Always centered.
- Proper backdrop.
- Correct z-index.
- No page shift.
- No hidden or partially visible modal.
- Responsive on every screen size.
- Background scroll should be locked while a modal is open.

Audit every modal across the application.

---

## 3. Loader Standardization

Create one global loader component and use it everywhere.

Requirements:

- Same loader design.
- Same animation.
- Perfectly centered.
- Proper overlay.
- Consistent spacing.
- No layout shifting.
- Works for page loading, API calls, table loading and form submission.

No module should use a different loader implementation.

---

## 4. Pagination (Mandatory)

Pagination must be implemented consistently across the platform.

Requirements:

- Every table that displays records must support pagination.
- If total records > 5, pagination should automatically appear.
- If records ≤ 5, pagination should remain hidden.

Pagination should include:

- Previous
- Next
- Page Numbers
- Current Page Indicator

Also add a page-size selector.

Example:


Show:
5 ▼
10
20
50
100


Changing the page size should update the table immediately.

Apply this to every table in every module.

---

## 5. Expandable Group View

Current implementation is incorrect.

When a user expands a Group, do NOT navigate to another listing or display the details separately.

Instead, follow the same UX used in the Scheduler module.

Expected Behavior:


Group Name
──────────────────────────

▼ Group A

API 1
API 2
API 3
Environment
Description
Execution Count

▶ Group B

▶ Group C

similar as schedular currentlly have .reuse same functionality and 
i strictlly said in histroy tav also have same functionalty like first i execute api after that and group and after that schedular then after one more single api manully and after that regular api singlly so table shuld be like 

1 regular api
2 base api 
 3schedular (when click on the it open like expend this row with their data like have dunctionlity in schedular tab )
4group (when click on the it open like expend this row with their data like have dunctionlity in schedular tab )
 5sigle api 

 and pagination also 


The selected row should simply expand and display its related information directly beneath it.

Do not open another page.
Do not redirect.
Do not display another listing.

Reuse the Scheduler module's expandable row behavior throughout the application.

---

## 6. Session Expiry & Authentication

This is mandatory.

If the user's session expires or the JWT becomes invalid:

- Immediately clear all authentication data.
- Remove tokens from storage.
- Remove user data.
- Redirect directly to the Login page.
- Do NOT continue showing protected pages.
- Do NOT display stale or cached data.
- Do NOT allow any further API calls using the expired token.

The user must authenticate again before accessing the application.

Implement this globally using the Axios interceptor / authentication middleware.

---

## 7. Global UI Audit

Perform a complete UI audit across the platform and fix any remaining inconsistencies, including:

- Spacing
- Alignment
- Empty states
- Hover effects
- Active states
- Focus states
- Responsive behavior
- Card heights
- Table alignment
- Button consistency
- Icon alignment
- Typography
- Form spacing
- Input heights
- Dropdown consistency

Every module should follow the same design system.

## and we can implement ui shre in image not to change just ui in which card have hover efeect aura effect on user name and clean structure 

## and one more thing that isbedcrum of the pages ae still have old even we changed all architeture 
## 8 
# Implement Enterprise-Level Global Search (Application-Wide)

I want to replace the current **dummy Global Search** with a fully functional **enterprise-grade application-wide search system**.

Before implementing anything, **analyze the complete project architecture, routing structure, modules, shared components, layouts, and navigation flow** so the solution fits naturally into the existing application.

## Core Requirements

The Global Search must be a **shared feature**, not a page-specific implementation.

Create it inside the shared/common layer so every current and future module can use the same search engine.

Example:

* Shared Components
* Shared Services
* Shared Hooks
* Shared Search Provider
* Shared Search Index

Do **not** duplicate search logic inside individual modules.

---

# Search Scope

The search should work across the **entire application**, including every module.

Examples:

* Dashboard
* API Testing
* Automation
* Performance Testing
* Reports
* Scheduler
* Executions
* Collections
* Settings
* Users
* Roles
* Analytics
* Future modules

Every searchable page, feature, menu item, tab, card, button, configuration page, and major section should be indexed automatically.

---

# Intelligent Search Index

Build a centralized search index.

Each searchable item should contain information like:

* Module Name
* Page Name
* Section
* Route
* Keywords
* Synonyms
* Description
* Navigation Path
* Icon
* Permission (if applicable)

The search should never depend on hardcoded conditions inside components.

Instead, maintain one centralized searchable registry.

---

# Real-Time Search

Search should start while typing.

No Search button.

Results should update instantly.

Implement:

* Debouncing
* Ranking
* Relevance scoring
* Fast filtering

Search should remain smooth even after thousands of searchable items are added.

---

# Search Ranking

Exact match should appear first.

Then:

* Starts with
* Partial match
* Keyword match
* Synonym match

Example:

Searching:

```
report
```

Should return:

Reports

Execution Report

Performance Report

API Report

Automation Report

Analytics Report

---

Searching:

```
api
```

Should return every API-related page across the application.

---

# Multiple Match Support

If the same keyword exists in multiple modules, display all matching results.

Example:

Search:

```
Settings
```

Results:

Automation → Settings

API Testing → Settings

Performance → Settings

System → Settings

Admin → Settings

Each result should clearly show where it belongs.

---

# Search Result Design

Use the Docker Desktop search experience as inspiration.

The dropdown should include:

* Recent Searches
* Suggested Searches
* Live Search Results
* Grouped Results by Module
* Icons
* Route Information

Recent searches should be stored locally.

Suggested searches should be based on the available application features.

---

# Navigation Behavior

When the user clicks a result:

Navigate automatically to the correct page.

If required:

* Open the correct module
* Expand the required sidebar
* Open the correct tab
* Scroll to the target section
* Highlight the destination briefly

The user should land exactly where the searched item exists.

---

# Loading Experience

When navigating from search:

Show a global loading indicator for approximately **1 second** to create a smooth transition before opening the destination.

The transition should feel intentional and polished.

---

# Highlight Search Matches

Highlight the matching text inside search results.

Example:

Search:

```
report
```

Display:

Execution **Report**

Performance **Report**

---

# Recent Searches

Maintain a history of recent searches.

Features:

* Most recent first
* Remove individual items
* Clear all history
* Persist using Local Storage (or backend later if required)

---

# Suggested Searches

Before typing anything, show useful suggestions such as:

* API Testing
* Automation
* Performance Testing
* Reports
* Executions
* Scheduler
* Analytics
* Collections
* Settings

---

# Keyboard Support

Support:

* Arrow Up
* Arrow Down
* Enter
* Escape
* Tab

The search should be fully keyboard accessible.

---

# Scalability

The implementation should be designed for future growth.

When new pages or modules are added, developers should only need to register them in the centralized search registry. No changes should be required in the search component itself.

---

# Performance

Optimize for speed.

Implement:

* Debounced searching
* Memoization
* Efficient indexing
* Lazy loading where appropriate
* Minimal unnecessary re-renders

The search should remain fast even with hundreds or thousands of searchable entries.

---

# Code Architecture

Create a reusable architecture with shared components such as:

* Global Search Provider
* Search Service
* Search Registry
* Search Hook
* Search Dropdown
* Search Result Item
* Recent Search Manager
* Search Utilities

Keep the code modular, reusable, and maintainable.

---

# Final Goal

The final result should feel comparable to enterprise products like Docker Desktop, VS Code Command Palette, Notion Search, or modern developer platforms.

This should become the single, centralized search system for the entire Testrix platform, providing fast, intelligent, scalable, and reusable navigation across every module.


---

## Final Requirement

- Do not break any existing functionality.
- Reuse existing components wherever possible.
- Maintain a consistent UI/UX across the platform.
- Verify every module after implementation.
- Ensure the application behaves like a production-grade enterprise SaaS platform.