import './tokens.css';

// Recipe: import Card from shared/ui/dashboard for any new analytics widget's
// container instead of a bespoke bordered <div> — keeps radius/shadow/hover
// identical platform-wide. `padded={false}` for content that wants custom
// inner padding (e.g. a KPI tile row split into per-cell padding).
export function Card({ children, className = '', padded = true, hoverable = true }) {
  const cls = [
    'tx-card',
    !padded && 'tx-card-unpadded',
    hoverable && 'tx-card-hoverable',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
