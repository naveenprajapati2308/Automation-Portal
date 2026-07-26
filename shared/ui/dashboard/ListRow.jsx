import './tokens.css';

// Recipe: the "flex-div row" alternative to <Table> for lists that aren't truly
// tabular (Group Health / Failing Schedules / Next Runs Due style) but should
// still share the exact same row rhythm (padding/border/hover) as .tx-table rows.
export function ListRow({ children, className = '' }) {
  return <div className={`tx-list-row ${className}`.trim()}>{children}</div>;
}
