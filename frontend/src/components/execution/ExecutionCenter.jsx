import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, Terminal, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { api, auth } from '../../api.js';
import { Panel, DataTable } from '../shared/index.jsx';

export function ExecutionCenter({
  environments,
  modules,
  selectedEnv,
  selectedModule,
  setSelectedEnv,
  setSelectedModule,
  run,
  executions,
  onSelectExecution
}) {
  const activeModules = (modules || []).filter(m => m.active !== false);

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

  // Prepare columns for recent executions list
  const queueColumns = [
    { 
      key: 'executionCode', 
      label: 'Run Code',
      render: (val, row) => (
        <button 
          onClick={() => onSelectExecution(row.id)}
          className="btn-link"
          style={{ textDecoration: 'underline', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#0f63ce' }}
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
    }
  ];

  // Calculate live progress percentage
  const total = activeExec ? activeExec.totalTests : 0;
  const progressPercent = total === 0 ? 0 : Math.min(100, Math.round(((activeExec?.passedTests + activeExec?.failedTests + activeExec?.skippedTests) / total) * 100));

  return (
    <section style={{ display: 'grid', gridTemplateColumns: activeExec ? '1fr 1fr' : '1fr', gap: '24px', padding: '16px' }}>
      
      {/* LEFT COLUMN: Controls and Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Controls Card */}
        <Panel title="Execution Controls">
          <div style={{ display: 'grid', gap: '16px' }}>
            
            {/* Module dropdown selector (admin-registered modules) */}
            <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600, fontSize: '13px', color: '#555' }}>What do you want to run?</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                disabled={showAdvanced}
                style={{ height: '40px', borderRadius: '8px', border: '1px solid #cfdae6', padding: '0 10px', background: showAdvanced ? '#f1f5f9' : '#fff' }}
              >
                {activeModules.length === 0 ? (
                  <option value="">No modules registered — ask an admin to add one</option>
                ) : (
                  activeModules.map(mod => (
                    <option key={mod.code} value={mod.code}>{mod.name} ({mod.code})</option>
                  ))
                )}
              </select>
            </div>

            {/* Advanced: raw XML suite picker, for dev/debug */}
            <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 0, background: 'transparent', cursor: 'pointer', padding: 0, fontSize: '12px', fontWeight: 600, color: '#617084' }}
              >
                <ChevronDown size={13} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                Advanced: run a raw XML suite instead
              </button>

              {showAdvanced && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={selectedSuite}
                    onChange={(e) => setSelectedSuite(e.target.value)}
                    style={{ flex: 1, height: '40px', borderRadius: '8px', border: '1px solid #cfdae6', padding: '0 10px', background: '#fff' }}
                  >
                    {runnerSuites.length === 0 ? (
                      <option value="">No suites discovered</option>
                    ) : (
                      runnerSuites.map(suite => (
                        <option key={suite.xml} value={suite.xml}>{suite.name} ({suite.xml})</option>
                      ))
                    )}
                  </select>

                  <button
                    onClick={fetchSuites}
                    className="btn btn-secondary btn-icon-only"
                    style={{ height: '40px', width: '40px' }}
                    title="Reload Suites"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Environment selector */}
            <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600, fontSize: '13px', color: '#555' }}>Execution Environment</label>
              <select 
                value={selectedEnv} 
                onChange={(e) => setSelectedEnv(Number(e.target.value))}
                style={{ height: '40px', borderRadius: '8px', border: '1px solid #cfdae6', padding: '0 10px', background: '#fff' }}
              >
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name} ({env.url})</option>
                ))}
              </select>
            </div>

            {/* Run Button */}
            <button 
              onClick={handleStartRun}
              className="btn btn-primary btn-icon"
              style={{ height: '44px', width: '100%', fontSize: '15px' }}
              disabled={(activeExec && activeExec.status === 'RUNNING') || (showAdvanced ? !selectedSuite : !selectedModule)}
            >
              <Play size={18} />
              <span>Launch Execution</span>
            </button>

          </div>
        </Panel>

        {/* Execution Queue Card */}
        <Panel title="Recent Executions Queue">
          <DataTable 
            columns={queueColumns} 
            data={executions} 
            searchPlaceholder="Filter execution history..."
          />
        </Panel>

      </div>

      {/* RIGHT COLUMN: Live Execution Monitor Panel */}
      {activeExec && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live Run Monitor */}
          <Panel title={`Live Monitor: ${activeExec.executionCode}`}>
            <div style={{ display: 'grid', gap: '16px' }}>
              
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{activeExec.suiteName}</h3>
                  <span style={{ fontSize: '12px', color: '#888' }}>Started: {new Date(activeExec.startTime).toLocaleTimeString()}</span>
                </div>
                <span className={`status ${activeExec.status.toLowerCase()}`}>
                  {activeExec.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '50px', height: '10px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progressPercent || 5}%`, 
                    background: '#0b63ce', 
                    height: '100%', 
                    transition: 'width 0.3s ease-out' 
                  }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '-8px' }}>
                <span>Progress: {progressPercent}%</span>
                <span>{activeExec.passedTests + activeExec.failedTests + activeExec.skippedTests} / {activeExec.totalTests || '?'} Tests Completed</span>
              </div>

              {/* Test Status Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div style={{ background: '#dff6e7', padding: '10px', borderRadius: '8px', color: '#136b36' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Passed</span>
                  <strong style={{ fontSize: '20px' }}>{activeExec.passedTests}</strong>
                </div>
                <div style={{ background: '#ffe3e3', padding: '10px', borderRadius: '8px', color: '#9c1f1f' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Failed</span>
                  <strong style={{ fontSize: '20px' }}>{activeExec.failedTests}</strong>
                </div>
                <div style={{ background: '#fff3d6', padding: '10px', borderRadius: '8px', color: '#8a6100' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Skipped</span>
                  <strong style={{ fontSize: '20px' }}>{activeExec.skippedTests}</strong>
                </div>
              </div>

              {/* Control Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCancelRun}
                  className="btn btn-secondary btn-icon"
                  style={{ flex: 1, height: '38px', color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  <Square size={16} />
                  <span>Cancel</span>
                </button>
              </div>

            </div>
          </Panel>

          {/* Console Output and screenshots tabs */}
          <div className="live-tabs-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #dce5ef', borderRadius: '8px', overflow: 'hidden', minHeight: '380px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2eaf3', background: '#f8fafc' }}>
              <button 
                onClick={() => setActiveTab('logs')}
                style={{ flex: 1, border: 0, padding: '12px', fontWeight: activeTab === 'logs' ? 700 : 500, borderBottom: activeTab === 'logs' ? '3px solid #0f63ce' : '3px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <Terminal size={14} /> Live Logs ({liveLogs.length})
              </button>
              <button 
                onClick={() => setActiveTab('screenshots')}
                style={{ flex: 1, border: 0, padding: '12px', fontWeight: activeTab === 'screenshots' ? 700 : 500, borderBottom: activeTab === 'screenshots' ? '3px solid #0f63ce' : '3px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <ImageIcon size={14} /> Screenshots ({liveScreenshots.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: activeTab === 'logs' ? '#0f1923' : '#fff' }}>
              {activeTab === 'logs' ? (
                // Console Terminal
                <pre style={{ margin: 0, color: '#a0aec0', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {liveLogs.length === 0 ? (
                    <div style={{ color: '#666', fontStyle: 'italic' }}>Awaiting pipeline execution log stream...</div>
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
                  <div style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '13px' }}>
                    No failure screenshots captured yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {liveScreenshots.map((shot, idx) => (
                      <div key={idx} style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                        <a href={`/uploads/${shot.filePath}`} target="_blank" rel="noreferrer">
                          <img 
                            src={`/uploads/${shot.filePath}`} 
                            alt={shot.testName} 
                            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          />
                        </a>
                        <div style={{ padding: '6px', fontSize: '11px', fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {shot.testName}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      )}

    </section>
  );
}
