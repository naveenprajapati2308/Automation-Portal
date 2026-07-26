import { StatusBadge as SharedStatusBadge } from '../../../../../shared/ui/dashboard/StatusBadge.jsx';
import { STATUS_BADGE, DRIFT_BADGE, TYPE_BADGE } from '../lib/statusColors.js';

// Thin re-exports: keep this app's own status vocabulary/colors while picking
// up the shared pill shape/typography from shared/ui/dashboard.
export function StatusBadge({ status, className = '' }) {
  return (
    <SharedStatusBadge
      status={status || 'NEVER_RUN'}
      colorMap={STATUS_BADGE}
      className={className}
      formatLabel={(s) => s.replace('_', ' ')}
    />
  );
}

export function DriftBadge({ severity, className = '' }) {
  if (!severity) return null;
  return <SharedStatusBadge status={severity} colorMap={DRIFT_BADGE} className={className} />;
}

export function TypeBadge({ type, className = '' }) {
  if (!type) return null;
  return <SharedStatusBadge status={type} colorMap={TYPE_BADGE} className={className} />;
}
