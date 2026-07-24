import { ArrowDownRight, ArrowUpRight, BarChart3, Minus } from 'lucide-react';
export { Panel } from './Panel.jsx';
export { DataTable } from './DataTable.jsx';

// ── Shared: Metric ─────────────────────────────────────────────────────────────
export function Metric({ label, value, hint, trend, icon: Icon, tone = 'default', className = '' }) {
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  const trendLabel = trend === undefined ? null : trend === 0 ? '0%' : `${trend > 0 ? '+' : ''}${trend}%`;
  return (
    <div className={`metric metric-${tone} ${className}`}>
      <div className="metric-head">
        <span>{label}</span>
        {Icon && (
          <div className="metric-icon">
            <Icon size={18} />
          </div>
        )}
      </div>
      <strong>{value}</strong>
      {(hint || trendLabel) && (
        <div className="metric-foot">
          {hint && <small>{hint}</small>}
          {trendLabel && (
            <em className={trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : ''}>
              <TrendIcon size={13} />
              {trendLabel}
            </em>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared: ExecutionTable ────────────────────────────────────────────────────
export function ExecutionTable({ executions, onSelect }) {
  if (!executions.length) {
    return <div className="empty"><BarChart3 size={20} /> No executions yet</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Type</th>
          <th>Status</th>
          <th>Module</th>
          <th>Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        {executions.map((execution) => (
          <tr key={execution.id}>
            <td>
              {onSelect ? (
                <button 
                  onClick={() => onSelect(execution.id)}
                  style={{ border: 0, background: 'transparent', padding: 0, color: '#176b87', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
                >
                  {execution.executionCode}
                </button>
              ) : (
                execution.executionCode
              )}
            </td>
            <td>{execution.executionType}</td>
            <td><span className={`status ${execution.status?.toLowerCase()}`}>{execution.status}</span></td>
            <td>{execution.moduleCode ?? 'All'}</td>
            <td>{execution.passRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Shared: Placeholder ───────────────────────────────────────────────────────
export function Placeholder({ title, lines }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="clean-list">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}

// ── Shared: Modal ─────────────────────────────────────────────────────────────
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { lockParentScroll } from '../../../../../../shared/ui/iframe-scroll-lock.js';

// This page is normally viewed inside the Testrix shell's auto-height iframe (matches its own
// content height exactly, no internal scroll of its own — the OUTER page scrolls instead). CSS
// `position: fixed` inside such an iframe anchors to *the iframe's own* full (often very tall)
// box, not the physical browser viewport — so plain `align-items: center` on `.modal-overlay`
// centers a popup in the middle of the WHOLE page's height, not in what the owner can actually
// see right now. If they're scrolled anywhere except exactly the middle, the popup renders off
// their visible area (this was a real, reported bug — a "Session Expired" popup rendering near
// the very bottom of a long scrolled page). Computes where, in this iframe's own local
// coordinate space, the center of the OUTER window's *currently visible* viewport falls, using
// `window.frameElement` (this iframe's own <iframe> element, as seen from the parent — readable
// because everything here is same-origin) and `window.top` (the real outermost viewport) —
// then positions the modal there directly instead of relying on CSS centering.
function useViewportCenterOffset() {
  const [offset, setOffset] = useState(null);

  useEffect(() => {
    let topWin = null;
    try {
      topWin = window.top;
      if (topWin === window) topWin = null; // not embedded — nothing to correct for
    } catch {
      topWin = null; // cross-origin top somehow — fall back to plain CSS centering
    }
    if (!topWin || !window.frameElement) return;

    const compute = () => {
      try {
        const iframeTop = window.frameElement.getBoundingClientRect().top;
        setOffset((topWin.innerHeight / 2) - iframeTop);
      } catch {
        setOffset(null);
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

  return offset;
}

export function Modal({ title, children, onClose }) {
  const centerY = useViewportCenterOffset();
  const modalStyle = centerY != null
    ? { position: 'absolute', top: centerY, left: '50%', transform: 'translate(-50%, -50%)', margin: 0 }
    : undefined;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const unlockParent = lockParentScroll(); // no-op unless embedded — see that file
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      unlockParent();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
