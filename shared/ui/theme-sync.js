const THEME_KEY = 'portal-theme';

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function getStoredThemePref() {
  return localStorage.getItem(THEME_KEY) || 'light';
}


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

 
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredThemePref() === 'system') applyTheme('system');
  });
}
