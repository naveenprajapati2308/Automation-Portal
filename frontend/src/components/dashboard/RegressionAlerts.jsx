import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export function RegressionAlerts({ alerts = [], onSelectExecution }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          style={{
            background: 'linear-gradient(135deg, rgba(239, 83, 80, 0.15), rgba(239, 83, 80, 0.05))',
            border: '1px solid rgba(239, 83, 80, 0.3)',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 15px rgba(239, 83, 80, 0.1)',
            animation: 'fadeInDown 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 83, 80, 0.2)', color: '#ef5350' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef5350', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regression Detected</span>
                <span style={{ fontSize: '10px', color: '#8a9bb0' }}>{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cfdae6' }}>
                Module <strong>{alert.moduleName}</strong> went from <strong>100% PASS</strong> ({alert.previousExecutionCode}) to <strong>{alert.passRate}% PASS</strong> in build <strong>{alert.latestExecutionCode}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectExecution && onSelectExecution(alert.latestExecutionId)}
            style={{
              background: '#ef5350',
              color: '#ffffff',
              border: 0,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(239, 83, 80, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f44336';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef5350';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Investigate Build <ArrowRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
