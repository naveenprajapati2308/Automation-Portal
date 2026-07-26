// Canonical status/method color maps for Performance Testing — same pattern as
// api-testing's lib/statusColors.js: every value is a Testrix shared theme
// token (see shared/ui/theme.css), so this gives the module the same
// light/dark palette as the rest of the platform.

// Run status (perf test / load test / group run) — badge background + text.
export const STATUS_BADGE = {
  PASSED: 'bg-[var(--success-bg-soft)] text-[var(--success-text)]',
  FAILED: 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]',
  RUNNING: 'bg-[var(--accent-bg-soft)] text-[var(--accent-text)]',
  ABORTED: 'bg-[var(--bg-hover)] text-[var(--text-muted)]',
  ERROR: 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]',
  QUEUED: 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  NEVER_RUN: 'bg-[var(--bg-hover)] text-[var(--text-muted)]',
};

// Drift severity badge (perf_drift_alert.severity).
export const DRIFT_BADGE = {
  STABLE: 'bg-[var(--success-bg-soft)] text-[var(--success-text)]',
  WARNING: 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  CRITICAL: 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]',
};

// Schedule / test-group-member type badge.
export const TYPE_BADGE = {
  PERF: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  PERF_TEST: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  LOAD: 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  LOAD_TEST: 'bg-[var(--warning-bg-soft)] text-[var(--warning-text)]',
  GROUP: 'bg-[var(--success-bg-soft)] text-[var(--success-text)]',
};

export const METHOD_COLORS = {
  GET: 'text-[var(--success-text)]',
  POST: 'text-[var(--warning-text)]',
  PUT: 'text-[var(--info-text)]',
  PATCH: 'text-[var(--teal-text)]',
  DELETE: 'text-[var(--danger-text)]',
};

export function methodColor(method) {
  return METHOD_COLORS[method] || 'text-[var(--text-muted)]';
}

// The small bordered text-input style used across every form in this app.
export const INPUT_CLASS = 'w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

export function resolveThemeColors(names) {
  const styles = getComputedStyle(document.documentElement);
  const out = {};
  for (const name of names) out[name] = styles.getPropertyValue(name).trim();
  return out;
}
