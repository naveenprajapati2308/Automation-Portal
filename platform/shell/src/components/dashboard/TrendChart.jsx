import React, { useMemo, useState } from 'react';
import { Loader } from '../../../../../shared/ui/Loader.jsx';

// Portal-wide status colors (Stripe / B2B SaaS palette)
const SERIES = [
  { key: 'pass', label: 'Pass', color: '#16a34a', grad: '#16a34a' },
  { key: 'fail', label: 'Fail', color: '#dc2626', grad: '#dc2626' },
  { key: 'skip', label: 'Skip', color: '#d97706', grad: '#d97706' },
];

const toRate = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

function getCurvedPath(points, getX, getY, key) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${getX(0)} ${getY(points[0][key])}`;

  let path = `M ${getX(0)} ${getY(points[0][key])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getX(i);
    const y0 = getY(points[i][key]);
    const x1 = getX(i + 1);
    const y1 = getY(points[i + 1][key]);
    const cp1x = x0 + (x1 - x0) / 2;
    const cp1y = y0;
    const cp2x = x0 + (x1 - x0) / 2;
    const cp2y = y1;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return path;
}

function getCurvedAreaPath(points, getX, getY, key, baseline) {
  if (!points || points.length === 0) return '';
  const curve = getCurvedPath(points, getX, getY, key);
  const lastX = getX(points.length - 1);
  const firstX = getX(0);
  return `${curve} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
}

export function TrendChart({ data = [], loading = false }) {
  const [visible, setVisible] = useState({ pass: true, fail: true, skip: true });
  const [hoverIndex, setHoverIndex] = useState(null);

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
      <div style={{ height: '180px', display: 'grid', placeItems: 'center' }}>
        <Loader size={28} label="Loading trend analytics..." />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div style={{ height: '180px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No trend data available for this range.
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padding = 34;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2 - 10;

  const maxIndex = points.length - 1 || 1;
  const getX = (index) => padding + (index / maxIndex) * chartWidth;
  const getY = (value) => padding + chartHeight - (Math.min(100, Math.max(0, value)) / 100) * chartHeight;
  const baseline = padding + chartHeight;

  const shownSeries = SERIES.filter((s) => visible[s.key]);
  const toggle = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Legend Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pass / Fail / Skip Rates (%)
        </span>
        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 600 }}>
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: visible[s.key] ? 'var(--bg-surface-2)' : 'transparent',
                border: `1px solid ${visible[s.key] ? 'var(--border)' : 'transparent'}`,
                cursor: 'pointer',
                opacity: visible[s.key] ? 1 : 0.4,
                transition: 'all 0.15s ease',
                color: 'var(--text-primary)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`trendGrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.grad} stopOpacity="0.16" />
                <stop offset="100%" stopColor={s.grad} stopOpacity="0.0" />
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
                stroke="var(--border-soft)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={getY(level) + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
                fontWeight="600"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* Area fills */}
          {points.length > 1 && shownSeries.map((s) => (
            <path
              key={`area-${s.key}`}
              d={getCurvedAreaPath(points, getX, getY, s.key, baseline)}
              fill={`url(#trendGrad-${s.key})`}
            />
          ))}

          {/* Curved Line paths */}
          {points.length > 1 && shownSeries.map((s) => (
            <path
              key={`line-${s.key}`}
              d={getCurvedPath(points, getX, getY, s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover Column Indicator */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padding}
              x2={getX(hoverIndex)}
              y2={baseline}
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((p, i) => {
            const x = getX(i);
            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Transparent hit target column */}
                <rect
                  x={x - 15}
                  y={padding}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                />
                {shownSeries.map((s) => (
                  <circle
                    key={`${s.key}-${i}`}
                    cx={x}
                    cy={getY(p[s.key])}
                    r={hoverIndex === i ? '5.5' : '3.5'}
                    fill="var(--bg-surface)"
                    stroke={s.color}
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                ))}
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 6)) === 0).map((p, idx) => {
            const index = points.indexOf(p);
            const x = getX(index);
            return (
              <text
                key={idx}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
                fontWeight="600"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Tooltip */}
      {activePoint && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: `${((getX(hoverIndex) / width) * 100).toFixed(1)}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-card-hover)',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {activePoint.date}
          </div>
          <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>Pass: {activePoint.pass}%</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>Fail: {activePoint.fail}%</span>
            <span style={{ color: '#d97706', fontWeight: 700 }}>Skip: {activePoint.skip}%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
            Executions: {activePoint.execCount}
          </div>
        </div>
      )}
    </div>
  );
}

