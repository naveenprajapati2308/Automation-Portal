import { Building2, ClipboardList, Settings, UserCog, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Metric, Panel } from '../shared/index.jsx';
import { ROLES } from '../../constants.js';

// ── Admin Dashboard Overview — Super Admin's Platform Dashboard (docs/version2.2.md's "Global
// Dashboard" / "Platform Analytics"): platform-wide counts only, never a specific workspace's
// operational data (executions/reports/etc. stay out of Super Admin's reach entirely). ─────────
export function AdminDashboardOverview({ setNotice, setActive }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    api.adminListUsers().then(setUsers).catch((err) => setNotice(err.message));
    api.adminListProjects().then(setProjects).catch((err) => setNotice(err.message));
    api.adminListWorkspaceRequests('PENDING').then(setPendingRequests).catch((err) => setNotice(err.message));
  }, []);

  const activeCount   = users.filter((u) => u.status === 'ACTIVE').length;
  const disabledCount = users.filter((u) => u.status === 'DISABLED').length;

  return (
    <section className="page-grid">
      <Metric label="Workspaces"       value={projects.length} />
      <Metric label="Pending Requests" value={pendingRequests.length} />
      <Metric label="Total Users"      value={users.length} />
      <Metric label="Active Users"     value={activeCount} />
      <Metric label="Disabled Users"   value={disabledCount} />
      <Metric label="Roles Available"  value={ROLES.length} />
      <Panel title="Quick Access">
        <div className="admin-quick-actions">
          <button className="primary-action" onClick={() => setActive('workspace-requests')}>
            <ClipboardList size={16} /> Workspace Requests
          </button>
          <button className="secondary-action" onClick={() => setActive('project-management')}>
            <Building2 size={16} /> Manage Workspaces
          </button>
          <button className="secondary-action" onClick={() => setActive('user-management')}>
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
