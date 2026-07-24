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

---

## Final Requirement

- Do not break any existing functionality.
- Reuse existing components wherever possible.
- Maintain a consistent UI/UX across the platform.
- Verify every module after implementation.
- Ensure the application behaves like a production-grade enterprise SaaS platform.