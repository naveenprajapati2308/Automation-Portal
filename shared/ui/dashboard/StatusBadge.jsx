import './tokens.css';

// Recipe: each app keeps its own status→className map (its existing lib/statusColors.js
// STATUS_BADGE/CLASS_BADGE object — the status vocabulary is business logic, not
// presentation) and passes it in as `colorMap`. Only the pill's shape/size/typography
// is shared. Apps with Tailwind can keep passing their existing `bg-[var(--x)] text-
// [var(--y)]` class strings; apps without Tailwind can point at tokens.css's generic
// `.tx-tone-bg-*` classes instead — both are just className strings to this component.
export function StatusBadge({ status, colorMap = {}, className = '', formatLabel }) {
  if (!status) return null;
  const toneClass = colorMap[status] || 'tx-tone-bg-neutral';
  const label = formatLabel ? formatLabel(status) : status;
  return (
    <span className={`tx-badge ${toneClass} ${className}`.trim()}>
      {label}
    </span>
  );
}
