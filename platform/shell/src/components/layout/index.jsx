import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bot,
  Camera,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Database,
  FileText,
  FolderTree,
  Gauge,
  GitCompare,
  Globe2,
  History,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Play,
  Send,
  Sun,
  TerminalSquare,
  UserCircle,
  Workflow,
  X
} from 'lucide-react';
import { GlobalSearchDropdown } from '../../search/components/GlobalSearchDropdown.jsx';
import { SIDEBAR_NAV } from '../../constants.js';
import { getStoredThemePref, resolveEffectiveTheme } from '../../../../../shared/ui/theme-sync.js';
import testrixLogo from '../../assets/testrix_logo.png';

const NAV_ICON_MAP = {
  LayoutDashboard, Play, Globe2, Gauge, UserCircle, FileText, TerminalSquare, Camera, GitCompare,
  Send, Database, Workflow, CalendarClock, History, FolderTree
};

// ── Layout: Sidebar ─────────────────────────────────────────────────────────
export function Sidebar({
  active,
  activeChildKey,
  logout,
  onNavigate,
  onNavigateChild,
  isCollapsed,
  onToggle,
  chatOpen,
  onToggleChat
}) {
  const isExpandable = (key) => SIDEBAR_NAV.some((item) => item.key === key && item.children);
  const [expandedKeys, setExpandedKeys] = useState(() => (isExpandable(active) ? { [active]: true } : {}));

  useEffect(() => {
    if (isExpandable(active)) setExpandedKeys((k) => ({ ...k, [active]: true }));
  }, [active]);

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
        <img src={testrixLogo} alt="TESTRIX" className="brand-logo sidebar-logo" style={{ width: 36, height: 36, flexShrink: 0 }} />
        {!isCollapsed && (
          <div style={{ animation: 'fadeIn 0.2s' }}>
            <strong>TESTRIX</strong>
            <span>Unified Testing Platform</span>
          </div>
        )}
      </div>

      <nav style={{ paddingRight: 0, flex: '0 1 auto' }}>
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
        {SIDEBAR_NAV.map((item) => {
          const Icon = NAV_ICON_MAP[item.icon] || LayoutDashboard;
          const isActive = active === item.key;
          const commonStyle = {
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '0' : '0 12px',
            borderRadius: '8px'
          };
          if (item.children && !isCollapsed) {
            const isExpanded = !!expandedKeys[item.key];
            return (
              <div className="nav-group" key={item.key}>
                <button
                  className={`nav-group-header ${isActive ? 'active' : ''}`}
                  onClick={() => setExpandedKeys((k) => ({ ...k, [item.key]: !k[item.key] }))}
                  title={item.label}
                  style={commonStyle}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span style={{ animation: 'fadeIn 0.2s' }}>{item.label}</span>
                  <ChevronDown size={14} className={`nav-group-chevron ${isExpanded ? 'open' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="nav-submenu">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        className={activeChildKey === child.key ? 'active' : ''}
                        onClick={() => onNavigateChild(item.key, child.key)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          if (item.children && isCollapsed) {
            return (
              <button
                key={item.key}
                className={isActive ? 'active' : ''}
                onClick={() => onNavigate(item.key)}
                title={item.label}
                style={commonStyle}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
              </button>
            );
          }
          if (item.href) {
            return (
              <a
                key={item.key}
                href={item.href}
                className={isActive ? 'active' : ''}
                title={item.label}
                style={{ ...commonStyle, textDecoration: 'none' }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>{item.label}</span>}
              </a>
            );
          }
          if (item.disabled) {
            return (
              <button
                key={item.key}
                disabled
                title={`${item.label} — coming soon`}
                style={{ ...commonStyle, opacity: 0.45, cursor: 'default' }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>{item.label}</span>}
              </button>
            );
          }
          return (
            <button
              key={item.key}
              className={isActive ? 'active' : ''}
              onClick={() => onNavigate(item.key)}
              title={item.label}
              style={commonStyle}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span style={{ animation: 'fadeIn 0.2s' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto' }}>
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
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="sidebar-footer">
          <button
            onClick={onToggleChat}
            title="AI Support"
            className={`ai-chat-btn ${chatOpen ? 'active' : ''}`}
            style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0' : '0 12px' }}
          >
            <Bot size={18} style={{ flexShrink: 0 }} />
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

// ── AI Support chat — the real /genai/chat assistant, anchored to the sidebar
export function AiSupportPanel({ isCollapsed, messages, input, setInput, busy, onSend, onClose }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="ai-chat-panel" style={{ left: isCollapsed ? '82px' : '292px' }}>
      <div className="ai-chat-header">
        <Bot size={20} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>AI Support</strong>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Testrix AI Assistant</span>
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
        {busy && <div className="ai-chat-bubble">Thinking…</div>}
      </div>

      <form
        className="ai-chat-input-row"
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI assistant…"
        />
        <button type="submit" className="tb-icon-btn" title="Send" disabled={busy}>
          <Send size={15} />
        </button>
      </form>
    </div>
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

// ── Breadcrumb: "{rootLabel} [> {mid.label}] > {pageTitle}", each non-current
// ── Breadcrumb: dynamic, interactive trail [ { label, onClick }, ... ] ─────
// Every segment except the current (last) item renders as an interactive button link.
export function Breadcrumb({ items = [], rootLabel = 'Home', mid, pageTitle, onNavigateRoot }) {
  if (items && items.length > 0) {
    return (
      <nav className="tb-breadcrumb" aria-label="Breadcrumb">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <span key={idx} className="tb-breadcrumb-segment">
              {idx > 0 && <ChevronRight size={12} className="tb-breadcrumb-sep" />}
              {isLast || !item.onClick ? (
                <span className="tb-breadcrumb-current">{item.label}</span>
              ) : (
                <button
                  type="button"
                  className="tb-breadcrumb-link"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              )}
            </span>
          );
        })}
      </nav>
    );
  }

  if (!pageTitle) return null;
  const legacyItems = [
    { label: rootLabel, onClick: onNavigateRoot },
    ...(mid && mid.label !== pageTitle ? [{ label: mid.label, onClick: mid.onClick }] : []),
    { label: pageTitle }
  ];

  return <Breadcrumb items={legacyItems} />;
}

// ── Layout: Topbar ───────────────────────────────────────────────────────────
export function Topbar({ pageTitle, breadcrumbItems, breadcrumbMid, superAdmin, onOpenAdmin, onNavigateHome, notifications, user, onNavigateProfile, onNavigate, topbarExtra }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [themePref, setThemePref] = useState(() => getStoredThemePref());

  const chooseTheme = (pref) => {
    setThemePref(pref);
    localStorage.setItem('portal-theme', pref);
    document.documentElement.dataset.theme = resolveEffectiveTheme(pref);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = resolveEffectiveTheme(themePref);
  }, []);

  // While the preference is 'system', flip with the OS instead of waiting for
  // the user to touch the switch again.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => { if (themePref === 'system') document.documentElement.dataset.theme = resolveEffectiveTheme('system'); };
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [themePref]);

  // Ctrl+K is now handled inside GlobalSearchDropdown itself.

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="topbar" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '22px', fontWeight: 800 }}>
          {pageTitle}
        </h1>
        <Breadcrumb items={breadcrumbItems} rootLabel="Home" mid={breadcrumbMid} pageTitle={pageTitle} onNavigateRoot={onNavigateHome} />
      </div>

      <div className="topbar-right">
        {topbarExtra}
        <GlobalSearchDropdown onNavigate={onNavigate} superAdmin={superAdmin} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="tb-icon-btn"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className="tb-count-badge">{unreadCount}</span>}
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
                {notifications.map((n) => (
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

        <div className="tb-theme-switch" role="group" aria-label="Theme">
          <button
            type="button"
            className={themePref === 'system' ? 'active' : ''}
            onClick={() => chooseTheme('system')}
            title="Match system theme"
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            className={themePref === 'light' ? 'active' : ''}
            onClick={() => chooseTheme('light')}
            title="Bright theme"
          >
            <Sun size={15} />
          </button>
          <button
            type="button"
            className={themePref === 'dark' ? 'active' : ''}
            onClick={() => chooseTheme('dark')}
            title="Dark theme"
          >
            <Moon size={15} />
          </button>
        </div>

        {superAdmin && (
          <button className="tb-chip tb-chip-blue" onClick={onOpenAdmin} title="Open Administration Workspace">
            <LayoutDashboard size={15} />
            Admin Panel
          </button>
        )}

        {user && (
          <button className="tb-user-chip" onClick={onNavigateProfile} title="View profile">
            {user.profileImagePath
              ? <img className="tb-user-avatar" src={user.profileImagePath.startsWith('/') || user.profileImagePath.startsWith('http') ? user.profileImagePath : `/uploads/${user.profileImagePath}`} alt="" />
              : <span className="tb-user-avatar">{(user.displayName || user.username || '?').trim().charAt(0).toUpperCase()}</span>}
            <span className="tb-user-text">
              <span className="tb-user-name">{user.displayName || user.username}</span>
              <span className="tb-user-role">{superAdmin && <Crown size={9} style={{ marginRight: 3, verticalAlign: '-1px' }} />}{(user.role || '').replace(/_/g, ' ').toLowerCase()}</span>
            </span>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>
    </header>
  );
}
