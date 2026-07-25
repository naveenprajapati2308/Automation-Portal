/**
 * DestinationHighlight.jsx
 * ────────────────────────
 * Post-navigation glow effect — a subtle colour pulse on the page edge
 * that confirms where the user landed after a search-driven navigation.
 *
 * Usage: mount when `active === true`, unmounts itself after `duration` ms.
 *
 * @param {{ active: boolean, color: string, duration?: number, onDone: () => void }} props
 */
import { useEffect, useRef } from 'react';

export function DestinationHighlight({ active, color, duration = 2000, onDone }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setTimeout(() => {
      onDone?.();
    }, duration);
    return () => clearTimeout(timerRef.current);
  }, [active, duration, onDone]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position:      'fixed',
        inset:         0,
        pointerEvents: 'none',
        zIndex:        9999,
        boxShadow:     `inset 0 0 0 3px ${color}55, inset 0 0 60px ${color}22`,
        borderRadius:  0,
        animation:     'destHighlight 2s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes destHighlight {
          0%   { opacity: 1; box-shadow: inset 0 0 0 3px ${color}88, inset 0 0 80px ${color}44; }
          60%  { opacity: 0.8; }
          100% { opacity: 0; box-shadow: inset 0 0 0 0px ${color}00; }
        }
      `}</style>
    </div>
  );
}
