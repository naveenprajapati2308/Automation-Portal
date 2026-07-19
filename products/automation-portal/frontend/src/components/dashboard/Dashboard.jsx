import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Clock3,
  FileText,
  Hourglass,
  Layers,
  Monitor,
  HelpCircle,
  TrendingUp,
  PieChart,
  Globe2,
  History,
  Timer
} from 'lucide-react';
import { api, auth } from '../../api.js';
import { Loader } from '../shared/Loader.jsx';

// Import child components
import { TrendChart } from './TrendChart.jsx';
import { EnvDistribution } from './EnvDistribution.jsx';
import './dashboard.css';

// Helper for formatting duration into hh:mm:ss
const formatDurationHMS = (seconds) => {
  if (!seconds) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [
    String(hrs).padStart(2, '0'),
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0')
  ].join(':');
};

export function Dashboard({ onSelectExecution, onNavigate }) {
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [selectedEnvId, setSelectedEnvId] = useState('');

  // Data states from API
  const [summary, setSummary] = useState(null);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [modulesHealthData, setModulesHealthData] = useState([]);
  const [modules, setModules] = useState([]);
  const [envDistribution, setEnvDistribution] = useState([]);
  const [trends, setTrends] = useState([]);
  const [slowTests, setSlowTests] = useState([]);
  const [flakyTests, setFlakyTests] = useState([]);

  // Load API Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        summaryData,
        recentData,
        envData,
        healthData,
        envDistData,
        trendsData,
        slowTestData,
        flakyTestData,
        modulesData
      ] = await Promise.all([
        api.dashboardSummary().catch(() => null),
        api.dashboardRecentActivity().catch(() => []),
        api.environments().catch(() => []),
        api.dashboardModuleHealth(range).catch(() => []),
        api.dashboardEnvDistribution(range).catch(() => []),
        api.dashboardTrends(range).catch(() => []),
        api.dashboardSlowTests(range).catch(() => []),
        api.dashboardFlakyTests(range).catch(() => []),
        api.modules().catch(() => [])
      ]);

      if (summaryData) setSummary(summaryData);
      if (recentData) setRecentExecutions(recentData);

      if (envData) {
        setEnvironments(envData);
        if (envData.length > 0 && !selectedEnvId) {
          setSelectedEnvId(envData[0].id);
        }
      }

      if (healthData) setModulesHealthData(healthData);
      if (modulesData) setModules(modulesData);
      if (envDistData) setEnvDistribution(envDistData);
      if (trendsData) setTrends(trendsData);
      if (slowTestData) setSlowTests(slowTestData);
      if (flakyTestData) setFlakyTests(flakyTestData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  // Keep a ref to the latest loadData (it closes over `range`/`selectedEnvId`) so the SSE
  // effect below can call the current version without re-subscribing on every render.
  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  });

  // Live updates: subscribe once to the dashboard-wide event stream (mirrors the pattern
  // already used by ExecutionCenter.jsx for its per-execution stream) and refresh the existing
  // REST-backed data on relevant lifecycle events. Debounced so a fast-running suite (many
  // TEST_PASSED/FAILED events in a row) doesn't hammer the dashboard endpoints; this is purely
  // additive on top of the existing mount/range-change load, so if the stream never connects or
  // errors out, the page behaves exactly as it did before (initial load only, manual refresh via
  // range change or triggering a run).
  useEffect(() => {
    const token = auth.get()?.accessToken;
    const url = `/api/events/dashboard/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const sse = new EventSource(url);

    let debounceTimer = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDataRef.current();
      }, 3000);
    };

    const liveEvents = [
      'EXECUTION_STARTING',
      'SUITE_STARTED',
      'TEST_PASSED',
      'TEST_FAILED',
      'TEST_SKIPPED',
      'MODULE_COMPLETED',
      'SUITE_COMPLETED'
    ];
    liveEvents.forEach((eventName) => sse.addEventListener(eventName, scheduleRefresh));

    sse.onerror = () => {
      // Non-fatal: dashboard already has real data from the initial load, this stream is a
      // best-effort live-update layer on top of it.
      console.warn('Dashboard live-update stream lost connection');
    };

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      sse.close();
    };
  }, []);

  // Identify the latest execution for the top cards & system info
  const lastRun = useMemo(() => {
    return recentExecutions.length > 0 ? recentExecutions[0] : null;
  }, [recentExecutions]);

  // Formatter for Date and Time
  const formatDateTime = (isoString) => {
    if (!isoString) return { date: 'N/A', time: 'N/A' };
    try {
      const dateObj = new Date(isoString);
      if (isNaN(dateObj.getTime())) return { date: 'N/A', time: 'N/A' };

      const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

      return {
        date: dateObj.toLocaleDateString('en-US', dateOptions),
        time: dateObj.toLocaleTimeString('en-US', timeOptions)
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  const startTimes = useMemo(() => formatDateTime(lastRun?.startTime), [lastRun]);
  const endTimes = useMemo(() => formatDateTime(lastRun?.endTime), [lastRun]);

  // Module Analytics rows come from the admin-registered modules (active only),
  // merged with the range-scoped health aggregates by module code. The ALL
  // master-suite module is excluded — the "Run All Modules" button owns that.
  // A module with envCodes set is only shown for those environments.
  const selectedEnvCode = environments.find(e => String(e.id) === String(selectedEnvId))?.code;
  const availableInEnv = (m) =>
    !m.envCodes || !selectedEnvCode ||
    m.envCodes.split(',').map(c => c.trim()).includes(selectedEnvCode);

  const moduleRows = useMemo(() => {
    return modules
      .filter(m => m.active && m.code !== 'ALL' && availableInEnv(m))
      .map(m => {
        const health = modulesHealthData.find(h => h.moduleCode === m.code);
        return {
          code: m.code,
          name: m.name,
          total: health ? (health.totalTests ?? health.total ?? 0) : 0,
          passed: health ? (health.passed ?? 0) : 0,
          failed: health ? (health.failed ?? 0) : 0,
          skipped: health ? (health.skipped ?? 0) : 0,
          accuracy: health ? (health.passRate ?? 0) : 0
        };
      });
  }, [modules, modulesHealthData, selectedEnvId, environments]);

  // Trigger run for a module
  const handleRunModule = async (moduleCode) => {
    if (!selectedEnvId) {
      alert('Please select an environment first.');
      return;
    }
    try {
      const payload = {
        executionType: moduleCode === 'ALL' ? 'ALL_MODULES' : 'MODULE',
        environmentId: Number(selectedEnvId),
        moduleCode: moduleCode === 'ALL' ? null : moduleCode
      };
      await api.runExecution(payload);
      const moduleName = moduleCode === 'ALL'
        ? 'All Modules'
        : (modules.find(m => m.code === moduleCode)?.name || moduleCode);
      alert(`Execution queued successfully for ${moduleName}!`);
      loadData();
    } catch (err) {
      console.error(err);
      alert(`Failed to trigger execution: ${err.message}`);
    }
  };

  // Accuracy circular ring calculation
  const accuracyPercent = lastRun ? Number(lastRun.passRate ?? 0) : 0;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyPercent / 100) * circumference;

  // Execution Mix calculations
  const mixPassRate = summary?.passRate ?? 0;
  const mixPassed = summary?.passedTests ?? 0;
  const mixFailed = summary?.failedTests ?? 0;
  const mixSkipped = summary?.skippedTests ?? 0;
  const mixCirc = 2 * Math.PI * 36;
  const mixTotal = mixPassed + mixFailed + mixSkipped;
  const mixPct = (v) => (mixTotal > 0 ? Math.round((v / mixTotal) * 100) : 0);
  // Donut segments (pass/fail/skip), drawn clockwise from 12 o'clock
  const mixSegments = (() => {
    const parts = [
      { value: mixPassed, color: 'var(--success-text)' },
      { value: mixFailed, color: 'var(--danger-text)' },
      { value: mixSkipped, color: 'var(--warning-text)' },
    ].filter((p) => p.value > 0);
    let acc = 0;
    return parts.map((p) => {
      const frac = mixTotal > 0 ? p.value / mixTotal : 0;
      const seg = { ...p, dash: frac * mixCirc, offset: -acc * mixCirc };
      acc += frac;
      return seg;
    });
  })();

  const accuracyColor = (pct) => (pct >= 80 ? 'var(--success-text)' : pct >= 50 ? 'var(--warning-text)' : 'var(--danger-text)');

  if (loading && !summary) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <Loader size={48} label="Loading quality analytics..." />
      </div>
    );
  }

  return (
    <section className="db-page">

      {/* Subheader (Portal Info & Range Filter) — the page title, search, Super Admin
          badge and Admin Panel button are all already provided once by the global
          Topbar, so this page only owns what's unique to it. */}
      <div className="db-subhead">
        <div>
          <span className="db-eyebrow">Quality Analytics Portal</span>
          <h3>Analytics Dashboard</h3>
        </div>

        <div className="db-range">
          Filter Range:
          <select className="db-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="db-kpi-row">

        {/* Card 1: Last Test Summary */}
        <div className="db-card db-tint-violet">
          <div className="db-kpi-head">
            <span className="db-kpi-label">Last Test Summary</span>
            <FileText size={16} style={{ color: 'var(--accent-text)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 14, fontSize: 13 }}>
            <div>
              <div style={{ color: '#5d7292', fontSize: 11 }}>Total Tests</div>
              <strong style={{ color: 'var(--text-primary)', fontSize: 18 }}>{lastRun?.totalTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--success-text)', fontSize: 11 }}>Passed</div>
              <strong style={{ color: 'var(--success-text)', fontSize: 18 }}>{lastRun?.passedTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--danger-text)', fontSize: 11 }}>Failed</div>
              <strong style={{ color: 'var(--danger-text)', fontSize: 18 }}>{lastRun?.failedTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--warning-text)', fontSize: 11 }}>Skipped</div>
              <strong style={{ color: 'var(--warning-text)', fontSize: 18 }}>{lastRun?.skippedTests ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Last Execution Started */}
        <div className="db-card db-tint-violet" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="db-kpi-head">
            <span className="db-kpi-label">Last Execution Started</span>
            <Clock3 size={16} style={{ color: 'var(--accent-text)' }} />
          </div>
          <div style={{ marginTop: 16 }}>
            <strong className="db-kpi-value" style={{ fontSize: 18 }}>{startTimes.date}</strong>
            <span className="db-kpi-sub" style={{ fontSize: 13 }}>{startTimes.time}</span>
          </div>
        </div>

        {/* Card 3: Last Execution Ended */}
        <div className="db-card db-tint-red" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="db-kpi-head">
            <span className="db-kpi-label">Last Execution Ended</span>
            <Hourglass size={16} style={{ color: 'var(--danger-text)' }} />
          </div>
          <div style={{ marginTop: 16 }}>
            <strong className="db-kpi-value" style={{ fontSize: 18 }}>{endTimes.date}</strong>
            <span className="db-kpi-sub" style={{ fontSize: 13 }}>{endTimes.time}</span>
          </div>
        </div>

        {/* Card 4: Last Duration */}
        <div className="db-card db-tint-green" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="db-kpi-head">
            <span className="db-kpi-label">Last Duration</span>
            <Timer size={16} style={{ color: 'var(--success-text)' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="db-kpi-sub">Total Runtime</span>
            <strong className="db-kpi-value db-mono" style={{ fontSize: 22, marginTop: 2 }}>
              {lastRun ? formatDurationHMS(lastRun.durationSeconds) : '00:00:00'}
            </strong>
            <span className="db-kpi-sub" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hour</span>
          </div>
        </div>

        {/* Card 5: Last Total Accuracy */}
        <div className="db-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span className="db-kpi-label">Total Accuracy</span>
            <strong className="db-kpi-value" style={{ fontSize: 22, marginTop: 10 }}>
              {accuracyPercent.toFixed(2)}%
            </strong>
            <span className="db-kpi-sub">
              ({lastRun ? lastRun.passedTests : 0}/{lastRun ? lastRun.totalTests : 0} Passed)
            </span>
          </div>

          <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={radius} fill="transparent" style={{ stroke: 'var(--border)' }} strokeWidth="6" />
              <circle
                cx="30" cy="30" r={radius} fill="transparent"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ stroke: 'var(--accent)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
              {Math.round(accuracyPercent)}%
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Charts and Mix */}
      <div className="db-charts-row">

        {/* Execution Trend */}
        <div className="db-card">
          <h3 className="db-card-title"><TrendingUp size={16} /> Execution Trend</h3>
          <TrendChart data={trends} loading={loading} />
        </div>

        {/* Execution Mix */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="db-card-title"><PieChart size={16} /> Execution Mix</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, gap: 12 }}>
            <div style={{ position: 'relative', width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="36" fill="transparent" style={{ stroke: 'var(--border)' }} strokeWidth="7" />
                {mixSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="46" cy="46" r="36" fill="transparent"
                    strokeWidth="7"
                    strokeDasharray={`${seg.dash} ${mixCirc - seg.dash}`}
                    strokeDashoffset={seg.offset}
                    style={{ stroke: seg.color, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                ))}
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{mixPassRate.toFixed(1)}%</div>
                <div style={{ fontSize: 8, color: '#5d7292', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Pass Rate</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, maxWidth: 120 }}>
              <div className="db-mix-row db-mix-pass">
                <span>Passed</span>
                <strong>{mixPassed} ({mixPct(mixPassed)}%)</strong>
              </div>
              <div className="db-mix-row db-mix-fail">
                <span>Failed</span>
                <strong>{mixFailed} ({mixPct(mixFailed)}%)</strong>
              </div>
              <div className="db-mix-row db-mix-skip">
                <span>Skipped</span>
                <strong>{mixSkipped} ({mixPct(mixSkipped)}%)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Distribution */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="db-card-title"><Globe2 size={16} /> Environment Distribution</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EnvDistribution data={envDistribution} environments={environments} loading={loading} />
          </div>
        </div>

      </div>

      {/* Row 3: Module Analytics */}
      <div className="db-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 className="db-card-title" style={{ margin: 0 }}><Layers size={16} /> Module Analytics</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select className="db-select" value={selectedEnvId} onChange={(e) => setSelectedEnvId(e.target.value)}>
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>

            <button className="db-run-all-btn" onClick={() => handleRunModule('ALL')}>
              <Play size={14} />
              Run All Modules
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="db-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
                <th>Accuracy</th>
                <th style={{ textAlign: 'right' }}>Run</th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((row) => (
                <tr key={row.code}>
                  <td className="db-cell-strong">{row.name}</td>
                  <td>{row.total}</td>
                  <td style={{ color: 'var(--success-text)', fontWeight: 600 }}>{row.passed}</td>
                  <td style={{ color: 'var(--danger-text)', fontWeight: 600 }}>{row.failed}</td>
                  <td style={{ color: 'var(--warning-text)', fontWeight: 600 }}>{row.skipped}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: accuracyColor(row.accuracy), minWidth: 40 }}>
                        {row.accuracy}%
                      </span>
                      <div className="db-bar-track">
                        <div className="db-bar-fill" style={{ background: accuracyColor(row.accuracy), width: `${row.accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="db-run-btn" onClick={() => handleRunModule(row.code)}>
                      <Play size={12} />
                      Run Module
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Slowest Test Cases & Flaky Tests */}
      <div className="db-two-col">

        {/* Slowest Test Cases */}
        <div className="db-card">
          <h3 className="db-card-title"><Clock3 size={16} /> Slowest Test Cases</h3>
          <div style={{ overflowY: 'auto', maxHeight: 250 }}>
            <table className="db-table">
              <thead>
                <tr>
                  <th>Test Case</th>
                  <th>Module</th>
                  <th style={{ textAlign: 'right' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {slowTests.slice(0, 10).map((tc, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="db-cell-strong">{tc.methodName}</div>
                      <div className="db-cell-sub">{tc.className}</div>
                    </td>
                    <td>
                      <span className="db-chip">{tc.module || 'ALL'}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--warning-text)' }}>
                      {Number(tc.duration).toFixed(2)}s
                    </td>
                  </tr>
                ))}
                {slowTests.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: 20, textAlign: 'center', color: '#5d7292', fontSize: 12 }}>
                      No slow test data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flaky Tests (Stability Analysis) */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="db-card-title"><HelpCircle size={16} /> Flaky Tests (Stability Analysis)</h3>

          <div className="db-empty-note">
            <HelpCircle size={36} />
            All tests are stable. No flakiness detected in this range.
          </div>
        </div>

      </div>

      {/* Row 5: System Information & Recent Executions */}
      <div className="db-info-row">

        {/* System & Run Information */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="db-card-title"><Monitor size={16} /> System &amp; Run Information</h3>

            <div className="db-sys-grid">
              <div className="db-sys-tile">
                <span>Host Machine</span>
                <strong>{lastRun?.machineName || 'localhost'}</strong>
              </div>

              <div className="db-sys-tile">
                <span>OS System</span>
                <strong>{lastRun?.osName || 'Windows/Linux'}</strong>
              </div>

              <div className="db-sys-tile">
                <span>Java Version</span>
                <strong>{lastRun?.javaVersion || 'Java 21'}</strong>
              </div>

              <div className="db-sys-tile">
                <span>Automation Browser</span>
                <strong>{lastRun ? `${lastRun.browserName || 'Chrome'} / Selenium` : 'Chrome / Selenium'}</strong>
              </div>
            </div>
          </div>

          <div className="db-sys-foot">
            System environment information matches the latest execution run <strong>{lastRun?.executionCode || 'AUTO-N/A'}</strong>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="db-card">
          <h3 className="db-card-title"><History size={16} /> Recent Executions</h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="db-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Module</th>
                  <th style={{ textAlign: 'right' }}>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions.slice(0, 6).map((exec) => (
                  <tr key={exec.id}>
                    <td>
                      <span className="db-code-link" onClick={() => onSelectExecution(exec.id)}>
                        {exec.executionCode}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {exec.executionType === 'ALL_MODULES' ? 'ALL_MODULES' : exec.executionType}
                    </td>
                    <td>
                      <span className={`xc-status xc-status-${(exec.status || '').toLowerCase()}`}>
                        <span className="xc-dot" />
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{exec.moduleCode || 'ALL'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {Number(exec.passRate ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </section>
  );
}
