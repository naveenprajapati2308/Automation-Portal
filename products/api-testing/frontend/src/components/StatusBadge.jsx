import { StatusBadge as SharedStatusBadge } from '../../../../../shared/ui/dashboard/StatusBadge.jsx';
import { STATUS_BADGE } from '../lib/statusColors.js';

// Thin re-export: keeps this app's own status vocabulary/colors (STATUS_BADGE)
// while picking up the shared pill shape/typography from shared/ui/dashboard.
export function StatusBadge({ status, className = '', formatLabel }) {
  return <SharedStatusBadge status={status} colorMap={STATUS_BADGE} className={className} formatLabel={formatLabel} />;
}
