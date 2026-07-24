import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Loader } from '../../../../../../shared/ui/Loader.jsx';

export function TestStepPanel({ testCaseId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchSteps = async () => {
      setLoading(true);
      try {
        const data = await api.getTestSteps(testCaseId);
        if (active) {
          setSteps(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load steps');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSteps();
    return () => { active = false; };
  }, [testCaseId]);

  if (loading) {
    return (
      <div style={{ padding: '12px' }}>
        <Loader size={16} label="Loading step execution logs..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px', color: 'var(--danger-text)', fontSize: '12px' }}>
        Error: {error}
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
        No steps available for this test case.
      </div>
    );
  }

  const getStepIcon = (status) => {
    switch (status.toUpperCase()) {
      case 'PASS':
        return <CheckCircle2 size={16} style={{ color: 'var(--success-text)' }} />;
      case 'FAIL':
        return <XCircle size={16} style={{ color: 'var(--danger-text)' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#ffb300' }} />;
    }
  };

  return (
    <div style={{ display: 'grid', gap: '8px', padding: '12px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
        Execution Steps Log ({steps.length})
      </div>
      <div style={{ display: 'grid', gap: '6px' }}>
        {steps.map((step, idx) => {
          const isFailed = step.status.toUpperCase() === 'FAIL';
          const isExpanded = expandedStep === step.id;
          return (
            <div
              key={step.id}
              style={{
                background: 'var(--bg-inset)',
                borderRadius: '6px',
                border: isFailed ? '1px solid rgba(239, 83, 80, 0.2)' : '1px solid #1a2c3d',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => isFailed && setExpandedStep(isExpanded ? null : step.id)}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isFailed ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getStepIcon(step.status)}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {step.stepName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#5d6b7a', fontWeight: 600 }}>
                    {step.durationMs ? `${(step.durationMs / 1000).toFixed(2)}s` : '0s'}
                  </span>
                  {isFailed && (isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />)}
                </div>
              </div>

              {isFailed && isExpanded && (
                <div style={{ padding: '12px', background: 'var(--bg-page)', borderTop: '1px solid rgba(239, 83, 80, 0.15)' }}>
                  <div style={{ color: 'var(--danger-text)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Error Message:
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', background: 'rgba(239,83,80,0.05)', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid #ef5350', marginBottom: '10px', fontFamily: 'monospace' }}>
                    {step.errorMessage}
                  </div>
                  {step.stackTrace && (
                    <>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                        Stack Trace:
                      </div>
                      <pre style={{ margin: 0, padding: '10px', background: 'var(--bg-page)', color: 'var(--text-muted)', borderRadius: '4px', overflowX: 'auto', fontSize: '11px', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {step.stackTrace}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
