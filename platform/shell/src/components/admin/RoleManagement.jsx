import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Panel } from '../shared/index.jsx';

// ── Role Management — the platform's real role catalog (docs/version2.2.md "ROLE MANAGEMENT":
// only Super Admin defines Roles/Permission Sets; a Project Admin only assigns these predefined
// roles within their own workspace, never creates new ones). This used to reassign each user's
// legacy single platform-tier role (SUPER_ADMIN/ADMIN/QA_LEAD/...), which doesn't reflect how
// roles actually work post-multi-workspace: a user's real roles are per-project grants made in
// each workspace's own Team Management page. This page is the catalog those grants are drawn
// from — read-only for v1, since the catalog is fixed/seeded, not authored here. ───────────────
export function RoleManagement({ setNotice }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    api.adminListRoles().then(setRoles).catch((e) => setNotice(e.message));
  }, []);

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Role Management">
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          {roles.length} role{roles.length !== 1 ? 's' : ''} defined platform-wide. Every workspace's Project Admin assigns these to their own team from Team Management — roles are never created or granted from here.
        </p>
        <div className="role-mgmt-grid">
          {roles.map((role) => (
            <div key={role.code} className="role-mgmt-card">
              <div className="role-mgmt-card-header">
                <strong>{role.name}</strong>
                <span className="role-mgmt-count">{role.activeAssignments} active assignment{role.activeAssignments !== 1 ? 's' : ''}</span>
              </div>
              <p className="role-mgmt-empty" style={{ color: 'var(--text-secondary)' }}>{role.description || '—'}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
