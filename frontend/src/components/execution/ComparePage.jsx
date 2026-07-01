import React, { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { Panel } from '../shared/index.jsx';
import { GitCompare, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function ComparePage({ executions = [] }) {
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    if (!baseId || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.compareExecutions(baseId, targetId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to compare executions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="compare-page page-grid" style={{ display: 'grid', gap: '20px' }}>
      <div className="dashboard-brief" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div>
          <span className="eyebrow">Comparison Center</span>
          <h2>Historical Comparison</h2>
        </div>
      </div>

      {/* Select Controls */}
      <Panel title="Select Executions to Compare" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#cfdae6' }}>Base Execution (Previous)</span>
            <select
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              style={{ height: '38px', borderRadius: '8px', border: '1px solid #1a2c3d', background: '#0f1923', color: '#cfdae6', padding: '0 10px', fontSize: '13px' }}
            >
              <option value="">Select Base Execution...</option>
              {executions.map(e => (
                <option key={e.id} value={e.id}>{e.executionCode} ({e.moduleCode} - {e.passRate}% Pass)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', placeItems: 'center', height: '38px', color: '#8a9bb0' }}>
            <ArrowRight size={18} />
          </div>

          <div style={{ flex: 1, minWidth: '220px', display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#cfdae6' }}>Target Execution (Current/Newer)</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ height: '38px', borderRadius: '8px', border: '1px solid #1a2c3d', background: '#0f1923', color: '#cfdae6', padding: '0 10px', fontSize: '13px' }}
            >
              <option value="">Select Target Execution...</option>
              {executions.map(e => (
                <option key={e.id} value={e.id}>{e.executionCode} ({e.moduleCode} - {e.passRate}% Pass)</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={!baseId || !targetId || loading}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: 0,
              background: '#00b0ff',
              color: '#ffffff',
              padding: '0 20px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (!baseId || !targetId || loading) ? 0.6 : 1,
            }}
          >
            <GitCompare size={16} /> {loading ? 'Comparing...' : 'Compare Runs'}
          </button>
        </div>
      </Panel>

      {error && (
        <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 83, 80, 0.1)', border: '1px solid #ef5350', color: '#ef5350', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {result && (
        <>
          {/* Delta Statistics */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#0f1923', border: '1px solid #1a2c3d', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Pass Rate Change</span>
              <strong style={{ display: 'block', fontSize: '28px', marginTop: '6px', color: result.delta.passRateChange >= 0 ? '#2f9c5d' : '#ef5350' }}>
                {result.delta.passRateChange >= 0 ? '+' : ''}{result.delta.passRateChange}%
              </strong>
              <span style={{ fontSize: '11px', color: '#5d6b7a', display: 'block', marginTop: '4px' }}>
                Base: {result.base.passRate}% → Target: {result.target.passRate}%
              </span>
            </div>

            <div style={{ background: '#0f1923', border: '1px solid #1a2c3d', padding: '16px', borderRadius: '12px', color: '#ef5350' }}>
              <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>New Failures</span>
              <strong style={{ display: 'block', fontSize: '28px', marginTop: '6px' }}>{result.delta.newFailures}</strong>
              <span style={{ fontSize: '11px', color: '#5d6b7a', display: 'block', marginTop: '4px' }}>Tests that broke</span>
            </div>

            <div style={{ background: '#0f1923', border: '1px solid #1a2c3d', padding: '16px', borderRadius: '12px', color: '#2f9c5d' }}>
              <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Fixed Failures</span>
              <strong style={{ display: 'block', fontSize: '28px', marginTop: '6px' }}>{result.delta.fixedFailures}</strong>
              <span style={{ fontSize: '11px', color: '#5d6b7a', display: 'block', marginTop: '4px' }}>Tests now passing</span>
            </div>

            <div style={{ background: '#0f1923', border: '1px solid #1a2c3d', padding: '16px', borderRadius: '12px', color: '#ffb300' }}>
              <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Still Failing</span>
              <strong style={{ display: 'block', fontSize: '28px', marginTop: '6px' }}>{result.delta.stillFailing}</strong>
              <span style={{ fontSize: '11px', color: '#5d6b7a', display: 'block', marginTop: '4px' }}>Persistent failures</span>
            </div>
          </div>

          {/* New Failures */}
          <Panel title={`New Failures (${result.newFailures.length})`} style={{ gridColumn: 'span 2' }}>
            {result.newFailures.length === 0 ? (
              <p style={{ color: '#8a9bb0', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
                <CheckCircle2 size={24} style={{ display: 'block', margin: '0 auto 8px', color: '#2f9c5d' }} />
                No new failures! Clean run transition.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {result.newFailures.map((item, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(239, 83, 80, 0.05)', borderLeft: '4px solid #ef5350', borderRadius: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#ef5350', display: 'block' }}>{item.methodName}</strong>
                    <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', margin: '2px 0 6px 0' }}>{item.className}</span>
                    <pre style={{ margin: 0, padding: '8px', background: '#0a1017', color: '#ef5350', fontSize: '11px', borderRadius: '4px', overflowX: 'auto' }}>
                      {item.failureReason || 'No failure reason provided.'}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Fixed Failures */}
          <Panel title={`Fixed Failures (${result.fixedTests.length})`}>
            {result.fixedTests.length === 0 ? (
              <p style={{ color: '#8a9bb0', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
                No previously failing tests were resolved in this run.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {result.fixedTests.map((item, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: 'rgba(47, 156, 93, 0.05)', borderLeft: '4px solid #2f9c5d', borderRadius: '4px', fontSize: '13px' }}>
                    <strong style={{ color: '#2f9c5d', display: 'block' }}>{item.methodName}</strong>
                    <span style={{ fontSize: '11px', color: '#8a9bb0' }}>{item.className}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Detailed side-by-side list */}
          <Panel title="Detailed Test Results Comparison" style={{ gridColumn: '1 / -1' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Test Class & Method</th>
                    <th>Base Status ({result.base.executionCode})</th>
                    <th>Target Status ({result.target.executionCode})</th>
                  </tr>
                </thead>
                <tbody>
                  {result.statusChangedTests.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#8a9bb0', padding: '20px 0' }}>
                        All test statuses are identical between these executions.
                      </td>
                    </tr>
                  ) : (
                    result.statusChangedTests.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong style={{ color: '#cfdae6' }}>{item.methodName}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#8a9bb0' }}>{item.className}</span>
                        </td>
                        <td>
                          <span className={`status ${item.baseStatus.toLowerCase()}`}>{item.baseStatus}</span>
                        </td>
                        <td>
                          <span className={`status ${item.targetStatus.toLowerCase()}`}>{item.targetStatus}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}
