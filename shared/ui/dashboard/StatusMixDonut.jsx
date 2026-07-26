import { useMemo } from 'react';
import './tokens.css';
import { Card } from './Card.jsx';
import { LoadingBlock } from './LoadingBlock.jsx';
import { EmptyState } from './EmptyState.jsx';

// Recipe: the ONE status-mix donut every dashboard uses (Execution Mix, Run
// Status Mix, Response Status Mix, etc). `segments` is [{key, label, value, color}]
// — color can be a literal CSS color or a `--token` name, rendered via native SVG
// `var()` (no canvas color-resolution involved, so it always tracks the live theme
// exactly, including on toggle). Hand-rolled SVG rather than a charting-library
// canvas — this is what gives it the rounded arc caps and the smooth fade/scale-in
// on mount without depending on a canvas animation engine.
export function StatusMixDonut({
  title,
  segments = [],
  loading = false,
  emptyMessage = 'No data available.',
  centerLabel = 'Total',
  centerValue,
  size = 132,
  strokeWidth = 15,
  className = '',
}) {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let offset = 0;
    return segments
      .filter((s) => (s.value || 0) > 0)
      .map((s) => {
        const fraction = s.value / total;
        const dash = fraction * circumference;
        const arc = { ...s, dash, offset };
        offset += dash;
        return arc;
      });
  }, [segments, total, circumference]);

  const colorVar = (c) => (c.startsWith('--') ? `var(${c})` : c);

  return (
    <Card className={className}>
      {title && <h3 className="tx-card-title">{title}</h3>}
      <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <LoadingBlock label="Loading..." minHeight={160} size={22} />
        ) : total === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="tx-donut-row">
            <div className="tx-donut-ring" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="tx-donut-svg">
                <circle cx={center} cy={center} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={strokeWidth} />
                {arcs.map((a) => (
                  <circle
                    key={a.key}
                    className="tx-donut-arc"
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke={colorVar(a.color)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                    strokeDashoffset={-a.offset}
                    transform={`rotate(-90 ${center} ${center})`}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <div className="tx-donut-center">
                <span className="tx-donut-center-value">{centerValue ?? total}</span>
                <span className="tx-donut-center-label">{centerLabel}</span>
              </div>
            </div>
            <div className="tx-chart-legend">
              {segments.map((s) => {
                const pct = total > 0 ? Math.round(((s.value || 0) / total) * 1000) / 10 : 0;
                return (
                  <div key={s.key} className="tx-chart-legend-item">
                    <span className="tx-chart-legend-dot" style={{ background: colorVar(s.color) }} />
                    <span className="tx-chart-legend-label">{s.label}</span>
                    <span className="tx-chart-legend-count">
                      {s.value ?? 0} <span className="tx-chart-legend-pct">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
