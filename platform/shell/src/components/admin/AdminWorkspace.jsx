import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Play,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import appLogo from '../../assets/testrix_logo.png';
import { ADMIN_WORKSPACE_NAV, ADMIN_WORKSPACE_NAV_FLAT } from '../../constants.js';
import { Breadcrumb } from '../layout/index.jsx';
import { AdminDashboardOverview } from './AdminDashboardOverview.jsx';
import { UserManagement } from './UserManagement.jsx';
import { RoleManagement } from './RoleManagement.jsx';
import { EnvironmentsConfig } from './EnvironmentsConfig.jsx';
import { ModuleManagement } from './ModuleManagement.jsx';
import { PortalConfig } from './PortalConfig.jsx';
import { InternalDocs } from './InternalDocs.jsx';
import { ApiCollection } from './ApiCollection.jsx';
import { Placeholder } from '../shared/index.jsx';

const WS_ICON_MAP = { Shield, Users, BookOpen, Play, Zap };
ADMIN_WORKSPACE_NAV.forEach((item) => { item._icon = WS_ICON_MAP[item.icon]; });

// ── Admin Sidebar — plugs directly into the platform shell's single
// <PortalLayout>, replacing the main Sidebar while in admin mode (not nested
// inside it — that was the "app inside an app" bug). Same expand/collapse
// group pattern as the main Sidebar's automation/apitest sub-menus. ─────────
export function AdminSidebar({ activePage, onNavigate, onBack, logout }) {
  const activeGroupKey = ADMIN_WORKSPACE_NAV.find((item) => item.children?.some((c) => c.key === activePage))?.key;
  const [expandedKeys, setExpandedKeys] = useState(() => new Set(activeGroupKey ? [activeGroupKey] : []));

  useEffect(() => {
    if (activeGroupKey) setExpandedKeys((prev) => new Set(prev).add(activeGroupKey));
  }, [activeGroupKey]);

  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <img className="brand-logo sidebar-logo" src={appLogo} alt="TESTRIX" />
        <div>
          <strong>Administration</strong>
          <span>Admin Dashboard</span>
        </div>
      </div>
      <nav>
        <div className="nav-section-label" style={{ color: 'var(--warning-text)' }}>Admin Controls</div>
        {ADMIN_WORKSPACE_NAV.map((item) => {
          const Icon = item._icon;
          if (item.children) {
            const isOpen = expandedKeys.has(item.key);
            return (
              <div key={item.key} className="nav-group">
                <button
                  type="button"
                  className={`admin-ws-nav-btn nav-group-header${item.key === activeGroupKey ? ' active' : ''}`}
                  onClick={() => setExpandedKeys((prev) => {
                    const next = new Set(prev);
                    next.has(item.key) ? next.delete(item.key) : next.add(item.key);
                    return next;
                  })}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronDown size={14} className={`nav-group-chevron${isOpen ? ' open' : ''}`} />
                </button>
                {isOpen && (
                  <div className="nav-submenu">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        className={activePage === child.key ? 'active' : ''}
                        onClick={() => onNavigate(child.key)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              key={item.key}
              className={`admin-ws-nav-btn${activePage === item.key ? ' active' : ''}`}
              onClick={() => onNavigate(item.key)}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button className="admin-ws-back-btn" onClick={onBack} title="Back to Portal">
          <LayoutDashboard size={18} />
          <span>← Back to Portal</span>
        </button>
      </nav>
      <div className="sidebar-footer admin-sidebar-footer">
        <button className="logout-btn" onClick={logout} title="Logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
        <p>All right reserved TESTRIX 2026</p>
      </div>
    </aside>
  );
}

// ── Admin Topbar — same slot as the main Topbar, swapped in for admin mode ──
export function AdminTopbar({ pageTitle, notice, onNavigateRoot, onBack }) {
  return (
    <header className="topbar admin-topbar">
      <div>
        <h1>{pageTitle}</h1>
        <Breadcrumb rootLabel="Admin Dashboard" pageTitle={pageTitle} onNavigateRoot={onNavigateRoot} />
        <p className="admin-notice">{notice}</p>
      </div>
      <div className="topbar-right">
        <div className="admin-badge">
          <Shield size={14} />
          Super Admin
        </div>
        <button className="admin-ws-back-topbar-btn" onClick={onBack}>
          ← Back to Portal
        </button>
      </div>
    </header>
  );
}

// ── Admin Content — just the page switch, hosted by the shell's single
// <PortalLayout> content area (no layout of its own). ───────────────────────
export function AdminContent({ activePage, setActivePage, setNotice }) {
  return (
    <>
      {activePage === 'admin-dashboard' && <AdminDashboardOverview setNotice={setNotice} setActive={setActivePage} />}
      {activePage === 'user-management' && <UserManagement setNotice={setNotice} />}
      {activePage === 'environments-config' && <EnvironmentsConfig setNotice={setNotice} />}
      {activePage === 'module-management' && <ModuleManagement setNotice={setNotice} />}
      {activePage === 'portal-config' && <PortalConfig setNotice={setNotice} />}
      {activePage === 'role-management' && <RoleManagement setNotice={setNotice} />}
      {activePage === 'access-management' && <Placeholder title="Access Management" lines={['IP allowlists', 'Session policies', 'Coming in a future phase']} />}
      {activePage === 'documentation' && <InternalDocs setNotice={setNotice} superAdmin />}
      {activePage === 'api-collection' && <ApiCollection />}
      {activePage === 'apitest-admin-soon' && (
        <Placeholder
          title="API Testing — Admin Controls"
          lines={['Environments, modules and config for API Testing are not wired up yet', 'This section is a placeholder until that admin surface is built']}
        />
      )}
    </>
  );
}

export const adminPageTitle = (activePage) => ADMIN_WORKSPACE_NAV_FLAT.find((i) => i.key === activePage)?.label ?? 'Administration';
