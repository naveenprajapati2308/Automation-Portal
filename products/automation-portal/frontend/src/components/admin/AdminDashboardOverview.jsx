import { Settings, UserCog, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Metric, Panel } from '../shared/index.jsx';

// ── Admin Dashboard Overview ──────────────────────────────────────────────────
export function AdminDashboardOverview({ setNotice, setActive }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.adminListUsers()
      .then(setUsers)
      .catch((err) => setNotice(err.message));
  }, []);

  const activeCount   = users.filter((u) => u.status === 'ACTIVE').length;
  const disabledCount = users.filter((u) => u.status === 'DISABLED').length;

  return (
    <section className="page-grid">
      <Metric label="Total Users"     value={users.length} />
      <Metric label="Active Users"    value={activeCount} />
      <Metric label="Disabled Users"  value={disabledCount} />
      <Metric label="Roles Available" value="5" />
      <Panel title="Quick Access">
        <div className="admin-quick-actions">
          <button className="primary-action" onClick={() => setActive('user-management')}>
            <Users size={16} /> Manage Users
          </button>
          <button className="secondary-action" onClick={() => setActive('role-management')}>
            <UserCog size={16} /> Manage Roles
          </button>
          <button className="secondary-action" onClick={() => setActive('access-management')}>
            <Settings size={16} /> Access Settings
          </button>
        </div>
      </Panel>
      <Panel title="Recent Users">
        <table>
          <thead>
            <tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {users.slice(0, 5).map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td><span className={`status ${u.status?.toLowerCase()}`}>{u.status}</span></td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
