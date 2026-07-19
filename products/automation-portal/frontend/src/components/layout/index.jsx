import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Crown,
  X,
  Send
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
  const [chatOpen, setChatOpen] = useState(false);

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
          onClick={() => setChatOpen((open) => !open)}
          title="AI Support"
          className={`ai-chat-btn ${chatOpen ? 'active' : ''}`}
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0' : '0 12px' }}
        >
          <img src="/chaticon.png" alt="AI Support" style={{ width: '20px', height: '20px', flexShrink: 0, objectFit: 'contain' }} />
          {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>AI Support</span>}
        </button>
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

      {chatOpen && <AiChatPanel isCollapsed={isCollapsed} onClose={() => setChatOpen(false)} />}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </aside>
  );
}

// ── AI Support chat (dummy — real assistant will be wired in here later) ──────
function AiChatPanel({ isCollapsed, onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: 'Hi! I am the TESTRIX AI assistant. I am not connected yet — this is a placeholder while the integration is in progress.' }
  ]);
  const [draft, setDraft] = useState('');
  const scrollRef = React.useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: 'user', text },
      { id: Date.now() + 1, from: 'bot', text: 'AI support is coming soon. Your message will reach a real assistant once the integration goes live.' }
    ]);
  };

  // Portal to <body>: the sidebar is position:sticky (its own stacking context),
  // so a fixed panel rendered inside it would paint below the main content.
  return createPortal(
    <div className="ai-chat-panel" style={{ left: isCollapsed ? '82px' : '292px' }}>
      <div className="ai-chat-header">
        <img src="/chaticon.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>AI Support</strong>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Coming soon</span>
        </div>
        <button className="tb-icon-btn" onClick={onClose} title="Close chat">
          <X size={15} />
        </button>
      </div>

      <div className="ai-chat-messages" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`ai-chat-bubble ${m.from === 'user' ? 'ai-chat-bubble-user' : ''}`}>
            {m.text}
          </div>
        ))}
      </div>

      <form className="ai-chat-input-row" onSubmit={sendMessage}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask something..."
        />
        <button type="submit" className="tb-icon-btn" title="Send">
          <Send size={15} />
        </button>
      </form>
    </div>,
    document.body
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
export function Topbar({ pageTitle, superAdmin, onOpenAdmin, onNavigateHome }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('portal-theme') || 'light');
  const searchRef = React.useRef(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal-theme', next);
    document.documentElement.dataset.theme = next;
    document.documentElement.setAttribute('data-bs-theme', next);
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
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: '0 10px 30px var(--shadow-a50)',
                zIndex: 200,
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Notifications</strong>
                <span style={{ fontSize: '11px', color: 'var(--cyan-text)', cursor: 'pointer', fontWeight: 'bold' }}>Mark all read</span>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ background: n.unread ? 'rgba(96, 179, 224, 0.04)' : 'transparent', padding: '8px', borderRadius: '6px', fontSize: '12px', border: n.unread ? '1px solid rgba(96, 179, 224, 0.08)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span>{n.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>{n.time}</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{n.message}</p>
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
