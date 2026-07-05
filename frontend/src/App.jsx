import {
  Camera,
  FileText,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Play,
  TerminalSquare,
  UserCircle,
  GitCompare,
  AlertTriangle,
  ShieldAlert,
  FileQuestion,
  WifiOff,
  Clock,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, auth } from './api.js';
import { AdminWorkspace } from './components/admin/AdminWorkspace.jsx';
import { AuthPage } from './components/auth/AuthPage.jsx';
import { Dashboard } from './components/dashboard/Dashboard.jsx';
import { EnvironmentView } from './components/environments/EnvironmentView.jsx';
import { ExecutionCenter } from './components/execution/ExecutionCenter.jsx';
import { ComparePage } from './components/execution/ComparePage.jsx';
import { PortalLayout, Sidebar, Topbar } from './components/layout/index.jsx';
import { Profile } from './components/profile/Profile.jsx';
import { ReportsCenter } from './components/reports/ReportsCenter.jsx';
import { Placeholder, Modal } from './components/shared/index.jsx';
import { FullScreenLoader } from './components/shared/Loader.jsx';
import { LogsViewer } from './components/logs/LogsViewer.jsx';
import { ScreenshotsGallery } from './components/screenshots/ScreenshotsGallery.jsx';
import { ExecutionDetailPage } from './components/execution/ExecutionDetailPage.jsx';
import { ADMIN_NAV, ADMIN_WORKSPACE_NAV, fallbackSummary, isSuperAdmin, USER_NAV } from './constants.js';

// Attach resolved icon components to nav items (done once at module level)
const ICON_MAP = {
  Gauge, Play, FileText, TerminalSquare, Camera, Globe2,
  UserCircle, LayoutDashboard, KeyRound, GitCompare
};
[...USER_NAV, ...ADMIN_NAV].forEach((item) => { item._icon = ICON_MAP[item.icon]; });

// ── Hash routing ──────────────────────────────────────────────────────────────
// The active tab lives in the URL hash (#/reports, #/admin/user-management) so a
// page refresh or back/forward keeps the user on the tab they were on.
const USER_TAB_KEYS = new Set(USER_NAV.map((item) => item.key));
const ADMIN_PAGE_KEYS = new Set(ADMIN_WORKSPACE_NAV.map((item) => item.key));

