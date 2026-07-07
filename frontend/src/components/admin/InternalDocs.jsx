import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FilePlus,
  Lock,
  Pencil,
  Search,
  Shield,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import { useState } from 'react';

/* ── Seed data ──────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'api',      label: 'API Reference',   color: 'var(--info-text)' },
  { key: 'setup',    label: 'Setup / Config',  color: '#10b981' },
  { key: 'auth',     label: 'Auth & Security', color: 'var(--warning-text)' },
  { key: 'db',       label: 'Database',        color: 'var(--accent-text)' },
  { key: 'workflow', label: 'Workflows',       color: '#06b6d4' },
  { key: 'misc',     label: 'Miscellaneous',   color: '#6b7280' },
];

const INITIAL_DOCS = [
  {
    id: 1,
    category: 'api',
    title: 'Dashboard Summary API',
    method: 'GET',
    endpoint: '/api/dashboard/summary',
    description: 'Returns aggregated execution statistics including total runs, pass rate, fail rate, queued and running counts.',
    body: null,
    response: '{\n  "totalExecutions": 142,\n  "passRate": 87.32,\n  "failRate": 12.68,\n  "queuedExecutions": 3,\n  "runningExecutions": 1\n}',
    notes: 'Requires ADMIN or SUPER_ADMIN role. Rate-limited to 60 req/min.',
  },
  {
    id: 2,
    category: 'api',
    title: 'User Management API',
    method: 'GET',
    endpoint: '/api/admin/users',
    description: 'Paginated list of all portal users with role, status and metadata.',
    body: null,
    response: '{\n  "users": [...],\n  "total": 54,\n  "page": 1,\n  "pageSize": 20\n}',
    notes: 'SUPER_ADMIN only. Supports ?role=&status=&page= query params.',
  },
  {
    id: 3,
    category: 'auth',
    title: 'JWT Token Expiry',
    method: null,
    endpoint: null,
    description: 'Access tokens expire after 15 minutes. Refresh tokens are valid for 7 days. The frontend stores the refresh token in an httpOnly cookie only.',
    body: null,
    response: null,
    notes: 'Never expose refresh token in localStorage. Contact backend team to rotate signing secret.',
  },
  {
    id: 4,
    category: 'setup',
    title: 'Local Dev Setup',
    method: null,
    endpoint: null,
    description: 'Run `docker compose up -d` from project root. Frontend runs on :5173, backend on :8080, Postgres on :5432.',
    body: null,
    response: null,
    notes: 'Copy .env.example to .env before starting. Backend hot-reload via spring-devtools.',
  },
];

const METHOD_COLORS = {
  GET:    { bg: '#dbeafe', color: '#1d4ed8' },
  POST:   { bg: '#dcfce7', color: '#15803d' },
  PUT:    { bg: '#fef9c3', color: '#a16207' },
  PATCH:  { bg: '#ffedd5', color: '#c2410c' },
  DELETE: { bg: '#fee2e2', color: '#b91c1c' },
};

let nextId = INITIAL_DOCS.length + 1;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function catLabel(key) { return CATEGORIES.find((c) => c.key === key)?.label ?? key; }
function catColor(key) { return CATEGORIES.find((c) => c.key === key)?.color ?? '#6b7280'; }

/* ── Code Block ──────────────────────────────────────────────────────────── */
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="doc-code-block">
      <button className="doc-copy-btn" onClick={copy} title="Copy">
        <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre><code>{code}</code></pre>
    </div>
  );
}

