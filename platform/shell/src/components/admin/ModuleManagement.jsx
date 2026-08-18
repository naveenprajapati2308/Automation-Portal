import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable, Modal, ConfirmDialog, buildHierarchyRows } from '../shared/index.jsx';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Globe2, ChevronRight, ChevronDown } from 'lucide-react';
import { Field } from '../shared/Field.jsx';
import { ModuleEnvironmentMappingPanel } from './ModuleEnvironmentMappingPanel.jsx';


const ALL_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'PROJECT_ADMIN', 'QA_LEAD', 'TECH_LEAD', 'AUTOMATION_ENGINEER', 'VIEWER'
];

export function ModuleManagement({ setNotice }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editModule, setEditModule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [envTarget, setEnvTarget] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const [frameworks, setFrameworks] = useState([]);
  useEffect(() => {
    api.frameworks().then((list) => setFrameworks(list || [])).catch(() => setFrameworks([]));
  }, []);
  const frameworkLabel = (code) => frameworks.find((fw) => fw.code === code)?.displayName || code || 'Unknown';


  const [testEngines, setTestEngines] = useState([]);
  useEffect(() => {
    api.adminListTestEngines().then((list) => setTestEngines(list || [])).catch(() => setTestEngines([]));
  }, []);

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

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: row.__isChild ? 26 : 0 }}>
          {row.__hasChildren ? (
            <button
              onClick={() => toggleExpand(row.id)}
              title={expandedIds.has(row.id) ? 'Collapse' : 'Expand'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '6px', flexShrink: 0, cursor: 'pointer',
                border: `1px solid ${expandedIds.has(row.id) ? '#176b87' : 'var(--border)'}`,
                background: expandedIds.has(row.id) ? '#176b87' : 'transparent',
                color: expandedIds.has(row.id) ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {expandedIds.has(row.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : row.__isChild ? (
            <span style={{ width: 22, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>↳</span>
          ) : (
            <span style={{ width: 22, flexShrink: 0 }} />
          )}
          <strong>{val}</strong>
        </div>
      )
    },
    {
      key: 'code',
      label: 'Code',
      render: (val) => <span className="status">{val}</span>
    },
    {
      key: 'xmlFile',
      label: 'Suite File',
      defaultVisible: false,
      render: (val) => val ? <code style={{ fontSize: '12px', background: 'var(--bg-inset)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{val}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: 'reportPath',
      label: 'Report Path',
      defaultVisible: false,
      render: (val) => val ? <code style={{ fontSize: '12px', background: 'var(--bg-inset)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{val}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: 'runnerType',
      label: 'Framework',
      render: (val) => <span className="status">{frameworkLabel(val)}</span>
    },
    {
      key: 'visible',
      label: 'Status',
      render: (_, mod) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className={`status ${mod.active ? 'passed' : 'failed'}`}>
            {mod.active ? 'ACTIVE' : 'INACTIVE'}
          </span>
          {mod.active && mod.visible === false && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hidden from pickers</span>
          )}
        </div>
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
            onClick={() => setEnvTarget(mod)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Globe2 size={12} /> Environments
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
  ], [modules, expandedIds, frameworks]);

  // Only top-level (parent) modules are shown by default; a parent's own sub-type variants
  // (e.g. Architect Empanelment's org types) render as child rows once its arrow is expanded —
  // see hierarchyRows.js for the reusable tree-building logic behind this.
  const visibleRows = useMemo(() => buildHierarchyRows(modules, {
    getParentId: (m) => m.parentModuleId || null,
    expandedIds
  }), [modules, expandedIds]);

  const topLevelCount = useMemo(() => modules.filter(m => !m.parentModuleId).length, [modules]);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Module Management">
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
          <strong>How this works:</strong> Register an execution suite here — its framework (Selenium, Playwright, or a future one), its suite/spec file, and where its report lands. Active modules appear in the Execution Center for test runs. A module can optionally sit under a parent as a sub-type variant (e.g. one org type of a larger workflow) — expand a parent row's arrow to see its variants.
        </div>

        <div className="um-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="primary-action" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Module
          </button>
          <span className="um-count">{topLevelCount} module group{topLevelCount !== 1 ? 's' : ''} · {modules.length} total</span>
        </div>

        <DataTable
          columns={columns}
          data={visibleRows}
          loading={loading}
          searchPlaceholder="Filter modules..."
          exportFilename="modules_list.csv"
        />
      </Panel>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add Module" onClose={() => setShowCreate(false)} closeOnBackdrop={false}>
          <ModuleForm
            allModules={modules}
            frameworks={frameworks}
            testEngines={testEngines}
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
            allModules={modules}
            frameworks={frameworks}
            testEngines={testEngines}
            setNotice={setNotice}
            onSaved={() => { setEditModule(null); fetchModules(); }}
            onCancel={() => setEditModule(null)}
          />
        </Modal>
      )}

      {/* Manage Environments (assign supported environments + per-environment overrides) */}
      {envTarget && (
        <Modal title={`Environments for: ${envTarget.name}`} onClose={() => setEnvTarget(null)} closeOnBackdrop={false}>
          <ModuleEnvironmentMappingPanel mod={envTarget} setNotice={setNotice} />
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

function ModuleForm({ mod, allModules = [], frameworks = [], testEngines = [], setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: mod?.name || '',
    code: mod?.code || '',
    description: mod?.description || '',
    xmlFile: mod?.xmlFile || '',
    reportPath: mod?.reportPath || '',
    runnerType: mod?.runnerType || 'MAVEN_TESTNG',
    visible: mod ? mod.visible !== false : true,
    allowedRoles: mod?.allowedRoles || '',
    active: mod ? mod.active : true,
    parentModuleId: mod?.parentModuleId || '',
    testEngineId: mod?.testEngineId || ''
  });

  // MAVEN_TESTNG modules dispatch through a SELENIUM engine, PLAYWRIGHT modules through a
  // PLAYWRIGHT engine — only offer engines of the matching type.
  const matchingEngines = testEngines.filter((e) =>
    form.runnerType === 'PLAYWRIGHT' ? e.engineType === 'PLAYWRIGHT' : e.engineType === 'SELENIUM'
  );
  const [errors, setErrors] = useState({});

  // A module can only be a sub-type of a top-level workflow module (no 3-level nesting), and
  // only of one under the same framework — a Selenium sub-type belongs under a Selenium parent.
  const parentOptions = allModules.filter(m =>
    !m.parentModuleId && m.runnerType === form.runnerType && m.id !== mod?.id
  );

  const selectedRoles = form.allowedRoles
    ? form.allowedRoles.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  const toggleRole = (role) => {
    const next = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
    update('allowedRoles', next.join(','));
  };

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required (e.g. LAND, EMP_ARCH)';
    if (!form.xmlFile.trim()) errs.xmlFile = 'Suite/spec file is required (e.g. land.xml or land.spec.ts)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const payload = {
      ...form,
      parentModuleId: form.parentModuleId ? Number(form.parentModuleId) : null,
      testEngineId: form.testEngineId ? Number(form.testEngineId) : null
    };
    try {
      if (mod) {
        await api.adminUpdateModule(mod.id, payload);
        setNotice('Module updated successfully.');
      } else {
        await api.adminCreateModule(payload);
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

      <div className="form-field">
        <label className="form-row">
          <span>Framework</span>
          <div className="field-input-wrap">
            <select
              value={form.runnerType}
              onChange={(e) => setForm(prev => ({ ...prev, runnerType: e.target.value, testEngineId: '' }))}
              disabled={!!mod}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '6px', padding: '0 10px', background: '#fff' }}
            >
              {frameworks.length === 0 ? (
                <option value={form.runnerType}>Loading frameworks…</option>
              ) : (
                frameworks.map((fw) => <option key={fw.code} value={fw.code}>{fw.displayName}</option>)
              )}
            </select>
          </div>
        </label>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Every module belongs to exactly one framework — options come from the backend's Framework
          registry, so a newly registered framework appears here automatically.
          {mod ? ' Locked on edit: the same code can exist once per framework.' : ''}
        </span>
      </div>

      <Field label="Suite / Spec File" required value={form.xmlFile} onChange={(v) => update('xmlFile', v)} error={errors.xmlFile} placeholder="e.g. land.xml (TestNG suite) or land.spec.ts (Playwright spec)" />
      <Field label="Report Path" value={form.reportPath} onChange={(v) => update('reportPath', v)} placeholder="e.g. reports/MasterReport2.html" />

      <div className="form-field">
        <label className="form-row">
          <span>Parent Module (optional)</span>
          <div className="field-input-wrap">
            <select
              value={form.parentModuleId}
              onChange={(e) => update('parentModuleId', e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '6px', padding: '0 10px', background: '#fff' }}
            >
              <option value="">None — this is its own top-level module</option>
              {parentOptions.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
        </label>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Set this when the module is a sub-type variant of a bigger workflow (e.g. one org type
          of Architect Empanelment) — it shows under its parent as a collapsible child row here,
          and as a second picker in the Execution Center, instead of its own top-level entry.
        </span>
      </div>

      <div className="form-field">
        <label className="form-row">
          <span>Test Engine (optional)</span>
          <div className="field-input-wrap">
            <select
              value={form.testEngineId}
              onChange={(e) => update('testEngineId', e.target.value)}
              style={{ width: '100%', height: '38px', border: '1px solid #cfdae6', borderRadius: '6px', padding: '0 10px', background: '#fff' }}
            >
              <option value="">None — use the legacy shared platform connection</option>
              {matchingEngines.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.businessId})</option>)}
            </select>
          </div>
        </label>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          If a Project Admin has registered a Test Engine (Workspace Settings → Framework Connection) for this
          framework, link it here so this module's runs authenticate with that engine's own credential instead
          of the platform-wide shared key. Leave unset to keep today's legacy behavior.
        </span>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
        Supported environments (and their per-environment overrides) are managed separately via the
        "Environments" action on this module's row — a module has none by default until assigned there.
      </p>

      <div className="form-field">
        <label className="form-row"><span>Allowed Roles (Execution Permission)</span></label>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '6px 0 2px' }}>
          {ALL_ROLES.map((role) => (
            <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => toggleRole(role)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              {role}
            </label>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Leave all unchecked to allow any signed-in user to execute this module.
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
          Active (fully enabled)
        </label>
      </div>

      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
        <input
          type="checkbox"
          id="mod-visible-chk"
          checked={form.visible}
          onChange={(e) => update('visible', e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="mod-visible-chk" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#555' }}>
          Visible (show in Execution Center / Dashboard pickers)
        </label>
      </div>

      <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="submit">Save Module</button>
      </div>
    </form>
  );
}
