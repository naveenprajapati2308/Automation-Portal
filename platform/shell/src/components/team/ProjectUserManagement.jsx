import { Crown, KeyRound, Trash2, UserCheck, UserMinus, UserPen, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, auth } from '../../api.js';
import { Field } from '../shared/Field.jsx';
import { Panel, DataTable, Modal, ConfirmDialog } from '../shared/index.jsx';

// ── Project Admin's own Team Management page — create/onboard, edit, activate/deactivate,
// assign roles, remove users within their current project. Never touches the platform Role
// catalog (only the project's own membership grants). ──────────────────────────────────────────
export function ProjectUserManagement({ setNotice }) {
  const project = auth.get()?.project;
  const [members, setMembers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [rolesTarget, setRolesTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);

  const currentUsername = auth.get()?.user?.username;

  const load = () => api.listProjectUsers(project.id).then(setMembers).catch((e) => setNotice(e.message));
  useEffect(() => {
    load();
    api.projectRoles().then(setRoleOptions).catch(() => {});
  }, []);

  const toggleStatus = async (member) => {
    try {
      await api.setProjectUserStatus(project.id, member.userId, member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE');
      setNotice(`${member.username} ${member.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await api.removeProjectUser(project.id, removeTarget.userId);
      setNotice(`${removeTarget.username} removed from ${project.name}.`);
      setRemoveTarget(null);
      await load();
    } catch (e) {
      setNotice(e.message);
      setRemoveTarget(null);
    }
  };

  const confirmTransfer = async () => {
    if (!transferTarget) return;
    try {
      await api.transferProjectOwnership(project.id, transferTarget.userId);
      setNotice(`${transferTarget.username} is now the Project Admin.`);
      setTransferTarget(null);
      await load();
    } catch (e) {
      setNotice(e.message);
      setTransferTarget(null);
    }
  };

  const columns = useMemo(() => [
    { key: 'username', label: 'Username', render: (v) => <strong>{v}</strong> },
    { key: 'email', label: 'Email' },
    { key: 'mobileNumber', label: 'Mobile', render: (v) => v || '—' },
    { key: 'roles', label: 'Roles', render: (v) => (v || []).join(', ') },
    { key: 'status', label: 'Status', render: (v) => <span className={`status ${v?.toLowerCase()}`}>{v}</span> },
    { key: 'joinedAt', label: 'Joined', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, m) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="action-btn edit-btn" onClick={() => setEditTarget(m)} title="Edit"><UserPen size={13} /> Edit</button>
          <button className="action-btn" onClick={() => setRolesTarget(m)} title="Assign roles"><KeyRound size={13} /> Roles</button>
          {m.status === 'ACTIVE' && !(m.roles || []).includes('PROJECT_ADMIN') && m.username !== currentUsername && (
            <button className="action-btn" onClick={() => setTransferTarget(m)} title="Transfer ownership"><Crown size={13} /> Make Admin</button>
          )}
          {m.status === 'ACTIVE'
            ? <button className="action-btn disable-btn" onClick={() => toggleStatus(m)} title="Deactivate"><UserMinus size={13} /> Deactivate</button>
            : <button className="action-btn enable-btn" onClick={() => toggleStatus(m)} title="Activate"><UserCheck size={13} /> Activate</button>}
          <button className="action-btn delete-btn" onClick={() => setRemoveTarget(m)} title="Remove from project"><Trash2 size={13} /> Remove</button>
        </div>
      )
    }
  ], [project]);

  if (!project) {
    return <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}><Panel title="Team Management"><p>No workspace context found.</p></Panel></section>;
  }

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title={`Team Management — ${project.name}`}>
        <div className="um-toolbar">
          <button className="primary-action um-create-btn" onClick={() => setShowCreate(true)}>
            <Users size={15} /> Add / Create User
          </button>
          <span className="um-count">{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable columns={columns} data={members} searchPlaceholder="Filter team members..." exportFilename="project_team.csv" />
      </Panel>

      {showCreate && (
        <Modal title="Add / Create User" onClose={() => setShowCreate(false)} closeOnBackdrop={false}>
          <CreateProjectUserForm
            projectId={project.id}
            roleOptions={roleOptions}
            setNotice={setNotice}
            onCreated={() => { setShowCreate(false); load(); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title={`Edit — ${editTarget.username}`} onClose={() => setEditTarget(null)} closeOnBackdrop={false}>
          <EditProjectUserForm
            projectId={project.id}
            member={editTarget}
            setNotice={setNotice}
            onSaved={() => { setEditTarget(null); load(); }}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}

      {rolesTarget && (
        <Modal title={`Assign Roles — ${rolesTarget.username}`} onClose={() => setRolesTarget(null)} closeOnBackdrop={false}>
          <AssignRolesForm
            projectId={project.id}
            member={rolesTarget}
            roleOptions={roleOptions}
            setNotice={setNotice}
            onSaved={() => { setRolesTarget(null); load(); }}
            onCancel={() => setRolesTarget(null)}
          />
        </Modal>
      )}

      {removeTarget && (
        <ConfirmDialog onClose={() => setRemoveTarget(null)}>
          <div className="confirm-icon"><Trash2 size={30} /></div>
          <h3>Remove from Project?</h3>
          <p>Remove <strong>{removeTarget.username}</strong> from <strong>{project.name}</strong>?</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setRemoveTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={confirmRemove}>Remove</button>
          </div>
        </ConfirmDialog>
      )}

      {transferTarget && (
        <ConfirmDialog onClose={() => setTransferTarget(null)}>
          <div className="confirm-icon"><Crown size={30} /></div>
          <h3>Transfer Ownership?</h3>
          <p>Make <strong>{transferTarget.username}</strong> the Project Admin of <strong>{project.name}</strong>? You will no longer be a Project Admin here.</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setTransferTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={confirmTransfer}>Transfer Ownership</button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

function RoleCheckboxes({ roleOptions, selected, onChange }) {
  return (
    <div className="form-field">
      <label className="form-row"><span>Roles<span className="required-mark" aria-hidden="true">*</span></span></label>
      <div className="ws-module-checks">
        {roleOptions.map((r) => (
          <label key={r.code} className="check-row">
            <input
              type="checkbox"
              checked={selected.includes(r.code)}
              onChange={() => onChange(selected.includes(r.code) ? selected.filter((c) => c !== r.code) : [...selected, r.code])}
            />
            {r.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function CreateProjectUserForm({ projectId, roleOptions, setNotice, onCreated, onCancel }) {
  const [form, setForm] = useState({ email: '', username: '', fullName: '', mobileNumber: '', roleCodes: [] });
  const [errors, setErrors] = useState({});
  const update = (f, v) => { setForm((c) => ({ ...c, [f]: v })); if (errors[f]) setErrors((e) => ({ ...e, [f]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    if (form.roleCodes.length === 0) errs.roleCodes = 'Select at least one role';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await api.createProjectUser(projectId, form);
      setNotice('User added to project — a welcome email was sent.');
      onCreated();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form" noValidate>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: -6 }}>
        If this email already has a Testrix account, they'll simply be added to this workspace — otherwise a new account is
        created with a temporary password, and the user is emailed either way.
      </p>
      <Field label="Email" required type="email" value={form.email} onChange={(v) => update('email', v)} error={errors.email} />
      <Field label="Username (new users only)" value={form.username} onChange={(v) => update('username', v)} />
      <Field label="Full Name (new users only)" value={form.fullName} onChange={(v) => update('fullName', v)} />
      <Field label="Mobile Number" value={form.mobileNumber} onChange={(v) => update('mobileNumber', v.replace(/\D/g, '').slice(0, 15))} />
      <RoleCheckboxes roleOptions={roleOptions} selected={form.roleCodes} onChange={(v) => update('roleCodes', v)} />
      {errors.roleCodes && <span className="field-error">{errors.roleCodes}</span>}
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit"><Users size={15} /> Add User</button>
      </div>
    </form>
  );
}

function EditProjectUserForm({ projectId, member, setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({ fullName: member.displayName ?? '', mobileNumber: member.mobileNumber ?? '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    try {
      await api.updateProjectUser(projectId, member.userId, form);
      setNotice('User updated.');
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <Field label="Full Name" required value={form.fullName} onChange={(v) => setForm((c) => ({ ...c, fullName: v }))} error={error} />
      <Field label="Mobile Number" value={form.mobileNumber} onChange={(v) => setForm((c) => ({ ...c, mobileNumber: v.replace(/\D/g, '').slice(0, 15) }))} />
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit">Save Changes</button>
      </div>
    </form>
  );
}

function AssignRolesForm({ projectId, member, roleOptions, setNotice, onSaved, onCancel }) {
  const [selected, setSelected] = useState(member.roles || []);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) { setError('Select at least one role'); return; }
    try {
      await api.assignProjectUserRoles(projectId, member.userId, selected);
      setNotice('Roles updated.');
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <RoleCheckboxes roleOptions={roleOptions} selected={selected} onChange={setSelected} />
      {error && <span className="field-error">{error}</span>}
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit">Save Roles</button>
      </div>
    </form>
  );
}
