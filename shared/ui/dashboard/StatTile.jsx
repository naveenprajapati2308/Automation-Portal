import './tokens.css';

const ICON_TONE_CLASS = {
  success: 'tx-kpi-icon-success',
  danger: 'tx-kpi-icon-danger',
  warning: 'tx-kpi-icon-warning',
  info: 'tx-kpi-icon-info',
};
const VALUE_TONE_CLASS = {
  success: 'tx-tone-success',
  danger: 'tx-tone-danger',
  warning: 'tx-tone-warning',
  info: 'tx-tone-info',
};

// Recipe: one KPI tile atom for every dashboard — icon badge + label + big value.
// `tone` colors both the icon badge and the value (success/danger/warning/info),
// default is the neutral accent badge with primary-text value.
export function StatTile({ icon: Icon, label, value, tone, className = '' }) {
  return (
    <div className={`tx-kpi-tile ${className}`.trim()}>
      <div className={`tx-kpi-icon ${ICON_TONE_CLASS[tone] || ''}`.trim()}>
        {Icon && <Icon size={17} />}
      </div>
      <div className="tx-kpi-body">
        <span className="tx-kpi-label">{label}</span>
        <span className={`tx-kpi-value ${VALUE_TONE_CLASS[tone] || ''}`.trim()}>{value}</span>
      </div>
    </div>
  );
}
