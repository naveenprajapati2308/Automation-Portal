import { useEffect, useState } from 'react';
import {
  ArrowUpRight, Clock, Play, Sparkles, TimerReset, Zap
} from 'lucide-react';
import { api, auth } from './api.js';
import { ADMIN_WORKSPACE_NAV_FLAT, API_TESTING_NAV, AUTOMATION_NAV, isSuperAdmin } from './constants.js';
import { AiSupportPanel, PortalLayout, Sidebar, Topbar } from './components/layout/index.jsx';
import { AdminSidebar, AdminTopbar, AdminContent, adminPageTitle } from './components/admin/AdminWorkspace.jsx';
import { AutomationWorkspace } from './components/automation/AutomationWorkspace.jsx';
import { ApiTestingWorkspace } from './components/apitesting/ApiTestingWorkspace.jsx';
import { Profile } from './components/profile/Profile.jsx';
import { AuthPage } from './components/auth/AuthPage.jsx';
import { ExecutionTable } from './components/shared/index.jsx';
import { TrendChart } from './components/dashboard/TrendChart.jsx';
import { FullScreenLoader } from '../../../shared/ui/Loader.jsx';
import appLogo from './assets/testrix_logo.png';

const authHeader = () => {
  const s = auth.get();
  return s?.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {};
};

