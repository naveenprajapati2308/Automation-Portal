import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Trash2, Save, Database, X, FolderPlus } from 'lucide-react';
import { apiClient } from '../api/client.js';
import KeyValueEditor from '../components/KeyValueEditor.jsx';
import AuthEditor, { EMPTY_AUTH } from '../components/AuthEditor.jsx';
import JsonTree from '../components/JsonTree.jsx';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BODY_TYPES = ['NONE', 'JSON', 'XML', 'TEXT', 'FORM_URLENCODED'];

const emptyForm = {
  name: '', method: 'GET', url: '', moduleId: '', headers: [],
  bodyType: 'NONE', body: '', auth: { ...EMPTY_AUTH },
  timeoutMs: 15000, cacheStrategy: 'PER_CALL', cacheTtlSeconds: 3600,
};

export default function BaseApis() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [extractPrompt, setExtractPrompt] = useState(null); // {path, name}
  const [addToCollection, setAddToCollection] = useState('');
  const [addedMessage, setAddedMessage] = useState('');

  const { data: apis = [] } = useQuery({
    queryKey: ['base-apis'],
    queryFn: async () => (await apiClient.get('/v1/base-apis')).data,
  });
  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => (await apiClient.get('/v1/collections')).data,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });
  const { data: tree } = useQuery({
    queryKey: ['base-api-tree', selectedId],
    queryFn: async () => (await apiClient.get(`/v1/base-apis/${selectedId}/response-tree`)).data,
    enabled: !!selectedId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['base-apis'] });
    qc.invalidateQueries({ queryKey: ['base-api-tree'] });
  };

  const toPayload = () => ({
    name: form.name, method: form.method, url: form.url,
    moduleId: form.moduleId ? Number(form.moduleId) : null,
    headers: JSON.stringify(form.headers),
    bodyType: form.bodyType, body: form.body || null,
    authType: form.auth.type,
    authConfig: JSON.stringify(form.auth),
    timeoutMs: Number(form.timeoutMs) || 15000,
    cacheStrategy: form.cacheStrategy,
    cacheTtlSeconds: form.cacheStrategy === 'CACHED_TTL' ? Number(form.cacheTtlSeconds) || 3600 : null,
  });

  const saveMut = useMutation({
    mutationFn: async () => selectedId
      ? (await apiClient.put(`/v1/base-apis/${selectedId}`, toPayload())).data
      : (await apiClient.post('/v1/base-apis', toPayload())).data,
    onSuccess: (saved) => { setSelectedId(saved.id); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => apiClient.delete(`/v1/base-apis/${id}`),
    onSuccess: () => { setSelectedId(null); setForm(emptyForm); invalidate(); },
  });

  const extractMut = useMutation({
    mutationFn: ({ path, name }) => apiClient.post(`/v1/base-apis/${selectedId}/bindings`,
      { sourceJsonPath: path, variableName: name }),
    onSuccess: () => { setExtractPrompt(null); invalidate(); },
  });

  const deleteExtractionMut = useMutation({
    mutationFn: (bindingId) => apiClient.delete(`/v1/base-apis/${selectedId}/bindings/${bindingId}`),
    onSuccess: invalidate,
  });

  const addToCollectionMut = useMutation({
    mutationFn: (collectionId) => apiClient.post(`/v1/base-apis/${selectedId}/add-to-collection/${collectionId}`),
    onSuccess: (_, collectionId) => {
      const c = collections.find((c) => c.id === Number(collectionId));
      setAddedMessage(`Added to "${c?.name ?? 'collection'}" ✓`);
      setAddToCollection('');
      setTimeout(() => setAddedMessage(''), 2500);
      qc.invalidateQueries({ queryKey: ['collection-requests'] });
    },
  });

  const select = (api) => {
    setSelectedId(api.id);
    setRunResult(null);
    setForm({
      name: api.name, method: api.method, url: api.url,
      moduleId: api.moduleId ?? '',
      headers: safeParse(api.headers, []),
      bodyType: api.bodyType || 'NONE', body: api.body || '',
      auth: { ...EMPTY_AUTH, ...safeParse(api.authConfig, {}) },
      timeoutMs: api.timeoutMs, cacheStrategy: api.cacheStrategy,
      cacheTtlSeconds: api.cacheTtlSeconds ?? 3600,
    });
  };

  const run = async () => {
    if (!selectedId) return;
    setRunning(true);
    try {
      const { data } = await apiClient.post(`/v1/base-apis/${selectedId}/execute`);
      setRunResult(data);
      invalidate();
    } catch (e) {
      setRunResult({ success: false, errorMessage: e.response?.data?.message || e.message });
    } finally {
      setRunning(false);
    }
  };

  const flatModules = flattenModules(modules);

  return (
    <div className="flex-1 flex min-h-0">
      {/* List */}
      <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base APIs</span>
          <button onClick={() => { setSelectedId(null); setForm(emptyForm); setRunResult(null); }}
            className="text-emerald-400 hover:text-emerald-300" title="New base API">
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {apis.map((a) => (
            <button key={a.id} onClick={() => select(a)}
              className={`w-full text-left px-3 py-2 text-xs border-b border-zinc-900 hover:bg-zinc-900/60 ${selectedId === a.id ? 'bg-emerald-600/10 text-emerald-300' : 'text-zinc-300'}`}>
              <span className="font-semibold text-emerald-400 mr-1.5">{a.method}</span>{a.name}
              <div className="text-zinc-600 truncate">{a.url}</div>
            </button>
          ))}
          {apis.length === 0 && <div className="p-3 text-xs text-zinc-600">No base APIs yet — create a token/lookup supplier API.</div>}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-emerald-400" />
          <h1 className="text-base font-semibold">{selectedId ? 'Edit Base API' : 'New Base API'}</h1>
          <div className="ml-auto flex gap-2 items-center">
            {selectedId && (
              <>
                {addedMessage && <span className="text-xs text-emerald-400">{addedMessage}</span>}
                <div className="flex items-center gap-1" title="Copy this base API into a tester collection">
                  <FolderPlus size={13} className="text-zinc-500" />
                  <select value={addToCollection}
                    onChange={(e) => { setAddToCollection(e.target.value); if (e.target.value) addToCollectionMut.mutate(e.target.value); }}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-emerald-500">
                    <option value="">Add to collection…</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button onClick={run} disabled={running}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white">
                  <Play size={12} /> {running ? 'Running…' : 'Run'}
                </button>
                <button onClick={() => deleteMut.mutate(selectedId)}
                  className="flex items-center gap-1.5 rounded border border-red-800 text-red-400 hover:bg-red-600/10 px-3 py-1.5 text-xs font-semibold">
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
            <button onClick={() => saveMut.mutate()} disabled={!form.name || !form.url || saveMut.isPending}
              className="flex items-center gap-1.5 rounded border border-emerald-700 text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-40 px-3 py-1.5 text-xs font-semibold">
              <Save size={12} /> {selectedId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name (e.g. Fetch Auth Token)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <select value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })} className={inputCls}>
            <option value="">No module</option>
            {flatModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={`${inputCls} w-28 font-semibold`}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input placeholder="https://auth.example.com/token" value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })} className={`${inputCls} flex-1`} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Cache strategy
            <select value={form.cacheStrategy} onChange={(e) => setForm({ ...form, cacheStrategy: e.target.value })} className={inputCls}>
              <option value="PER_CALL">Per call (always fresh)</option>
              <option value="CACHED_TTL">Cached with TTL (tokens)</option>
              <option value="SCHEDULED_REFRESH">Scheduled refresh (read cache)</option>
            </select>
          </label>
          {form.cacheStrategy === 'CACHED_TTL' && (
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              TTL seconds
              <input type="number" min="1" value={form.cacheTtlSeconds}
                onChange={(e) => setForm({ ...form, cacheTtlSeconds: e.target.value })} className={inputCls} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Timeout ms
            <input type="number" min="100" value={form.timeoutMs}
              onChange={(e) => setForm({ ...form, timeoutMs: e.target.value })} className={inputCls} />
          </label>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-1.5">Headers</div>
          <KeyValueEditor items={form.headers} onChange={(headers) => setForm({ ...form, headers })} keyPlaceholder="Header" />
        </div>

        <div>
          <div className="flex gap-1 mb-1.5">
            {BODY_TYPES.map((bt) => (
              <button key={bt} onClick={() => setForm({ ...form, bodyType: bt })}
                className={`px-2.5 py-1 rounded text-[11px] ${form.bodyType === bt ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-700' : 'text-zinc-500 border border-zinc-800 hover:text-zinc-300'}`}>
                {bt}
              </button>
            ))}
          </div>
          {form.bodyType !== 'NONE' && (
            <div className="h-32 border border-zinc-800 rounded overflow-hidden">
              <Editor height="100%" theme="vs-dark"
                language={form.bodyType === 'JSON' ? 'json' : 'plaintext'}
                value={form.body} onChange={(v) => setForm({ ...form, body: v ?? '' })}
                options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }} />
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-1.5">Authorization</div>
          <AuthEditor auth={form.auth} onChange={(auth) => setForm({ ...form, auth })} />
        </div>

        {runResult && (
          <div className={`rounded border p-3 text-xs ${runResult.success ? 'border-emerald-800 bg-emerald-600/5' : 'border-red-800 bg-red-600/5'}`}>
            {runResult.success
              ? <span className="text-emerald-300">✓ {runResult.statusCode} {runResult.statusText} · {runResult.durationMs} ms — snapshot refreshed, pick fields on the right</span>
              : <span className="text-red-400">✗ {runResult.errorMessage}</span>}
          </div>
        )}
      </div>

      {/* Response tree + extractions */}
      {selectedId && (
        <div className="w-96 shrink-0 border-l border-zinc-800 flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Response Fields → Variables
          </div>
          <div className="p-3 border-b border-zinc-800">
            <div className="text-[11px] text-zinc-500 mb-1.5">Extracted variables (usable as {'{{name}}'} in Regular APIs)</div>
            {(tree?.extractions ?? []).map((x) => (
              <div key={x.id} className="flex items-center gap-2 text-xs py-1">
                <span className="text-emerald-300 font-mono">{'{{' + x.variableName + '}}'}</span>
                <span className="text-zinc-600 font-mono truncate flex-1">{x.sourceJsonPath}</span>
                <button onClick={() => deleteExtractionMut.mutate(x.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
            ))}
            {(tree?.extractions ?? []).length === 0 && <div className="text-xs text-zinc-600">None yet — click + on a field below.</div>}
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {tree?.snapshot
              ? <JsonTree json={tree.snapshot} onExtract={(path, name) => setExtractPrompt({ path, name })} />
              : <div className="p-3 text-xs text-zinc-600">Run the API once to load its response here.</div>}
          </div>
        </div>
      )}

      {/* Extract-variable prompt */}
      {extractPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1e] border border-zinc-700 rounded-lg p-4 w-96">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Extract as variable</span>
              <button onClick={() => setExtractPrompt(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <div className="text-xs text-zinc-500 font-mono mb-2">{extractPrompt.path}</div>
            <input autoFocus value={extractPrompt.name}
              onChange={(e) => setExtractPrompt({ ...extractPrompt, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && extractMut.mutate(extractPrompt)}
              className={`${inputCls} w-full mb-3`} placeholder="variableName" />
            <button onClick={() => extractMut.mutate(extractPrompt)} disabled={!extractPrompt.name}
              className="w-full rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2 text-sm font-semibold text-white">
              Create {'{{' + (extractPrompt.name || '…') + '}}'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function safeParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function flattenModules(nodes, prefix = '') {
  const out = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: prefix + n.name });
    out.push(...flattenModules(n.children ?? [], prefix + n.name + ' / '));
  }
  return out;
}
