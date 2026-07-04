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
  Globe2,
  Crown
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
export function Topbar({ pageTitle, superAdmin, onOpenAdmin }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('portal-theme') || 'dark');
  const searchRef = React.useRef(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal-theme', next);
    document.documentElement.dataset.theme = next;
  };

  // Ctrl+K focuses the global search (the shortcut shown on the input)
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const notifications = [
    { id: 1, title: 'Execution Completed', message: 'Suite run EXE_20260626 completed successfully.', time: '5m ago', unread: true },
    { id: 2, title: 'Failure Alert', message: 'Test method TC_023 failed in module LAND.', time: '1h ago', unread: true },
    { id: 3, title: 'Runner Registered', message: 'New runner framework-runner connected to Execution Manager.', time: '2h ago', unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="topbar" style={{ background: '#070d19', borderBottom: '1px solid #14253f', paddingBottom: '16px', marginBottom: '16px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '22px', fontWeight: 800 }}>
          {pageTitle}
        </h1>
      </div>

      <div className="topbar-right">
        {/* Environment status pill */}
        <div className="tb-chip tb-chip-cyan">
          <Globe2 size={14} />
          QA Environment
        </div>

        {/* Global Search Bar */}
        <div className="tb-search">
          <Search size={15} />
          <input
            ref={searchRef}
            placeholder="Global search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="tb-kbd">Ctrl + K</span>
        </div>

        {/* Notifications Center */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="tb-icon-btn"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="tb-count-badge">{unreadCount}</span>
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

        {/* Theme toggle — always in the same spot, left of the Super Admin chip */}
        <button
          className="tb-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to bright theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {superAdmin && (
          <>
            <div className="tb-chip tb-chip-amber">
              <Crown size={14} />
              Super Admin
            </div>
            <button className="tb-chip tb-chip-blue" onClick={onOpenAdmin} title="Open Administration Workspace">
              <LayoutDashboard size={15} />
              Admin Panel
            </button>
          </>
        )}
      </div>
    </header>
  );
}
