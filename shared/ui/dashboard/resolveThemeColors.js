// Resolves CSS variables' *actual* current color at call time, for contexts that
// can't read CSS directly (Chart.js color props draw to a <canvas>, not the DOM).
// Re-resolve after `data-theme` changes — pair with useThemeVersion() to know when.
export function resolveThemeColors(names) {
  const styles = getComputedStyle(document.documentElement);
  const out = {};
  for (const name of names) out[name] = styles.getPropertyValue(name).trim();
  return out;
}
