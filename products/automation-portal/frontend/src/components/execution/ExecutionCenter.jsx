import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  Image as ImageIcon,
  ChevronDown,
  Rocket,
  History,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api, auth } from '../../api.js';
import { DataTable, Modal } from '../shared/index.jsx';
import './execution.css';

// ── Formatting helpers ─────────────────────────────────────────────────────────
function prettyStatus(raw) {
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function ExecutionCenter({
  environments,
  modules,
  selectedEnv,
  selectedModule,
  setSelectedEnv,
  setSelectedModule,
  run,
  executions,
  onSelectExecution,
  onRefresh
}) {
  // Active modules, narrowed to the selected environment (empty envCodes = all envs)
  const selectedEnvCode = (environments || []).find(e => String(e.id) === String(selectedEnv))?.code;
  const activeModules = (modules || []).filter(m => m.active !== false)
    .filter(m => !m.envCodes || !selectedEnvCode ||
      m.envCodes.split(',').map(c => c.trim()).includes(selectedEnvCode));

  // If the environment switch made the current module unavailable, fall back
  // to the first module that is available there.
  useEffect(() => {
    if (selectedModule && !activeModules.some(m => m.code === selectedModule)) {
      setSelectedModule(activeModules[0]?.code || '');
    }
  }, [selectedEnv, modules]);

  const [runnerSuites, setRunnerSuites] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeExec, setActiveExec] = useState(null);

  // Real-time streams
  const [liveLogs, setLiveLogs] = useState([]);
  const [liveScreenshots, setLiveScreenshots] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');

  const sseRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Fetch dynamic runner suites on mount
  const fetchSuites = async () => {
    try {
      const suites = await api.runnerSuites();
      const list = Array.isArray(suites) ? suites : [];
      setRunnerSuites(list);
      if (list.length > 0) {
        setSelectedSuite(list[0].xml);
      }
    } catch (e) {
      console.error("Failed to load runner suites", e);
    }
  };

  useEffect(() => {
    fetchSuites();
  }, []);

  // Listen to execution queue changes to attach SSE stream to any active run
  useEffect(() => {
    const running = executions.find(e => e.status === 'RUNNING' || e.status === 'QUEUED');

    if (running) {
      if (!activeExec || activeExec.executionCode !== running.executionCode) {
        setupSseConnection(running);
      }
    } else {
      // Nothing running
      if (activeExec && activeExec.status === 'RUNNING') {
        // If it was running but disappeared from active list, finalize it
        cleanupSse();
        setActiveExec(null);
      }
    }

    return () => cleanupSse();
  }, [executions]);

  // Scroll terminal to bottom as logs append
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  const cleanupSse = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  const setupSseConnection = (execution) => {
    cleanupSse();

    // Baseline details
    setActiveExec({
      id: execution.id,
      executionCode: execution.executionCode,
      status: execution.status,
      suiteName: execution.suiteName || 'Suite Run',
      totalTests: execution.totalTests || 0,
      passedTests: execution.passedTests || 0,
      failedTests: execution.failedTests || 0,
      skippedTests: execution.skippedTests || 0,
      startTime: execution.startTime || new Date().toISOString()
    });

    setLiveLogs([]);
    setLiveScreenshots([]);

    // Subscribe to SSE endpoint
    const token = auth.get()?.accessToken;
    const url = `/api/events/execution/${execution.executionCode}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    console.log("Connecting to SSE stream:", url);

    const sse = new EventSource(url);
    sseRef.current = sse;

    sse.addEventListener('CONNECTED', (e) => {
      appendLog('SYSTEM', 'Connected to execution live broadcast stream');
    });

    sse.addEventListener('EXECUTION_STARTING', (e) => {
      setActiveExec(prev => prev ? { ...prev, status: 'RUNNING' } : null);
      appendLog('SYSTEM', 'Execution manager dispatched process');
    });

    sse.addEventListener('SUITE_STARTED', (e) => {
      const payload = JSON.parse(e.data);
      setActiveExec(prev => prev ? {
        ...prev,
        status: 'RUNNING',
        suiteName: payload.data.suiteName || prev.suiteName,
        // Expected test count is known upfront (TestNG suite is fully resolved before it runs) —
        // seed it here so the progress bar reflects real progress instead of always reading 100%.
        totalTests: payload.data.totalExpectedTests || prev.totalTests
      } : null);
      appendLog('SYSTEM', 'Suite started: ' + (payload.data.suiteName || ''));
    });

    sse.addEventListener('TEST_STARTED', (e) => {
      const payload = JSON.parse(e.data);
      appendLog('FRAMEWORK', 'Starting test case: ' + payload.data.testName);
    });

    sse.addEventListener('TEST_PASSED', (e) => {
      const payload = JSON.parse(e.data);
      setActiveExec(prev => {
        if (!prev) return null;
        const passed = prev.passedTests + 1;
        return {
          ...prev,
          totalTests: Math.max(prev.totalTests, passed + prev.failedTests + prev.skippedTests),
          passedTests: passed
        };
      });
      appendLog('PASS', `PASS: ${payload.data.testName} (${payload.data.durationMs}ms)`);
    });

    sse.addEventListener('TEST_FAILED', (e) => {
      const payload = JSON.parse(e.data);
      setActiveExec(prev => {
        if (!prev) return null;
        const failed = prev.failedTests + 1;
        return {
          ...prev,
          totalTests: Math.max(prev.totalTests, prev.passedTests + failed + prev.skippedTests),
          failedTests: failed
        };
      });
      appendLog('FAIL', `FAIL: ${payload.data.testName} - ${payload.data.exceptionMessage || ''}`);
    });

    sse.addEventListener('TEST_SKIPPED', (e) => {
      const payload = JSON.parse(e.data);
      setActiveExec(prev => {
        if (!prev) return null;
        const skipped = prev.skippedTests + 1;
        return {
          ...prev,
          totalTests: Math.max(prev.totalTests, prev.passedTests + prev.failedTests + skipped),
          skippedTests: skipped
        };
      });
      appendLog('SKIP', `SKIP: ${payload.data.testName}`);
    });

    sse.addEventListener('SCREENSHOT_CAPTURED', (e) => {
      const payload = JSON.parse(e.data);
      setLiveScreenshots(prev => [...prev, payload.data]);
      appendLog('SYSTEM', 'Screenshot captured: ' + (payload.data.filePath || ''));
    });

    sse.addEventListener('LOG_ENTRY', (e) => {
      const payload = JSON.parse(e.data);
      appendLog(payload.data.level, payload.data.message, payload.data.source);
    });

    sse.addEventListener('SUITE_COMPLETED', (e) => {
      appendLog('SYSTEM', 'Suite completed event received. Disconnecting stream.');
      cleanupSse();
      setActiveExec(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
    });

    sse.onerror = (err) => {
      console.error("SSE stream error", err);
      appendLog('ERROR', 'EventSource connection closed or lost');
      cleanupSse();
    };
  };

  const appendLog = (level, message, source = 'SYSTEM') => {
    setLiveLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    }]);
  };

  const handleStartRun = async () => {
    try {
      if (showAdvanced) {
        if (!selectedSuite) return;
        await run('XML_SUITE', selectedSuite);
      } else {
        if (!selectedModule) return;
        await run('MODULE', null, selectedModule);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRun = async () => {
    if (!activeExec) return;
    if (confirm("Are you sure you want to cancel this execution?")) {
      try {
        await api.cancelExecution(activeExec.id);
        appendLog('SYSTEM', 'Cancellation request submitted');
      } catch (e) {
        alert("Failed to cancel: " + e.message);
      }
    }
  };

  // Delete flow (same behavior as Reports Center — full cascade on the backend)
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteExecution(confirmDelete.id);
      setConfirmDelete(null);
      if (onRefresh) await onRefresh();
    } catch (e) {
      alert('Failed to delete execution: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  // Prepare columns for recent executions list
  const queueColumns = [
    {
      key: 'executionCode',
      label: 'Run Code',
      render: (val, row) => (
        <button
          onClick={() => onSelectExecution(row.id)}
          className="btn-link"
          style={{ textDecoration: 'underline', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--indigo-text)' }}
        >
          {val}
        </button>
      )
    },
    { key: 'suiteName', label: 'Suite Name' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`status ${val?.toLowerCase()}`}>
          {val}
        </span>
      )
    },
    {
      key: 'passRate',
      label: 'Metrics',
      render: (val, row) => (
        <div style={{ fontSize: '12px' }}>
          {row.passedTests} P / {row.failedTests} F ({val}%)
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => {
        const busy = row.status === 'QUEUED' || row.status === 'RUNNING';
        return (
          <button
            onClick={() => setConfirmDelete(row)}
            className="rc-act-btn rc-act-danger"
            title={busy ? 'Cancel the run before deleting' : 'Delete Execution'}
            disabled={busy}
            style={busy ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
          >
            <Trash2 size={14} />
          </button>
        );
      }
    }
  ];

  // Calculate live progress percentage
  const total = activeExec ? activeExec.totalTests : 0;
  const progressPercent = total === 0 ? 0 : Math.min(100, Math.round(((activeExec?.passedTests + activeExec?.failedTests + activeExec?.skippedTests) / total) * 100));

  return (
    <section className="xc-page">

      {/* Controls Card */}
        <div className="xc-card xc-controls-card">
          {/* Decorative illustration (top-right) — served from frontend/public/.
              Two variants stacked in place; CSS opacity swaps them by theme so
              the toggle updates instantly without re-mounting. */}
          <img
            src="/execution-art-bright.png"
            alt=""
            className="xc-controls-art xc-controls-art-bright"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <img
            src="/execution-art.png"
            alt=""
            className="xc-controls-art xc-controls-art-dark"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <h3 className="xc-card-title"><Rocket size={17} /> Execution Controls</h3>

          {/* Module dropdown selector (admin-registered modules) */}
          <label className="xc-label">What do you want to run?</label>
          <select
            className="xc-select xc-select-primary"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            disabled={showAdvanced}
          >
            {activeModules.length === 0 ? (
              <option value="">No modules registered — ask an admin to add one</option>
            ) : (
              activeModules.map(mod => (
                <option key={mod.code} value={mod.code}>{mod.name} ({mod.code})</option>
              ))
            )}
          </select>

          {/* Advanced: raw XML suite picker, for dev/debug */}
          <button type="button" className="xc-advanced-toggle" onClick={() => setShowAdvanced(v => !v)}>
            <ChevronDown size={13} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            Advanced: run a raw XML suite instead
          </button>

          {showAdvanced && (
            <div className="xc-advanced-row">
              <select
                className="xc-select"
                style={{ flex: 1 }}
                value={selectedSuite}
                onChange={(e) => setSelectedSuite(e.target.value)}
              >
                {runnerSuites.length === 0 ? (
                  <option value="">No suites discovered</option>
                ) : (
                  runnerSuites.map(suite => (
                    <option key={suite.xml} value={suite.xml}>{suite.name} ({suite.xml})</option>
                  ))
                )}
              </select>

              <button className="xc-icon-btn" onClick={fetchSuites} title="Reload Suites">
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          {/* Environment selector */}
          <label className="xc-label" style={{ marginTop: 16 }}>Execution Environment</label>
          <select
            className="xc-select"
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(Number(e.target.value))}
          >
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name} ({env.url})</option>
            ))}
          </select>

          {/* Run Button */}
          <button
            className="xc-launch"
            onClick={handleStartRun}
            disabled={(activeExec && activeExec.status === 'RUNNING') || (showAdvanced ? !selectedSuite : !selectedModule)}
          >
            <Play size={17} />
            <span>Launch Execution</span>
          </button>
        </div>

      {/* LIVE ROW: monitor (left) + logs/screenshots (right), shown while a run
          is active — sits between the controls and the queue so nothing else
          in the layout moves around. */}
      {activeExec && (
        <div className="xc-live-row">

          {/* Live Run Monitor */}
          <div className="xc-card">
            <h3 className="xc-card-title"><Terminal size={17} /> Live Monitor: {activeExec.executionCode}</h3>

            {/* Status Header */}
            <div className="xc-live-head">
              <div>
                <h3 className="xc-live-suite">{activeExec.suiteName}</h3>
                <span className="xc-live-started">Started: {new Date(activeExec.startTime).toLocaleTimeString()}</span>
              </div>
              <span className={`xc-status xc-status-${activeExec.status.toLowerCase()}`}>
                <span className="xc-dot" />
                {prettyStatus(activeExec.status)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="xc-progress-track">
              <div className="xc-progress-fill" style={{ width: `${progressPercent || 5}%` }}></div>
            </div>
            <div className="xc-progress-meta">
              <span>Progress: {progressPercent}%</span>
              <span>{activeExec.passedTests + activeExec.failedTests + activeExec.skippedTests} / {activeExec.totalTests || '?'} Tests Completed</span>
            </div>

            {/* Test Status Counters */}
            <div className="xc-counters">
              <div className="xc-counter xc-counter-pass">
                <span>Passed</span>
                <strong>{activeExec.passedTests}</strong>
              </div>
              <div className="xc-counter xc-counter-fail">
                <span>Failed</span>
                <strong>{activeExec.failedTests}</strong>
              </div>
              <div className="xc-counter xc-counter-skip">
                <span>Skipped</span>
                <strong>{activeExec.skippedTests}</strong>
              </div>
            </div>

            {/* Control Buttons */}
            <button className="xc-cancel-btn" onClick={handleCancelRun}>
              <Square size={15} />
              <span>Cancel</span>
            </button>
          </div>

          {/* Console Output and screenshots tabs */}
          <div className="xc-tabs-card">
            <div className="xc-tabs-bar">
              <button
                className={`xc-tab${activeTab === 'logs' ? ' active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                <Terminal size={14} /> Live Logs ({liveLogs.length})
              </button>
              <button
                className={`xc-tab${activeTab === 'screenshots' ? ' active' : ''}`}
                onClick={() => setActiveTab('screenshots')}
              >
                <ImageIcon size={14} /> Screenshots ({liveScreenshots.length})
              </button>
            </div>

            <div className="xc-tab-body" style={{ background: activeTab === 'logs' ? 'var(--bg-inset)' : undefined }}>
              {activeTab === 'logs' ? (
                // Console Terminal
                <pre style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {liveLogs.length === 0 ? (
                    <div style={{ color: '#5d7292', fontStyle: 'italic' }}>Awaiting pipeline execution log stream...</div>
                  ) : (
                    liveLogs.map((logItem, idx) => {
                      let color = '#a0aec0';
                      if (logItem.level === 'ERROR' || logItem.level === 'FAIL') color = '#f87171';
                      else if (logItem.level === 'PASS') color = '#34d399';
                      else if (logItem.level === 'SKIP') color = '#fbbf24';
                      else if (logItem.level === 'SYSTEM') color = '#60a5fa';

                      return (
                        <div key={idx} style={{ color, marginBottom: '2px' }}>
                          <span style={{ color: '#4a5568', marginRight: '6px' }}>[{logItem.timestamp}]</span>
                          <span style={{ color: '#718096', marginRight: '4px' }}>[{logItem.source}]</span>
                          {logItem.message}
                        </div>
                      );
                    })
                  )}
                  <div ref={terminalEndRef}></div>
                </pre>
              ) : (
                // screenshots
                liveScreenshots.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>
                    No failure screenshots captured yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {liveScreenshots.map((shot, idx) => (
                      <div key={idx} className="xc-shot-card">
                        <a href={`/uploads/${shot.filePath}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/uploads/${shot.filePath}`}
                            alt={shot.testName}
                            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          />
                        </a>
                        <div className="xc-shot-name">{shot.testName}</div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      )}

      {/* Execution Queue Card */}
      <div className="xc-card">
        <h3 className="xc-card-title"><History size={17} /> Recent Executions Queue</h3>
        <DataTable
          columns={queueColumns}
          data={executions}
          searchPlaceholder="Filter execution history..."
          exportFilename="executions.csv"
        />
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Delete Execution" onClose={() => setConfirmDelete(null)}>
          <div className="rc-confirm-body">
            <AlertTriangle size={38} />
            <p className="rc-confirm-text">
              Are you sure you want to delete this execution?<br />
              <code>{confirmDelete.executionCode}</code> — {confirmDelete.moduleCode} ({confirmDelete.status})<br />
              This permanently removes its test cases, logs, screenshots, reports and all artifact files. This cannot be undone.
            </p>
            <div className="rc-confirm-actions">
              <button className="rc-btn-cancel" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="rc-btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </section>
  );
}
