import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink, Terminal, AlertTriangle, RefreshCw, ChevronDown, ChevronRight,
  Shield, Users, Play, BarChart2, Globe, Camera, FileText, Key, Search, BookOpen, Layers
} from 'lucide-react';

// ── API Catalogue ────────────────────────────────────────────────────────────
const API_GROUPS = [
  {
    id: 'auth',
    label: 'Authentication',
    icon: Key,
    color: '#e0a64a',
    bg: 'rgba(224,166,74,0.10)',
    base: '/api/auth',
    description: 'Login, logout, token refresh and session management.',
    endpoints: [
      { method: 'POST', path: '/api/auth/login',   desc: 'Authenticate user and obtain JWT access + refresh tokens.' },
      { method: 'POST', path: '/api/auth/refresh',  desc: 'Exchange a valid refresh token for a new access token.' },
      { method: 'POST', path: '/api/auth/logout',   desc: 'Invalidate the current session and revoke tokens.' },
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    color: '#58a6ff',
    bg: 'rgba(88,166,255,0.10)',
    base: '/api/admin/users',
    description: 'CRUD operations for portal users — Super Admin only.',
    endpoints: [
      { method: 'GET',    path: '/api/admin/users',        desc: 'List all registered users with roles and status.' },
      { method: 'POST',   path: '/api/admin/users',        desc: 'Create a new user account.' },
      { method: 'PUT',    path: '/api/admin/users/{id}',   desc: 'Update user details, role or status.' },
      { method: 'DELETE', path: '/api/admin/users/{id}',   desc: 'Permanently remove a user from the system.' },
    ],
  },
  {
    id: 'executions',
    label: 'Test Executions',
    icon: Play,
    color: '#3fb950',
    bg: 'rgba(63,185,80,0.10)',
    base: '/api/executions',
    description: 'Trigger, monitor and manage automation test runs.',
    endpoints: [
      { method: 'GET',  path: '/api/executions',             desc: 'Fetch paginated list of all execution records.' },
      { method: 'POST', path: '/api/executions',             desc: 'Trigger a new test execution run.' },
      { method: 'GET',  path: '/api/executions/{id}',        desc: 'Get detailed results for a specific execution.' },
      { method: 'GET',  path: '/api/executions/{id}/steps',  desc: 'Retrieve all step-level results for an execution.' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart2,
    color: '#a371f7',
    bg: 'rgba(163,113,247,0.10)',
    base: '/api/reports',
    description: 'Generate, download and browse test execution reports.',
    endpoints: [
      { method: 'GET', path: '/api/reports',        desc: 'List all generated reports with metadata.' },
      { method: 'GET', path: '/api/reports/{id}',   desc: 'Retrieve a specific report by ID.' },
    ],
  },
  {
    id: 'modules',
    label: 'Test Modules',
    icon: Layers,
    color: '#f78166',
    bg: 'rgba(247,129,102,0.10)',
    base: '/api/modules',
    description: 'Manage automation test modules and test case configurations.',
    endpoints: [
      { method: 'GET',    path: '/api/modules',        desc: 'List all available test modules.' },
      { method: 'POST',   path: '/api/modules',        desc: 'Register a new test module.' },
      { method: 'PUT',    path: '/api/modules/{id}',   desc: 'Update an existing module definition.' },
      { method: 'DELETE', path: '/api/modules/{id}',   desc: 'Remove a module from the registry.' },
    ],
  },
  {
    id: 'environments',
    label: 'Environments',
    icon: Globe,
    color: '#39d353',
    bg: 'rgba(57,211,83,0.10)',
    base: '/api/environments',
    description: 'Configure and switch between test environments (URLs, credentials).',
    endpoints: [
      { method: 'GET',    path: '/api/environments',        desc: 'List all configured environments.' },
      { method: 'POST',   path: '/api/environments',        desc: 'Add a new environment configuration.' },
      { method: 'PUT',    path: '/api/environments/{id}',   desc: 'Edit an existing environment.' },
      { method: 'DELETE', path: '/api/environments/{id}',   desc: 'Delete an environment record.' },
    ],
  },
  {
    id: 'screenshots',
    label: 'Screenshots',
    icon: Camera,
    color: '#d2a8ff',
    bg: 'rgba(210,168,255,0.10)',
    base: '/api/screenshots',
    description: 'Access screenshots captured during test executions.',
    endpoints: [
      { method: 'GET', path: '/api/screenshots',             desc: 'Browse all captured screenshots.' },
      { method: 'GET', path: '/api/screenshots/{filename}',  desc: 'Download a specific screenshot file.' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart2,
    color: '#79c0ff',
    bg: 'rgba(121,192,255,0.10)',
    base: '/api/dashboard',
    description: 'Aggregate statistics and KPIs for the portal home screen.',
    endpoints: [
      { method: 'GET', path: '/api/dashboard/summary',  desc: 'Overall pass/fail rates, queued and running counts.' },
      { method: 'GET', path: '/api/dashboard/trend',    desc: 'Historical execution trend data for charting.' },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: Users,
    color: '#ffa657',
    bg: 'rgba(255,166,87,0.10)',
    base: '/api/profile',
    description: 'View and update the currently authenticated user\'s profile.',
    endpoints: [
      { method: 'GET',  path: '/api/profile',          desc: 'Retrieve current user profile and preferences.' },
      { method: 'PUT',  path: '/api/profile',          desc: 'Update display name, avatar or preferences.' },
      { method: 'POST', path: '/api/profile/password', desc: 'Change the authenticated user\'s password.' },
    ],
  },
];

// ── Method badge colours ─────────────────────────────────────────────────────
const METHOD_STYLES = {
  GET:    { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950', border: 'rgba(63,185,80,0.3)' },
  POST:   { bg: 'rgba(88,166,255,0.15)', color: '#58a6ff', border: 'rgba(88,166,255,0.3)' },
  PUT:    { bg: 'rgba(255,166,87,0.15)', color: '#ffa657', border: 'rgba(255,166,87,0.3)' },
  DELETE: { bg: 'rgba(248,81,73,0.15)',  color: '#f85149', border: 'rgba(248,81,73,0.3)' },
};

function MethodBadge({ method }) {
  const s = METHOD_STYLES[method] || METHOD_STYLES.GET;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 60, padding: '2px 10px', borderRadius: 6,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0,
    }}>
      {method}
    </span>
  );
}

function EndpointRow({ endpoint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px', borderRadius: 8,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      <MethodBadge method={endpoint.method} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <code style={{
          fontSize: 13, fontFamily: '"Fira Code", "Cascadia Code", monospace',
          color: '#c9d1d9', display: 'block', marginBottom: 3,
        }}>
          {endpoint.path}
        </code>
        <p style={{ margin: 0, fontSize: 12, color: '#8a9bb0', lineHeight: 1.4 }}>
          {endpoint.desc}
        </p>
      </div>
    </div>
  );
}

function ApiGroup({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  return (
    <div style={{
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: 'transparent', border: 0,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: group.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={group.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#cdd6e0' }}>{group.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.07)', color: '#8a9bb0',
            }}>
              {group.endpoints.length} endpoints
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8a9bb0' }}>{group.description}</p>
        </div>
        <span style={{ color: '#4e6275', flexShrink: 0 }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Endpoints */}
      {open && (
        <div style={{ padding: '0 16px 14px', display: 'grid', gap: 6 }}>
          {group.endpoints.map((ep, i) => <EndpointRow key={i} endpoint={ep} />)}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ApiCollection() {
  const [search, setSearch] = useState('');
  const [swaggerMode, setSwaggerMode] = useState(false);   // toggle to show iframe
  const [iframeStatus, setIframeStatus] = useState('idle'); // idle | loading | ok | error
  const iframeRef = useRef(null);

  const swaggerUrl = (() => {
    const port = window.location.port;
    if (port === '5173' || port === '3000') return `http://${window.location.hostname}:8080/swagger-ui/index.html`;
    return `${window.location.origin}/swagger-ui/index.html`;
  })();

  // Filter groups by search
  const filtered = search.trim() === ''
    ? API_GROUPS
    : API_GROUPS.map(g => ({
        ...g,
        endpoints: g.endpoints.filter(ep =>
          ep.path.toLowerCase().includes(search.toLowerCase()) ||
          ep.method.toLowerCase().includes(search.toLowerCase()) ||
          ep.desc.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.label.toLowerCase().includes(search.toLowerCase()) || g.endpoints.length > 0);

  const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

  // When swagger mode enabled, start loading
  useEffect(() => {
    if (swaggerMode) setIframeStatus('loading');
  }, [swaggerMode]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Hero header ── */}
      <div style={{
        borderRadius: 14, padding: '24px 28px',
        background: 'linear-gradient(135deg, #0d1f33 0%, #0a1824 50%, #071520 100%)',
        border: '1px solid rgba(23,107,135,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(23,107,135,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: 'rgba(23,107,135,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Terminal size={18} color="#4ab8d8" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ab8d8' }}>
                REST API Reference
              </span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#e6edf3' }}>
              Backend API Collection
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#8a9bb0', maxWidth: 500, lineHeight: 1.5 }}>
              Complete reference for all <strong style={{ color: '#cdd6e0' }}>{totalEndpoints} endpoints</strong> across{' '}
              <strong style={{ color: '#cdd6e0' }}>{API_GROUPS.length} controllers</strong>. 
              Use Swagger UI for interactive testing.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setSwaggerMode(m => !m)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(23,107,135,0.5)',
                background: swaggerMode ? 'rgba(23,107,135,0.3)' : 'rgba(23,107,135,0.1)',
                color: '#4ab8d8', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              <BookOpen size={14} />
              {swaggerMode ? 'Hide Swagger UI' : 'Show Swagger UI'}
            </button>
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8,
                background: 'linear-gradient(135deg, #176b87 0%, #0b4f68 100%)',
                color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(23,107,135,0.35)',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={14} /> Open Swagger
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Endpoints', value: totalEndpoints },
            { label: 'Controllers', value: API_GROUPS.length },
            { label: 'Auth Type', value: 'JWT Bearer' },
            { label: 'Base URL', value: '/api' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 10, color: '#4e6275', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#cdd6e0' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Swagger iframe (collapsible) ── */}
      {swaggerMode && (
        <div style={{
          borderRadius: 12, border: '1px solid rgba(23,107,135,0.3)',
          background: '#0a1520', overflow: 'hidden', position: 'relative',
        }}>
          {/* iframe header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#f85149','#e3b341','#3fb950'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#4e6275', fontFamily: 'monospace' }}>
                {swaggerUrl}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {iframeStatus === 'error' && (
                <button
                  onClick={() => { setIframeStatus('loading'); setSwaggerMode(false); setTimeout(() => setSwaggerMode(true), 100); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#8a9bb0', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  <RefreshCw size={11} /> Retry
                </button>
              )}
              <a href={swaggerUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, border: '1px solid rgba(23,107,135,0.4)',
                  background: 'rgba(23,107,135,0.15)', color: '#4ab8d8',
                  textDecoration: 'none', fontSize: 12,
                }}
              >
                <ExternalLink size={11} /> New Tab
              </a>
            </div>
          </div>

          {/* Loading overlay */}
          {iframeStatus === 'loading' && (
            <div style={{
              position: 'absolute', top: 41, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, background: '#0a1520', zIndex: 2,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '3px solid #1e3348', borderTopColor: '#176b87',
                animation: 'spin 0.9s linear infinite',
              }} />
              <p style={{ color: '#8a9bb0', fontSize: 13, margin: 0 }}>Loading Swagger UI…</p>
            </div>
          )}

          {/* Error overlay */}
          {iframeStatus === 'error' && (
            <div style={{
              padding: '48px 24px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: 14,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(248,81,73,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={26} color="#f85149" />
              </div>
              <div>
                <p style={{ color: '#cdd6e0', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>
                  Swagger UI couldn't be embedded
                </p>
                <p style={{ color: '#8a9bb0', fontSize: 13, margin: 0, maxWidth: 380 }}>
                  The backend may still be starting, or X-Frame-Options is preventing embedding.
                  Use "Open Swagger" to access it directly.
                </p>
              </div>
              <a href={swaggerUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #176b87 0%, #0b4f68 100%)',
                  color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700,
                }}
              >
                <ExternalLink size={13} /> Open in New Tab
              </a>
            </div>
          )}

          {iframeStatus !== 'error' && (
            <iframe
              ref={iframeRef}
              src={swaggerUrl}
              title="Swagger UI"
              onLoad={() => setIframeStatus('ok')}
              onError={() => setIframeStatus('error')}
              style={{
                width: '100%', height: 520, border: 'none', display: 'block', background: '#fff',
              }}
            />
          )}
        </div>
      )}

      {/* ── API Reference catalogue ── */}
      <div style={{
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
      }}>
        {/* Catalogue header + search */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="#4ab8d8" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#cdd6e0' }}>Endpoint Reference</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
              background: 'rgba(23,107,135,0.2)', color: '#4ab8d8',
            }}>
              {filtered.reduce((s, g) => s + g.endpoints.length, 0)} / {totalEndpoints}
            </span>
          </div>

          {/* Search box */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '0 12px', minWidth: 220,
            transition: 'border-color 0.2s',
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(23,107,135,0.6)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <Search size={13} color="#4e6275" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search endpoints, methods…"
              style={{
                background: 'transparent', border: 0, outline: 0, height: 36,
                fontSize: 13, color: '#cdd6e0', width: '100%',
              }}
            />
          </div>
        </div>

        {/* Groups list */}
        <div style={{ padding: '14px 16px', display: 'grid', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4e6275' }}>
              <Search size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No endpoints match "{search}"</p>
            </div>
          ) : (
            filtered.map((group, i) => (
              <ApiGroup key={group.id} group={group} defaultOpen={i === 0 && !search} />
            ))
          )}
        </div>
      </div>

      {/* ── Auth info banner ── */}
      <div style={{
        borderRadius: 10, padding: '14px 18px',
        background: 'rgba(224,166,74,0.07)', border: '1px solid rgba(224,166,74,0.2)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Shield size={16} color="#e0a64a" style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 13, color: '#e0a64a' }}>
            Authentication Required
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#8a9bb0', lineHeight: 1.5 }}>
            All endpoints (except <code style={{ color: '#cdd6e0' }}>/api/auth/login</code>) require a valid{' '}
            <code style={{ color: '#cdd6e0' }}>Authorization: Bearer &lt;token&gt;</code> header.
            Obtain a token via <code style={{ color: '#cdd6e0' }}>POST /api/auth/login</code>.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
