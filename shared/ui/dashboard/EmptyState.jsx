import './tokens.css';


export function EmptyState({ icon: Icon, message, className = '' }) {
  return (
    <div className={`tx-empty ${className}`.trim()}>
      {Icon && <Icon size={28} />}
      <span>{message}</span>
    </div>
  );
}
