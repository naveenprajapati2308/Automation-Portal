import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  LogOut,
  Search
} from 'lucide-react';
import appLogo from '../../assets/testrix_logo.png';
import { USER_NAV } from '../../constants.js';

// ── Layout: Sidebar ───────────────────────────────────────────────────────────
export function Sidebar({
  active,
  setActive,
  logout,
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
          border: '1px solid var(--sidebar-edge)',
          background: 'var(--sidebar-item-hover-bg)',
          color: 'var(--sidebar-muted)'
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

// ── Breadcrumb: "{rootLabel} > {pageTitle}", root is a real nav link ──────────
export function Breadcrumb({ rootLabel, pageTitle, onNavigateRoot }) {
  if (!pageTitle || pageTitle === rootLabel) return null;
  return (
    // A <nav> element would inherit the sidebar's global `nav { flex-direction: column }`
    // rule, so this uses a div with the equivalent ARIA role instead.
    <div className="tb-breadcrumb" role="navigation" aria-label="Breadcrumb">
      <button type="button" className="tb-breadcrumb-link" onClick={onNavigateRoot}>
        {rootLabel}
      </button>
      <ChevronRight size={12} className="tb-breadcrumb-sep" />
      <span className="tb-breadcrumb-current">{pageTitle}</span>
    </div>
  );
}

// ── Layout: Topbar ────────────────────────────────────────────────────────────
export function Topbar({ pageTitle, onNavigateHome }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = React.useRef(null);

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

  return (
    <header className="topbar" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '22px', fontWeight: 800 }}>
          {pageTitle}
        </h1>
        <Breadcrumb rootLabel="Dashboard" pageTitle={pageTitle} onNavigateRoot={onNavigateHome} />
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
      </div>
    </header>
  );
}
