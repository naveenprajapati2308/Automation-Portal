import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Play, ChevronRight } from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/Button.jsx';
import { TypeBadge } from '../components/StatusBadge.jsx';
import { INPUT_CLASS } from '../lib/statusColors.js';

const DEFAULT_FORM = { name: '', description: '', runStrategy: 'SEQUENTIAL', stopOnFailure: false, scheduleCron: '', isActive: true, memberIds: [] };

export default function TestGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [allTests, setAllTests] = useState([]);
  const [runningGroupId, setRunningGroupId] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [g, pt, lt] = await Promise.all([
        api.get('/test-groups'),
        api.get('/performance-tests'),
        api.get('/load-tests'),
      ]);
      setGroups(g);
      setAllTests([
        ...pt.map((t) => ({ ...t, testType: 'PERF' })),
        ...lt.map((t) => ({ ...t, testType: 'LOAD' })),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const memberKey = (testType, testId) => `${testType}:${testId}`;

  const handleNew = () => { setEditMode('new'); setFormData({ ...DEFAULT_FORM }); };
  const handleEdit = (g) => {
    setEditMode(g);
    setFormData({
      name: g.name, description: g.description || '', runStrategy: g.runStrategy || 'SEQUENTIAL',
      stopOnFailure: !!g.stopOnFailure, scheduleCron: g.scheduleCron || '', isActive: g.isActive !== false,
      memberIds: (g.members || []).map((m) => memberKey(m.testType, m.testId)),
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test group?')) return;
    try { await api.delete(`/test-groups/${id}`); fetchAll(); } catch (err) { alert(err.message); }
  };

  const handleRun = async (id) => {
    setRunningGroupId(id);
    try {
      const run = await api.post(`/test-groups/${id}/run`);
      alert(`Group run started (Run #${run.id}). Check Run History for results.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setRunningGroupId(null);
    }
  };

  const toggleTest = (testType, testId) => {
    const key = memberKey(testType, testId);
    setFormData((p) => ({
      ...p,
      memberIds: p.memberIds.includes(key) ? p.memberIds.filter((k) => k !== key) : [...p.memberIds, key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      runStrategy: formData.runStrategy,
      stopOnFailure: formData.stopOnFailure,
      scheduleCron: formData.scheduleCron || null,
      isActive: formData.isActive,
      members: formData.memberIds.map((key, i) => {
        const [testType, testId] = key.split(':');
        return { testType, testId: Number(testId), sequenceOrder: i };
      }),
    };
    try {
      if (editMode === 'new') await api.post('/test-groups', payload);
      else await api.put(`/test-groups/${editMode.id}`, payload);
      setEditMode(null);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading test groups…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  if (editMode !== null) {
    return (
      <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 max-w-3xl flex flex-col gap-6">
        <h2 className="text-lg font-bold">{editMode === 'new' ? 'New Test Group' : `Edit: ${editMode.name}`}</h2>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Group Name *</label>
          <input required className={INPUT_CLASS} placeholder="Regression Suite" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
          <textarea className={INPUT_CLASS} rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Run Strategy</label>
            <select className={INPUT_CLASS} value={formData.runStrategy} onChange={(e) => setFormData((p) => ({ ...p, runStrategy: e.target.value }))}>
              <option value="SEQUENTIAL">Sequential — one after another</option>
              <option value="PARALLEL">Parallel — all at once</option>
            </select>
          </div>
          {formData.runStrategy === 'SEQUENTIAL' && (
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={formData.stopOnFailure} onChange={(e) => setFormData((p) => ({ ...p, stopOnFailure: e.target.checked }))} className="accent-[var(--accent)]" />
              Stop on first failure
            </label>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Select Tests to Include</h3>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {allTests.map((test) => {
              const key = memberKey(test.testType, test.id);
              const selected = formData.memberIds.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => toggleTest(test.testType, test.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${selected ? 'border-[var(--accent)] bg-[var(--accent-bg-soft)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
                >
                  <div className={`w-4 h-4 rounded border-2 shrink-0 ${selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-muted)]'}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{test.name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{test.targetUrl}</div>
                  </div>
                  <TypeBadge type={test.testType} />
                </div>
              );
            })}
          </div>
          {formData.memberIds.length > 0 && <div className="mt-2 text-xs text-[var(--text-muted)]">{formData.memberIds.length} test(s) selected</div>}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Schedule (CRON — optional)</label>
          <input className={INPUT_CLASS} placeholder="0 0 6 * * ? (6am daily)" value={formData.scheduleCron} onChange={(e) => setFormData((p) => ({ ...p, scheduleCron: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setEditMode(null)}>Cancel</Button>
          <Button type="submit">Save Group</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-muted)]">Combine performance & load tests into groups and execute them as a suite. Schedule groups via CRON for regression pipelines.</p>
        <Button onClick={handleNew}><Plus size={16} /> New Group</Button>
      </div>

      <div className="flex flex-col gap-4">
        {groups.length === 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-center py-12 text-[var(--text-muted)]">
            No test groups yet. Create a group to bundle tests into a suite.
          </div>
        )}
        {groups.map((group) => (
          <div key={group.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold">{group.name}</h3>
                {group.description && <div className="text-sm text-[var(--text-muted)] mt-1">{group.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRun(group.id)} disabled={runningGroupId === group.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50"><Play size={14} /> Run Suite</button>
                <button onClick={() => handleEdit(group)} className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(group.id)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(group.members || []).map((m, i) => {
                const t = allTests.find((t) => t.testType === m.testType && t.id === m.testId);
                return (
                  <div key={m.id ?? `${m.testType}-${m.testId}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-hover)] rounded-full text-xs">
                    {i > 0 && <ChevronRight size={11} className="opacity-40" />}
                    <TypeBadge type={m.testType} />
                    <span>{t?.name || `#${m.testId}`}</span>
                  </div>
                );
              })}
              {!group.members?.length && <span className="text-xs text-[var(--text-muted)]">No tests linked yet.</span>}
            </div>

            <div className="mt-3 flex gap-6 text-xs text-[var(--text-muted)] items-center">
              <span>{group.runStrategy === 'PARALLEL' ? 'Parallel' : 'Sequential'}</span>
              {group.stopOnFailure && group.runStrategy !== 'PARALLEL' && <span>Stops on first failure</span>}
              {group.scheduleCron && <span className="font-mono">{group.scheduleCron}</span>}
              <span className="ml-auto">See Run History for last run status →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
