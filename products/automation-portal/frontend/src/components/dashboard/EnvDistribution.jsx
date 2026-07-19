import React, { useMemo } from 'react';

const ENV_COLORS = {
  dev: '#06b6d4',      // Cyan
  staging: '#10b981',  // Emerald
  prod: '#f43f5e',     // Rose
  qa: '#7c3aed',       // Violet (primary accent)
  uat: '#2563eb',      // Blue
  default: '#94a3b8'   // Slate
};

export function EnvDistribution({ data = [], environments = [], loading = false }) {
  const resolvedData = useMemo(() => {
    if (!data) return [];
    
    const envMap = new Map(environments.map(e => [e.id, e.name]));
    const total = data.reduce((sum, item) => sum + (item.count ?? 0), 0);

    return data.map(item => {
      const name = envMap.get(Number(item.envId)) || `Env #${item.envId}`;
      const count = item.count ?? 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      
      let key = name.toLowerCase();
      let color = ENV_COLORS.default;
      if (key.includes('dev')) color = ENV_COLORS.dev;
      else if (key.includes('stage') || key.includes('stg') || key.includes('preprod')) color = ENV_COLORS.staging;
      else if (key.includes('prod')) color = ENV_COLORS.prod;
      else if (key.includes('qa')) color = ENV_COLORS.qa;
      else if (key.includes('uat')) color = ENV_COLORS.uat;

      return { name, count, pct, color };
    });
  }, [data, environments]);

  if (loading) {
    return (
      <div style={{ height: '100px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
        Loading environment mix...
      </div>
    );
  }

  if (resolvedData.length === 0) {
    return (
      <div style={{ height: '100px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
        No environment runs tracked.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '12px', width: '100%' }}>
      {resolvedData.map((item, idx) => (
        <div key={idx} style={{ display: 'grid', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>{item.count} runs ({item.pct.toFixed(0)}%)</span>
          </div>
          <div style={{ background: 'var(--bg-surface-2)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: item.color, width: `${item.pct}%`, borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
