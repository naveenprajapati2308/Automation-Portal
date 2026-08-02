import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, CalendarCheck, CalendarClock, CheckCircle2, Clock,
  Layers, ListTodo, Loader2, Play, Sparkles, Timer, TimerReset, TrendingUp, XCircle, Zap
} from 'lucide-react';
import { api, auth } from './api.js';
import { ADMIN_WORKSPACE_NAV_FLAT, API_TESTING_NAV, AUTOMATION_NAV, MODULES_ENV_NAV, PERFORMANCE_NAV, isSuperAdmin } from './constants.js';
import { AiSupportPanel, PortalLayout, Sidebar, Topbar } from './components/layout/index.jsx';
import { AdminSidebar, AdminTopbar, AdminContent, adminPageTitle } from './components/admin/AdminWorkspace.jsx';
import { ModuleManagement } from './components/admin/ModuleManagement.jsx';
import { AutomationWorkspace } from './components/automation/AutomationWorkspace.jsx';
import { ApiTestingWorkspace } from './components/apitesting/ApiTestingWorkspace.jsx';
import { PerformanceWorkspace } from './components/performance/PerformanceWorkspace.jsx';
import { Profile } from './components/profile/Profile.jsx';
import { AuthPage } from './components/auth/AuthPage.jsx';
import { ExecutionTrendChart } from '../../../shared/ui/dashboard/ExecutionTrendChart.jsx';
import { StatusMixDonut } from '../../../shared/ui/dashboard/StatusMixDonut.jsx';
import { FullScreenLoader } from '../../../shared/ui/Loader.jsx';
import { useDateRange } from '../../../shared/ui/useDateRange.js';
import { DateRangeFilter } from '../../../shared/ui/DateRangeFilter.jsx';
import { DATE_RANGE_SCOPES, rangeLabel, rangeToDays } from '../../../shared/ui/date-range.js';
import '../../../shared/ui/refreshing.css';
import { DestinationHighlight } from './search/components/DestinationHighlight.jsx';
import { registerAction } from './search/searchActions.js';
import { MODULE_COLOR } from './search/core/searchTypes.js';
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
const PERFORMANCE_PAGE_KEYS = new Set(PERFORMANCE_NAV.map((item) => item.key));
const MODULES_ENV_PAGE_KEYS = new Set(MODULES_ENV_NAV.map((item) => item.key));

