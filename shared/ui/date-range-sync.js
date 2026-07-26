// Cross-iframe persistence for the Global Date Range Filter, modeled on theme-sync.js.
// Each dashboard "scope" (see DATE_RANGE_SCOPES) gets its own localStorage key so the
// four dashboards keep independent selections while each persists across navigation.
import { DEFAULT_RANGE, isKnownRange } from './date-range.js';

const KEY_PREFIX = 'testrix-date-range:';
const EVENT_NAME = 'testrix:date-range-change';

function keyFor(scope) {
  return `${KEY_PREFIX}${scope}`;
}

export function getStoredRange(scope, fallback = DEFAULT_RANGE) {
  const value = localStorage.getItem(keyFor(scope));
  return isKnownRange(value) ? value : fallback;
}

export function setStoredRange(scope, range) {
  localStorage.setItem(keyFor(scope), range);
  // The native `storage` event only fires in *other* documents/iframes, never the
  // one that wrote the value, so dispatch a same-document event too.
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { scope, range } }));
}

export function subscribeRangeChange(scope, callback) {
  const onCustom = (event) => {
    if (event.detail?.scope === scope) callback(event.detail.range);
  };
  const onStorage = (event) => {
    if (event.key === keyFor(scope)) callback(isKnownRange(event.newValue) ? event.newValue : DEFAULT_RANGE);
  };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
