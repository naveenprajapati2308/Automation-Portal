import React, { useMemo } from 'react';

// Plain SVG donut, same "no extra deps, shared CSS vars" approach as TrendChart —
// used for the Global Dashboard's status-mix widgets (screenshot design pass).
export function DonutChart({ segments = [], size = 140, strokeWidth = 18, centerLabel = 'Total' }) {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return segments
      .filter((s) => (s.value || 0) > 0)
      .map((s) => {
        const fraction = s.value / total;
        const dash = fraction * circumference;
        const arc = { ...s, r, circumference, dash, offset };
        offset += dash;
        return arc;
      });
  }, [segments, total, size, strokeWidth]);

  if (total <= 0) {
    return (
      <div style={{ height: size, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No data available.
      </div>
    );
  }

  const center = size / 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={(size - strokeWidth) / 2} fill="none" stroke="var(--border-soft)" strokeWidth={strokeWidth} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={center}
              cy={center}
              r={a.r}
              fill="none"
              stroke={a.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${a.dash} ${a.circumference - a.dash}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${center} ${center})`}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{total}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round(((s.value || 0) / total) * 1000) / 10 : 0;
          return (
            <div key={s.key} className="donut-legend-item">
              <span className="donut-legend-dot" style={{ background: s.color }} />
              <span className="donut-legend-label">{s.label}</span>
              <span className="donut-legend-value">{s.value ?? 0} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