const DEFAULT_ROUTE = { adminPage: 'admin-dashboard', automationPage: 'dashboard', apitestPage: 'dashboard', perfPage: 'dashboard', modulesEnvPage: 'module-management' };

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
  if (head === 'perf') {
    return { ...DEFAULT_ROUTE, page: 'perf', perfPage: PERFORMANCE_PAGE_KEYS.has(sub) ? sub : 'dashboard' };
  }
  if (head === 'modules-environments') {
    return { ...DEFAULT_ROUTE, page: 'modules-environments', modulesEnvPage: MODULES_ENV_PAGE_KEYS.has(sub) ? sub : 'module-management' };
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

// ── Dashboard: compact KPI tile (icon + big value + label) ──
function KpiTile({ icon: Icon, tone, value, label }) {
  return (
    <div className="kpi-tile">
      <div className={`kpi-icon kpi-icon-${tone}`}><Icon size={18} /></div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
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

// API Testing's trend endpoint returns { date, passed, failed } — reshape to a superset
// shape (extra fields are simply ignored by the shared ExecutionTrendChart, which only
// reads `date`/`label` plus whichever series keys it's given).
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
  const [perfSummary, setPerfSummary] = useState(null);
  const [perfTrend, setPerfTrend] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [range, setRange] = useDateRange(DATE_RANGE_SCOPES.GLOBAL, '7d');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const initialRoute = parseHashRoute();
  const [page, setPage] = useState(initialRoute.page);
  const [adminPage, setAdminPage] = useState(initialRoute.adminPage);
  const [automationPage, setAutomationPage] = useState(initialRoute.automationPage);
  const [apitestPage, setApitestPage] = useState(initialRoute.apitestPage);
  const [perfPage, setPerfPage] = useState(initialRoute.perfPage);
  const [modulesEnvPage, setModulesEnvPage] = useState(initialRoute.modulesEnvPage);
  const [notice, setNoticeState] = useState(null);
  const notify = (text) => setNoticeState(text ? { text } : null);
  const [adminNotice, setAdminNotice] = useState('Administration workspace — Super Admin only.');

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, from: 'bot', text: 'Hi! I am the Testrix AI assistant. Ask me anything about your testing platform.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  // ── Search navigation state ─────────────────────────────────────────────
  const [searchNavLoading, setSearchNavLoading] = useState(false);
  const [destHighlight, setDestHighlight] = useState({ active: false, color: '#60b3e0' });

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
    fetch('/health/perf').then((r) => setHealth((h) => ({ ...h, perf: r.ok ? 'up' : 'down' }))).catch(() => setHealth((h) => ({ ...h, perf: 'down' })));

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

    // Global Date Range Filter: every range-aware fetch below is keyed on `range` and
    // fired together as one logical refresh (dashboardRefreshing gates a dim overlay,
    // distinct from the first-load FullScreenLoader) rather than each widget polling
    // independently. `days` (API Testing) is translated from the shared `range` token.
    const days = rangeToDays(range);
    let cancelled = false;
    (async () => {
      setDashboardRefreshing(true);
      try {
        await Promise.allSettled([
          loadSummary(`/automation/api/dashboard/summary?range=${range}`, setAutoSummary),
          loadSummary(`/automation/api/dashboard/trends?range=${range}`, setAutoTrends),
          loadSummary(`/automation/api/dashboard/module-health?range=${range}`, setAutoModuleHealth),
          loadSummary(`/apitest/api/v1/dashboard/summary?days=${days}`, setApiSummary),
          loadSummary(`/apitest/api/v1/dashboard/trend?days=${days}`, setApiTrend),
          loadSummary(`/perf/api/v1/dashboard/stats?range=${range}`, setPerfSummary),
          loadSummary(`/perf/api/v1/dashboard/trend?range=${range}`, setPerfTrend),
          api.dashboardRecentActivity().then((rows) => setRecentActivity(rows.slice(0, 5))).catch(() => setRecentActivity(null)),
        ]);
      } finally {
        if (!cancelled) setDashboardRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authed, range]);

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
  }, [page, adminPage, automationPage, apitestPage, perfPage, modulesEnvPage]);

  // Every internal nav click already does `window.location.hash = ...`, which
  // pushes a real browser history entry — but nothing was listening for the
  // reverse direction, so back/forward changed the URL without changing what
  // was on screen. Re-parsing the hash on every hashchange (back/forward,
  // manual URL edit, or a fresh `#/...` link) keeps the two in sync both ways.
  useEffect(() => {
    const onHashChange = () => {
      const r = parseHashRoute();
      setPage(r.page);
      setAdminPage(r.adminPage);
      setAutomationPage(r.automationPage);
      setApitestPage(r.apitestPage);
      setPerfPage(r.perfPage);
      setModulesEnvPage(r.modulesEnvPage);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ── Register search action handlers ────────────────────────────────────────
  // Must live here (before the early returns) to satisfy Rules of Hooks.
  // Guards on authed so actions are only registered for a logged-in session.
  useEffect(() => {
    if (!authed) return;
    registerAction('auto-run',            () => setAutomationPage('execution'));
    registerAction('api-create',          () => { setApitestPage('regular-apis'); setPage('apitest'); });
    registerAction('api-schedule-create', () => { setApitestPage('scheduler');    setPage('apitest'); });
    registerAction('admin-create-user',   () => { setPage('admin'); setAdminPage('user-management'); });
  }, [authed]);

  // ── Document title sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    const title = page === 'admin'
      ? adminPageTitle(adminPage)
      : page === 'automation'
        ? (automationPage === 'dashboard' ? 'Automation Overview' : (AUTOMATION_NAV.find((i) => i.key === automationPage)?.label ?? 'Automation'))
        : page === 'apitest'
          ? (apitestPage === 'dashboard' ? 'API Testing Overview' : (API_TESTING_NAV.find((i) => i.key === apitestPage)?.label ?? 'API Testing'))
          : page === 'perf'
            ? (perfPage === 'dashboard' ? 'Performance Overview' : (PERFORMANCE_NAV.find((i) => i.key === perfPage)?.label ?? 'Performance'))
            : page === 'modules-environments'
              ? (MODULES_ENV_NAV.find((i) => i.key === modulesEnvPage)?.label ?? 'Modules & Environments')
              : page === 'profile' ? 'Profile' : 'Dashboard';

    document.title = title ? `${title} | TESTRIX` : 'TESTRIX Unified Testing Platform';
  }, [authed, page, adminPage, automationPage, apitestPage, perfPage, modulesEnvPage]);

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

  const setPerfPageAndHash = (nextPerfPage) => {
    setPerfPage(nextPerfPage);
    setPage('perf');
    window.location.hash = `#/perf/${nextPerfPage}`;
  };

  const setModulesEnvPageAndHash = (nextModulesEnvPage) => {
    setModulesEnvPage(nextModulesEnvPage);
    setPage('modules-environments');
    window.location.hash = `#/modules-environments/${nextModulesEnvPage}`;
  };

  const logout = () => {
    api.logout(session?.refreshToken).catch(() => { });
    forceLogout();
  };

  // ── Search navigation ───────────────────────────────────────────────────
  // Called by GlobalSearchDropdown when user selects a result.
  const navigateFromSearch = (item) => {
    const { nav, permission, disabled } = item;
    if (disabled) return;
    if (permission === 'SUPER_ADMIN' && !superAdmin) return;

    setSearchNavLoading(true);
    const color = MODULE_COLOR[nav.page] || '#60b3e0';

    setTimeout(() => {
      setSearchNavLoading(false);

      if (nav.page === 'dashboard')           goDashboard();
      else if (nav.page === 'automation')     setAutomationPageAndHash(nav.sub);
      else if (nav.page === 'apitest')        setApitestPageAndHash(nav.sub);
      else if (nav.page === 'perf')           setPerfPageAndHash(nav.sub);
      else if (nav.page === 'admin' && superAdmin) {
        setPage('admin');
        setAdminPageAndHash(nav.sub);
      }
      else if (nav.page === 'profile')        goProfile();

      if (nav.anchor) {
        requestAnimationFrame(() => {
          document.getElementById(nav.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      setDestHighlight({ active: true, color });
    }, 800);
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

  // ── Dynamic Breadcrumbs & Page Titles ──────────────────────────────────────
  // One entry per embedded product — each one's NAV array (constants.js) is the
  // single source of truth for its sub-page labels, so adding a future product
  // only means adding one entry here, not another copy-pasted if/else branch.
  // Home + Dashboard is the platform root, and the one and only page named
  // "Dashboard"; every product's own landing sub-page is labeled "Overview"
  // (its `dashboard` NAV key), never "Dashboard", so the hierarchy can't be
  // misread as if a product's landing page were a sibling of the platform root.
  const MODULE_CONFIG = {
    automation: { label: 'Automation', nav: AUTOMATION_NAV, activeSubPage: automationPage, goOverview: () => setAutomationPageAndHash('dashboard') },
    apitest:    { label: 'API Testing', nav: API_TESTING_NAV, activeSubPage: apitestPage, goOverview: () => setApitestPageAndHash('dashboard') },
    perf:       { label: 'Performance', nav: PERFORMANCE_NAV, activeSubPage: perfPage, goOverview: () => setPerfPageAndHash('dashboard') },
  };

  let pageTitle = 'Dashboard';
  let breadcrumbItems = [
    { label: 'Home', onClick: goDashboard },
    { label: 'Dashboard' }
  ];

  if (page === 'admin') {
    const subLabel = adminPageTitle(adminPage);
    pageTitle = subLabel;
    breadcrumbItems = [
      { label: 'Home', onClick: goDashboard },
      { label: 'Administration', onClick: () => setAdminPageAndHash('admin-dashboard') },
      { label: subLabel }
    ];
  } else if (page === 'profile') {
    pageTitle = 'Profile';
    breadcrumbItems = [
      { label: 'Home', onClick: goDashboard },
      { label: 'Profile' }
    ];
  } else if (page === 'modules-environments') {
    // Nested under Automation in the breadcrumb too, matching its sidebar placement — it's
    // Automation-only config, not a standalone section of the platform.
    const subLabel = MODULES_ENV_NAV.find((i) => i.key === modulesEnvPage)?.label ?? 'Modules & Environments';
    pageTitle = subLabel;
    breadcrumbItems = [
      { label: 'Home', onClick: goDashboard },
      { label: 'Automation', onClick: () => setAutomationPageAndHash('dashboard') },
      { label: subLabel }
    ];
  } else if (MODULE_CONFIG[page]) {
    const { label: moduleLabel, nav, activeSubPage, goOverview } = MODULE_CONFIG[page];
    const sub = nav.find((i) => i.key === activeSubPage);
    const subLabel = sub ? sub.label : 'Overview';
    pageTitle = activeSubPage === 'dashboard' ? `${moduleLabel} Overview` : subLabel;
    breadcrumbItems = [
      { label: 'Home', onClick: goDashboard },
      { label: moduleLabel, onClick: goOverview },
      { label: subLabel }
    ];
  }

  const apiTrendPoints = toTrendChartData(apiTrend);

  // Show the Testrix loader while the dashboard is fetching its first data.
  // Once either summary arrives (or fails) the loader clears — same UX as
  // Automation and API Testing which use FullScreenLoader on their iframes.
  const dashboardLoading = authed && autoSummary === null && apiSummary === null;

  const dashboardContent = (
    <div className={!dashboardLoading && dashboardRefreshing ? 'dr-refreshing' : ''}>
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
          health={health.perf}
          kpiValue={perfSummary ? perfSummary.totalRuns ?? 0 : '—'}
          kpiLabel="Test Runs"
          summary={perfSummary
            ? `${perfSummary.totalRuns > 0 ? Math.round((perfSummary.passedRuns / perfSummary.totalRuns) * 100) : 0}% pass rate · ${perfSummary.runningRuns ?? 0} running`
            : 'Stats unavailable'}
          onSeeMore={() => setPerfPageAndHash('dashboard')}
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
          <>
            <div className="kpi-row">
              <KpiTile icon={Play} tone="accent" value={autoSummary.totalExecutions ?? 0} label="Total Executions" />
              <KpiTile icon={CheckCircle2} tone="success" value={`${autoSummary.passRate ?? 0}%`} label="Pass Rate" />
              <KpiTile icon={XCircle} tone="danger" value={`${autoSummary.failRate ?? 0}%`} label="Fail Rate" />
              <KpiTile icon={Loader2} tone="info" value={autoSummary.runningExecutions ?? 0} label="Running" />
              <KpiTile icon={ListTodo} tone="warning" value={autoSummary.queuedExecutions ?? 0} label="Queued" />
              <KpiTile icon={Timer} tone="accent" value={`${autoSummary.averageDuration ?? 0}s`} label="Avg Duration" />
            </div>

            <div className="panel-row">
              <StatusMixDonut
                title="Execution Status Mix"
                segments={[
                  { key: 'passed', label: 'Passed', value: autoSummary.passedTests ?? 0, color: '--success-text' },
                  { key: 'failed', label: 'Failed', value: autoSummary.failedTests ?? 0, color: '--danger-text' },
                  { key: 'skipped', label: 'Skipped', value: autoSummary.skippedTests ?? 0, color: '--warning-text' },
                ]}
                centerLabel="Total"
              />
              <div className="panel-box">
                <div className="mini-block-title">Run Summary</div>
                <div className="tile-row">
                  <div className="tile">
                    <div className="tile-icon kpi-icon-accent"><Clock size={15} /></div>
                    <div className="tile-value">{autoSummary.lastExecutionStatus ?? '—'}</div>
                    <div className="tile-label">Last Run</div>
                  </div>
                  <div className="tile">
                    <div className="tile-icon kpi-icon-info"><Layers size={15} /></div>
                    <div className="tile-value">{autoModuleHealth?.length ?? 0}</div>
                    <div className="tile-label">Modules Tracked</div>
                  </div>
                  <div className="tile">
                    <div className="tile-icon kpi-icon-success"><CalendarCheck size={15} /></div>
                    <div className="tile-value">{recentActivity?.length ?? 0}</div>
                    <div className="tile-label">Recent Runs</div>
                  </div>
                </div>
              </div>
            </div>

            {autoTrends && autoTrends.length > 0 && (
              <ExecutionTrendChart
                className="mini-block-spaced"
                title={`Execution Trend (${rangeLabel(range)})`}
                data={autoTrends}
                series={[
                  { key: 'passed', label: 'Passed', color: '--success-text' },
                  { key: 'failed', label: 'Failed', color: '--danger-text' },
                  { key: 'skipped', label: 'Skipped', color: '--warning-text' },
                ]}
              />
            )}

            <div className="mini-block">
              <div className="mini-block-title">Module Health ({rangeLabel(range)})</div>
              {autoModuleHealth && autoModuleHealth.length > 0
                ? <ModuleHealthTable modules={autoModuleHealth} />
                : <p className="panel-empty">No module activity yet.</p>}
            </div>
          </>
        ) : <p className="panel-empty">Automation stats unavailable.</p>}
      </section>

      <section className="product-overview">
        <div className="panel-title"><Zap size={16} /> API Testing Overview <HealthDot state={health.apitest} /></div>
        {apiSummary ? (
          <>
            <div className="kpi-row">
              <KpiTile icon={Zap} tone="accent" value={apiSummary.totalExecutions ?? 0} label="Executions" />
              <KpiTile icon={CheckCircle2} tone="success" value={`${Math.round(apiSummary.successRate ?? 0)}%`} label="Success Rate" />
              <KpiTile icon={Layers} tone="info" value={apiSummary.totalRegularApis ?? 0} label="Total APIs" />
              <KpiTile icon={XCircle} tone="danger" value={apiSummary.failed ?? 0} label="Failed APIs" />
              <KpiTile icon={Timer} tone="accent" value={`${Math.round(apiSummary.avgDurationMs ?? 0)}ms`} label="Avg Response" />
              <KpiTile icon={CalendarClock} tone="warning" value={apiSummary.activeSchedules ?? 0} label="Active Schedules" />
            </div>

            <div className="panel-row">
              <div className="panel-box">
                <div className="mini-block-title">Response Status Mix ({rangeLabel(range)})</div>
                {apiSummary.statusClassBreakdown ? (
                  <div className="status-tile-row">
                    {Object.entries(apiSummary.statusClassBreakdown).map(([cls, count]) => {
                      const tone = chipTone(cls);
                      const bg = tone === 'good' ? 'var(--success-bg-soft)' : tone === 'bad' ? 'var(--danger-bg-soft)' : 'var(--bg-surface-2)';
                      const fg = tone === 'good' ? 'var(--success-text)' : tone === 'bad' ? 'var(--danger-text)' : 'var(--text-primary)';
                      return (
                        <div key={cls} className="status-tile" style={{ background: bg }}>
                          <span className="status-tile-value" style={{ color: fg }}>{count}</span>
                          <span className="status-tile-label">{cls}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="panel-empty">No response data yet.</p>}
              </div>
              <div className="panel-box">
                <div className="mini-block-title">Scheduling Overview</div>
                <div className="tile-row">
                  <div className="tile">
                    <div className="tile-icon kpi-icon-info"><CalendarClock size={15} /></div>
                    <div className="tile-value">{apiSummary.totalSchedules ?? 0}</div>
                    <div className="tile-label">Total Schedules</div>
                  </div>
                  <div className="tile">
                    <div className="tile-icon kpi-icon-warning"><AlertTriangle size={15} /></div>
                    <div className="tile-value">{apiSummary.failingSchedules?.length ?? 0}</div>
                    <div className="tile-label">Failing Schedules</div>
                  </div>
                </div>
                {apiSummary.nextRuns?.[0] && (
                  <div className="panel-subrow" style={{ marginTop: 10 }}>
                    <span className="panel-subrow-label"><Clock size={12} /> Next run</span>
                    <span className="panel-subrow-value" title={apiSummary.nextRuns[0].name}>
                      {apiSummary.nextRuns[0].name} · {formatWhen(apiSummary.nextRuns[0].nextRunAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <ExecutionTrendChart
              className="mini-block-spaced"
              title={`Execution Trend (${rangeLabel(range)})`}
              data={apiTrendPoints}
              series={[
                { key: 'passed', label: 'Passed', color: '--success-text' },
                { key: 'failed', label: 'Failed', color: '--danger-text' },
              ]}
              emptyMessage="No trend data yet."
            />

            {apiSummary.moduleStats && apiSummary.moduleStats.length > 0 && (
              <div className="mini-block">
                <div className="mini-block-title">Module Summary</div>
                <ApiModuleStatsTable modules={apiSummary.moduleStats} />
              </div>
            )}
          </>
        ) : <p className="panel-empty">API Testing stats unavailable.</p>}
      </section>

      <section className="product-overview">
        <div className="panel-title"><TimerReset size={16} /> Performance Testing Overview <HealthDot state={health.perf} /></div>
        {perfSummary ? (
          <>
            <div className="kpi-row">
              <KpiTile icon={Activity} tone="accent" value={perfSummary.totalRuns ?? 0} label="Total Runs" />
              <KpiTile icon={CheckCircle2} tone="success" value={`${perfSummary.totalRuns > 0 ? Math.round((perfSummary.passedRuns / perfSummary.totalRuns) * 100) : 0}%`} label="Pass Rate" />
              <KpiTile icon={XCircle} tone="danger" value={perfSummary.failedRuns ?? 0} label="Failed Runs" />
              <KpiTile icon={Loader2} tone="info" value={perfSummary.runningRuns ?? 0} label="Running" />
              <KpiTile icon={Zap} tone="accent" value={perfSummary.performanceTestCount ?? 0} label="Perf Tests" />
              <KpiTile icon={TrendingUp} tone="warning" value={perfSummary.loadTestCount ?? 0} label="Load Tests" />
            </div>

            <div className="panel-row">
              <StatusMixDonut
                title="Run Status Mix"
                segments={[
                  { key: 'passed', label: 'Passed', value: perfSummary.passedRuns ?? 0, color: '--success-text' },
                  { key: 'failed', label: 'Failed', value: perfSummary.failedRuns ?? 0, color: '--danger-text' },
                  { key: 'running', label: 'Running', value: perfSummary.runningRuns ?? 0, color: '--accent-text' },
                ]}
                centerLabel="Total"
              />
              <div className="panel-box">
                <div className="mini-block-title">Suite Summary</div>
                <div className="tile-row">
                  <div className="tile">
                    <div className="tile-icon kpi-icon-info"><Layers size={15} /></div>
                    <div className="tile-value">{perfSummary.testGroupCount ?? 0}</div>
                    <div className="tile-label">Test Groups</div>
                  </div>
                  <div className="tile">
                    <div className="tile-icon kpi-icon-warning"><CalendarClock size={15} /></div>
                    <div className="tile-value">{perfSummary.scheduledCount ?? 0}</div>
                    <div className="tile-label">Active Schedules</div>
                  </div>
                </div>
              </div>
            </div>

            {perfTrend && perfTrend.length > 0 && (
              <ExecutionTrendChart
                className="mini-block-spaced"
                title={`Execution Trend (${rangeLabel(range)})`}
                data={perfTrend}
                series={[
                  { key: 'passed', label: 'Passed', color: '--success-text' },
                  { key: 'failed', label: 'Failed', color: '--danger-text' },
                ]}
              />
            )}
          </>
        ) : <p className="panel-empty">Performance stats unavailable.</p>}
      </section>
    </div>
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
            active={page === 'modules-environments' ? 'automation' : page}
            activeChildKey={page === 'automation' ? automationPage : page === 'apitest' ? apitestPage : page === 'perf' ? perfPage : page === 'modules-environments' ? modulesEnvPage : null}
            logout={logout}
            superAdmin={superAdmin}
            onNavigate={(key) => {
              if (key === 'dashboard') goDashboard();
              if (key === 'profile') goProfile();
              if (key === 'automation') setAutomationPageAndHash(automationPage);
              if (key === 'apitest') setApitestPageAndHash(apitestPage);
              if (key === 'perf') setPerfPageAndHash(perfPage);
            }}
            onNavigateChild={(parentKey, childKey) => {
              if (parentKey === 'automation') {
                // Module control lives nested under Automation's own sub-menu (Automation-only
                // config) but renders as the shell-native page, not the embedded
                // automation-portal iframe the rest of Automation's items use.
                if (childKey === 'module-management') {
                  setModulesEnvPageAndHash(childKey);
                } else {
                  setAutomationPageAndHash(childKey);
                }
              }
              if (parentKey === 'apitest') setApitestPageAndHash(childKey);
              if (parentKey === 'perf') setPerfPageAndHash(childKey);
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
            breadcrumbItems={breadcrumbItems}
            superAdmin={superAdmin}
            onOpenAdmin={openAdmin}
            onNavigateHome={goDashboard}
            notifications={notifications}
            user={user}
            onNavigateProfile={goProfile}
            onNavigate={navigateFromSearch}
            topbarExtra={page === 'dashboard' ? <DateRangeFilter value={range} onChange={setRange} /> : null}
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
        ) : page === 'perf' ? (
          <PerformanceWorkspace activePage={perfPage} />
        ) : page === 'modules-environments' && superAdmin ? (
          <ModuleManagement setNotice={notify} />
        ) : page === 'profile' ? (
          <Profile setNotice={notify} />
        ) : dashboardLoading ? (
          <FullScreenLoader logoSrc={appLogo} subtitle="Loading Dashboard" />
        ) : dashboardContent}
      </PortalLayout>

      {/* ── Search: navigation loading overlay (uses existing Testrix loader) ── */}
      {searchNavLoading && (
        <FullScreenLoader logoSrc={appLogo} subtitle="Navigating…" />
      )}

      {/* ── Search: post-navigation destination highlight ─────────────── */}
      <DestinationHighlight
        active={destHighlight.active}
        color={destHighlight.color}
        duration={2000}
        onDone={() => setDestHighlight((d) => ({ ...d, active: false }))}
      />

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
