import React, { useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export function RunHeatmap({ data = [], loading = false }) {
  // Construct a matrix [dayIndex][hourIndex] = count
  const matrix = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 1;
    if (!data) return { grid, max };

    data.forEach((item) => {
      // dow from MySQL DAYOFWEEK is 1-indexed (1=Sunday, 2=Monday, ..., 7=Saturday)
      const dowIndex = (item.dow ?? 1) - 1; 
      const hourIndex = item.hour ?? 0;
      const count = item.count ?? 0;

      if (dowIndex >= 0 && dowIndex < 7 && hourIndex >= 0 && hourIndex < 24) {
        grid[dowIndex][hourIndex] = count;
        if (count > max) {
          max = count;
        }
      }
    });

    return { grid, max };
  }, [data]);

  if (loading) {
    return (
      <div style={{ height: '180px', display: 'grid', placeItems: 'center', color: '#8a9bb0' }}>
        Loading execution heatmap...
      </div>
    );
  }

  const { grid, max } = matrix;

  const getColor = (count) => {
    if (count === 0) return '#0f1923'; // Matches dark theme background
    const intensity = count / max;
    // Premium theme gradient colors, e.g. blue shades
    if (intensity < 0.25) return 'rgba(0, 176, 255, 0.15)';
    if (intensity < 0.5) return 'rgba(0, 176, 255, 0.4)';
    if (intensity < 0.75) return 'rgba(0, 176, 255, 0.7)';
    return 'rgba(0, 229, 255, 1)'; // Vibrant bright blue
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#8a9bb0', fontWeight: 600 }}>Run Frequency (Day × Hour)</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '9px', fontWeight: 600, color: '#8a9bb0' }}>
          <span>Less</span>
          <div style={{ width: '8px', height: '8px', background: '#0f1923', border: '1px solid #1a2c3d', borderRadius: '1px' }} />
          <div style={{ width: '8px', height: '8px', background: 'rgba(0, 176, 255, 0.15)', borderRadius: '1px' }} />
          <div style={{ width: '8px', height: '8px', background: 'rgba(0, 176, 255, 0.4)', borderRadius: '1px' }} />
          <div style={{ width: '8px', height: '8px', background: 'rgba(0, 176, 255, 0.7)', borderRadius: '1px' }} />
          <div style={{ width: '8px', height: '8px', background: 'rgba(0, 229, 255, 1)', borderRadius: '1px' }} />
          <span>More</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ minWidth: '480px', display: 'grid', gap: '3px' }}>
          {/* Header Row for Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: '3px', alignItems: 'center' }}>
            <div />
            {HOURS.map((h, i) => (
              <div 
                key={h} 
                style={{ 
                  fontSize: '8px', 
                  color: '#8a9bb0', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  visibility: i % 4 === 0 ? 'visible' : 'hidden' 
                }}
              >
                {h.split(':')[0]}
              </div>
            ))}
          </div>

          {/* Day Rows */}
          {DAYS.map((day, dIdx) => (
            <div 
              key={day} 
              style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: '3px', alignItems: 'center' }}
            >
              <div style={{ fontSize: '10px', color: '#8a9bb0', fontWeight: 700, textTransform: 'uppercase' }}>
                {day}
              </div>
              {grid[dIdx].map((count, hIdx) => (
                <div
                  key={hIdx}
                  title={`${DAYS[dIdx]}, ${HOURS[hIdx]}\nExecutions: ${count}`}
                  style={{
                    aspectRatio: '1',
                    background: getColor(count),
                    borderRadius: '2px',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.25)';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 229, 255, 0.4)';
                    e.currentTarget.style.zIndex = '5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.zIndex = '1';
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
