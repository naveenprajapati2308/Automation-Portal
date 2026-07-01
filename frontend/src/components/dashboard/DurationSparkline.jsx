import React, { useMemo } from 'react';

export function DurationSparkline({ data = [], loading = false }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => ({
      date: d.date,
      avgDuration: Number(d.avgDuration ?? 0),
      execCount: d.execCount ?? 0,
    }));
  }, [data]);

  const maxDuration = useMemo(() => {
    if (points.length === 0) return 1;
    return Math.max(...points.map((p) => p.avgDuration), 1);
  }, [points]);

  if (loading) {
    return (
      <div style={{ height: '70px', display: 'grid', placeItems: 'center', color: '#8a9bb0' }}>
        Loading build times...
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div style={{ height: '70px', display: 'grid', placeItems: 'center', color: '#8a9bb0', fontSize: '12px' }}>
        No duration data.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '50px' }}>
        {points.map((p, idx) => {
          const heightPercent = (p.avgDuration / maxDuration) * 100;
          return (
            <div
              key={idx}
              title={`${p.date}\nAvg Duration: ${p.avgDuration.toFixed(1)}s\nRuns: ${p.execCount}`}
              style={{
                flex: 1,
                height: `${Math.max(heightPercent, 10)}%`,
                background: 'linear-gradient(to top, #e5a93c, #fcd068)',
                borderRadius: '2px 2px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#8a9bb0', fontWeight: 600 }}>
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
