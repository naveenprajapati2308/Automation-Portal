import { RANGE_OPTIONS } from './date-range.js';
import './date-range-filter.css';

export function DateRangeFilter({ value, onChange, label = 'Filter Range:', className = '' }) {
  return (
    <div className={`dr-range ${className}`}>
      {label}
      <select className="dr-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
