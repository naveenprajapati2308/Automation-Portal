import './tokens.css';


export function ListRow({ children, className = '' }) {
  return <div className={`tx-list-row ${className}`.trim()}>{children}</div>;
}
