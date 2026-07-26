/**
 * searchTypes.js
 * ──────────────
 * Shared constants used by every layer of the search system:
 * providers, engine, service, hook, and UI.
 *
 * This is the only file every other search file imports from for type names —
 * keeps string literals centralised and prevents silent typos.
 */

// ── Entity Types ─────────────────────────────────────────────────────────────
// What kind of searchable thing is this result?
export const ENTITY_TYPE = {
  PAGE:       'page',        // Full navigable page
  SECTION:    'section',     // A section within a page
  TAB:        'tab',         // A tab within a page
  CARD:       'card',        // Dashboard card / widget
  ACTION:     'action',      // Executable command (create, run, open dialog)
  SETTING:    'setting',     // Settings or configuration entry
  REPORT:     'report',      // Report or analytics view
  DOCS:       'docs',        // Documentation page
  USER:       'user',        // User entity (future dynamic)
  COLLECTION: 'collection',  // API collection (future dynamic)
  EXECUTION:  'execution',   // Execution record (future dynamic)
  SCHEDULE:   'schedule',    // Scheduled run (future dynamic)
};

// Human-readable labels shown as group headers in the dropdown
export const ENTITY_LABEL = {
  [ENTITY_TYPE.PAGE]:       'Pages',
  [ENTITY_TYPE.SECTION]:    'Sections',
  [ENTITY_TYPE.TAB]:        'Tabs',
  [ENTITY_TYPE.CARD]:       'Dashboard',
  [ENTITY_TYPE.ACTION]:     'Actions',
  [ENTITY_TYPE.SETTING]:    'Settings',
  [ENTITY_TYPE.REPORT]:     'Reports',
  [ENTITY_TYPE.DOCS]:       'Documentation',
  [ENTITY_TYPE.USER]:       'Users',
  [ENTITY_TYPE.COLLECTION]: 'Collections',
  [ENTITY_TYPE.EXECUTION]:  'Executions',
  [ENTITY_TYPE.SCHEDULE]:   'Schedules',
};

// Display order for entity groups in dropdown (lower = higher priority)
export const ENTITY_ORDER = {
  [ENTITY_TYPE.PAGE]:       1,
  [ENTITY_TYPE.ACTION]:     2,
  [ENTITY_TYPE.SECTION]:    3,
  [ENTITY_TYPE.TAB]:        4,
  [ENTITY_TYPE.REPORT]:     5,
  [ENTITY_TYPE.SETTING]:    6,
  [ENTITY_TYPE.CARD]:       7,
  [ENTITY_TYPE.DOCS]:       8,
  [ENTITY_TYPE.COLLECTION]: 9,
  [ENTITY_TYPE.EXECUTION]:  10,
  [ENTITY_TYPE.SCHEDULE]:   11,
  [ENTITY_TYPE.USER]:       12,
};

// ── Provider Types ────────────────────────────────────────────────────────────
export const PROVIDER_TYPE = {
  STATIC:  'static',   // Hardcoded items (pages, sections, actions)
  DYNAMIC: 'dynamic',  // Live data from API (users, executions, etc.)
  AI:      'ai',       // Future: AI-powered intent resolution
};

// ── Module Accent Colors ──────────────────────────────────────────────────────
// Used for the post-navigation destination highlight glow.
// Keys match the `nav.page` field on search items.
export const MODULE_COLOR = {
  dashboard:  '#60b3e0',  // cyan (default portal accent)
  automation: '#4ade80',  // green
  apitest:    '#60b3e0',  // cyan/blue
  admin:      '#f97316',  // orange
  profile:    '#a78bfa',  // purple
  perf:       '#facc15',  // yellow
};

// ── Suggestion Seeds ──────────────────────────────────────────────────────────
// Shown in the dropdown before the user types anything.
export const SUGGESTED_QUERIES = [
  'API Testing',
  'Automation',
  'Execution Center',
  'Reports',
  'Scheduler',
  'Create User',
  'Environments',
  'Run Automation',
  'Documentation',
  'Collections',
];
