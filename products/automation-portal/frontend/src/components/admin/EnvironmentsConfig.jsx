import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable } from '../shared/index.jsx';
import { Globe2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Field } from '../shared/Field.jsx';

export function EnvironmentsConfig({ setNotice }) {
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editEnv, setEditEnv] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEnvironments = async () => {
    setLoading(true);
    try {
      const data = await api.environments();
      setEnvironments(data || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteEnvironment(deleteTarget.id);
      setNotice(`Environment "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchEnvironments();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID'
    },
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
      key: 'baseUrl',
      label: 'Base URL',
      render: (val) => val ? <a href={val} target="_blank" rel="noreferrer" className="btn-link" style={{ color: '#176b87', textDecoration: 'underline' }}>{val}</a> : '—'
    },
    {
      key: 'active',
      label: 'Status',
      render: (val) => <span className={`status ${val ? 'passed' : 'failed'}`}>{val ? 'ACTIVE' : 'INACTIVE'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, env) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="action-btn edit-btn" 
            onClick={() => setEditEnv(env)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button 
            className="action-btn delete-btn" 
            onClick={() => setDeleteTarget(env)}
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
      <Panel title="Environment Management">
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

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Environment</h2>
              <button className="close-btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <EnvironmentForm 
                setNotice={setNotice} 
                onSaved={() => { setShowCreate(false); fetchEnvironments(); }} 
                onCancel={() => setShowCreate(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEnv && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Environment: {editEnv.name}</h2>
              <button className="close-btn" onClick={() => setEditEnv(null)}>✕</button>
            </div>
            <div className="modal-body">
              <EnvironmentForm 
                env={editEnv} 
                setNotice={setNotice} 
                onSaved={() => { setEditEnv(null); fetchEnvironments(); }} 
                onCancel={() => setEditEnv(null)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <div className="confirm-icon" style={{ color: '#dc2626' }}><Trash2 size={30} /></div>
            <h3>Delete Environment?</h3>
            <p>Are you sure you want to delete environment <strong>{deleteTarget.name}</strong>?</p>
            <p className="confirm-warning">All execution logs referring to this environment will remain, but you won't be able to run new sessions against it.</p>
            <div className="confirm-actions">
              <button className="secondary-action" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="danger-action" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EnvironmentForm({ env, setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: env?.name || '',
    code: env?.code || '',
    baseUrl: env?.baseUrl || '',
    active: env ? env.active : true
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    if (!form.baseUrl.trim()) errs.baseUrl = 'Base URL is required';
    else if (!/^https?:\/\/.+/.test(form.baseUrl)) errs.baseUrl = 'Must be a valid HTTP/HTTPS URL';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      if (env) {
        await api.updateEnvironment(env.id, form);
        setNotice('Environment updated successfully.');
      } else {
        await api.createEnvironment(form);
        setNotice('Environment created successfully.');
      }
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <Field label="Environment Name" required value={form.name} onChange={(v) => update('name', v)} error={errors.name} />
      <Field label="Environment Code" required value={form.code} onChange={(v) => update('code', v.toUpperCase())} error={errors.code} disabled={!!env} />
      <Field label="Base URL" required value={form.baseUrl} onChange={(v) => update('baseUrl', v)} error={errors.baseUrl} placeholder="http://example.com" />
      
      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
        <input 
          type="checkbox" 
          id="env-active-chk" 
          checked={form.active} 
          onChange={(e) => update('active', e.target.checked)} 
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="env-active-chk" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#555' }}>Active (Enable for Suite Executions)</label>
      </div>

      <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="submit">
          Save Environment
        </button>
      </div>
    </form>
  );
}
