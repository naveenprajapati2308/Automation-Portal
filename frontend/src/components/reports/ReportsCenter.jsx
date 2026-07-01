import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable } from '../shared/index.jsx';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  GitCompare, 
  Search, 
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export function ReportsCenter({ onSelectExecution }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [status, setStatus] = useState('');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Comparison state
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (module) params.module = module;
      if (search) params.search = search;
      
      if (fromDate) {
        params.from = new Date(fromDate).toISOString();
      }
      if (toDate) {
        params.to = new Date(toDate).toISOString();
      }

      const list = await api.reportsList(params);
      setReports(list);
    } catch (e) {
      console.error("Error loading reports list", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [status, module, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleCompare = async () => {
    if (!baseId || !targetId) {
      alert("Please select both base and target executions to compare.");
      return;
    }
    setIsComparing(true);
    try {
      const result = await api.compareExecutions(baseId, targetId);
      setComparisonResult(result);
    } catch (e) {
      alert("Comparison failed: " + e.message);
    } finally {
      setIsComparing(false);
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const columns = useMemo(() => [
    {
      key: 'executionCode',
      label: 'Code',
      render: (val, report) => (
        <button 
          onClick={() => onSelectExecution(report.id)}
          style={{ border: 0, background: 'transparent', padding: 0, color: '#176b87', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
        >
          {val}
        </button>
      )
    },
    {
      key: 'suiteName',
      label: 'Suite Name',
      render: (val) => <span style={{ fontSize: '12px', color: '#2c3e50', fontWeight: 600 }}>{val ?? 'Master Automation'}</span>
    },
    {
      key: 'moduleCode',
      label: 'Module',
      render: (val) => <span className="status">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <span className={`status ${val?.toLowerCase()}`}>{val}</span>
    },
    {
      key: 'testsCount',
      label: 'Tests (P / F / S)',
      render: (_, report) => (
        <span style={{ fontSize: '12px', fontWeight: 600 }}>
          <span style={{ color: '#2f9c5d' }}>{report.passedTests}</span> / <span style={{ color: '#e57373' }}>{report.failedTests}</span> / <span style={{ color: '#e0a64a' }}>{report.skippedTests}</span>
        </span>
      )
    },
    {
      key: 'passRate',
      label: 'Pass %',
      render: (val) => <span style={{ fontWeight: 700 }}>{val}%</span>
    },
    {
      key: 'durationSeconds',
      label: 'Duration',
      render: (val) => formatDuration(val)
    },
    {
      key: 'createdAt',
      label: 'Started At',
      render: (val) => <span style={{ fontSize: '11px', color: '#6a7886' }}>{formatDate(val)}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, report) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {report.finalReportPath && (
            <>
              <a 
                href={`/api/reports/${report.id}/view`} 
                target="_blank" 
                rel="noreferrer"
                className="secondary-action" 
                title="Open Extent Report"
                style={{ display: 'inline-flex', padding: '6px 8px', minHeight: 'unset' }}
               >
                 <ExternalLink size={14} />
               </a>
               <a 
                 href={`/api/reports/${report.id}/download`} 
                 className="secondary-action" 
                 title="Download HTML"
                 style={{ display: 'inline-flex', padding: '6px 8px', minHeight: 'unset' }}
               >
                 <Download size={14} />
               </a>
             </>
           )}
           <a 
             href={`/api/reports/${report.id}/testng-results`} 
             className="secondary-action" 
             title="Download TestNG XML"
             style={{ display: 'inline-flex', padding: '6px 8px', minHeight: 'unset', color: '#176b87' }}
           >
             <FileText size={14} />
           </a>
           <button 
             onClick={() => onSelectExecution(report.id)}
             className="secondary-action" 
             title="View Details"
             style={{ display: 'inline-flex', padding: '6px 8px', minHeight: 'unset' }}
           >
             <Eye size={14} />
           </button>
         </div>
       )
     }
  ], [onSelectExecution]);

  return (
    <section className="reports-page" style={{ display: 'grid', gap: '20px' }}>
      
      {/* Search and Filters */}
      <Panel title="Filter Reports">
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'end' }}>
          
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Search Execution Code</label>
            <div style={{ display: 'flex', border: '1px solid #cfdae6', borderRadius: '8px', overflow: 'hidden', background: '#fff', alignItems: 'center', padding: '0 8px' }}>
              <Search size={15} style={{ color: '#8a9bb0' }} />
              <input 
                type="text" 
                placeholder="e.g. AUTO-2026..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: '36px', border: 0, outline: 0, paddingLeft: '6px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Module</label>
            <select 
              value={module} 
              onChange={(e) => setModule(e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
            >
              <option value="">All Modules</option>
              <option value="LAND">Land Management</option>
              <option value="ARCHITECT">Architect Empanelment</option>
              <option value="SURVEY">Survey</option>
              <option value="GIS">GIS</option>
            </select>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
            >
              <option value="">All Statuses</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="PARTIAL">Partial</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
            />
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
            />
          </div>

          <button 
            type="submit" 
            className="primary-action"
            style={{ height: '38px', width: '100%', borderRadius: '8px' }}
          >
            Apply Filters
          </button>
        </form>
      </Panel>

      {/* Historical Report List */}
      <Panel title="Historical Execution Reports">
        <DataTable 
          columns={columns} 
          data={reports} 
          loading={loading} 
          searchPlaceholder="Search reports..."
          exportFilename="historical_reports.csv"
        />
      </Panel>

      {/* Comparison Engine UI */}
      <Panel title="Compare Execution Run Metrics">
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
            
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Base Execution (Older Run)</label>
              <select 
                value={baseId} 
                onChange={(e) => setBaseId(e.target.value)}
                style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
              >
                <option value="">Select Base Execution</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>{r.executionCode} ({r.moduleCode} - {r.passRate}% Pass)</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Target Execution (Newer Run)</label>
              <select 
                value={targetId} 
                onChange={(e) => setTargetId(e.target.value)}
                style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '8px', background: '#fff', padding: '0 8px', fontSize: '13px' }}
              >
                <option value="">Select Target Execution</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>{r.executionCode} ({r.moduleCode} - {r.passRate}% Pass)</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleCompare}
              className="primary-action"
              style={{ height: '38px', padding: '0 24px', width: 'auto', display: 'flex', gap: '8px', borderRadius: '8px' }}
              disabled={isComparing}
            >
              <GitCompare size={16} /> {isComparing ? 'Comparing...' : 'Compare Runs'}
            </button>
          </div>

          {/* Comparison Results Card */}
          {comparisonResult && (
            <div style={{ background: '#f5f8fb', border: '1px solid #dce5ef', borderRadius: '10px', padding: '20px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2eaf3', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3>Comparison Result: <code>{comparisonResult.base.executionCode}</code> vs <code>{comparisonResult.target.executionCode}</code></h3>
                <button 
                  onClick={() => setComparisonResult(null)}
                  style={{ background: 'transparent', border: 0, color: '#e57373', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Clear Comparison
                </button>
              </div>

              {/* Delta KPI Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2eaf3' }}>
                  <span style={{ fontSize: '11px', color: '#8a9bb0', textTransform: 'uppercase', display: 'block' }}>Pass Rate Change</span>
                  <strong style={{ fontSize: '22px', color: comparisonResult.delta.passRateChange >= 0 ? '#2f9c5d' : '#e57373' }}>
                    {comparisonResult.delta.passRateChange >= 0 ? '+' : ''}{comparisonResult.delta.passRateChange}%
                  </strong>
                </div>

                <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2eaf3' }}>
                  <span style={{ fontSize: '11px', color: '#8a9bb0', textTransform: 'uppercase', display: 'block' }}>New Failures</span>
                  <strong style={{ fontSize: '22px', color: comparisonResult.delta.newFailures > 0 ? '#e57373' : '#2f9c5d' }}>
                    {comparisonResult.delta.newFailures} tests
                  </strong>
                </div>

                <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2eaf3' }}>
                  <span style={{ fontSize: '11px', color: '#8a9bb0', textTransform: 'uppercase', display: 'block' }}>Fixed Failures</span>
                  <strong style={{ fontSize: '22px', color: '#2f9c5d' }}>
                    {comparisonResult.delta.fixedFailures} tests
                  </strong>
                </div>

                <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2eaf3' }}>
                  <span style={{ fontSize: '11px', color: '#8a9bb0', textTransform: 'uppercase', display: 'block' }}>Still Failing</span>
                  <strong style={{ fontSize: '22px', color: '#e0a64a' }}>
                    {comparisonResult.delta.stillFailing} tests
                  </strong>
                </div>
              </div>

              {/* Newly Failed Tests list */}
              {comparisonResult.newFailures.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #fdd8d8', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#c0392b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={16} /> New Regression Failures ({comparisonResult.newFailures.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {comparisonResult.newFailures.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px', background: '#fff8f8', borderRadius: '4px', borderLeft: '3px solid #e57373', fontSize: '12px' }}>
                        <strong>{item.methodName}</strong> <span style={{ color: '#8a9bb0' }}>({item.className})</span>
                        <p style={{ margin: '4px 0 0', color: '#c0392b', fontStyle: 'italic' }}>{item.failureReason ?? 'No message'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed Tests list */}
              {comparisonResult.fixedTests.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #dff6e7', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#136b36', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Fixed Failures ({comparisonResult.fixedTests.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {comparisonResult.fixedTests.map((item, idx) => (
                      <div key={idx} style={{ padding: '6px 8px', background: '#f5fcf7', borderRadius: '4px', borderLeft: '3px solid #2f9c5d', fontSize: '12px' }}>
                        <strong>{item.methodName}</strong> <span style={{ color: '#8a9bb0' }}>({item.className})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General status changes */}
              {comparisonResult.statusChangedTests.length === 0 && (
                <p style={{ color: '#5d6b7a', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>All matched tests have identical status in both executions.</p>
              )}
            </div>
          )}
        </div>
      </Panel>
    </section>
  );
}
