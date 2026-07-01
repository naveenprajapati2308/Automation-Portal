import React, { useEffect, useState, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  Hourglass,
  Target,
  Layers,
  Monitor,
  Search,
  Cpu,
  HelpCircle
} from 'lucide-react';
import { api } from '../../api.js';

// Import child components
import { TrendChart } from './TrendChart.jsx';
import { EnvDistribution } from './EnvDistribution.jsx';

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
        flakyTestData
      ] = await Promise.all([
        api.dashboardSummary().catch(() => null),
        api.dashboardRecentActivity().catch(() => []),
        api.environments().catch(() => []),
        api.dashboardModuleHealth(range).catch(() => []),
        api.dashboardEnvDistribution(range).catch(() => []),
        api.dashboardTrends(range).catch(() => []),
        api.dashboardSlowTests(range).catch(() => []),
        api.dashboardFlakyTests(range).catch(() => [])
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

  // Helper for mapping module codes to suite names
  const mapModuleToSuiteName = (code) => {
    if (code === 'GIS') return 'GISSystemSuite';
    if (code === 'ALL') return 'ALLSuite';
    if (code === 'LAND') return 'LandManagementSuite';
    if (code === 'SURVEY') return 'SurveyManagementSuite';
    if (code === 'ARCHITECT') return 'ArchitectEmpanelmentSuite';
    return `${code}Suite`;
  };

  // Static definition of modules to guarantee the table has the exact 4 rows from the screenshot
  const moduleRows = useMemo(() => {
    const standardModules = [
      { code: 'GIS', name: 'GISSystemSuite' },
      { code: 'ALL', name: 'ALLSuite' },
      { code: 'LAND', name: 'LandManagementSuite' },
      { code: 'SURVEY', name: 'SurveyManagementSuite' }
    ];

    return standardModules.map(m => {
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
  }, [modulesHealthData]);

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
      alert(`Execution queued successfully for ${mapModuleToSuiteName(moduleCode)}!`);
      loadData();
    } catch (err) {
      console.error(err);
      alert(`Failed to trigger execution: ${err.message}`);
    }
  };

  // Accuracy circular ring calculation
  const accuracyPercent = lastRun ? Number(lastRun.passRate ?? 0) : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyPercent / 100) * circumference;

  // Execution Mix calculations
  const mixPassRate = summary?.passRate ?? 0;
  const mixPassed = summary?.passedTests ?? 0;
  const mixFailed = summary?.failedTests ?? 0;
  const mixSkipped = summary?.skippedTests ?? 0;
  const mixCirc = 2 * Math.PI * 36;
  const mixOffset = mixCirc - (mixPassRate / 100) * mixCirc;

  if (loading && !summary) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#6366f1', background: '#060913' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(99, 102, 241, 0.1)', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ marginTop: '16px', fontWeight: 600, fontSize: '15px' }}>Loading quality analytics...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <section style={{ background: '#060913', color: '#f8fafc', padding: '20px', minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Dashboard Header */}
      <div style={{
        background: '#0c1020',
        border: '1px solid #192038',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.3)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fff' }}>Dashboard</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Signed in successfully.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search executions, reports"
              style={{
                background: '#060913',
                border: '1px solid #192038',
                color: '#fff',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                fontSize: '13px',
                width: '220px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#192038'}
            />
          </div>

          {/* Super Admin Pill */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', background: '#fbbf24', borderRadius: '50%' }} />
            Super Admin
          </div>

          {/* Administration Button */}
          <button
            onClick={() => onNavigate && onNavigate('administration')}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            }}
          >
            <Cpu size={14} />
            Administration
          </button>
        </div>
      </div>

      {/* 2. Subheader (Portal Info & Range Filter) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Quality Analytics Portal</span>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#fff' }}>Analytics Dashboard</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Filter Range:</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{
              background: '#0c1020',
              border: '1px solid #192038',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#192038'}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* 3. Row 1: 5 Premium Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Last Test Summary */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>LAST TEST SUMMARY</span>
            <FileText size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '14px', fontSize: '13px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Total Tests</div>
              <strong style={{ color: '#fff', fontSize: '18px' }}>{lastRun?.totalTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: '#10b981', fontSize: '11px' }}>Passed</div>
              <strong style={{ color: '#10b981', fontSize: '18px' }}>{lastRun?.passedTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: '#f43f5e', fontSize: '11px' }}>Failed</div>
              <strong style={{ color: '#f43f5e', fontSize: '18px' }}>{lastRun?.failedTests ?? 0}</strong>
            </div>
            <div>
              <div style={{ color: '#fbbf24', fontSize: '11px' }}>Skipped</div>
              <strong style={{ color: '#fbbf24', fontSize: '18px' }}>{lastRun?.skippedTests ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Last Execution Started */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>LAST EXECUTION STARTED</span>
            <Clock3 size={16} style={{ color: '#6366f1' }} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <strong style={{ display: 'block', fontSize: '18px', color: '#fff' }}>{startTimes.date}</strong>
            <span style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{startTimes.time}</span>
          </div>
        </div>

        {/* Card 3: Last Execution Ended */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>LAST EXECUTION ENDED</span>
            <Hourglass size={16} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <strong style={{ display: 'block', fontSize: '18px', color: '#fff' }}>{endTimes.date}</strong>
            <span style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{endTimes.time}</span>
          </div>
        </div>

        {/* Card 4: Last Duration */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>LAST DURATION</span>
            <Clock3 size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Total Runtime</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#fff', fontFamily: 'monospace', marginTop: '2px' }}>
              {lastRun ? formatDurationHMS(lastRun.durationSeconds) : '00:00:00'}
            </strong>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#64748b', marginTop: '2px' }}>HOUR</span>
          </div>
        </div>

        {/* Card 5: Last Total Accuracy */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>LAST TOTAL ACCURACY</span>
            </div>
            <strong style={{ display: 'block', fontSize: '22px', color: '#fff', marginTop: '10px' }}>
              {accuracyPercent.toFixed(2)}%
            </strong>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              ({lastRun ? lastRun.passedTests : 0}/{lastRun ? lastRun.totalTests : 0} Passed)
            </span>
          </div>

          <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="transparent" stroke="#192038" strokeWidth="3.5" />
              <circle
                cx="22" cy="22" r={radius} fill="transparent"
                stroke={accuracyPercent >= 80 ? '#10b981' : accuracyPercent >= 50 ? '#fbbf24' : '#f43f5e'}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%'
                }}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '9px', fontWeight: 'bold', color: '#fff' }}>
              {Math.round(accuracyPercent)}%
            </div>
          </div>
        </div>

      </div>

      {/* 4. Row 2: Charts and Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Pass Rate Trend */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Pass Rate Trend</h3>
          <TrendChart data={trends} loading={loading} />
        </div>

        {/* Execution Mix */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Execution Mix</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, gap: '12px' }}>
            <div style={{ position: 'relative', width: '92px', height: '92px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="36" fill="transparent" stroke="#192038" strokeWidth="7" />
                <circle
                  cx="46" cy="46" r="36" fill="transparent"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeDasharray={mixCirc}
                  strokeDashoffset={mixOffset}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%'
                  }}
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{mixPassRate.toFixed(1)}%</div>
                <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>Pass Rate</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, maxWidth: '120px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#a7f3d0', fontWeight: 600 }}>Passed</span>
                <strong style={{ color: '#10b981' }}>{mixPassed}</strong>
              </div>
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fecdd3', fontWeight: 600 }}>Failed</span>
                <strong style={{ color: '#f43f5e' }}>{mixFailed}</strong>
              </div>
              <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fef3c7', fontWeight: 600 }}>Skipped</span>
                <strong style={{ color: '#fbbf24' }}>{mixSkipped}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Distribution */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Environment Distribution</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EnvDistribution data={envDistribution} environments={environments} loading={loading} />
          </div>
        </div>

      </div>

      {/* 5. Row 3: Module Analytics */}
      <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>Module Analytics</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              style={{
                background: '#060913',
                border: '1px solid #192038',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#192038'}
            >
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>

            <button
              onClick={() => handleRunModule('ALL')}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 0,
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              <Play size={14} fill="#fff" />
              Run All Modules
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #192038' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passed</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skipped</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accuracy</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Run</th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((row) => (
                <tr key={row.code} style={{ borderBottom: '1px solid rgba(25, 32, 56, 0.4)', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{row.name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#cbd5e1' }}>{row.total}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>{row.passed}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#f43f5e', fontWeight: 600 }}>{row.failed}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>{row.skipped}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: row.accuracy >= 80 ? '#10b981' : row.accuracy >= 50 ? '#fbbf24' : '#f43f5e', minWidth: '40px' }}>
                        {row.accuracy}%
                      </span>
                      <div style={{ width: '80px', height: '6px', background: '#192038', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: row.accuracy >= 80 ? '#10b981' : row.accuracy >= 50 ? '#fbbf24' : '#f43f5e',
                          width: `${row.accuracy}%`
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRunModule(row.code)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                        e.currentTarget.style.borderColor = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      <Play size={12} fill="#a5b4fc" />
                      Run Module
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Row 4: Slowest Test Cases & Flaky Tests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Slowest Test Cases */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Slowest Test Cases</h3>
          <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #192038' }}>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Test Case</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Module</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textAlign: 'right' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {slowTests.slice(0, 10).map((tc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(25, 32, 56, 0.2)' }}>
                    <td style={{ padding: '10px 4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{tc.methodName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{tc.className}</div>
                    </td>
                    <td style={{ padding: '10px 4px' }}>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {tc.module || 'ALL'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>
                      {Number(tc.duration).toFixed(2)}s
                    </td>
                  </tr>
                ))}
                {slowTests.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      No slow test data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flaky Tests (Stability Analysis) */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Flaky Tests (Stability Analysis)</h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <HelpCircle size={36} style={{ color: '#64748b', marginBottom: '12px' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', fontWeight: 500 }}>
              All tests are stable. No flakiness detected in this range.
            </span>
          </div>
        </div>

      </div>

      {/* 7. Row 5: System Information & Recent Executions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* System & Run Information */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>System & Run Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#080b18', border: '1px solid #192038', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Host Machine</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginTop: '4px' }}>
                  {lastRun?.machineName || 'localhost'}
                </strong>
              </div>
              
              <div style={{ background: '#080b18', border: '1px solid #192038', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>OS System</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginTop: '4px' }}>
                  {lastRun?.osName || 'Windows/Linux'}
                </strong>
              </div>

              <div style={{ background: '#080b18', border: '1px solid #192038', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Java Version</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginTop: '4px' }}>
                  {lastRun?.javaVersion || 'Java 21'}
                </strong>
              </div>

              <div style={{ background: '#080b18', border: '1px solid #192038', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Automation Browser</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginTop: '4px' }}>
                  {lastRun ? `${lastRun.browserName || 'Chrome'} / Selenium` : 'Chrome / Selenium'}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '16px', borderTop: '1px solid #192038', paddingTop: '12px' }}>
            System environment information matches the latest execution run <strong style={{ color: '#a5b4fc' }}>{lastRun?.executionCode || 'AUTO-N/A'}</strong>
          </div>
        </div>

        {/* Recent Executions */}
        <div style={{ background: '#0c1020', border: '1px solid #192038', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>Recent Executions</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #192038' }}>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Code</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Type</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>Module</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textAlign: 'right' }}>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions.slice(0, 6).map((exec) => {
                  let statusBg = 'rgba(148, 163, 184, 0.1)';
                  let statusColor = '#94a3b8';
                  
                  if (exec.status === 'PASSED') {
                    statusBg = 'rgba(16, 185, 129, 0.1)';
                    statusColor = '#10b981';
                  } else if (exec.status === 'FAILED' || exec.status === 'ERROR') {
                    statusBg = 'rgba(244, 63, 94, 0.1)';
                    statusColor = '#f43f5e';
                  } else if (exec.status === 'RUNNING') {
                    statusBg = 'rgba(6, 182, 212, 0.1)';
                    statusColor = '#06b6d4';
                  } else if (exec.status === 'QUEUED') {
                    statusBg = 'rgba(251, 191, 36, 0.1)';
                    statusColor = '#fbbf24';
                  } else if (exec.status === 'PARTIAL') {
                    statusBg = 'rgba(249, 115, 22, 0.1)';
                    statusColor = '#f97316';
                  }

                  return (
                    <tr key={exec.id} style={{ borderBottom: '1px solid rgba(25, 32, 56, 0.2)', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '10px 4px' }}>
                        <span
                          onClick={() => onSelectExecution(exec.id)}
                          style={{
                            color: '#a5b4fc',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        >
                          {exec.executionCode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px', fontSize: '12px', color: '#cbd5e1' }}>
                        {exec.executionType === 'ALL_MODULES' ? 'ALL_MODULES' : exec.executionType}
                      </td>
                      <td style={{ padding: '10px 4px' }}>
                        <span style={{
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}30`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {exec.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px', fontSize: '12px', color: '#cbd5e1' }}>
                        {exec.moduleCode || 'ALL'}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                        {Number(exec.passRate ?? 0).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </section>
  );
}
