import React, { useMemo } from 'react';

// Plain SVG donut with smooth rounded ring arcs & B2B SaaS legend styling
export function DonutChart({ segments = [], size = 150, strokeWidth = 16, centerLabel = 'Total' }) {
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
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
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', tracking: '-0.03em' }}>{total}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 140 }}>
        {segments.map((s) => {
          const pct = total > 0 ? Math.round(((s.value || 0) / total) * 1000) / 10 : 0;
          return (
            <div key={s.key} className="donut-legend-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="donut-legend-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span className="donut-legend-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <span className="donut-legend-value" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                {s.value ?? 0} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

