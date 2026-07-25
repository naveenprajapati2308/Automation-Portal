import { useEffect, useState } from 'react';


export function useViewportBounds() {
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    let topWin = null;
    try {
      topWin = window.top;
      if (topWin === window) topWin = null; // not embedded — nothing to correct for
    } catch {
      topWin = null; // cross-origin top somehow — fall back to plain CSS
    }
    if (!topWin || !window.frameElement) return;

    const compute = () => {
      try {
        const iframeTop = window.frameElement.getBoundingClientRect().top;
        setBounds({ top: -iframeTop, height: topWin.innerHeight });
      } catch {
        setBounds(null);
      }
    };
    compute();
    topWin.addEventListener('scroll', compute);
    topWin.addEventListener('resize', compute);
    window.addEventListener('resize', compute);
    return () => {
      topWin.removeEventListener('scroll', compute);
      topWin.removeEventListener('resize', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);

  return bounds;
}