const fetchJson = async (url, headers) => {
  const res = await fetch(url, { headers: { ...authHeader(), ...headers } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── Hash routing ─────────────────────────────────────────────────────────────
const ADMIN_PAGE_KEYS = new Set(ADMIN_WORKSPACE_NAV_FLAT.map((item) => item.key));
const AUTOMATION_PAGE_KEYS = new Set(AUTOMATION_NAV.map((item) => item.key));
const API_TESTING_PAGE_KEYS = new Set(API_TESTING_NAV.map((item) => item.key));

const DEFAULT_ROUTE = { adminPage: 'admin-dashboard', automationPage: 'dashboard', apitestPage: 'dashboard' };

const parseHashRoute = () => {
  const [head, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (head === 'admin') {
    return { ...DEFAULT_ROUTE, page: 'admin', adminPage: ADMIN_PAGE_KEYS.has(sub) ? sub : 'admin-dashboard' };
  }
  if (head === 'automation') {
    return { ...DEFAULT_ROUTE, page: 'automation', automationPage: AUTOMATION_PAGE_KEYS.has(sub) ? sub : 'dashboard' };
  }
  if (head === 'apitest') {
    return { ...DEFAULT_ROUTE, page: 'apitest', apitestPage: API_TESTING_PAGE_KEYS.has(sub) ? sub : 'dashboard' };
  }
  if (head === 'profile') {
    return { ...DEFAULT_ROUTE, page: 'profile' };
  }
  return { ...DEFAULT_ROUTE, page: 'dashboard' };
};

function HealthDot({ state }) {
  const cls = state === 'up' ? 'card-dot up' : state === 'down' ? 'card-dot down' : 'card-dot';
  const label = state === 'up' ? 'Online' : state === 'down' ? 'Offline' : 'Checking…';
  return <span className="card-health"><span className={cls} />{label}</span>;
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Dashboard: compact top-row product card — status + one KPI + one-line summary ──
function OverviewCard({ icon: Icon, tone, label, health: healthState, kpiValue, kpiLabel, summary, soon, onSeeMore }) {
  return (
    <div className={`card ${soon ? 'card-soon' : ''}`}>
      <div className="card-head">
        <div className="card-head-left">
          <div className={`card-icon card-icon-${tone}`}><Icon size={18} /></div>
          <h2>{label}</h2>
        </div>
        {soon ? <span className="soon">Soon</span> : <HealthDot state={healthState} />}
      </div>
      {kpiValue !== undefined && (
        <div className="card-kpi">
          <span className="card-kpi-value">{kpiValue}</span>
          {kpiLabel && <span className="card-kpi-label">{kpiLabel}</span>}
        </div>
      )}
      <p>{summary}</p>
      {onSeeMore && (
        <button type="button" className="open-btn" onClick={onSeeMore}>
          See More <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}


// ── Dashboard: an accuracy/pass-rate bar cell, shared by both module tables ──
function AccuracyCell({ rate }) {
  const pct = rate ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 800, minWidth: 34 }}>{pct}%</span>
      <div className="module-health-meter"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ── Dashboard: per-module health (Automation) — same table system ExecutionTable
// already uses, not a bespoke widget, matching the "Module Analytics" pattern the
// Automation product's own dashboard already has.
function ModuleHealthTable({ modules }) {
  const top = [...modules]
    .sort((a, b) => (b.totalTests ?? 0) - (a.totalTests ?? 0))
    .slice(0, 5);
  if (!top.length) return <p className="panel-empty">No module activity yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Accuracy</th>
          <th>Last Run</th>
        </tr>
      </thead>
      <tbody>
        {top.map((m) => (
          <tr key={m.moduleCode}>
            <td>{m.moduleName ?? m.moduleCode}</td>
            <td>{m.totalTests ?? 0}</td>
            <td style={{ color: 'var(--success-text)', fontWeight: 700 }}>{m.passed ?? 0}</td>
            <td style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{m.failed ?? 0}</td>
            <td><AccuracyCell rate={m.passRate} /></td>
            <td>
              <span className={`status ${(m.lastExecutionStatus || '').toLowerCase()}`}>
                {m.lastExecutionStatus ?? '—'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Dashboard: per-module execution counts (API Testing) — same table system ──
function ApiModuleStatsTable({ modules }) {
  const top = modules.slice(0, 5);
  if (!top.length) return <p className="panel-empty">No module activity yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Executions</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Accuracy</th>
        </tr>
      </thead>
      <tbody>
        {top.map((m) => {
          const total = (m.passed ?? 0) + (m.failed ?? 0);
          const passRate = total > 0 ? Math.round((m.passed / total) * 100) : 0;
          return (
            <tr key={m.moduleId}>
              <td>{m.moduleName}</td>
              <td>{m.executions}</td>
              <td style={{ color: 'var(--success-text)', fontWeight: 700 }}>{m.passed ?? 0}</td>
              <td style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{m.failed ?? 0}</td>
              <td><AccuracyCell rate={passRate} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Dashboard: HTTP status-class mix (API Testing) ──────────────────────────
function chipTone(cls) {
  if (cls === '2xx' || cls === '3xx') return 'good';
  if (cls === '4xx' || cls === '5xx' || cls === 'ERROR' || cls === 'TIMEOUT') return 'bad';
  return 'neutral';
}

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// API Testing's trend endpoint returns { date, passed, failed } — reshape to the
// { date, totalTests, passed, failed, skipped } shape TrendChart expects (it derives
// pass/fail/skip rates from these itself, same as it does for Automation's own trend data).
function toTrendChartData(points) {
  return (points || []).map((p) => {
    const passed = p.passed ?? 0;
    const failed = p.failed ?? 0;
    return {
      date: p.date,
      totalTests: passed + failed,
      passed,
      failed,
      skipped: 0,
      execCount: passed + failed
    };
  });
}

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [health, setHealth] = useState({});
  const [autoSummary, setAutoSummary] = useState(null);
  const [autoTrends, setAutoTrends] = useState(null);
  const [autoModuleHealth, setAutoModuleHealth] = useState(null);
  const [apiSummary, setApiSummary] = useState(null);
  const [apiTrend, setApiTrend] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const initialRoute = parseHashRoute();
  const [page, setPage] = useState(initialRoute.page);
  const [adminPage, setAdminPage] = useState(initialRoute.adminPage);
  const [automationPage, setAutomationPage] = useState(initialRoute.automationPage);
  const [apitestPage, setApitestPage] = useState(initialRoute.apitestPage);
  const [notice, setNoticeState] = useState(null);
  const notify = (text) => setNoticeState(text ? { text } : null);
  const [adminNotice, setAdminNotice] = useState('Administration workspace — Super Admin only.');

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, from: 'bot', text: 'Hi! I am the Testrix AI assistant. Ask me anything about your testing platform.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    const s = auth.get();
    if (!s?.accessToken) {
      setAuthed(false);
      return;
    }
    const verify = async () => {
      try {
        const r = await fetch('/automation/api/auth/me', { headers: authHeader() });
        if (r.ok) return setAuthed(true);
        if (s.refreshToken) {
          const rr = await fetch('/automation/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: s.refreshToken })
          });
          if (rr.ok) {
            auth.set(await rr.json());
            return setAuthed(true);
          }
        }
      } catch {
        // Couldn't verify (network error, gateway hiccup, etc.) — fall through to
        // logged-out below rather than assuming the session is still good. A stale
        // or invalid session must never render the authenticated shell.
      }
      auth.clear();
      setAuthed(false);
    };
    verify();
  }, []);

  const forceLogout = () => {
    auth.clear();
    setAuthed(false);
    window.location.hash = '';
  };

  useEffect(() => {
    if (!authed) return;
    fetch('/health/automation').then((r) => setHealth((h) => ({ ...h, automation: r.ok ? 'up' : 'down' }))).catch(() => setHealth((h) => ({ ...h, automation: 'down' })));
    fetch('/health/apitest').then((r) => setHealth((h) => ({ ...h, apitest: r.ok ? 'up' : 'down' }))).catch(() => setHealth((h) => ({ ...h, apitest: 'down' })));
    fetch('/health/genai').then((r) => setHealth((h) => ({ ...h, genai: r.ok ? 'up' : 'down' }))).catch(() => setHealth((h) => ({ ...h, genai: 'down' })));

    const loadSummary = async (url, setter) => {
      try {
        const res = await fetch(url, { headers: authHeader() });
        if (res.status === 401) return forceLogout();
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        // Both dashboard summary endpoints wrap their payload as { success, message, data } —
        // unwrap here rather than storing the envelope, which silently rendered every stat as
        // its `?? 0` fallback (only ever caught now because the DB has real execution data;
        // it read as "correct" for months while every execution count was genuinely 0).
        setter(body.data ?? body);
      } catch {
        setter(null);
      }
    };
    loadSummary('/automation/api/dashboard/summary', setAutoSummary);
    loadSummary('/automation/api/dashboard/trends?range=7d', setAutoTrends);
    loadSummary('/automation/api/dashboard/module-health?range=30d', setAutoModuleHealth);
    loadSummary('/apitest/api/v1/dashboard/summary', setApiSummary);
    loadSummary('/apitest/api/v1/dashboard/trend?days=7', setApiTrend);
    api.dashboardRecentActivity().then((rows) => setRecentActivity(rows.slice(0, 5))).catch(() => setRecentActivity(null));
  }, [authed]);

  // api.js's request() clears localStorage on a real 401 but has no way to force
  // this component's `authed` state back to the login screen on its own — wire it
  // up here so every api.xxx() call in the shell (not just the dashboard's own
  // fetches above) redirects to login instead of leaving a stale, broken page up.
  useEffect(() => {
    api.setErrorCallback(({ status }) => {
      if (status === 401) forceLogout();
    });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNoticeState(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // The shell is the one persistent scroll container (embedded product
  // iframes auto-size to their content, never scroll internally — see
  // useIframeAutoHeight). Switching tabs swaps content in place rather than
  // navigating, so the browser never resets scroll on its own; do it here.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, adminPage, automationPage, apitestPage]);

  if (authed === null) return <FullScreenLoader logoSrc={appLogo} subtitle="Loading TESTRIX" />;
  if (!authed) {
    return <AuthPage onAuthenticated={(nextSession) => { auth.set(nextSession); setAuthed(true); }} />;
  }

  const session = auth.get();
  const user = session?.user;
  const superAdmin = isSuperAdmin(session);

  const goDashboard = () => {
    setPage('dashboard');
    window.location.hash = '';
  };

  const goProfile = () => {
    setPage('profile');
    window.location.hash = '#/profile';
  };

  const openAdmin = () => {
    if (!superAdmin) return;
    setPage('admin');
    setAdminPage('admin-dashboard');
    window.location.hash = '#/admin/admin-dashboard';
  };

  const setAdminPageAndHash = (nextAdminPage) => {
    setAdminPage(nextAdminPage);
    window.location.hash = `#/admin/${nextAdminPage}`;
  };


  const setAutomationPageAndHash = (nextAutomationPage) => {
    setAutomationPage(nextAutomationPage);
    setPage('automation');
    window.location.hash = `#/automation/${nextAutomationPage}`;
  };

  const setApitestPageAndHash = (nextApitestPage) => {
    setApitestPage(nextApitestPage);
    setPage('apitest');
    window.location.hash = `#/apitest/${nextApitestPage}`;
  };

  const logout = () => {
    api.logout(session?.refreshToken).catch(() => { });
    forceLogout();
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput('');
    setChatMessages((m) => [...m, { id: Date.now(), from: 'user', text }]);
    setChatBusy(true);
    try {
      const r = await fetch('/genai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ message: text, userId: user?.username || 'testrix' })
      });
      const data = await r.json();
      setChatMessages((m) => [...m, { id: Date.now() + 1, from: 'bot', text: data.message || 'No response.' }]);
    } catch {
      setChatMessages((m) => [...m, { id: Date.now() + 1, from: 'bot', text: 'AI service is unreachable right now. Please try again.' }]);
    } finally {
      setChatBusy(false);
    }
  };

  const pageTitle = page === 'admin'
    ? adminPageTitle(adminPage)
    : page === 'automation'
      ? (AUTOMATION_NAV.find((i) => i.key === automationPage)?.label ?? 'Automation')
      : page === 'apitest'
        ? (API_TESTING_NAV.find((i) => i.key === apitestPage)?.label ?? 'API Testing')
        : page === 'profile' ? 'Profile' : 'Global Dashboard';

  // Middle breadcrumb segment for pages nested under a product section (e.g.
  // "Dashboard > API Testing > History") — omitted for pages that live
  // directly under the root (Global Dashboard, Admin, Profile).
  const breadcrumbMid = page === 'automation'
    ? { label: 'Automation', onClick: () => setAutomationPageAndHash('dashboard') }
    : page === 'apitest'
      ? { label: 'API Testing', onClick: () => setApitestPageAndHash('dashboard') }
      : null;

  const apiTrendPoints = toTrendChartData(apiTrend);

  const dashboardContent = (
    <>
      <p className="dash-subtitle">One place for every testing product — automation, API and performance.</p>

      <section className="cards overview-cards">
        <OverviewCard
          icon={Play}
          tone="accent"
          label="Automation"
          health={health.automation}
          kpiValue={autoSummary ? autoSummary.totalExecutions ?? 0 : '—'}
          kpiLabel="Executions"
          summary={autoSummary
            ? `${autoSummary.passRate ?? 0}% pass rate · ${autoSummary.runningExecutions ?? 0} running`
            : 'Stats unavailable'}
          onSeeMore={() => setAutomationPageAndHash('dashboard')}
        />
        <OverviewCard
          icon={Zap}
          tone="info"
          label="API Testing"
          health={health.apitest}
          kpiValue={apiSummary ? apiSummary.totalExecutions ?? 0 : '—'}
          kpiLabel="API Executions"
          summary={apiSummary
            ? `${Math.round(apiSummary.successRate ?? 0)}% success · ${apiSummary.activeSchedules ?? 0} active schedules`
            : 'Stats unavailable'}
          onSeeMore={() => setApitestPageAndHash('dashboard')}
        />
        <OverviewCard
          icon={TimerReset}
          tone="success"
          label="Performance"
          soon
          summary="Developed separately as its own product — joins this dashboard soon."
        />
        <OverviewCard
          icon={Sparkles}
          tone="warning"
          label="AI Support"
          health={health.genai}
          kpiValue={health.genai === 'up' ? 'Online' : 'Offline'}
          kpiLabel="Assistant status"
          summary="Chat assistant for the whole platform."
        />
      </section>

      <section className="product-overview">
        <div className="panel-title"><Play size={16} /> Automation Overview <HealthDot state={health.automation} /></div>
        {autoSummary ? (
          <div className="split">
            <div>
              <div className="stats">
                <Stat label="Total executions" value={autoSummary.totalExecutions ?? 0} />
                <Stat label="Pass rate" value={`${autoSummary.passRate ?? 0}%`} tone="good" />
                <Stat label="Fail rate" value={`${autoSummary.failRate ?? 0}%`} tone="bad" />
                <Stat label="Running" value={autoSummary.runningExecutions ?? 0} />
                <Stat label="Queued" value={autoSummary.queuedExecutions ?? 0} />
                <Stat label="Avg duration" value={`${autoSummary.averageDuration ?? 0}s`} />
              </div>
              {autoSummary.lastExecutionStatus && (
                <div className="panel-subrow">
                  <span className="panel-subrow-label">Last run</span>
                  <span className={`status ${autoSummary.lastExecutionStatus.toLowerCase()}`}>
                    {autoSummary.lastExecutionStatus}
                  </span>
                </div>
              )}
              <div className="panel-subrow">
                <span className="panel-subrow-label">Pass / Fail / Skip (tests)</span>
                <span className="panel-subrow-value">
                  {autoSummary.passedTests ?? 0} / {autoSummary.failedTests ?? 0} / {autoSummary.skippedTests ?? 0}
                </span>
              </div>
              {autoTrends && autoTrends.length > 0 && (
                <div className="mini-block">
                  <div className="mini-block-title">Execution trend (7d)</div>
                  <TrendChart data={autoTrends} />
                </div>
              )}
              {autoModuleHealth && autoModuleHealth.length > 0 && (
                <div className="mini-block">
                  <div className="mini-block-title">Module health (30d)</div>
                  <ModuleHealthTable modules={autoModuleHealth} />
                </div>
              )}
            </div>
            <div>
              <div className="mini-block-title" style={{ marginBottom: 8 }}>Recent Activity</div>
              {recentActivity && recentActivity.length > 0
                ? <ExecutionTable executions={recentActivity} />
                : <p className="panel-empty">No executions yet.</p>}
            </div>
          </div>
        ) : <p className="panel-empty">Automation stats unavailable.</p>}
      </section>

      <section className="product-overview">
        <div className="panel-title"><Zap size={16} /> API Testing Overview <HealthDot state={health.apitest} /></div>
        {apiSummary ? (
          <div className="split">
            <div>
              <div className="stats">
                <Stat label="Executions" value={apiSummary.totalExecutions ?? 0} />
                <Stat label="Success rate" value={`${Math.round(apiSummary.successRate ?? 0)}%`} tone="good" />
                <Stat label="Total APIs" value={apiSummary.totalRegularApis ?? 0} />
                <Stat label="Failed APIs" value={apiSummary.failed ?? 0} tone="bad" />
                <Stat label="Avg response" value={`${Math.round(apiSummary.avgDurationMs ?? 0)}ms`} />
                <Stat label="Active schedules" value={apiSummary.activeSchedules ?? 0} />
              </div>
              {apiSummary.statusClassBreakdown && (
                <div className="mini-block">
                  <div className="mini-block-title">Response status mix (30d)</div>
                  <div className="chip-row">
                    {Object.entries(apiSummary.statusClassBreakdown).map(([cls, count]) => (
                      <span key={cls} className={`status-chip status-chip-${chipTone(cls)}`}>
                        {cls} <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mini-block">
                <div className="mini-block-title">Scheduling</div>
                <div className="panel-subrow">
                  <span className="panel-subrow-label">Total schedules</span>
                  <span className="panel-subrow-value">{apiSummary.totalSchedules ?? 0}</span>
                </div>
                <div className="panel-subrow">
                  <span className="panel-subrow-label">Failing schedules</span>
                  <span className={`inline-flag ${apiSummary.failingSchedules?.length ? 'bad' : 'good'}`}>
                    {apiSummary.failingSchedules?.length ?? 0}
                  </span>
                </div>
                {apiSummary.nextRuns?.[0] && (
                  <div className="panel-subrow">
                    <span className="panel-subrow-label"><Clock size={12} /> Next run</span>
                    <span className="panel-subrow-value" title={apiSummary.nextRuns[0].name}>
                      {apiSummary.nextRuns[0].name} · {formatWhen(apiSummary.nextRuns[0].nextRunAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="mini-block-title" style={{ marginBottom: 8 }}>Execution trend (7d)</div>
              {apiTrendPoints.length > 0
                ? <TrendChart data={apiTrendPoints} />
                : <p className="panel-empty">No trend data yet.</p>}
              {apiSummary.moduleStats && apiSummary.moduleStats.length > 0 && (
                <div className="mini-block">
                  <div className="mini-block-title">Module summary</div>
                  <ApiModuleStatsTable modules={apiSummary.moduleStats} />
                </div>
              )}
            </div>
          </div>
        ) : <p className="panel-empty">API Testing stats unavailable.</p>}
      </section>

      <section className="product-overview card-soon">
        <div className="panel-title"><TimerReset size={16} /> Performance Testing Overview <span className="soon">Soon</span></div>
        <p className="panel-empty" style={{ marginBottom: 14 }}>
          Performance Testing runs as its own product today and isn't wired into this gateway yet. Once
          connected, this section will surface active tests, response times, throughput, error rate,
          concurrent users, the latest run, plus trend and resource-usage charts.
        </p>
        <div className="stats">
          <Stat label="Active tests" value="—" />
          <Stat label="Avg response time" value="—" />
          <Stat label="Throughput" value="—" />
          <Stat label="Error rate" value="—" />
          <Stat label="Concurrent users" value="—" />
          <Stat label="Latest run" value="—" />
        </div>
      </section>
    </>
  );

  const notifications = [
    { id: 1, title: 'Execution Completed', message: 'A suite run finished successfully.', time: '5m ago', unread: true },
    { id: 2, title: 'AI Assistant', message: 'Testrix AI assistant is online and ready.', time: '1h ago', unread: false }
  ];

  return (
    <>
      <PortalLayout
        isCollapsed={page === 'admin' ? false : isSidebarCollapsed}
        shellClassName={page === 'admin' && superAdmin ? 'admin-shell' : ''}
        mainClassName={page === 'admin' && superAdmin ? 'admin-main' : ''}
        sidebar={page === 'admin' && superAdmin ? (
          <AdminSidebar
            activePage={adminPage}
            onNavigate={setAdminPageAndHash}
            onBack={goDashboard}
            logout={logout}
          />
        ) : (
          <Sidebar
            active={page}
            activeChildKey={page === 'automation' ? automationPage : page === 'apitest' ? apitestPage : null}
            logout={logout}
            onNavigate={(key) => {
              if (key === 'dashboard') goDashboard();
              if (key === 'profile') goProfile();
              if (key === 'automation') setAutomationPageAndHash(automationPage);
              if (key === 'apitest') setApitestPageAndHash(apitestPage);
            }}
            onNavigateChild={(parentKey, childKey) => {
              if (parentKey === 'automation') setAutomationPageAndHash(childKey);
              if (parentKey === 'apitest') setApitestPageAndHash(childKey);
            }}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((o) => !o)}
          />
        )}
        topbar={page === 'admin' && superAdmin ? (
          <AdminTopbar
            pageTitle={pageTitle}
            notice={adminNotice}
            onNavigateRoot={() => setAdminPageAndHash('admin-dashboard')}
            onBack={goDashboard}
          />
        ) : (
          <Topbar
            pageTitle={pageTitle}
            breadcrumbMid={breadcrumbMid}
            superAdmin={superAdmin}
            onOpenAdmin={openAdmin}
            onNavigateHome={goDashboard}
            notifications={notifications}
            user={user}
            onNavigateProfile={goProfile}
          />
        )}
      >
        {page === 'admin' && superAdmin ? (
          <AdminContent
            activePage={adminPage}
            setActivePage={setAdminPageAndHash}
            setNotice={setAdminNotice}
          />
        ) : page === 'automation' ? (
          <AutomationWorkspace activePage={automationPage} />
        ) : page === 'apitest' ? (
          <ApiTestingWorkspace activePage={apitestPage} />
        ) : page === 'profile' ? (
          <Profile setNotice={notify} />
        ) : dashboardContent}
      </PortalLayout>

      {notice && (
        <div
          role="status"
          style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
            background: '#16a34a', color: '#fff', padding: '12px 18px',
            borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
          }}
        >
          {notice.text}
        </div>
      )}

      {chatOpen && (
        <AiSupportPanel
          isCollapsed={isSidebarCollapsed}
          messages={chatMessages}
          input={chatInput}
          setInput={setChatInput}
          busy={chatBusy}
          onSend={sendChat}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
