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
        // An iframe can't render anything above its own top edge — if iframeTop > 0 (page
        // scrolled above the iframe, e.g. the shell topbar still showing), the naive -iframeTop
        // shift pushes the overlay's top past what the iframe can actually paint, clipping it.
        // Clamp to 0 and shrink height by the same amount so the overlay covers exactly the
        // outer viewport's overlap with the iframe instead of running off its top edge.
        const top = Math.max(0, -iframeTop);
        const height = topWin.innerHeight - Math.max(0, iframeTop);
        setBounds({ top, height });
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
