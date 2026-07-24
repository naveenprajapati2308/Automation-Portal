import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable, Modal } from '../shared/index.jsx';
import { Sliders, Save, Edit2 } from 'lucide-react';
import { Field } from '../shared/Field.jsx';

export function PortalConfig({ setNotice }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editConfig, setEditConfig] = useState(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await api.configurations();
      setConfigs(data || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const columns = useMemo(() => [
    {
      key: 'configKey',
      label: 'Configuration Key',
      render: (val) => <code>{val}</code>
    },
    {
      key: 'configValue',
      label: 'Value',
      render: (val) => <strong style={{ color: '#0f63ce' }}>{val}</strong>
    },
    {
      key: 'description',
      label: 'Description'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, config) => (
        <button 
          className="action-btn edit-btn" 
          onClick={() => setEditConfig(config)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Edit2 size={12} /> Edit Value
        </button>
      )
    }
  ], []);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="System Configurations">
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          These configuration properties control core behavior of the Automation Execution Engine, the database callbacks, and security properties. Change with caution.
        </p>

        <DataTable 
          columns={columns} 
          data={configs} 
          loading={loading}
          searchPlaceholder="Search config keys..."
          exportFilename="system_configs.csv"
        />
      </Panel>

      {/* Edit Modal */}
      {editConfig && (
        <Modal title="Edit Configuration Value" onClose={() => setEditConfig(null)} closeOnBackdrop={false}>
          <ConfigForm
            config={editConfig}
            setNotice={setNotice}
            onSaved={() => { setEditConfig(null); fetchConfigs(); }}
            onCancel={() => setEditConfig(null)}
          />
        </Modal>
      )}
    </section>
  );
}

function ConfigForm({ config, setNotice, onSaved, onCancel }) {
  const [configValue, setConfigValue] = useState(config.configValue);
  const [description, setDescription] = useState(config.description || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!configValue.trim()) {
      setError('Value cannot be empty');
      return;
    }

    try {
      await api.updateConfiguration(config.configKey, {
        configValue,
        description
      });
      setNotice('Configuration updated successfully.');
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Configuration Key</label>
        <code style={{ fontSize: '14px', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px', display: 'block', border: '1px solid #e2e8f0' }}>{config.configKey}</code>
      </div>

      <Field 
        label="Configuration Value" 
        required 
        value={configValue} 
        onChange={(v) => { setConfigValue(v); setError(''); }} 
        error={error} 
      />

      <div className="form-field" style={{ marginBottom: '14px' }}>
        <label className="form-row">
          <span>Description</span>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', height: '80px', borderRadius: '8px', border: '1px solid #cfdae6', padding: '8px 10px', fontSize: '13px', outline: 0 }}
          />
        </label>
      </div>

      <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Save size={14} /> Save Value
        </button>
      </div>
    </form>
  );
}
