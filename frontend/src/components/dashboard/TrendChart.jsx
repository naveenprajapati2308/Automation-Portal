import React, { useMemo } from 'react';

export function TrendChart({ data = [], loading = false }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, index) => ({
      x: index,
      date: d.date,
      passRate: Number(d.passRate ?? 0),
      failRate: Number(d.failRate ?? 0),
      execCount: d.execCount ?? 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ height: '160px', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
        Loading trend analytics...
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div style={{ height: '160px', display: 'grid', placeItems: 'center', color: '#64748b', fontSize: '13px' }}>
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

  // Generate SVG path for pass rate
  let passPath = '';
  let passAreaPath = '';
  points.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.passRate);
    if (i === 0) {
      passPath = `M ${x} ${y}`;
      passAreaPath = `M ${x} ${padding + chartHeight} L ${x} ${y}`;
    } else {
      passPath += ` L ${x} ${y}`;
      passAreaPath += ` L ${x} ${y}`;
    }
    if (i === points.length - 1) {
      passAreaPath += ` L ${x} ${padding + chartHeight} Z`;
    }
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'linear-gradient(to right, #6366f1, #a5b4fc)', borderRadius: '2px' }} />
          <span style={{ color: '#94a3b8' }}>Pass Rate</span>
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="passStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((level) => (
            <g key={level}>
              <line
                x1={padding}
                y1={getY(level)}
                x2={width - padding}
                y2={getY(level)}
                stroke="#192038"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={getY(level) + 3}
                textAnchor="end"
                fontSize="9"
                fill="#64748b"
                fontWeight="600"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* Area & Stroke Paths */}
          {points.length > 1 && (
            <>
              <path d={passAreaPath} fill="url(#passGrad)" />
              <path
                d={passPath}
                fill="none"
                stroke="url(#passStroke)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Data Points / Interactive Dots */}
          {points.map((p, i) => {
            const x = getX(i);
            const y = getY(p.passRate);
            return (
              <g key={i} className="chart-dot-group" style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="#0c1020"
                  stroke="#6366f1"
                  strokeWidth="2"
                  style={{ transition: 'all 0.15s' }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#a5b4fc"
                />
                <title>{`${p.date}\nPass Rate: ${p.passRate}%\nRuns: ${p.execCount}`}</title>
              </g>
            );
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
                fill="#64748b"
                fontWeight="600"
              >
                {p.date ? p.date.substring(5) : ''}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