/* ── DocCard ──────────────────────────────────────────────────────────────── */
function DocCard({ doc, onEdit, onDelete, canWrite }) {
  const [open, setOpen] = useState(false);
  const method = doc.method ? METHOD_COLORS[doc.method] ?? { bg: '#e5e7eb', color: '#374151' } : null;

  return (
    <div className="doc-card">
      <div className="doc-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="doc-card-title-row">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span
            className="doc-cat-badge"
            style={{
              background: catColor(doc.category) + '22',
              color: catColor(doc.category),
              borderColor: catColor(doc.category) + '55',
            }}
          >
            <Tag size={10} /> {catLabel(doc.category)}
          </span>
          {method && (
            <span className="doc-method-badge" style={{ background: method.bg, color: method.color }}>
              {doc.method}
            </span>
          )}
          <strong className="doc-card-title">{doc.title}</strong>
        </div>

        {/* Write actions — Super Admin only */}
        {canWrite ? (
          <div className="doc-card-actions">
            <button
              className="doc-icon-btn edit"
              onClick={(e) => { e.stopPropagation(); onEdit(doc); }}
              title="Edit entry"
            >
              <Pencil size={14} />
            </button>
            <button
              className="doc-icon-btn delete"
              onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
              title="Delete entry"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="doc-card-actions">
            <span className="doc-readonly-badge" title="View only — Super Admin can edit">
              <Lock size={11} /> Read only
            </span>
          </div>
        )}
      </div>

      {open && (
        <div className="doc-card-body">
          {doc.endpoint && (
            <div className="doc-endpoint">
              <Code2 size={14} />
              <code>{doc.endpoint}</code>
            </div>
          )}
          <p className="doc-description">{doc.description}</p>
          {doc.body && (
            <div className="doc-section">
              <div className="doc-section-label">Request Body</div>
              <CodeBlock code={doc.body} />
            </div>
          )}
          {doc.response && (
            <div className="doc-section">
              <div className="doc-section-label">Response</div>
              <CodeBlock code={doc.response} />
            </div>
          )}
          {doc.notes && (
            <div className="doc-notes">
              <strong>📌 Notes:</strong> {doc.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── DocForm (Modal) ─────────────────────────────────────────────────────── */
function DocForm({ initial, onSave, onClose }) {
  const blank = {
    category: 'api', title: '', method: 'GET',
    endpoint: '', description: '', body: '', response: '', notes: '',
  };
  const [form, setForm] = useState(initial ?? blank);
  const [errors, setErrors] = useState({});

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => { if (validate()) onSave(form); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>{initial ? 'Edit Entry' : 'New Documentation Entry'}</h2>
            {/* Super Admin badge inside modal */}
            <span className="doc-sa-badge">
              <Shield size={11} /> Super Admin
            </span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body doc-form-body">
          {/* Category */}
          <label className="form-row">
            <span>Category <span className="required-mark">*</span></span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>

          {/* Title */}
          <div className={`form-field${errors.title ? ' has-error' : ''}`} style={{ marginBottom: 0 }}>
            <label className="form-row">
              <span>Title <span className="required-mark">*</span></span>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Create Execution API"
              />
            </label>
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          {/* HTTP Method + Endpoint */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
            <label className="form-row">
              <span>Method</span>
              <select value={form.method ?? ''} onChange={(e) => set('method', e.target.value || null)}>
                <option value="">None</option>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="form-row">
              <span>Endpoint</span>
              <input
                value={form.endpoint ?? ''}
                onChange={(e) => set('endpoint', e.target.value)}
                placeholder="/api/..."
              />
            </label>
          </div>

          {/* Description */}
          <div className={`form-field${errors.description ? ' has-error' : ''}`} style={{ marginBottom: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              Description <span className="required-mark">*</span>
            </span>
            <textarea
              className="doc-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What does this do?"
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          {/* Request Body */}
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            Request Body <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(JSON / optional)</span>
          </span>
          <textarea
            className="doc-textarea doc-code-textarea"
            rows={4}
            value={form.body ?? ''}
            onChange={(e) => set('body', e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
          />

          {/* Response */}
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            Response <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(JSON / optional)</span>
          </span>
          <textarea
            className="doc-textarea doc-code-textarea"
            rows={4}
            value={form.response ?? ''}
            onChange={(e) => set('response', e.target.value)}
            placeholder={'{\n  "status": "ok"\n}'}
          />

          {/* Notes */}
          <label className="form-row">
            <span>Notes</span>
            <input
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Auth, rate limits, gotchas..."
            />
          </label>

          <div className="modal-form-actions" style={{ marginTop: 16 }}>
            <button className="secondary-action" onClick={onClose}>Cancel</button>
            <button className="primary-action modal-submit-btn" onClick={submit}>
              {initial ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export function InternalDocs({ setNotice, superAdmin = false }) {
  const [docs, setDocs]       = useState(INITIAL_DOCS);
  const [search, setSearch]   = useState('');
  const [catFilter, setCat]   = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);

  const visible = docs.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      (d.endpoint ?? '').toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const openNew  = () => { setEditing(null); setShowForm(true); };
  const openEdit = (doc) => { setEditing(doc); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const saveDoc = (form) => {
    if (editing) {
      setDocs((prev) => prev.map((d) => d.id === editing.id ? { ...form, id: editing.id } : d));
      setNotice?.('Documentation entry updated.');
    } else {
      setDocs((prev) => [...prev, { ...form, id: nextId++ }]);
      setNotice?.('New documentation entry added.');
    }
    closeForm();
  };

  const deleteDoc = (id) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setNotice?.('Entry deleted.');
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: visible.filter((d) => d.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="internal-docs-page">

      {/* ── Read-only notice for non-super-admins ── */}
      {!superAdmin && (
        <div className="doc-readonly-notice">
          <Lock size={15} />
          <span>
            You are viewing documentation in <strong>read-only</strong> mode.
            Only a <strong>Super Admin</strong> can add, edit or delete entries.
          </span>
        </div>
      )}

      {/* ── Super Admin write banner ── */}
      {superAdmin && (
        <div className="doc-write-banner">
          <div className="doc-write-banner-left">
            <Shield size={16} />
            <div>
              <div className="doc-write-banner-title">Internal Team Documentation</div>
              <div className="doc-write-banner-sub">
                You have Super Admin write access — add, edit or delete any entry.
              </div>
            </div>
          </div>
          <button
            id="doc-add-entry-btn"
            className="primary-action doc-add-btn"
            onClick={openNew}
          >
            <FilePlus size={16} />
            Add Documentation
            <span className="doc-add-badge">
              <Shield size={10} /> Super Admin
            </span>
          </button>
        </div>
      )}

      {/* ── Search + Filter toolbar ── */}
      <div className="doc-toolbar">
        <div className="um-search-box" style={{ maxWidth: 340 }}>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs, endpoints…"
          />
          {search && (
            <button
              className="close-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="um-filter-select"
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <span className="um-count">{visible.length} entries</span>
      </div>

      {/* ── Doc list ── */}
      {visible.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <BookOpen size={20} /> No documentation entries found.
        </div>
      ) : (
        grouped.map((cat) => (
          <div key={cat.key} className="doc-group">
            <div className="doc-group-label">
              <span className="doc-group-dot" style={{ background: cat.color }} />
              {cat.label}
              <span className="doc-group-count">{cat.items.length}</span>
            </div>
            <div className="doc-group-cards">
              {cat.items.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  canWrite={superAdmin}
                  onEdit={openEdit}
                  onDelete={deleteDoc}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Form Modal (Super Admin only) ── */}
      {showForm && superAdmin && (
        <DocForm initial={editing} onSave={saveDoc} onClose={closeForm} />
      )}
    </div>
  );
}
