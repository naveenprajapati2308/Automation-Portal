import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  RefreshCw, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { api } from '../../api.js';
import { Panel } from '../shared/index.jsx';

export function LogsViewer() {
  const [executions, setExecutions] = useState([]);
  const [selectedExecId, setSelectedExecId] = useState(null);
  const [selectedExec, setSelectedExec] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [execFilter, setExecFilter] = useState('');

  const terminalEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Load executions list
  const loadExecutions = async (selectFirst = true) => {
    setLoadingExecs(true);
    try {
      const data = await api.executions();
      // Sort executions by startTime or ID descending
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => b.id - a.id)
        : [];
      setExecutions(sorted);
      
      if (selectFirst && sorted.length > 0 && !selectedExecId) {
        setSelectedExecId(sorted[0].id);
      }
    } catch (e) {
      console.error("Failed to load executions", e);
    } finally {
      setLoadingExecs(false);
    }
  };

  // Load logs for selected execution
  const fetchLogs = async (id, isSilent = false) => {
    if (!isSilent) setLoadingLogs(true);
    try {
      const logData = await api.executionLogs(id);
      setLogs(Array.isArray(logData) ? logData : []);
      
      // Update selected execution details from the list or fetch it
      const current = executions.find(e => e.id === id);
      if (current) {
        setSelectedExec(current);
      } else {
        const details = await api.executionDetails(id);
        setSelectedExec(details);
      }
    } catch (e) {
      console.error(`Failed to fetch logs for execution ${id}`, e);
    } finally {
      if (!isSilent) setLoadingLogs(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadExecutions(true);
  }, []);

  // Fetch logs when selected execution changes
  useEffect(() => {
    if (selectedExecId) {
      fetchLogs(selectedExecId);
      
      // Setup polling if the execution is running or queued
      cleanupPolling();
      const current = executions.find(e => e.id === selectedExecId);
      const isRunning = current && (current.status === 'RUNNING' || current.status === 'QUEUED');
      
      if (isRunning) {
        pollIntervalRef.current = setInterval(() => {
          fetchLogs(selectedExecId, true);
          // Also refresh executions list in case status changes
          loadExecutions(false);
        }, 3000);
      }
    } else {
      setSelectedExec(null);
      setLogs([]);
    }

    return () => cleanupPolling();
  }, [selectedExecId]);

  // Clean up polling interval
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Scroll to bottom of terminal if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const logText = logs
      .filter(log => log.message.toLowerCase().includes(filterText.toLowerCase()) || log.level.toLowerCase().includes(filterText.toLowerCase()))
      .map(log => `[${log.level}] ${log.message}`)
      .join('\n');
      
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'FAILED':
        return <XCircle size={16} style={{ color: '#ef4444' }} />;
      case 'RUNNING':
        return <Loader2 size={16} className="animate-spin" style={{ color: '#60b3e0' }} />;
      case 'QUEUED':
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  // Filter executions list
  const filteredExecutions = executions.filter(exec => 
    exec.executionCode?.toLowerCase().includes(execFilter.toLowerCase()) ||
    (exec.moduleCode && exec.moduleCode.toLowerCase().includes(execFilter.toLowerCase())) ||
    exec.status?.toLowerCase().includes(execFilter.toLowerCase())
  );

  // Filter log lines
  const filteredLogs = logs.filter(log => 
    log.message?.toLowerCase().includes(filterText.toLowerCase()) || 
    log.level?.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="split" style={{ gridTemplateColumns: '320px 1fr' }}>
      
      {/* Left panel: Executions List */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Executions</h2>
          <button 
            className="secondary-action btn-icon-only" 
            onClick={() => loadExecutions(false)} 
            disabled={loadingExecs}
            title="Refresh List"
          >
            <RefreshCw size={14} className={loadingExecs ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="search" style={{ background: '#0d1527', border: '1px solid #14253f', width: '100%' }}>
          <Search size={16} style={{ color: '#7a9cb8' }} />
          <input 
            placeholder="Search executions..." 
            value={execFilter}
            onChange={(e) => setExecFilter(e.target.value)}
            style={{ background: 'transparent', color: '#fff', border: 0, width: '100%' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '600px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loadingExecs && executions.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', color: '#7a9cb8' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#7a9cb8', fontSize: '13px' }}>
              No executions found
            </div>
          ) : (
            filteredExecutions.map(exec => (
              <div 
                key={exec.id} 
                onClick={() => setSelectedExecId(exec.id)}
                style={{
                  padding: '12px',
                  background: selectedExecId === exec.id ? '#1a2635' : '#0d1527',
                  border: selectedExecId === exec.id ? '1px solid #60b3e0' : '1px solid #14253f',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: selectedExecId === exec.id ? '#60b3e0' : '#fff', fontSize: '13px' }}>
                    {exec.executionCode}
                  </strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#1e2f48', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>
                    {getStatusIcon(exec.status)}
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{exec.status}</span>
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7a9cb8', fontSize: '11px' }}>
                  <span>Mod: {exec.moduleCode || 'ALL'}</span>
                  <span>{exec.startTime ? new Date(exec.startTime).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Right panel: Terminal Logs */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {selectedExec ? (
          <>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #14253f', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Console Log Stream</h2>
                  <span style={{ fontSize: '12px', color: '#60b3e0', background: '#102a45', padding: '2px 8px', borderRadius: '12px', border: '1px solid #1c3d5a' }}>
                    {selectedExec.executionCode}
                  </span>
                </div>
                <p style={{ color: '#7a9cb8', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Suite: {selectedExec.suiteName || 'Master Automation'} | Env: {selectedExec.environmentName || 'QA'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status ${selectedExec.status?.toLowerCase()}`} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  {selectedExec.status}
                </span>
                
                {/* Live Indicator */}
                {(selectedExec.status === 'RUNNING' || selectedExec.status === 'QUEUED') && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', animation: 'pulse 1.5s infinite', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                    LIVE STREAM
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Actions toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div className="search" style={{ background: '#0d1527', border: '1px solid #14253f', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ color: '#7a9cb8' }} />
                <input 
                  placeholder="Filter console log output..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{ background: 'transparent', color: '#fff', border: 0, width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#7a9cb8', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    style={{ accentColor: '#60b3e0' }}
                  />
                  Auto-scroll
                </label>

                <button 
                  className="secondary-action" 
                  onClick={() => fetchLogs(selectedExecId, false)} 
                  disabled={loadingLogs}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  <RefreshCw size={13} className={loadingLogs ? "animate-spin" : ""} />
                  Refresh
                </button>

                <button 
                  className="secondary-action" 
                  onClick={handleCopyLogs}
                  disabled={logs.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>

                <button 
                  className="secondary-action" 
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              </div>
            </div>

            {/* Monospace terminal console */}
            <div style={{ flex: 1, background: '#070d19', borderRadius: '8px', border: '1px solid #14253f', padding: '16px', display: 'flex', flexDirection: 'column', height: '500px' }}>
              <div 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace', 
                  fontSize: '12px', 
                  lineHeight: '1.6', 
                  whiteSpace: 'pre-wrap', 
                  color: '#e2e8f0' 
                }}
              >
                {loadingLogs && logs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#7a9cb8' }}>
                    <Loader2 size={32} className="animate-spin" />
                    <span>Fetching console log records...</span>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div style={{ padding: '20px', color: '#7a9cb8', fontStyle: 'italic' }}>
                    {logs.length === 0 ? "No log output recorded for this run." : "No log lines match your filter criteria."}
                  </div>
                ) : (
                  filteredLogs.map((log, index) => {
                    let levelColor = '#a8a29e'; // default gray
                    if (log.level === 'ERROR') levelColor = '#ef4444'; // red
                    else if (log.level === 'WARN') levelColor = '#f59e0b'; // orange
                    else if (log.level === 'INFO') levelColor = '#3b82f6'; // blue
                    else if (log.level === 'DEBUG') levelColor = '#10b981'; // green

                    return (
                      <div 
                        key={index} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          borderBottom: '1px solid rgba(20,37,63,0.3)',
                          padding: '3px 0' 
                        }}
                      >
                        <span style={{ color: '#475569', minWidth: '45px', userSelect: 'none' }}>
                          {String(index + 1).padStart(3, '0')}
                        </span>
                        <span style={{ color: levelColor, minWidth: '60px', fontWeight: 'bold', userSelect: 'none' }}>
                          [{log.level}]
                        </span>
                        <span style={{ color: log.source === 'SYSTEM' ? '#60b3e0' : '#94a3b8', minWidth: '80px', userSelect: 'none' }}>
                          {log.source ? `${log.source}:` : ''}
                        </span>
                        <span style={{ flex: 1, wordBreak: 'break-all' }}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: '#7a9cb8', gap: '12px' }}>
            <Terminal size={48} style={{ strokeWidth: '1.2' }} />
            <span>Select an execution from the left sidebar to view its console log stream.</span>
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
