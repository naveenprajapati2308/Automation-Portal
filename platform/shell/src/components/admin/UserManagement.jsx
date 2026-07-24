import { KeyRound, Search, Trash2, UserCheck, UserMinus, UserPen, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { ROLES } from '../../constants.js';
import { Field } from '../shared/Field.jsx';
import { Panel, DataTable, Modal, ConfirmDialog } from '../shared/index.jsx';

// ── Validation helpers ────────────────────────────────────────────────────────
const MOBILE_REGEX = /^[0-9]{10,15}$/;

function validate(form) {
  const errors = {};
  if (!form.username?.trim()) errors.username = 'Username is required';
  if (!form.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address';
  if (!form.password?.trim()) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!form.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!form.mobileNumber?.trim()) errors.mobileNumber = 'Mobile number is required';
  else if (!MOBILE_REGEX.test(form.mobileNumber.trim()))
    errors.mobileNumber = 'Enter a valid mobile number (10–15 digits)';
  if (!form.designation?.trim()) errors.designation = 'Designation is required';
  if (!form.role) errors.role = 'Role is required';
  return errors;
}

function validateEdit(form) {
  const errors = {};
  if (!form.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!form.mobileNumber?.trim()) errors.mobileNumber = 'Mobile number is required';
  else if (!MOBILE_REGEX.test(form.mobileNumber.trim()))
    errors.mobileNumber = 'Enter a valid mobile number (10–15 digits)';
  if (!form.designation?.trim()) errors.designation = 'Designation is required';
  return errors;
}

// ── User Management Page ───────────────────────────────────────────────────────
export function UserManagement({ setNotice }) {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const loadUsers = () => api.adminListUsers().then(setUsers).catch((e) => setNotice(e.message));
  useEffect(() => { loadUsers(); }, []);

  const disable = async (id) => {
    try { await api.adminDisableUser(id); setNotice('User disabled.'); await loadUsers(); }
    catch (e) { setNotice(e.message); }
  };

  const enable = async (id) => {
    try { await api.adminEnableUser(id); setNotice('User enabled.'); await loadUsers(); }
    catch (e) { setNotice(e.message); }
  };

  const changeRole = async (id, role) => {
    try { await api.adminAssignRole(id, role); setNotice('Role updated.'); await loadUsers(); }
    catch (e) { setNotice(e.message); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminDeleteUser(deleteTarget.id);
      setNotice(`User "${deleteTarget.username}" deleted.`);
      setDeleteTarget(null);
      await loadUsers();
    } catch (e) {
      setNotice(e.message);
      setDeleteTarget(null);
    }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchRole = !filterRole || u.role === filterRole;
      const matchStatus = !filterStatus || u.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const usersWithIndices = useMemo(() => {
    return filtered.map((u, idx) => ({ ...u, index: idx + 1 }));
  }, [filtered]);

  const columns = useMemo(() => [
    {
      key: 'index',
      label: '#',
      render: (val) => <span style={{ color: 'var(--text-muted)' }}>{val}</span>
    },
    {
      key: 'username',
      label: 'Username',
      render: (val) => <strong>{val}</strong>
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => val || '-'
    },
    {
      key: 'mobileNumber',
      label: 'Mobile',
      render: (val) => val || '—'
    },
    {
      key: 'role',
      label: 'Role',
      render: (val, u) => (
        <select
          value={val}
          onChange={(e) => changeRole(u.id, e.target.value)}
          disabled={val === 'SUPER_ADMIN'}
          className="role-select"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <span className={`status ${val?.toLowerCase()}`}>{val}</span>
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (val) => val ? new Date(val).toLocaleDateString() : '—'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, u) => (
        <div className="um-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="action-btn edit-btn" onClick={() => setEditUser(u)} title="Edit user">
            <UserPen size={13} /> Edit
          </button>
          {u.status === 'ACTIVE'
            ? <button className="action-btn disable-btn" onClick={() => disable(u.id)} disabled={u.role === 'SUPER_ADMIN'} title="Disable user">
              <UserMinus size={13} /> Disable
            </button>
            : <button className="action-btn enable-btn" onClick={() => enable(u.id)} title="Enable user">
              <UserCheck size={13} /> Enable
            </button>}
          <button className="action-btn reset-btn" onClick={() => setResetTarget(u)} title="Reset password">
            <KeyRound size={13} /> Reset Pwd
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => setDeleteTarget(u)}
            disabled={u.role === 'SUPER_ADMIN'}
            title={u.role === 'SUPER_ADMIN' ? 'Cannot delete Super Admin' : 'Delete user'}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )
    }
  ], [users]);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="User Management">
        {/* Toolbar */}
        <div className="um-toolbar">
          <button className="primary-action um-create-btn" onClick={() => setShowCreate(true)}>
            <Users size={15} /> Create User
          </button>
          <span className="um-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Filters */}
        <div className="um-filters">
          <div className="um-search-box">
            <Search size={15} />
            <input
              placeholder="Search by username or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="um-filter-select">
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="um-filter-select">
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
          {(search || filterRole || filterStatus) && (
            <button className="um-clear-btn" onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}>
              Clear
            </button>
          )}
        </div>

        <DataTable 
          columns={columns} 
          data={usersWithIndices} 
          searchPlaceholder="Filter users..."
          exportFilename="users_list.csv"
        />
      </Panel>

      {/* ── Modals ── */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)} closeOnBackdrop={false}>
          <CreateUserForm
            setNotice={setNotice}
            onCreated={() => { setShowCreate(false); loadUsers(); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editUser && (
        <Modal title={`Edit User — ${editUser.username}`} onClose={() => setEditUser(null)} closeOnBackdrop={false}>
          <EditUserForm
            user={editUser}
            setNotice={setNotice}
            onSaved={() => { setEditUser(null); loadUsers(); }}
            onCancel={() => setEditUser(null)}
          />
        </Modal>
      )}

      {resetTarget && (
        <Modal title={`Reset Password — ${resetTarget.username}`} onClose={() => setResetTarget(null)} closeOnBackdrop={false}>
          <ResetPasswordForm
            userId={resetTarget.id}
            setNotice={setNotice}
            onDone={() => setResetTarget(null)}
            onCancel={() => setResetTarget(null)}
          />
        </Modal>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog onClose={() => setDeleteTarget(null)}>
          <div className="confirm-icon"><Trash2 size={30} /></div>
          <h3>Delete User?</h3>
          <p>Are you sure you want to delete <strong>{deleteTarget.username}</strong>?</p>
          <p className="confirm-warning">This action can't be reverted.</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={confirmDelete}>Delete</button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

// ── Create User Form ──────────────────────────────────────────────────────────
function CreateUserForm({ setNotice, onCreated, onCancel }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', fullName: '',
    mobileNumber: '', designation: '', organization: '', role: 'VIEWER'
  });
  const [errors, setErrors] = useState({});
  const update = (f, v) => {
    setForm((c) => ({ ...c, [f]: v }));
    // Clear error on change
    if (errors[f]) setErrors((e) => { const n = { ...e }; delete n[f]; return n; });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await api.adminCreateUser(form);
      setNotice('User created successfully.');
      onCreated();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form" noValidate>
      <Field label="Username" required value={form.username} onChange={(v) => update('username', v)} error={errors.username} />
      <Field label="Email" required type="email" value={form.email} onChange={(v) => update('email', v)} error={errors.email} />
      <Field label="Password" required type="password" value={form.password} onChange={(v) => update('password', v)} error={errors.password} />
      <Field label="Mobile Number" required value={form.mobileNumber} onChange={(v) => update('mobileNumber', v.replace(/\D/g, '').slice(0, 15))} error={errors.mobileNumber} inputMode="numeric" />
      <Field label="Full Name" required value={form.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName} />
      <Field label="Designation" required value={form.designation} onChange={(v) => update('designation', v)} error={errors.designation} />
      <Field label="Organization" value={form.organization} onChange={(v) => update('organization', v)} />
      <div className={`form-field${errors.role ? ' has-error' : ''}`}>
        <label className="form-row">
          <span>Role<span className="required-mark" aria-hidden="true">*</span></span>
          <select value={form.role} onChange={(e) => update('role', e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {errors.role && <span className="field-error">{errors.role}</span>}
      </div>
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit">
          <Users size={15} /> Create User
        </button>
      </div>
    </form>
  );
}

// ── Edit User Form ────────────────────────────────────────────────────────────
function EditUserForm({ user, setNotice, onSaved, onCancel }) {
  const [form, setForm] = useState({
    fullName: user.displayName ?? '',
    mobileNumber: user.mobileNumber ?? '',
    designation: user.designation ?? '',
    organization: user.organization ?? ''
  });
  const [errors, setErrors] = useState({});
  const update = (f, v) => {
    setForm((c) => ({ ...c, [f]: v }));
    if (errors[f]) setErrors((e) => { const n = { ...e }; delete n[f]; return n; });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateEdit(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await api.adminUpdateUser(user.id, form);
      setNotice('User updated.');
      onSaved();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <Field label="Full Name" required value={form.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName} />
      <Field label="Mobile Number" required value={form.mobileNumber} onChange={(v) => update('mobileNumber', v.replace(/\D/g, '').slice(0, 15))} error={errors.mobileNumber} inputMode="numeric" />
      <Field label="Designation" required value={form.designation} onChange={(v) => update('designation', v)} error={errors.designation} />
      <Field label="Organization" value={form.organization} onChange={(v) => update('organization', v)} />
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit">Save Changes</button>
      </div>
    </form>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────────
function ResetPasswordForm({ userId, setNotice, onDone, onCancel }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newPassword || newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await api.adminResetPassword(userId, { newPassword });
      setNotice('Password reset successfully.');
      onDone();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <Field label="New Password" required type="password" value={newPassword} onChange={setNewPassword} error={errors.newPassword} />
      <Field label="Confirm Password" required type="password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} />
      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit">
          <KeyRound size={15} /> Reset Password
        </button>
      </div>
    </form>
  );
}

// ── Field with inline error ───────────────────────────────────────────────────
