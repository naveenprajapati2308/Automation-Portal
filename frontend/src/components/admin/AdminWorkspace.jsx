import {
  BookOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Shield,
  UserCog,
  Users,
  TerminalSquare,
  Globe2,
  Sliders
} from 'lucide-react';
import { useState } from 'react';
import appLogo from '../../assets/MPHIDB_Logo2.png';
import { ADMIN_WORKSPACE_NAV } from '../../constants.js';
import { PortalLayout } from '../layout/index.jsx';
import { AdminDashboardOverview } from './AdminDashboardOverview.jsx';
import { UserManagement } from './UserManagement.jsx';
import { EnvironmentsConfig } from './EnvironmentsConfig.jsx';
import { ModuleManagement } from './ModuleManagement.jsx';
import { PortalConfig } from './PortalConfig.jsx';
import { InternalDocs } from './InternalDocs.jsx';
import { ApiCollection } from './ApiCollection.jsx';
import { Placeholder } from '../shared/index.jsx';

// Resolve icons for workspace nav
const WS_ICON_MAP = { Shield, Users, UserCog, KeyRound, BookOpen, TerminalSquare, Globe2, Sliders, Package };
ADMIN_WORKSPACE_NAV.forEach((item) => { item._icon = WS_ICON_MAP[item.icon]; });

// ── Admin Workspace ───────────────────────────────────────────────────────────
export function AdminWorkspace({ superAdmin, logout, onBack }) {
  const [activePage, setActivePage] = useState('admin-dashboard');
  const [notice, setNotice] = useState('Administration workspace — Super Admin only.');

  if (!superAdmin) {
    return null;
  }

  const pageTitle = ADMIN_WORKSPACE_NAV.find((i) => i.key === activePage)?.label ?? 'Administration';

  const sidebar = (
      <aside className="admin-sidebar">
        <div className="brand">
          <img className="brand-logo sidebar-logo" src={appLogo} alt="TESTRIX" />
          <div>
            <strong>Administration</strong>
            <span>Admin Dashboard</span>
          </div>
        </div>
        <nav>
          <div className="nav-section-label" style={{ color: '#e0a64a' }}>Admin Controls</div>
          {ADMIN_WORKSPACE_NAV.map((item) => {
            const Icon = item._icon;
            return (
              <button
                key={item.key}
                className={`admin-ws-nav-btn${activePage === item.key ? ' active' : ''}`}
                onClick={() => setActivePage(item.key)}
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

  const topbar = (
        <header className="topbar admin-topbar">
          <div>
            <h1>{pageTitle}</h1>
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

  return (
    <PortalLayout sidebar={sidebar} topbar={topbar} shellClassName="admin-shell" mainClassName="admin-main">
        {/* Admin Pages */}
        {activePage === 'admin-dashboard' && <AdminDashboardOverview setNotice={setNotice} setActive={setActivePage} />}
        {activePage === 'user-management' && <UserManagement setNotice={setNotice} />}
        {activePage === 'environments-config' && <EnvironmentsConfig setNotice={setNotice} />}
        {activePage === 'module-management' && <ModuleManagement setNotice={setNotice} />}
        {activePage === 'portal-config' && <PortalConfig setNotice={setNotice} />}
        {activePage === 'role-management' && <Placeholder title="Role Management" lines={['Role definitions', 'Permission matrix', 'Coming in a future phase']} />}
        {activePage === 'access-management' && <Placeholder title="Access Management" lines={['IP allowlists', 'Session policies', 'Coming in a future phase']} />}
        {activePage === 'documentation' && <InternalDocs setNotice={setNotice} superAdmin={superAdmin} />}
        {activePage === 'api-collection' && <ApiCollection />}
    </PortalLayout>
  );
}
