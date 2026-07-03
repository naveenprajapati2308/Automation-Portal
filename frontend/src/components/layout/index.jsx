import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  Globe2
} from 'lucide-react';
import appLogo from '../../assets/MPHIDB_Logo2.png';
import { USER_NAV } from '../../constants.js';

// ── Layout: Sidebar ───────────────────────────────────────────────────────────
export function Sidebar({ 
  active, 
  setActive, 
  superAdmin, 
  logout, 
  onOpenAdmin,
  isCollapsed,
  onToggle
}) {
  return (
    <aside 
      className="sidebar"
      style={{ 
        width: isCollapsed ? '70px' : '280px',
        minWidth: isCollapsed ? '70px' : '280px',
        padding: isCollapsed ? '12px 8px' : '22px',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <div className="brand" style={{ paddingBottom: isCollapsed ? '12px' : '24px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <img className="brand-logo sidebar-logo" src={appLogo} alt="TESTRIX" style={{ width: '36px', height: '36px' }} />
        {!isCollapsed && (
          <div style={{ animation: 'fadeIn 0.2s' }}>
            <strong>Automation Portal</strong>
          </div>
        )}
      </div>

      <nav style={{ paddingRight: 0 }}>
        <div 
          className="nav-section-label" 
          style={{ 
            textAlign: isCollapsed ? 'center' : 'left', 
            fontSize: isCollapsed ? '9px' : '10px',
            padding: isCollapsed ? '10px 0 4px' : '10px 12px 4px'
          }}
        >
          {isCollapsed ? 'NAV' : 'Navigation'}
        </div>
        {USER_NAV.map((item) => {
          const Icon = item._icon;
          return (
            <button
              key={item.key}
              className={active === item.key ? 'active' : ''}
              onClick={() => setActive(item.key)}
              title={item.label}
              style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0' : '0 12px',
                borderRadius: '8px'
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>{item.label}</span>}
            </button>
          );
        })}

        {/* SUPER_ADMIN only — Administration entry */}
        {superAdmin && (
          <>
            <div 
              className="nav-section-label nav-section-admin"
              style={{ 
                textAlign: isCollapsed ? 'center' : 'left', 
                fontSize: isCollapsed ? '9px' : '10px',
                padding: isCollapsed ? '10px 0 4px' : '10px 12px 4px'
              }}
            >
              {isCollapsed ? 'ADM' : 'Admin Area'}
            </div>
            <button
              className="admin-nav-btn admin-entry-btn"
              onClick={onOpenAdmin}
              title="Open Administration Workspace"
              style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0' : '0 12px'
              }}
            >
              <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>Administration</span>}
            </button>
          </>
        )}
      </nav>

      {/* Collapse Toggle Button */}
      <button 
        onClick={onToggle}
        className="secondary-action"
        style={{
          minHeight: '32px',
          height: '32px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '8px 0',
          border: '1px solid #253040',
          background: '#1a2635',
          color: '#8a9bb0'
        }}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-footer" style={{ paddingGap: isCollapsed ? '8px' : '14px' }}>
        <button 
          onClick={logout} 
          title="Logout" 
          className="logout-btn"
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0' : '0 12px' }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>Logout</span>}
        </button>
        {!isCollapsed && <p style={{ animation: 'fadeIn 0.2s', textAlign: 'center' }}>All right reserved TESTRIX 2026</p>}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </aside>
  );
}

export function PortalLayout({ sidebar, topbar, children, shellClassName = '', mainClassName = '', isCollapsed }) {
  return (
    <div 
      className={`shell portal-layout ${shellClassName}`.trim()}
      style={{ 
        gridTemplateColumns: isCollapsed ? '70px 1fr' : '280px 1fr',
        transition: 'grid-template-columns 0.2s ease-in-out'
      }}
    >
      {sidebar}
      <main className={`layout-main ${mainClassName}`.trim()}>
        {topbar}
        <div className="layout-content">
          {children}
        </div>
      </main>
    </div>
  );
}

// ── Layout: Topbar ────────────────────────────────────────────────────────────
export function Topbar({ pageTitle, superAdmin, onOpenAdmin, session }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, title: 'Execution Completed', message: 'Suite run EXE_20260626 completed successfully.', time: '5m ago', unread: true },
    { id: 2, title: 'Failure Alert', message: 'Test method TC_023 failed in module LAND.', time: '1h ago', unread: true },
    { id: 3, title: 'Runner Registered', message: 'New runner framework-runner connected to Execution Manager.', time: '2h ago', unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const userInitials = session?.user?.displayName
    ? session.user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="topbar" style={{ background: '#070d19', borderBottom: '1px solid #14253f', paddingBottom: '16px', marginBottom: '16px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '22px', fontWeight: 800 }}>
          {pageTitle}
        </h1>
      </div>

      <div className="topbar-right">
        {/* Environment status pill */}
        <div className="brief-meta" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(96, 179, 224, 0.15)', color: '#60b3e0', border: '1px solid rgba(96, 179, 224, 0.25)', borderRadius: '20px' }}>
          <Globe2 size={13} style={{ marginRight: '6px' }} />
          QA Environment
        </div>

        {/* Global Search Bar */}
        <div className="search" style={{ background: '#0d1527', border: '1px solid #14253f' }}>
          <Search size={18} style={{ color: '#7a9cb8' }} />
          <input 
            placeholder="Global search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', color: '#fff' }}
          />
        </div>

        {/* Notifications Center */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="secondary-action btn-icon-only"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%', position: 'relative', background: '#0d1527', border: '1px solid #14253f', color: '#7a9cb8' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 0 2px #0d1527' }}></span>
            )}
          </button>
          
          {showNotifications && (
            <div 
              style={{ 
                position: 'absolute', 
                top: '46px', 
                right: 0, 
                width: '320px', 
                background: '#0d1527', 
                border: '1px solid #14253f', 
                borderRadius: '10px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
                zIndex: 200,
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #14253f', paddingBottom: '8px', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Notifications</strong>
                <span style={{ fontSize: '11px', color: '#60b3e0', cursor: 'pointer', fontWeight: 'bold' }}>Mark all read</span>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ background: n.unread ? 'rgba(96, 179, 224, 0.04)' : 'transparent', padding: '8px', borderRadius: '6px', fontSize: '12px', border: n.unread ? '1px solid rgba(96, 179, 224, 0.08)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#fff' }}>
                      <span>{n.title}</span>
                      <span style={{ fontSize: '10px', color: '#7a9cb8', fontWeight: 400 }}>{n.time}</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#7a9cb8' }}>{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1527', padding: '4px 10px 4px 4px', borderRadius: '20px', border: '1px solid #14253f' }}>
          <div style={{ width: '28px', height: '28px', background: '#60b3e0', color: '#070d19', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 800 }}>
            {userInitials}
          </div>
          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{session?.user?.displayName || 'User'}</span>
            <span style={{ color: '#7a9cb8', fontSize: '9px' }}>{session?.user?.role || 'Viewer'}</span>
          </div>
        </div>

        {superAdmin && (
          <>
            <div className="admin-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <Shield size={14} />
              Super Admin
            </div>
            <button className="admin-workspace-btn" onClick={onOpenAdmin} title="Open Administration Workspace" style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #1e3d5a, #0e2030)', border: '1px solid #2a4c72', color: '#60b3e0', borderRadius: '8px', padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>
              <LayoutDashboard size={15} />
              Admin Panel
            </button>
          </>
        )}
      </div>
    </header>
  );
}
