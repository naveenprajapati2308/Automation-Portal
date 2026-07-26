// Shared vocabulary for the Global Date Range Filter, used by every dashboard
// (shell, automation-portal, api-testing, performance-testing). Keep the token
// set in sync with automation's DashboardService.getSinceInstant on the backend.

export const DATE_RANGE_SCOPES = {
  GLOBAL: 'global',
  AUTOMATION: 'automation',
  APITESTING: 'apitesting',
  PERFORMANCE: 'performance',
};

export const DEFAULT_RANGE = '7d';

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range', disabled: true },
];

export function isKnownRange(value) {
  return RANGE_OPTIONS.some((o) => o.value === value && !o.disabled);
}

export function rangeLabel(value) {
  return RANGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// For backends/clients that only understand an integer day count (e.g. API Testing's `days` param).
export function rangeToDays(range) {
  return { today: 1, '7d': 7, '30d': 30, '90d': 90 }[range] ?? 7;
}
