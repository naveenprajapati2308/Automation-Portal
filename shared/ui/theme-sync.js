const THEME_KEY = 'portal-theme';

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function getStoredThemePref() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

// A stored preference is 'light' | 'dark' | 'system' — this resolves it to
// the actual 'light'/'dark' value that CSS (`[data-theme]`) understands.
export function resolveEffectiveTheme(pref) {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

const applyTheme = (pref) => {
  document.documentElement.dataset.theme = resolveEffectiveTheme(pref);
};

export function initThemeSync() {
  applyTheme(getStoredThemePref());

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) applyTheme(event.newValue || 'light');
  });

  // Only matters while the stored preference is 'system': re-resolve when the
  // OS-level scheme flips, without waiting for a 'storage' event (there won't
  // be one — the stored value itself didn't change).
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredThemePref() === 'system') applyTheme('system');
  });
}
