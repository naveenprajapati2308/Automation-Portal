import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Play, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { buildHierarchyRows } from '../hierarchyRows.js';
import { Table } from './Table.jsx';
import { EmptyState } from './EmptyState.jsx';
import './module-analytics-table.css';

const accuracyColor = (pct) => (pct >= 80 ? 'var(--success-text)' : pct >= 50 ? 'var(--warning-text)' : 'var(--danger-text)');

/**
 * Standard Module Analytics table: Parent -> Child module hierarchy, Framework/Environment
 * filters, and Run/Run All controls that queue real executions through the same pipeline as
 * the Execution Center. Presentational + self-contained UI state (expand/collapse, the
 * "select an Environment first" guard) — data fetching and the actual run/queue call are left
 * to the host page via props, so the same component can be dropped onto any Testrix dashboard.
 *
 * `modules` — flat list: { id, code, name, runnerType, parentModuleId, active }
 * `healthByKey` — Map keyed `${code}::${runnerType}` -> { total, passed, failed, skipped, accuracy }
 */
export function ModuleAnalyticsTable({
  modules = [],
  healthByKey = new Map(),
  frameworks = [],
  environments = [],
  selectedFramework = '',
  onFrameworkChange,
  selectedEnvironmentId = '',
  onEnvironmentChange,
  isModuleAvailable,
  onRunModule,
  onRunAllForParent,
  loading = false,
  title = 'Module Analytics',
  icon: Icon,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [queuingKeys, setQueuingKeys] = useState(new Set());
  const [notice, setNotice] = useState(null);

  // The "select an Environment first" warning is only ever set by the guard below — once the
  // user actually picks one, drop it immediately rather than leaving a stale message on screen.
  useEffect(() => {
    if (selectedEnvironmentId) setNotice(null);
  }, [selectedEnvironmentId]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleModules = useMemo(() => modules.filter((m) =>
    m.active !== false && m.code !== 'ALL' &&
    (!selectedFramework || m.runnerType === selectedFramework) &&
    (!isModuleAvailable || isModuleAvailable(m))
  ), [modules, selectedFramework, isModuleAvailable]);

  const rows = useMemo(() => buildHierarchyRows(visibleModules, {
    getParentId: (m) => m.parentModuleId || null,
    expandedIds
  }), [visibleModules, expandedIds]);

  const childrenOf = (parentId) => visibleModules.filter((m) => m.parentModuleId === parentId);

  const healthFor = (row) => healthByKey.get(`${row.code}::${row.runnerType}`) || {};

  const handleReset = () => {
    onFrameworkChange?.('');
    onEnvironmentChange?.('');
    setExpandedIds(new Set());
    setNotice(null);
  };

  const withQueuing = async (key, action) => {
    if (!selectedEnvironmentId) {
      setNotice('Please select an Environment before running this module.');
      return;
    }
    setNotice(null);
    setQueuingKeys((prev) => new Set(prev).add(key));
    try {
      await action();
    } catch (err) {
      setNotice(err?.message || 'Failed to queue execution.');
    } finally {
      setQueuingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const runRow = (row) => withQueuing(row.code, () => onRunModule?.(row));
  const runAllForParent = (row) => withQueuing(`${row.code}::ALL`, () => onRunAllForParent?.(row, childrenOf(row.id)));

  return (
    <div className="tx-mat">
      <div className="tx-mat-toolbar">
        <h3 className="tx-card-title" style={{ margin: 0 }}>{Icon && <Icon size={16} />}{title}</h3>

        <div className="tx-mat-filters">
          <select
            className="tx-mat-select"
            value={selectedFramework}
            onChange={(e) => onFrameworkChange?.(e.target.value)}
            aria-label="Framework filter"
          >
            <option value="">All Frameworks</option>
            {frameworks.map((fw) => (
              <option key={fw.code} value={fw.code}>{fw.displayName || fw.code}</option>
            ))}
          </select>

          <select
            className="tx-mat-select"
            value={selectedEnvironmentId}
            onChange={(e) => onEnvironmentChange?.(e.target.value)}
            aria-label="Environment filter"
          >
            <option value="">Select Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>

          <button type="button" className="tx-mat-reset-btn" onClick={handleReset}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {notice && (
        <div className="tx-mat-notice">
          <AlertTriangle size={14} />
          {notice}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Total</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Accuracy</th>
              <th className="tx-align-right">Run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const health = healthFor(row);
              const total = health.total ?? health.totalTests ?? 0;
              const passed = health.passed ?? 0;
              const failed = health.failed ?? 0;
              const skipped = health.skipped ?? 0;
              const accuracy = health.accuracy ?? health.passRate ?? 0;
              const isQueuing = queuingKeys.has(row.__hasChildren ? `${row.code}::ALL` : row.code);

              return (
                <tr key={`${row.id}`}>
                  <td className="tx-mat-cell-strong">
                    <div className="tx-mat-name-cell" style={{ paddingLeft: row.__isChild ? 26 : 0 }}>
                      {row.__hasChildren ? (
                        <button
                          type="button"
                          className={`tx-mat-chevron ${expandedIds.has(row.id) ? 'tx-mat-chevron-open' : ''}`}
                          onClick={() => toggleExpand(row.id)}
                          title={expandedIds.has(row.id) ? 'Collapse' : 'Expand'}
                        >
                          {expandedIds.has(row.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : row.__isChild ? (
                        <span className="tx-mat-branch">↳</span>
                      ) : (
                        <span className="tx-mat-spacer" />
                      )}
                      <strong>{row.name}</strong>
                    </div>
                  </td>
                  <td>{total}</td>
                  <td style={{ color: 'var(--success-text)', fontWeight: 600 }}>{passed}</td>
                  <td style={{ color: 'var(--danger-text)', fontWeight: 600 }}>{failed}</td>
                  <td style={{ color: 'var(--warning-text)', fontWeight: 600 }}>{skipped}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: accuracyColor(accuracy), minWidth: 40 }}>{accuracy}%</span>
                      <div className="tx-mat-bar-track">
                        <div className="tx-mat-bar-fill" style={{ background: accuracyColor(accuracy), width: `${accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="tx-align-right">
                    {row.__hasChildren ? (
                      <button type="button" className="tx-mat-run-all-btn" disabled={isQueuing} onClick={() => runAllForParent(row)}>
                        {isQueuing ? <Loader2 size={12} className="tx-mat-spin" /> : <Play size={12} />}
                        Run All
                      </button>
                    ) : (
                      <button type="button" className="tx-mat-run-btn" disabled={isQueuing} onClick={() => runRow(row)}>
                        {isQueuing ? <Loader2 size={12} className="tx-mat-spin" /> : <Play size={12} />}
                        Run
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="7">
                  <EmptyState message="No modules match the current filters." />
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
