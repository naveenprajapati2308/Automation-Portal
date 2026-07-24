import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable, Modal, ConfirmDialog } from '../shared/index.jsx';
import { Package, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Field } from '../shared/Field.jsx';

export function ModuleManagement({ setNotice }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editModule, setEditModule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const data = await api.adminListModules();
      setModules(data || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const handleToggle = async (mod) => {
    try {
      await api.adminToggleModule(mod.id);
      setNotice(`Module "${mod.name}" ${mod.active ? 'disabled' : 'enabled'} successfully.`);
      fetchModules();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminDeleteModule(deleteTarget.id);
      setNotice(`Module "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchModules();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const columns = useMemo(() => [
    { key: 'id', label: 'ID' },
    {
      key: 'name',
      label: 'Name',
      render: (val) => <strong>{val}</strong>
    },
    {
      key: 'code',
      label: 'Code',
      render: (val) => <span className="status">{val}</span>
    },
    {
      key: 'xmlFile',
      label: 'Suite XML',
      render: (val) => val ? <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{val}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: 'reportPath',
      label: 'Report Path',
      render: (val) => val ? <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{val}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: 'runnerType',
      label: 'Runner Type',
      render: (val) => <span className="status">{val || 'MAVEN_TESTNG'}</span>
    },
    {
      key: 'envCodes',
      label: 'Environments',
      render: (val) => val
        ? <span style={{ fontSize: '12px', fontWeight: 600 }}>{val.split(',').join(', ')}</span>
        : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All</span>
    },
    {
      key: 'active',
      label: 'Status',
      render: (val) => (
        <span className={`status ${val ? 'passed' : 'failed'}`}>
          {val ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, mod) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="action-btn edit-btn"
            onClick={() => setEditModule(mod)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            className="action-btn"
            onClick={() => handleToggle(mod)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: mod.active ? '#fef3c7' : '#d1fae5',
              color: mod.active ? '#92400e' : '#065f46',
              border: `1px solid ${mod.active ? '#f59e0b' : '#10b981'}`,
              borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            {mod.active ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
            {mod.active ? 'Disable' : 'Enable'}
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => setDeleteTarget(mod)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )
    }
  ], []);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Module Management">
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
          <strong>How this works:</strong> Add a module here with its Suite XML filename (e.g. <code>land.xml</code>) and Report Path (e.g. <code>reports/MasterReport2.html</code>). Active modules appear in the Execution Center for test runs.
        </div>

        <div className="um-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="primary-action" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Module
          </button>
          <span className="um-count">{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
        </div>

        <DataTable
          columns={columns}
          data={modules}
          loading={loading}
          searchPlaceholder="Filter modules..."
          exportFilename="modules_list.csv"
        />
      </Panel>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add Module" onClose={() => setShowCreate(false)} closeOnBackdrop={false}>
          <ModuleForm
            setNotice={setNotice}
            onSaved={() => { setShowCreate(false); fetchModules(); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editModule && (
        <Modal title={`Edit Module: ${editModule.name}`} onClose={() => setEditModule(null)} closeOnBackdrop={false}>
          <ModuleForm
            mod={editModule}
            setNotice={setNotice}
            onSaved={() => { setEditModule(null); fetchModules(); }}
            onCancel={() => setEditModule(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog onClose={() => setDeleteTarget(null)}>
          <div className="confirm-icon" style={{ color: '#dc2626' }}><Trash2 size={30} /></div>
          <h3>Delete Module?</h3>
          <p>Are you sure you want to delete module <strong>{deleteTarget.name}</strong> (<code>{deleteTarget.code}</code>)?</p>
          <p className="confirm-warning">This module will no longer appear in the Execution Center. Past execution records are kept intact.</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={handleDelete}>Delete</button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

function ModuleForm({ mod, setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name:        mod?.name        || '',
    code:        mod?.code        || '',
    description: mod?.description || '',
    xmlFile:     mod?.xmlFile     || '',
    reportPath:  mod?.reportPath  || '',
    runnerType:  mod?.runnerType  || 'MAVEN_TESTNG',
    envCodes:    mod?.envCodes    || '',
    active:      mod ? mod.active : true
  });
  const [errors, setErrors] = useState({});

  // Environment availability — checkboxes fed from the Environments section.
  // Nothing checked = module available in every environment.
  const [environments, setEnvironments] = useState([]);
  useEffect(() => {
    api.environments().then((envs) => setEnvironments(envs || [])).catch(() => setEnvironments([]));
  }, []);

  const selectedEnvCodes = form.envCodes
    ? form.envCodes.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const toggleEnvCode = (code) => {
    const next = selectedEnvCodes.includes(code)
      ? selectedEnvCodes.filter((c) => c !== code)
      : [...selectedEnvCodes, code];
    update('envCodes', next.join(','));
  };

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())    errs.name    = 'Name is required';
    if (!form.code.trim())    errs.code    = 'Code is required (e.g. LAND, EMP_ARCH)';
    if (!form.xmlFile.trim()) errs.xmlFile = 'Suite XML filename is required (e.g. land.xml)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      if (mod) {
        await api.adminUpdateModule(mod.id, form);
        setNotice('Module updated successfully.');
      } else {
        await api.adminCreateModule(form);
        setNotice('Module created successfully.');
      }
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <Field label="Module Name" required value={form.name} onChange={(v) => update('name', v)} error={errors.name} placeholder="e.g. Land Management" />
      <Field label="Module Code" required value={form.code} onChange={(v) => update('code', v.toUpperCase().replace(/\s+/g, '_'))} error={errors.code} disabled={!!mod} placeholder="e.g. LAND" />
      <Field label="Description" value={form.description} onChange={(v) => update('description', v)} placeholder="Optional description" />
      <Field label="Suite XML File" required value={form.xmlFile} onChange={(v) => update('xmlFile', v)} error={errors.xmlFile} placeholder="e.g. land.xml" />
      <Field label="Report Path" value={form.reportPath} onChange={(v) => update('reportPath', v)} placeholder="e.g. reports/MasterReport2.html" />

      <div className="form-field">
        <label className="form-row">
          <span>Runner Type</span>
          <div className="field-input-wrap">
            <select
              value={form.runnerType}
              onChange={(e) => update('runnerType', e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '6px', padding: '0 10px', background: '#fff' }}
            >
              <option value="MAVEN_TESTNG">Maven + TestNG (MPHIDB framework)</option>
            </select>
          </div>
        </label>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>More runner types can be added here as new frameworks are integrated.</span>
      </div>

      <div className="form-field">
        <label className="form-row">
          <span>Available Environments</span>
        </label>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '6px 0 2px' }}>
          {environments.map((env) => (
            <label key={env.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedEnvCodes.includes(env.code)}
                onChange={() => toggleEnvCode(env.code)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              {env.name} ({env.code})
            </label>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Leave all unchecked to make this module available in every environment.
        </span>
      </div>

      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
        <input
          type="checkbox"
          id="mod-active-chk"
          checked={form.active}
          onChange={(e) => update('active', e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="mod-active-chk" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#555' }}>
          Active (Show in Execution Center)
        </label>
      </div>

      <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="submit">Save Module</button>
      </div>
    </form>
  );
}
