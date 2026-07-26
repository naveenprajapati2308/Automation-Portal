import './tokens.css';

// Recipe: swap a page's own `<table className="...">` for `<Table>` and keep
// authoring `<thead>/<tbody>/<tr>/<th>/<td>` as before — this only supplies the
// shared header/row/hover styling via tokens.css's `.tx-table`. Use the
// `tx-align-right` class on numeric `<th>`/`<td>` cells for right-alignment.
export function Table({ children, className = '' }) {
  return <table className={`tx-table ${className}`.trim()}>{children}</table>;
}
