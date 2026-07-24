import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { ROLES } from '../../constants.js';
import { Panel } from '../shared/index.jsx';

// ── Role Management — role-centric view over the same users/role data
// User Management already edits per-user (api.adminAssignRole); this page
// groups the same data by role so Super Admin can see who holds what. ──────
export function RoleManagement({ setNotice }) {
  const [users, setUsers] = useState([]);

  const load = () => api.adminListUsers().then(setUsers).catch((e) => setNotice(e.message));
  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    try {
      await api.adminAssignRole(id, role);
      setNotice('Role updated.');
      await load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Role Management">
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          {ROLES.length} roles defined &middot; {users.length} total user{users.length !== 1 ? 's' : ''}
        </p>
        <div className="role-mgmt-grid">
          {ROLES.map((role) => {
            const roleUsers = users.filter((u) => u.role === role);
            return (
              <div key={role} className="role-mgmt-card">
                <div className="role-mgmt-card-header">
                  <strong>{role}</strong>
                  <span className="role-mgmt-count">{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}</span>
                </div>
                {roleUsers.length === 0 ? (
                  <p className="role-mgmt-empty">No users with this role.</p>
                ) : (
                  <ul className="role-mgmt-user-list">
                    {roleUsers.map((u) => (
                      <li key={u.id}>
                        <span>{u.username}</span>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          disabled={u.role === 'SUPER_ADMIN'}
                          className="role-select"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}
