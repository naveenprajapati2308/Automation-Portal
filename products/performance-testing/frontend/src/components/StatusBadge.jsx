import { STATUS_BADGE, DRIFT_BADGE, TYPE_BADGE } from '../lib/statusColors.js';

export function StatusBadge({ status, className = '' }) {
  if (!status) return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-hover)] text-[var(--text-muted)] ${className}`}>NEVER RUN</span>;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[status] ?? 'bg-[var(--bg-hover)] text-[var(--text-muted)]'} ${className}`.trim()}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function DriftBadge({ severity, className = '' }) {
  if (!severity) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${DRIFT_BADGE[severity] ?? 'bg-[var(--bg-hover)] text-[var(--text-muted)]'} ${className}`.trim()}>
      {severity}
    </span>
  );
}

export function TypeBadge({ type, className = '' }) {
  if (!type) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_BADGE[type] ?? 'bg-[var(--bg-hover)] text-[var(--text-muted)]'} ${className}`.trim()}>
      {type}
    </span>
  );
}
