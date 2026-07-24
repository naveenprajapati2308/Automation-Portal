import { useEffect, useState } from 'react';

// When embedded in the shell's auto-height iframe (see iframe-resize.js), `position: fixed`
// inside this document anchors to the IFRAME's own full box — which iframe-resize.js keeps
// sized to this page's entire content height, not the physical browser viewport. So a modal
// centered with plain CSS, or a drawer sized to `height: 100%`, positions itself relative to
// the whole (often very tall) page instead of what the owner can actually see right now. If
// they're scrolled anywhere except near the top, it renders partly or fully off-screen.
//
// This computes where, in THIS iframe's own local coordinate space, the OUTER window's
// currently-visible viewport falls — using `window.frameElement` (this iframe's own <iframe>
// element, as seen from the parent — readable because everything here is same-origin) and
// `window.top` (the real outermost viewport). Returns `{ top, height }` describing that visible
// slice, or `null` if not embedded / not computable (fall back to plain CSS `fixed`/`100vh`
// in that case — it's already correct for a non-embedded page).
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
