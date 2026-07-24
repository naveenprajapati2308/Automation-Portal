import React, { useMemo, useState } from 'react';
import { Loader } from '../../../../../shared/ui/Loader.jsx';

// Ported from products/automation-portal/frontend/src/components/dashboard/TrendChart.jsx —
// same component, reused as-is (plain SVG + shared CSS vars, no extra deps) rather than
// re-implemented, so the Global Dashboard's trend charts look and behave identically to the
// ones inside the Automation product itself.

// Portal-wide status colors (same as Module Analytics / Execution Mix).
const SERIES = [
  { key: 'pass', label: 'Pass', color: 'var(--success-text)' },
  { key: 'fail', label: 'Fail', color: 'var(--danger-text)' },
  { key: 'skip', label: 'Skip', color: 'var(--warning-text)' },
];

const toRate = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

export function TrendChart({ data = [], loading = false }) {
  const [visible, setVisible] = useState({ pass: true, fail: true, skip: true });

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, index) => {
      const total = Number(d.totalTests ?? 0);
      return {
        x: index,
        date: d.date,
        label: d.label ?? (d.date ? d.date.substring(5) : ''),
        pass: Number(d.passRate ?? toRate(Number(d.passed ?? 0), total)),
        fail: Number(d.failRate ?? toRate(Number(d.failed ?? 0), total)),
        skip: Number(d.skipRate ?? toRate(Number(d.skipped ?? 0), total)),
        execCount: d.execCount ?? d.executions ?? 0,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div style={{ height: '160px', display: 'grid', placeItems: 'center' }}>
        <Loader size={28} label="Loading trend analytics..." />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div style={{ height: '160px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No trend data available for this range.
      </div>
    );
  }

  const width = 600;
  const height = 180;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxIndex = points.length - 1 || 1;
  const getX = (index) => padding + (index / maxIndex) * chartWidth;
  const getY = (value) => padding + chartHeight - (value / 100) * chartHeight;

  const linePath = (key) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p[key])}`).join(' ');

  const areaPath = (key) => {
    const baseline = padding + chartHeight;
    const line = points.map((p, i) => `L ${getX(i)} ${getY(p[key])}`).join(' ');
    return `M ${getX(0)} ${baseline} ${line} L ${getX(points.length - 1)} ${baseline} Z`;
  };

  const shownSeries = SERIES.filter((s) => visible[s.key]);
  // The soft area fill only appears when a single series is shown — overlapping
  // translucent fills for all three would just read as mud.
  const soloSeries = shownSeries.length === 1 ? shownSeries[0] : null;

  const toggle = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }}>
        {SERIES.map((s) => (
          <label
            key={s.key}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: visible[s.key] ? 1 : 0.45, userSelect: 'none' }}
          >
            <input
              type="checkbox"
              checked={visible[s.key]}
              onChange={() => toggle(s.key)}
              style={{ accentColor: s.color, width: 13, height: 13, cursor: 'pointer', margin: 0 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </label>
        ))}
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`trendGrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: s.color }} stopOpacity="0.25" />
                <stop offset="100%" style={{ stopColor: s.color }} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((level) => (
            <g key={level}>
              <line
                x1={padding}
                y1={getY(level)}
                x2={width - padding}
                y2={getY(level)}
                style={{ stroke: 'var(--border-soft)' }}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={getY(level) + 3}
                textAnchor="end"
                fontSize="9"
                style={{ fill: 'var(--text-muted)' }}
                fontWeight="600"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* Area fill (only when a single series is visible) */}
          {soloSeries && points.length > 1 && (
            <path d={areaPath(soloSeries.key)} fill={`url(#trendGrad-${soloSeries.key})`} />
          )}

          {/* Series lines */}
          {points.length > 1 && shownSeries.map((s) => (
            <path
              key={s.key}
              d={linePath(s.key)}
              fill="none"
              style={{ stroke: s.color }}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Data points */}
          {points.map((p, i) => {
            const x = getX(i);
            return shownSeries.map((s) => (
              <g key={`${s.key}-${i}`} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={getY(p[s.key])} r="4" style={{ fill: 'var(--bg-surface)', stroke: s.color }} strokeWidth="2" />
                <title>{`${p.label.includes(':') ? `${p.date} ${p.label}` : p.date}\nPass: ${p.pass}%  Fail: ${p.fail}%  Skip: ${p.skip}%\nRuns: ${p.execCount}`}</title>
              </g>
            ));
          })}

          {/* X Axis Labels */}
          {points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, idx) => {
            const index = points.indexOf(p);
            const x = getX(index);
            return (
              <text
                key={idx}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                style={{ fill: 'var(--text-muted)' }}
                fontWeight="600"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
