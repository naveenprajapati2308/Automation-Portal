import { useEffect, useState } from 'react';
import { Plus, Edit2, Copy, Trash2, Upload } from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/Button.jsx';
import { KeyValueEditor } from '../components/KeyValueEditor.jsx';
import { AuthEditor } from '../components/AuthEditor.jsx';
import { INPUT_CLASS } from '../lib/statusColors.js';

const DEFAULT_FORM = {
  name: '', description: '', authType: 'NONE', authValue: '', authKeyName: '', authKeyIn: 'HEADER',
  headers: [], queryParams: [], bodyTemplate: '', variables: [],
};

export default function VirtualUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null); // null = list, 'new' = creating, object = editing
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/virtual-users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      ...DEFAULT_FORM,
      ...user,
      authValue: '',
      headers: user.headers || [],
      queryParams: user.queryParams || [],
      variables: user.variables || [],
    });
  };

  const handleCreateNew = () => {
    setEditingUser('new');
    setFormData({ ...DEFAULT_FORM });
  };

  const handleClone = async (id) => {
    try {
      await api.post(`/virtual-users/${id}/clone`);
      fetchUsers();
    } catch (err) {
      alert('Failed to clone user: ' + err.message);
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const form = new FormData();
    form.append('file', file);

    try {
      setLoading(true);
      await api.post('/virtual-users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchUsers();
    } catch (err) {
      alert('Failed to import CSV: ' + err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this virtual user?')) return;
    try {
      await api.delete(`/virtual-users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    const payload = {
      ...formData,
      headers: formData.headers.filter((h) => h.key.trim() !== ''),
      queryParams: formData.queryParams.filter((p) => p.key.trim() !== ''),
      variables: formData.variables.filter((v) => v.key.trim() !== ''),
    };
    try {
      if (editingUser === 'new') await api.post('/virtual-users', payload);
      else await api.put(`/virtual-users/${editingUser.id}`, payload);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Failed to save virtual user: ' + err.message);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading virtual users…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  if (editingUser !== null) {
    return (
      <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 max-w-3xl flex flex-col gap-6">
        <h2 className="text-lg font-bold">{editingUser === 'new' ? 'Create Virtual User' : `Edit: ${editingUser.name}`}</h2>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Profile Name</label>
          <input className={INPUT_CLASS} placeholder="e.g. Premium Admin User" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
          <textarea className={INPUT_CLASS} rows={2} placeholder="Summary of what this profile represents" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Authentication</h3>
          <AuthEditor
            authType={formData.authType}
            authValue={formData.authValue}
            authKeyName={formData.authKeyName}
            authKeyIn={formData.authKeyIn}
            onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Custom HTTP Headers</h3>
          <KeyValueEditor items={formData.headers} onChange={(headers) => setFormData((p) => ({ ...p, headers }))} keyPlaceholder="X-Tenant-Id" />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Custom Query Parameters</h3>
          <KeyValueEditor items={formData.queryParams} onChange={(queryParams) => setFormData((p) => ({ ...p, queryParams }))} keyPlaceholder="page" />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Body Template Variables</h3>
          <KeyValueEditor items={formData.variables} onChange={(variables) => setFormData((p) => ({ ...p, variables }))} keyPlaceholder="userId" maskable />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Request Body Payload Template</label>
          <textarea className={`${INPUT_CLASS} font-mono text-xs`} rows={5} placeholder='{ "username": "{{username}}" }' value={formData.bodyTemplate} onChange={(e) => setFormData((p) => ({ ...p, bodyTemplate: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button type="submit">Save Profile</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[var(--text-muted)]">Create reusable simulated client profiles to assign to Load Tests.</p>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            <strong>CSV columns:</strong> <code className="font-mono">name, description, authType, authValue, authKeyName, authKeyIn, headers, queryParams, bodyTemplate, variables</code>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <label className="inline-flex items-center gap-2 cursor-pointer border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-md px-4 py-2.5 text-sm font-semibold">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </label>
          <Button onClick={handleCreateNew}><Plus size={16} /> New Virtual User</Button>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-surface-2)] text-left text-xs text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">User Profile</th>
              <th className="px-4 py-2.5 font-semibold">Description</th>
              <th className="px-4 py-2.5 font-semibold">Auth</th>
              <th className="px-4 py-2.5 font-semibold">Metadata</th>
              <th className="px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.length > 0 ? users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-semibold">{user.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{user.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.authType !== 'NONE' ? 'bg-[var(--accent-bg-soft)] text-[var(--accent-text)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                    {user.authType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs">
                    <span className="bg-[var(--bg-hover)] text-[var(--text-muted)] rounded-full px-2 py-0.5">{user.headers?.length || 0} Headers</span>
                    <span className="bg-[var(--bg-hover)] text-[var(--text-muted)] rounded-full px-2 py-0.5">{user.variables?.length || 0} Variables</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(user)} className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleClone(user.id)} className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]" title="Clone"><Copy size={14} /></button>
                    <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No virtual user profiles yet. Click "New Virtual User" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
