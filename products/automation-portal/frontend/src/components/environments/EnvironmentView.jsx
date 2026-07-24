import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { Loader } from '../../../../../../shared/ui/Loader.jsx';
import { Modal } from '../shared/index.jsx';
import {
  Globe2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Link2,
  Play,
  Clock,
  Percent,
  Settings2,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import './environments.css';

const parseConfig = (json) => {
  try {
    const obj = JSON.parse(json || '{}');
    return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
  } catch {
    return [];
  }
};

const toConfigJson = (rows) => {
  const obj = {};
  rows.forEach(({ key, value }) => {
    if (key.trim()) obj[key.trim()] = value;
  });
  return JSON.stringify(obj);
};

const isSecretKey = (key) => /pass|secret|token|captcha|key/i.test(key);

function ReachBadge({ env }) {
  if (env.reachability === 'UP') {
    return <span className="ev-reach ev-reach-up"><Wifi size={13} /> Live · {env.latencyMs}ms</span>;
  }
  if (env.reachability === 'DEGRADED') {
    return <span className="ev-reach ev-reach-slow"><AlertTriangle size={13} /> Degraded (HTTP {env.httpStatus})</span>;
  }
  if (env.reachability === 'DOWN') {
    return <span className="ev-reach ev-reach-down"><WifiOff size={13} /> Unreachable</span>;
  }
  return <span className="ev-reach ev-reach-nourl"><Link2 size={13} /> No URL set</span>;
}

function EnvCard({ env, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [baseUrl, setBaseUrl] = useState(env.baseUrl || '');
  const [rows, setRows] = useState(parseConfig(env.configJson));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    setBaseUrl(env.baseUrl || '');
    setRows(parseConfig(env.configJson));
  }, [env.baseUrl, env.configJson]);

  const updateRow = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateEnvironment(env.id, {
        baseUrl: baseUrl.trim(),
        active: env.active,
        configJson: toConfigJson(rows)
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      onSaved();
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const lastRun = env.lastRunAt ? new Date(env.lastRunAt).toLocaleString() : '—';

  return (
    <div className={`ev-card${env.active ? '' : ' ev-card-disabled'}`}>
      <div className="ev-card-head">
        <div className="ev-card-title">
          <span className="ev-code">{env.code}</span>
          <div>
            <h3>{env.name}</h3>
            <span className={`ev-active-pill ${env.active ? 'on' : 'off'}`}>
              {env.active ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
        <ReachBadge env={env} />
      </div>

      <div className="ev-url-row">
        <Link2 size={14} />
        <input
          type="text"
          value={baseUrl}
          placeholder="https://target-app-url…  (used for health checks / future run injection)"
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>

      <div className="ev-stats">
        <div className="ev-stat">
          <Play size={13} />
          <div>
            <strong>{env.totalRuns}</strong>
            <span>Total Runs</span>
          </div>
        </div>
        <div className="ev-stat">
          <Clock size={13} />
          <div>
            <strong className={`ev-status-text ${String(env.lastRunStatus || '').toLowerCase()}`}>
              {env.lastRunStatus || '—'}
            </strong>
            <span title={env.lastRunCode || ''}>{lastRun}</span>
          </div>
        </div>
        <div className="ev-stat">
          <Percent size={13} />
          <div>
            <strong>{env.avgPassRate}%</strong>
            <span>Avg Pass Rate</span>
          </div>
        </div>
      </div>

      <button className="ev-config-toggle" onClick={() => setExpanded((v) => !v)}>
        <Settings2 size={14} />
        Framework Config ({rows.length})
        <span className={`ev-chev${expanded ? ' open' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="ev-config">
          <p className="ev-config-hint">
            Key/value config for this environment (login credentials, captcha keys, …).
            Stored in the portal; injected into runs once the framework contract is wired.
          </p>
          {rows.length > 0 && (
            <div className="ev-config-secrets-row">
              <button className="ev-mini-btn" onClick={() => setShowSecrets((v) => !v)}>
                {showSecrets ? <EyeOff size={12} /> : <Eye size={12} />}
                {showSecrets ? 'Hide values' : 'Show values'}
              </button>
            </div>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="ev-config-row">
              <input
                type="text"
                placeholder="key (e.g. login.username)"
                value={row.key}
                onChange={(e) => updateRow(idx, 'key', e.target.value)}
              />
              <input
                type={!showSecrets && isSecretKey(row.key) ? 'password' : 'text'}
                placeholder="value"
                value={row.value}
                onChange={(e) => updateRow(idx, 'value', e.target.value)}
              />
              <button className="ev-row-del" title="Remove" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button className="ev-mini-btn" onClick={() => setRows((prev) => [...prev, { key: '', value: '' }])}>
            <Plus size={12} /> Add entry
          </button>
        </div>
      )}

      <div className="ev-card-foot">
        {savedFlash && <span className="ev-saved">Saved ✓</span>}
        <button className="ev-save-btn" onClick={save} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Environment Health & Config Page ──────────────────────────────────────────
export function EnvironmentView({ onRefresh }) {
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add-environment form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ code: '', name: '', baseUrl: '' });
  const [addError, setAddError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await api.environmentsHealth();
      setEnvs(data || []);
    } catch (e) {
      console.error('Failed to load environment health', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reload this page AND App-level state, so the new environment shows up in
  // every environment selector (Dashboard, Execution Center, Reports filters).
  const reloadEverywhere = async () => {
    await load(true);
    if (onRefresh) await onRefresh();
  };

  const handleCreate = async () => {
    const code = addForm.code.trim().toUpperCase();
    const name = addForm.name.trim();
    if (!code || !name) {
      setAddError('Code and Name are required.');
      return;
    }
    if (envs.some((e) => e.code?.toUpperCase() === code)) {
      setAddError(`Environment code "${code}" already exists.`);
      return;
    }
    setCreating(true);
    setAddError('');
    try {
      await api.createEnvironment({ code, name, baseUrl: addForm.baseUrl.trim() || null, active: true });
      setShowAdd(false);
      setAddForm({ code: '', name: '', baseUrl: '' });
      await reloadEverywhere();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <Loader size={44} label="Probing environments..." />
      </div>
    );
  }

  return (
    <section className="ev-page">
      <div className="ev-head">
        <h3 className="ev-title"><Globe2 size={17} /> Environment Health &amp; Configuration</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="ev-refresh" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'ev-spin' : ''} />
            {refreshing ? 'Probing…' : 'Re-check'}
          </button>
          <button className="ev-add-btn" onClick={() => { setShowAdd(true); setAddError(''); }}>
            <Plus size={14} /> Add Environment
          </button>
        </div>
      </div>

      <div className="ev-grid">
        {envs.map((env) => (
          <EnvCard key={env.id} env={env} onSaved={reloadEverywhere} />
        ))}
      </div>

      {showAdd && (
        <Modal title="Add Environment" onClose={() => setShowAdd(false)}>
          <div className="ev-add-form">
            <label>
              <span>Code *</span>
              <input
                type="text"
                placeholder="e.g. STAGING"
                value={addForm.code}
                onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </label>
            <label>
              <span>Name *</span>
              <input
                type="text"
                placeholder="e.g. Staging"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              <span>Base URL</span>
              <input
                type="text"
                placeholder="https://target-app-url…  (optional, needed for health checks)"
                value={addForm.baseUrl}
                onChange={(e) => setAddForm((f) => ({ ...f, baseUrl: e.target.value }))}
              />
            </label>
            {addError && <p className="ev-add-error">{addError}</p>}
            <p className="ev-config-hint">
              Saved environments become selectable everywhere — Dashboard, Execution Center and report filters.
              Framework config (credentials, captcha keys) can be added on the card after saving.
            </p>
            <div className="ev-add-actions">
              <button className="ev-mini-btn" onClick={() => setShowAdd(false)} disabled={creating}>Cancel</button>
              <button className="ev-save-btn" onClick={handleCreate} disabled={creating}>
                <Save size={14} /> {creating ? 'Creating…' : 'Create Environment'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
