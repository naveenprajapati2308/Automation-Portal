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
import { LogsViewer } from './components/logs/LogsViewer.jsx';
import { ScreenshotsGallery } from './components/screenshots/ScreenshotsGallery.jsx';
import { ExecutionDetailPage } from './components/execution/ExecutionDetailPage.jsx';
import { ADMIN_NAV, fallbackSummary, isSuperAdmin, USER_NAV } from './constants.js';

// Attach resolved icon components to nav items (done once at module level)
const ICON_MAP = {
  Gauge, Play, FileText, TerminalSquare, Camera, Globe2,
  UserCircle, LayoutDashboard, KeyRound, GitCompare
};
[...USER_NAV, ...ADMIN_NAV].forEach((item) => { item._icon = ICON_MAP[item.icon]; });

// ── Error Popup Content ───────────────────────────────────────────────────────
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
  const [active, setActive] = useState('dashboard');
  // workspace: 'portal' | 'admin'
  const [workspace, setWorkspace] = useState('portal');

  const [summary, setSummary] = useState(fallbackSummary);
  const [environments, setEnvironments] = useState([]);
  const [modules, setModules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(1);
  const [selectedModule, setSelectedModule] = useState('LAND');
  const [suiteXmlPath, setSuiteXmlPath] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const toggleSidebar = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

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
      setGlobalError(err);
    });
    return () => api.setErrorCallback(null);
  }, []);

  // `notice` is a toast, not a permanent header fixture — auto-dismiss it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

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
      auth.clear();
      setSession(null);
      setNotice(error.message);
    }
  };

  useEffect(() => {
    if (session?.accessToken) refresh();
  }, [session?.accessToken]);

  const pageTitle = useMemo(
    () => USER_NAV.find((item) => item.key === active)?.label ?? 'Dashboard',
    [active]
  );

  const onAuthenticated = (nextSession) => {
    auth.set(nextSession);
    setSession(nextSession);
    setNotice('Signed in successfully.');
  };

  const logout = async () => {
    try {
      if (session?.refreshToken) await api.logout(session.refreshToken);
    } finally {
      auth.clear();
      setSession(null);
      setActive('dashboard');
      setWorkspace('portal');
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
      setNotice(`${execution.executionCode} queued successfully.`);
      await refresh();
      return execution;
    } catch (error) {
      setNotice(error.message);
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
  if (workspace === 'admin') {
    content = (
      <AdminWorkspace
        superAdmin={superAdmin}
        logout={logout}
        onBack={() => setWorkspace('portal')}
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
            session={session}
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
          />
        )}
        {active === 'reports' && <ReportsCenter onSelectExecution={setSelectedExecutionId} />}
        {active === 'logs' && <LogsViewer />}
        {active === 'screenshots' && <ScreenshotsGallery onSelectExecution={setSelectedExecutionId} />}
        {active === 'compare' && <ComparePage executions={executions} />}
        {active === 'environments' && <EnvironmentView environments={environments} />}
        {active === 'profile' && <Profile setNotice={setNotice} />}
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

      {notice && (
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
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#10b981',
              color: '#052e1d',
              flexShrink: 0,
            }}
          >
            <Check size={12} strokeWidth={3} />
          </span>
          {notice}
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#34d399',
              cursor: 'pointer',
              padding: '2px',
              marginLeft: '4px',
              opacity: 0.7,
            }}
          >
            ✕
          </button>
        </div>
      )}

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
