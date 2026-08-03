import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { GitCompare, ArrowRight, CheckCircle2, XCircle, Info } from 'lucide-react';
import { ExecutionTreePicker } from './ExecutionTreePicker.jsx';
import './compare.css';

// "Which module family does this execution belong to" — the same moduleCode+framework pair
// used everywhere else (Module Management, Execution Center) to key a specific module row.
// Two executions are only ever valid comparison candidates when this key matches exactly, so a
// Partnership Firm run never gets compared against an unrelated Land or Individual run.
const executionModuleKey = (exec) => (exec ? `${exec.moduleCode}::${exec.framework}` : null);

export function ComparePage({ executions = [], modules = [] }) {
  const [baseId, setBaseId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const baseExec = useMemo(() => executions.find((e) => e.id === baseId) || null, [executions, baseId]);
  const targetExec = useMemo(() => executions.find((e) => e.id === targetId) || null, [executions, targetId]);
  const baseModuleKey = executionModuleKey(baseExec);
  const targetModuleKey = executionModuleKey(targetExec);

  // Picking one side clears the other side's selection if it no longer belongs to the same
  // module — this is the "keep both dropdowns synchronized" safety net; the tree picker's own
  // restrictToModuleKey filtering is what stops an invalid pick from happening in the first place.
  const handleBaseChange = (id) => {
    setBaseId(id);
    const exec = executions.find((e) => e.id === id);
    if (targetId && executionModuleKey(exec) !== targetModuleKey) setTargetId(null);
  };
  const handleTargetChange = (id) => {
    setTargetId(id);
    const exec = executions.find((e) => e.id === id);
    if (baseId && executionModuleKey(exec) !== baseModuleKey) setBaseId(null);
  };

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
    <section className="cp-page compare-page">

      {/* Hero */}
      <div className="cp-hero">
        {/* Two variants stacked in place; CSS opacity swaps them by theme so
            the toggle updates instantly without re-mounting. */}
        <img
          src="/execution-art-brigth-art2.png"
          alt=""
          className="cp-hero-art cp-hero-art-bright"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <img
          src="/execution-art2.png"
          alt=""
          className="cp-hero-art cp-hero-art-dark"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="cp-hero-eyebrow">Comparison Center</div>
        <h2 className="cp-hero-title">Historical Comparison</h2>
        <p className="cp-hero-sub">Compare two execution runs to analyze improvements and identify issues.</p>
      </div>

      {/* Select Controls */}
      <div className="cp-card">
        <h3 className="cp-select-title">Select Executions to Compare</h3>
        <p className="cp-select-sub">Choose two execution runs to see a detailed comparison of their performance.</p>

        <div className="cp-pick-row">
          <div className="cp-pick">
            <label className="cp-pick-label">Base Execution (Previous)</label>
            <ExecutionTreePicker
              modules={modules}
              executions={executions}
              value={baseId}
              onChange={handleBaseChange}
              placeholder="Select Base Execution..."
              accent="violet"
              restrictToModuleKey={targetModuleKey}
            />
          </div>

          <div className="cp-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="cp-pick">
            <label className="cp-pick-label">Target Execution (Current/Newer)</label>
            <ExecutionTreePicker
              modules={modules}
              executions={executions}
              value={targetId}
              onChange={handleTargetChange}
              placeholder="Select Target Execution..."
              accent="cyan"
              restrictToModuleKey={baseModuleKey}
            />
          </div>

          <button
            className="cp-compare-btn"
            onClick={handleCompare}
            disabled={!baseId || !targetId || loading}
          >
            <GitCompare size={17} /> {loading ? 'Comparing...' : 'Compare Runs'}
          </button>
        </div>

        <div className="cp-tip">
          <Info size={18} />
          <span><strong>Tip:</strong> The base execution will be considered as the older run, and the target execution as the newer run for comparison.</span>
        </div>
      </div>

      {error && (
        <div className="cp-error">{error}</div>
      )}

      {/* Comparison Results */}
      {result && (
        <>
          {/* Delta Statistics */}
          <div className="cp-kpi-grid">
            <div className="cp-kpi">
              <span>Pass Rate Change</span>
              <strong style={{ color: result.delta.passRateChange >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {result.delta.passRateChange >= 0 ? '+' : ''}{result.delta.passRateChange}%
              </strong>
              <em>Base: {result.base.passRate}% → Target: {result.target.passRate}%</em>
            </div>

            <div className="cp-kpi">
              <span>New Failures</span>
              <strong style={{ color: 'var(--danger-text)' }}>{result.delta.newFailures}</strong>
              <em>Tests that broke</em>
            </div>

            <div className="cp-kpi">
              <span>Fixed Failures</span>
              <strong style={{ color: 'var(--success-text)' }}>{result.delta.fixedFailures}</strong>
              <em>Tests now passing</em>
            </div>

            <div className="cp-kpi">
              <span>Still Failing</span>
              <strong style={{ color: 'var(--warning-text)' }}>{result.delta.stillFailing}</strong>
              <em>Persistent failures</em>
            </div>
          </div>

          {/* New / Fixed failures side by side */}
          <div className="cp-result-grid">
            <div className="cp-card">
              <h3 className="cp-result-title cp-result-title-fail">
                <XCircle size={16} /> New Failures ({result.newFailures.length})
              </h3>
              {result.newFailures.length === 0 ? (
                <p className="cp-empty-note">
                  <CheckCircle2 size={24} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--success-text)' }} />
                  No new failures! Clean run transition.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {result.newFailures.map((item, idx) => (
                    <div key={idx} className="cp-fail-item">
                      <strong>{item.methodName}</strong>
                      <span>{item.className}</span>
                      <pre>{item.failureReason || 'No failure reason provided.'}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cp-card">
              <h3 className="cp-result-title cp-result-title-fixed">
                <CheckCircle2 size={16} /> Fixed Failures ({result.fixedTests.length})
              </h3>
              {result.fixedTests.length === 0 ? (
                <p className="cp-empty-note">No previously failing tests were resolved in this run.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {result.fixedTests.map((item, idx) => (
                    <div key={idx} className="cp-fixed-item">
                      <strong>{item.methodName}</strong>
                      <span>{item.className}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detailed side-by-side list */}
          <div className="cp-card">
            <h3 className="cp-result-title">
              <GitCompare size={16} /> Detailed Test Results Comparison
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Test Class &amp; Method</th>
                    <th>Base Status ({result.base.executionCode})</th>
                    <th>Target Status ({result.target.executionCode})</th>
                  </tr>
                </thead>
                <tbody>
                  {result.statusChangedTests.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        All test statuses are identical between these executions.
                      </td>
                    </tr>
                  ) : (
                    result.statusChangedTests.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.methodName}</strong>
                          <span>{item.className}</span>
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
          </div>
        </>
      )}
    </section>
  );
}
