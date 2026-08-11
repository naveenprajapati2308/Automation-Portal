import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable, Modal, ConfirmDialog } from '../shared/index.jsx';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Field } from '../shared/Field.jsx';

// ── Real cross-project Environments administration for Super Admin — native page hitting
// EnvironmentAdminController (/api/admin/environments), not an iframe of the live, project-scoped
// Automation product page. Each project still manages its own environments day-to-day through
// its own Environments page; this is the platform-level oversight/setup view. ──────────────────
export function EnvironmentsAdmin({ setNotice }) {
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEnvironments = async () => {
    setLoading(true);
    try {
      const data = await api.adminListEnvironments();
      setEnvironments(data || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnvironments(); }, []);

  const handleToggleActive = async (env) => {
    try {
      await api.adminUpdateEnvironment(env.id, { active: !env.active });
      setNotice(`Environment "${env.name}" ${env.active ? 'disabled' : 'enabled'} successfully.`);
      fetchEnvironments();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminDeleteEnvironment(deleteTarget.id);
      setNotice(`Environment "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchEnvironments();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'projectName',
      label: 'Project',
      render: (val, row) => <span className="status">{val || `Project #${row.projectId}`}</span>
    },
    { key: 'name', label: 'Name', render: (val) => <strong>{val}</strong> },
    { key: 'code', label: 'Code' },
    { key: 'baseUrl', label: 'Base URL', defaultVisible: false },
    { key: 'businessId', label: 'ID', defaultVisible: false },
    {
      key: 'active',
      label: 'Status',
      render: (val) => <span className={`status ${val ? 'passed' : 'failed'}`}>{val ? 'ACTIVE' : 'INACTIVE'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, env) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="action-btn edit-btn" onClick={() => setEditTarget(env)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Edit2 size={12} /> Edit
          </button>
          <button
            className="action-btn"
            onClick={() => handleToggleActive(env)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: env.active ? '#fef3c7' : '#d1fae5',
              color: env.active ? '#92400e' : '#065f46',
              border: `1px solid ${env.active ? '#f59e0b' : '#10b981'}`,
              borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            {env.active ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
            {env.active ? 'Disable' : 'Enable'}
          </button>
          <button className="action-btn delete-btn" onClick={() => setDeleteTarget(env)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )
    }
  ], [environments]);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Environments — All Workspaces">
        <div className="um-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="primary-action" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Environment
          </button>
          <span className="um-count">{environments.length} environment{environments.length !== 1 ? 's' : ''}</span>
        </div>

        <DataTable
          columns={columns}
          data={environments}
          loading={loading}
          searchPlaceholder="Filter environments..."
          exportFilename="environments_list.csv"
        />
      </Panel>

      {showCreate && (
        <Modal title="Add Environment" onClose={() => setShowCreate(false)} closeOnBackdrop={false}>
          <EnvironmentForm setNotice={setNotice} onSaved={() => { setShowCreate(false); fetchEnvironments(); }} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editTarget && (
        <Modal title={`Edit Environment: ${editTarget.name}`} onClose={() => setEditTarget(null)} closeOnBackdrop={false}>
          <EnvironmentForm env={editTarget} setNotice={setNotice} onSaved={() => { setEditTarget(null); fetchEnvironments(); }} onCancel={() => setEditTarget(null)} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog onClose={() => setDeleteTarget(null)}>
          <div className="confirm-icon" style={{ color: '#dc2626' }}><Trash2 size={30} /></div>
          <h3>Delete Environment?</h3>
          <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong> (<code>{deleteTarget.code}</code>)?</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={handleDelete}>Delete</button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

function EnvironmentForm({ env, setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: env?.name || '',
    code: env?.code || '',
    baseUrl: env?.baseUrl || '',
    projectId: env?.projectId || '',
    active: env ? env.active : true
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const payload = { ...form, projectId: form.projectId ? Number(form.projectId) : undefined };
    try {
      if (env) {
        await api.adminUpdateEnvironment(env.id, payload);
        setNotice('Environment updated successfully.');
      } else {
        await api.adminCreateEnvironment(payload);
        setNotice('Environment created successfully.');
      }
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <Field label="Environment Name" required value={form.name} onChange={(v) => update('name', v)} error={errors.name} placeholder="e.g. UAT" />
      <Field label="Environment Code" required value={form.code} onChange={(v) => update('code', v.toUpperCase().replace(/\s+/g, '_'))} error={errors.code} disabled={!!env} placeholder="e.g. UAT" />
      <Field label="Base URL" value={form.baseUrl} onChange={(v) => update('baseUrl', v)} placeholder="https://…" />
      {!env && (
        <>
          <Field label="Project ID" value={form.projectId} onChange={(v) => update('projectId', v.replace(/\D/g, ''))} placeholder="Leave blank for the Default Workspace" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '-10px', marginBottom: '10px' }}>
            Targets a specific project's workspace. Leave blank to create it in the Default Workspace instead.
          </span>
        </>
      )}

      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
        <input
          type="checkbox"
          id="env-active-chk"
          checked={form.active}
          onChange={(e) => update('active', e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="env-active-chk" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#555' }}>
          Active
        </label>
      </div>

      <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="submit">Save Environment</button>
      </div>
    </form>
  );
}
