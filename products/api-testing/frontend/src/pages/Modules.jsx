import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, FolderTree, CornerDownRight } from 'lucide-react';
import { apiClient } from '../api/client.js';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';

function ModuleNode({ node, depth, onDelete }) {
  return (
    <>
      <div className="flex items-center gap-2 py-1.5 border-b border-zinc-900 text-sm" style={{ paddingLeft: depth * 20 }}>
        {depth > 0 && <CornerDownRight size={13} className="text-zinc-600" />}
        <span className="text-zinc-200">{node.name}</span>
        {node.description && <span className="text-xs text-zinc-600">{node.description}</span>}
        <button onClick={() => onDelete(node.id)} className="ml-auto text-zinc-600 hover:text-red-400 pr-2"><Trash2 size={13} /></button>
      </div>
      {(node.children ?? []).map((c) => <ModuleNode key={c.id} node={c} depth={depth + 1} onDelete={onDelete} />)}
    </>
  );
}

export default function Modules() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', parentModuleId: '', description: '' });
  const [error, setError] = useState('');

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });

  const flat = flatten(modules);

  const createMut = useMutation({
    mutationFn: () => apiClient.post('/v1/modules', {
      name: form.name,
      parentModuleId: form.parentModuleId ? Number(form.parentModuleId) : null,
      description: form.description || null,
    }),
    onSuccess: () => {
      setForm({ name: '', parentModuleId: '', description: '' });
      setError('');
      qc.invalidateQueries({ queryKey: ['modules'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => apiClient.delete(`/v1/modules/${id}`),
    onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: ['modules'] }); },
    onError: (e) => setError(e.response?.data?.message ?? 'Delete failed'),
  });

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2"><FolderTree size={18} className="text-emerald-400" /> Modules</h1>
        <p className="text-xs text-zinc-500">Group Base/Regular APIs (Login, Dashboard, Analytics…). Supports nesting.</p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Name
          <input className={inputCls} placeholder="e.g. Login" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Parent (optional)
          <select className={inputCls} value={form.parentModuleId}
            onChange={(e) => setForm({ ...form, parentModuleId: e.target.value })}>
            <option value="">— root —</option>
            {flat.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 flex-1">
          Description
          <input className={inputCls} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <button onClick={() => createMut.mutate()} disabled={!form.name.trim() || createMut.isPending}
          className="flex items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={14} /> Add
        </button>
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] px-3 py-1">
        {modules.map((m) => <ModuleNode key={m.id} node={m} depth={0} onDelete={(id) => deleteMut.mutate(id)} />)}
        {modules.length === 0 && <div className="py-4 text-center text-xs text-zinc-600">No modules yet</div>}
      </div>
    </div>
  );
}

function flatten(nodes, prefix = '') {
  const out = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: prefix + n.name });
    out.push(...flatten(n.children ?? [], prefix + n.name + ' / '));
  }
  return out;
}