const parseHashRoute = () => {
  const [head, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (head === 'admin') {
    return {
      workspace: 'admin',
      active: 'dashboard',
      adminPage: ADMIN_PAGE_KEYS.has(sub) ? sub : 'admin-dashboard'
    };
  }
  return {
    workspace: 'portal',
    active: USER_TAB_KEYS.has(head) ? head : 'dashboard',
    adminPage: 'admin-dashboard'
  };
};

// ── Error Popup Content ───────────────────────────────────────────────────────
// Toast tone palette — success stays the common case; warnings/errors mostly
// surface via the global popup, but toast callers can opt into those tones too.
const TOAST_TONES = {
  success: { bg: '#16a34a', icon: Check },
  warning: { bg: '#d97706', icon: AlertTriangle },
  error: { bg: '#dc2626', icon: AlertTriangle },
};

function ErrorPopupContent({ error, onAction, onClose }) {
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = error.status;

  // Choose icon based on status
  let Icon = AlertTriangle;
  let statusClass = 'error-500';
  if (status === 0) {
    Icon = WifiOff;
    statusClass = 'error-0';
  } else if (status === 401) {
    Icon = Clock;
    statusClass = 'error-401';
  } else if (status === 403) {
    Icon = ShieldAlert;
    statusClass = 'error-403';
  } else if (status === 404) {
    Icon = FileQuestion;
    statusClass = 'error-404';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(error.detail || error.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="error-popup-container">
      <div className={`error-popup-icon-wrapper ${statusClass}`}>
        <Icon size={32} />
      </div>
      <h3 className="error-popup-title" style={{ margin: '0 0 8px 0' }}>{error.title}</h3>
      <p className="error-popup-message">{error.message}</p>

      {error.detail && (
        <>
          <button
            className={`error-popup-diag-btn ${showDiag ? 'active' : ''}`}
            onClick={() => setShowDiag(!showDiag)}
          >
            Diagnostics Details
            <ChevronDown size={14} />
          </button>

          {showDiag && (
            <div style={{ position: 'relative', width: '100%' }}>
              <button
                onClick={handleCopy}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <div className="error-popup-diag-box">
                {error.detail}
              </div>
            </div>
          )}
        </>
      )}

      <div className="error-popup-actions">
        {status === 401 ? (
          <button className="error-popup-btn error-popup-btn-action" onClick={onAction}>
            Sign In Again
          </button>
        ) : (
          <button className="error-popup-btn error-popup-btn-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export function App() {
  const [session, setSession] = useState(auth.get());
  const initialRoute = parseHashRoute();
  const [active, setActive] = useState(initialRoute.active);
  // workspace: 'portal' | 'admin'
  const [workspace, setWorkspace] = useState(initialRoute.workspace);
  const [adminPage, setAdminPage] = useState(initialRoute.adminPage);

  const [summary, setSummary] = useState(fallbackSummary);
  const [environments, setEnvironments] = useState([]);
  const [modules, setModules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(1);
  const [selectedModule, setSelectedModule] = useState('LAND');
  const [suiteXmlPath, setSuiteXmlPath] = useState('');
  // Toast: { text, tone } — tone is 'success' | 'warning' | 'error'
  const [notice, setNotice] = useState(null);
  const notify = (text, tone = 'success') => setNotice(text ? { text, tone } : null);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const toggleSidebar = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  // Apply the saved theme before anything renders (toggle lives in Topbar).
  // The admin workspace always runs in the default (dark) theme — it has its
  // own look and is not light-themed; the user's choice is restored on exit.
  useEffect(() => {
    document.documentElement.dataset.theme = workspace === 'admin'
      ? 'dark'
      : (localStorage.getItem('portal-theme') || 'dark');
  }, [workspace]);

  // Set favicon once
  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = new URL('./assets/MPHIDB_Logo2.png', import.meta.url).href;
  }, []);

  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    api.setErrorCallback((err) => {
      // On the login screen AuthPage shows errors inline below the form —
      // don't stack the global popup on top of it.
      if (!session?.accessToken) return;
      setGlobalError(err);
    });
    return () => api.setErrorCallback(null);
  }, [session?.accessToken]);

  // `notice` is a toast, not a permanent header fixture — auto-dismiss it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // Keep the URL hash in sync with the active tab/workspace.
  useEffect(() => {
    const target = workspace === 'admin' ? `/admin/${adminPage}` : `/${active}`;
    if (window.location.hash !== `#${target}`) {
      window.location.hash = target;
    }
  }, [active, workspace, adminPage]);

  // Browser back/forward (and manual hash edits) drive the tab state.
  useEffect(() => {
    const onHashChange = () => {
      const route = parseHashRoute();
      setActive(route.active);
      setWorkspace(route.workspace);
      setAdminPage(route.adminPage);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refresh = async () => {
    try {
      const [summaryData, envData, moduleData, executionData] = await Promise.all([
        api.dashboardSummary(),
        api.environments(),
        api.modules(),
        api.executions()
      ]);
      setSummary(summaryData);
      setEnvironments(envData);
      setModules(moduleData);
      setExecutions(executionData);
      if (envData[0]) setSelectedEnv(envData[0].id);
      if (moduleData[0]) setSelectedModule(moduleData[0].code);
    } catch (error) {
      // Don't nuke the session on a transient load failure — if the session is
      // genuinely expired, the api layer's 401 popup → logout already handles it.
      notify(error.message, 'error');
    }
  };

  // Full-screen boot loader: shown while the initial portal data loads after
  // sign-in. Held for at least 1s so it reads as a deliberate branded moment,
  // then fades out ('show' → 'exit' → unmounted).
  const [bootLoader, setBootLoader] = useState(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    setBootLoader('show');
    const startedAt = Date.now();
    refresh().finally(() => {
      const holdFor = Math.max(0, 1500 - (Date.now() - startedAt));
      setTimeout(() => {
        setBootLoader('exit');
        setTimeout(() => setBootLoader(null), 400);
      }, holdFor);
    });
  }, [session?.accessToken]);

  const pageTitle = useMemo(
    () => USER_NAV.find((item) => item.key === active)?.label ?? 'Dashboard',
    [active]
  );

  const onAuthenticated = (nextSession) => {
    auth.set(nextSession);
    setSession(nextSession);
    // A "Session Expired" popup raised while the previous session was dying can
    // survive in state across the login screen (the popup JSX isn't rendered
    // there) and would instantly reappear over the brand-new session — and its
    // close handler would then log that new session out. Reset it on sign-in.
    setGlobalError(null);
    notify('Signed in successfully.');
  };

  const logout = async () => {
    try {
      if (session?.refreshToken) await api.logout(session.refreshToken);
    } finally {
      auth.clear();
      setSession(null);
      setGlobalError(null);
      setActive('dashboard');
      setWorkspace('portal');
      setAdminPage('admin-dashboard');
    }
  };

  const run = async (executionType, overrideXml = null, overrideModuleCode = null) => {
    try {
      const payload = {
        executionType,
        environmentId: selectedEnv,
        moduleCode: executionType === 'MODULE' ? (overrideModuleCode || selectedModule) : undefined,
        suiteXmlPath: overrideXml || (executionType === 'XML_SUITE' ? suiteXmlPath : undefined)
      };
      const execution = await api.runExecution(payload);
      notify(`${execution.executionCode} queued successfully.`);
      await refresh();
      return execution;
    } catch (error) {
      notify(error.message, 'error');
      throw error;
    }
  };

  if (!session?.accessToken) {
    return <AuthPage onAuthenticated={onAuthenticated} />;
  }

  const superAdmin = isSuperAdmin(session);

  const openAdminWorkspace = () => {
    if (superAdmin) {
      setWorkspace('admin');
    } else {
      setGlobalError({
        status: 403,
        title: 'Access Restricted (403)',
        message: 'You do not have permission to access the Administration workspace.',
        detail: 'Only Super Admin accounts can enter this area.'
      });
    }
  };

  // ── Admin Workspace ─────────────────────────────────────────────────────────
  // ── Admin Workspace / Normal Portal content ───────────────────────────────
  let content;
  if (workspace === 'admin' && superAdmin) {
    content = (
      <AdminWorkspace
        superAdmin={superAdmin}
        logout={logout}
        onBack={() => setWorkspace('portal')}
        activePage={adminPage}
        setActivePage={setAdminPage}
      />
    );
  } else {
    content = (
      <PortalLayout
        isCollapsed={isSidebarCollapsed}
        sidebar={(
          <Sidebar
            active={active}
            setActive={setActive}
            superAdmin={superAdmin}
            logout={logout}
            onOpenAdmin={openAdminWorkspace}
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
          />
        )}
        topbar={(
          <Topbar
            pageTitle={pageTitle}
            superAdmin={superAdmin}
            onOpenAdmin={openAdminWorkspace}
          />
        )}
      >
        {/* User pages */}
        {active === 'dashboard' && <Dashboard onSelectExecution={setSelectedExecutionId} onNavigate={setActive} />}
        {active === 'execution' && (
          <ExecutionCenter
            environments={environments}
            modules={modules}
            selectedEnv={selectedEnv}
            selectedModule={selectedModule}
            suiteXmlPath={suiteXmlPath}
            setSelectedEnv={setSelectedEnv}
            setSelectedModule={setSelectedModule}
            setSuiteXmlPath={setSuiteXmlPath}
            run={run}
            executions={executions}
            onSelectExecution={setSelectedExecutionId}
            onRefresh={refresh}
          />
        )}
        {active === 'reports' && <ReportsCenter onSelectExecution={setSelectedExecutionId} />}
        {active === 'logs' && <LogsViewer />}
        {active === 'screenshots' && <ScreenshotsGallery onSelectExecution={setSelectedExecutionId} />}
        {active === 'compare' && <ComparePage executions={executions} />}
        {active === 'environments' && <EnvironmentView onRefresh={refresh} />}
        {active === 'profile' && <Profile setNotice={notify} />}
        {selectedExecutionId && (
          <ExecutionDetailPage
            executionId={selectedExecutionId}
            onClose={() => {
              setSelectedExecutionId(null);
              refresh();
            }}
          />
        )}
      </PortalLayout>
    );
  }

  return (
    <>
      {content}

      {bootLoader && <FullScreenLoader exiting={bootLoader === 'exit'} />}

      {notice && (() => {
        const tone = TOAST_TONES[notice.tone] || TOAST_TONES.success;
        const ToneIcon = tone.icon;
        return (
          <div
            role="status"
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: tone.bg,
              color: '#ffffff',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <ToneIcon size={12} strokeWidth={3} />
            </span>
            {notice.text}
            <button
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '2px',
                marginLeft: '4px',
                opacity: 0.8,
              }}
            >
              ✕
            </button>
          </div>
        );
      })()}

      {globalError && (
        <Modal
          title=""
          onClose={() => {
            if (globalError.status === 401) {
              logout();
            }
            setGlobalError(null);
          }}
        >
          <ErrorPopupContent
            error={globalError}
            onClose={() => {
              if (globalError.status === 401) {
                logout();
              }
              setGlobalError(null);
            }}
            onAction={() => {
              if (globalError.status === 401) {
                logout();
              }
              setGlobalError(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
