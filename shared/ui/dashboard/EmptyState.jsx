import './tokens.css';

// Recipe: standardizes empty-state typography/spacing platform-wide; each call
// site keeps its own copy (some are generic "No data", some are actionable
// hints like "create one in the Scheduler tab" — the message is left as-is).
export function EmptyState({ icon: Icon, message, className = '' }) {
  return (
    <div className={`tx-empty ${className}`.trim()}>
      {Icon && <Icon size={28} />}
      <span>{message}</span>
    </div>
  );
}
