import { STATUS_BADGE } from '../lib/statusColors.js';

export function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  return (
    <span
      className={`px-1.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[status] ?? 'bg-[var(--bg-hover)] text-[var(--text-muted)]'} ${className}`.trim()}
    >
      {status}
    </span>
  );
}
