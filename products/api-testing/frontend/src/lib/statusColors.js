// Canonical status/method color maps — single source of truth. Previously
// this same data existed as 3 separately drifted copies (GroupsPanel.jsx,
// History.jsx had its own GROUP_STATUS_BADGE + a shorter methodColor()
// missing OPTIONS/HEAD, Dashboard.jsx re-encoded CLASS_COLORS as raw hex for
// Chart.js). Every value here is a Testrix shared theme token (see
// shared/ui/theme.css), so it also gives this app the same light/dark
// palette as the rest of the platform, not just the same code.

// Execution/group run status — badge background + text.
export const STATUS_BADGE = {
  SUCCESS: 'bg-[var(--success-bg-soft)] text-[var(--success-text)]',
  PARTIAL: 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  FAILED: 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]',
  RUNNING: 'bg-[var(--accent-bg-soft)] text-[var(--accent-text)]',
};

// HTTP response status class (2xx/3xx/4xx/5xx) + request-level ERROR/TIMEOUT.
export const CLASS_COLORS = {
  '2xx': 'text-[var(--success-text)]',
  '3xx': 'text-[var(--info-text)]',
  '4xx': 'text-[var(--warning-text)]',
  '5xx': 'text-[var(--danger-text)]',
  ERROR: 'text-[var(--indigo-text)]',
  TIMEOUT: 'text-[var(--pink-text)]',
};

// Same classes as CLASS_COLORS, as a bg+text pill (for StatusPill-style
// badges) instead of text-only.
export const CLASS_BADGE = {
  '2xx': 'bg-[var(--success-bg-soft)] text-[var(--success-text)]',
  '3xx': 'bg-[var(--info-text)]/15 text-[var(--info-text)]',
  '4xx': 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  '5xx': 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]',
  ERROR: 'bg-[var(--indigo-text)]/15 text-[var(--indigo-text)]',
  TIMEOUT: 'bg-[var(--pink-text)]/15 text-[var(--pink-text)]',
};

// HTTP method badge — arbitrary-but-consistent distinctiveness, not semantic
// pass/fail (a POST isn't "a warning"); reuses the same tokens as
// CLASS_COLORS/STATUS_BADGE since they read fine for this purpose too and
// keeps the token set small.
export const METHOD_COLORS = {
  GET: 'text-[var(--success-text)]',
  POST: 'text-[var(--warning-text)]',
  PUT: 'text-[var(--info-text)]',
  PATCH: 'text-[var(--teal-text)]',
  DELETE: 'text-[var(--danger-text)]',
  OPTIONS: 'text-[var(--indigo-text)]',
  HEAD: 'text-[var(--pink-text)]',
};

export function methodColor(method) {
  return METHOD_COLORS[method] || 'text-[var(--text-muted)]';
}

// The small bordered text-input style used across AuthEditor, GroupsPanel,
// History, etc. — was defined 3 times with slightly drifted padding.
export const INPUT_CLASS = 'bg-[var(--bg-surface-2)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

// Health/pass-rate percentage → same thresholds used across Dashboard,
// GroupsPanel and History today (>=99.9 good, >=50 warning, else bad).
export function healthColor(pct) {
  if (pct == null) return 'text-[var(--text-muted)]';
  if (pct >= 99.9) return 'text-[var(--success-text)]';
  if (pct >= 50) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

// Resolves the CSS variables' *actual* current color at call time, for
// contexts that can't read CSS directly (Chart.js color props draw to a
// <canvas>, not the DOM). Re-resolve after `data-theme` changes — callers
// should use the `useThemeVersion()` hook below to know when to re-run this.
export function resolveThemeColors(names) {
  const styles = getComputedStyle(document.documentElement);
  const out = {};
  for (const name of names) out[name] = styles.getPropertyValue(name).trim();
  return out;
}
