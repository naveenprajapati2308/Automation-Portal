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

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
