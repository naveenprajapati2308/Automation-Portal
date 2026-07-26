import { useEffect, useState } from 'react';

// Bumps whenever the platform theme changes. Chart.js reads colors as plain
// JS values at draw time, not live CSS, so anything feeding it a color
// resolved from a CSS variable (see resolveThemeColors in statusColors.js)
// needs to know when to re-resolve and re-render.
export function useThemeVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'data-theme')) {
        setVersion((v) => v + 1);
      }
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return version;
}
