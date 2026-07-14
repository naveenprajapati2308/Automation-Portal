import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Download, ChevronDown, ChevronRight, ChevronLeft, CheckCircle2, XCircle,
  Trash2, Copy, Braces, X, Save, FolderPlus, Folder, Layers, Pencil,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import KeyValueEditor from '../components/KeyValueEditor.jsx';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';
const GRID_COLS = 'grid grid-cols-[1fr_90px_1.2fr_140px_160px_90px] gap-2 items-center';

function methodColor(m) {
  return {
    GET: 'text-emerald-400', POST: 'text-amber-400', PUT: 'text-blue-400',
    PATCH: 'text-teal-300', DELETE: 'text-red-400', OPTIONS: 'text-purple-400', HEAD: 'text-pink-400',
  }[m] || 'text-zinc-400';
}

function statusPillClass(cls) {
  if (cls === '2xx' || cls === '3xx') return 'text-emerald-400';
  if (cls === '4xx' || cls === '5xx') return 'text-red-400';
  if (cls === 'TIMEOUT') return 'text-amber-400';
  return 'text-zinc-500';
}

async function downloadFrom(url, fallbackName) {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="([^"]+)"/i);
  const filename = starMatch ? decodeURIComponent(starMatch[1]) : (plainMatch ? plainMatch[1] : fallbackName);
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function flattenFolders(nodes, depth = 0) {
  const out = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    out.push(...flattenFolders(n.children ?? [], depth + 1));
  }
  return out;
}

export default function CollectionRequestsList() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [draftVariables, setDraftVariables] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [newFolderParent, setNewFolderParent] = useState(undefined); // undefined = modal closed
  const [newFolderName, setNewFolderName] = useState('');
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [envManageOpen, setEnvManageOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState(null); // {id?, name, variables}

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => (await apiClient.get('/v1/collections')).data,
  });
  const collection = collections.find((c) => String(c.id) === collectionId);

  const { data: requests = [] } = useQuery({
    queryKey: ['collection-requests', collectionId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/requests`)).data,
    refetchInterval: 8000,
  });

  const { data: folderTree = [] } = useQuery({
    queryKey: ['collection-folders', collectionId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/folders`)).data,
  });

  const { data: variables = [] } = useQuery({
    queryKey: ['collection-variables', collectionId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/variables`)).data,
  });

  const { data: environments = [] } = useQuery({
    queryKey: ['collection-environments', collectionId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/environments`)).data,
  });

  const invalidateRequests = () => qc.invalidateQueries({ queryKey: ['collection-requests', collectionId] });
  const invalidateFolders = () => qc.invalidateQueries({ queryKey: ['collection-folders', collectionId] });
  const invalidateEnvs = () => {
    qc.invalidateQueries({ queryKey: ['collection-environments', collectionId] });
    qc.invalidateQueries({ queryKey: ['collections'] });
  };

  const deleteMut = useMutation({
    mutationFn: (requestId) => apiClient.delete(`/v1/collections/${collectionId}/requests/${requestId}`),
    onSuccess: invalidateRequests,
  });

  const duplicateMut = useMutation({
    mutationFn: async (r) => {
      const { data: full } = await apiClient.get(`/v1/collections/${collectionId}/requests/${r.id}`);
      const config = JSON.parse(full.configJson);
      return apiClient.post(`/v1/collections/${collectionId}/requests`, { name: `${r.name} (copy)`, config, folderId: r.folderId });
    },
    onSuccess: invalidateRequests,
  });

  const moveMut = useMutation({
    mutationFn: ({ requestId, folderId }) => apiClient.patch(`/v1/collections/${collectionId}/requests/${requestId}/move`, { folderId }),
    onSuccess: invalidateRequests,
  });

  const createFolderMut = useMutation({
    mutationFn: () => apiClient.post(`/v1/collections/${collectionId}/folders`, {
      name: newFolderName.trim(), parentFolderId: newFolderParent ?? null,
    }),
    onSuccess: () => { setNewFolderParent(undefined); setNewFolderName(''); invalidateFolders(); },
  });

  const deleteFolderMut = useMutation({
    mutationFn: (folderId) => apiClient.delete(`/v1/collections/${collectionId}/folders/${folderId}`),
    onSuccess: () => { invalidateFolders(); invalidateRequests(); },
  });

  const saveVariablesMut = useMutation({
    mutationFn: () => apiClient.put(`/v1/collections/${collectionId}/variables`, { variables: draftVariables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-variables', collectionId] });
      setSaveMessage('Saved ✓');
      setTimeout(() => setSaveMessage(''), 1500);
    },
  });

  const activateEnvMut = useMutation({
    mutationFn: (environmentId) => apiClient.patch(`/v1/collections/${collectionId}/environments/active`, { environmentId }),
    onSuccess: () => { invalidateEnvs(); setEnvMenuOpen(false); },
  });

  const saveEnvMut = useMutation({
    mutationFn: () => editingEnv.id
      ? apiClient.put(`/v1/collections/${collectionId}/environments/${editingEnv.id}`, { name: editingEnv.name, variables: editingEnv.variables })
      : apiClient.post(`/v1/collections/${collectionId}/environments`, { name: editingEnv.name, variables: editingEnv.variables }),
    onSuccess: () => { setEditingEnv(null); invalidateEnvs(); },
  });

  const deleteEnvMut = useMutation({
    mutationFn: (envId) => apiClient.delete(`/v1/collections/${collectionId}/environments/${envId}`),
    onSuccess: invalidateEnvs,
  });

  const openVariables = () => { setDraftVariables(variables.length ? variables : []); setVariablesOpen(true); };
  const toggleFolder = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const flatFolders = flattenFolders(folderTree);
  const requestsByFolder = new Map();
  for (const r of requests) {
    const key = r.folderId ?? 'root';
    if (!requestsByFolder.has(key)) requestsByFolder.set(key, []);
    requestsByFolder.get(key).push(r);
  }
  const foldersByParent = new Map();
  for (const f of flatFolders) {
    const key = f.parentFolderId ?? 'root';
    if (!foldersByParent.has(key)) foldersByParent.set(key, []);
    foldersByParent.get(key).push(f);
  }
  const activeEnv = environments.find((e) => e.id === collection?.activeEnvironmentId);

  const RequestRow = ({ r, depth }) => (
    <div className={`${GRID_COLS} px-4 py-2.5 border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer text-xs`}
      style={{ paddingLeft: 16 + depth * 20 }}
      onClick={() => navigate(`/tester/${collectionId}/${r.id}`)}>
      <span className="text-zinc-100 truncate">{r.name}</span>
      <span className={`font-semibold ${methodColor(r.method)}`}>{r.method}</span>
      <span className="text-zinc-400 truncate" title={r.url}>{r.url}</span>
      <span className={`font-semibold ${statusPillClass(r.lastStatusClass)}`}>
        {r.lastStatusCode
          ? <span className="inline-flex items-center gap-1">
              {r.lastStatusClass === '2xx' || r.lastStatusClass === '3xx' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {r.lastStatusCode}
            </span>
          : r.lastStatusClass
            ? <span className="inline-flex items-center gap-1"><XCircle size={12} /> {r.lastStatusClass}</span>
            : <span className="text-zinc-700">never run</span>}
      </span>
      <span className="text-zinc-500">{r.lastExecutedAt ? new Date(r.lastExecutedAt).toLocaleString() : '—'}</span>
      <span className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        <select value={r.folderId ?? ''} onChange={(e) => moveMut.mutate({ requestId: r.id, folderId: e.target.value ? Number(e.target.value) : null })}
          className="bg-zinc-900 border border-zinc-800 rounded text-[10px] px-1 py-0.5 outline-none max-w-[70px]" title="Move to folder">
          <option value="">Root</option>
          {flatFolders.map((f) => <option key={f.id} value={f.id}>{'—'.repeat(f.depth)} {f.name}</option>)}
        </select>
        <button onClick={() => duplicateMut.mutate(r)} title="Duplicate" className="text-zinc-600 hover:text-emerald-400"><Copy size={13} /></button>
        <button onClick={() => deleteMut.mutate(r.id)} title="Delete" className="text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button>
      </span>
    </div>
  );

  const FolderSection = ({ folder }) => {
    const isCollapsed = collapsed.has(folder.id);
    const childFolders = foldersByParent.get(folder.id) ?? [];
    const childRequests = requestsByFolder.get(folder.id) ?? [];
    return (
      <>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-900 bg-zinc-900/30 text-xs"
          style={{ paddingLeft: 16 + folder.depth * 20 }}>
          <button onClick={() => toggleFolder(folder.id)} className="text-zinc-400 hover:text-zinc-200">
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          <Folder size={13} className="text-amber-400" />
          <span className="text-zinc-200 font-medium">{folder.name}</span>
          <span className="text-zinc-600">({childRequests.length})</span>
          <button onClick={() => { setNewFolderParent(folder.id); setNewFolderName(''); }}
            className="ml-2 text-zinc-600 hover:text-emerald-400" title="New sub-folder"><FolderPlus size={13} /></button>
          <button onClick={() => navigate(`/tester/${collectionId}/new`)}
            className="text-zinc-600 hover:text-emerald-400" title="New request here"><Plus size={13} /></button>
          <button onClick={() => deleteFolderMut.mutate(folder.id)}
            className="ml-auto text-zinc-600 hover:text-red-400" title="Delete folder"><Trash2 size={13} /></button>
        </div>
        {!isCollapsed && (
          <>
            {childFolders.map((f) => <FolderSection key={f.id} folder={f} />)}
            {childRequests.map((r) => <RequestRow key={r.id} r={r} depth={folder.depth + 1} />)}
          </>
        )}
      </>
    );
  };

  const rootFolders = foldersByParent.get('root') ?? [];
  const rootRequests = requestsByFolder.get('root') ?? [];

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/tester" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-1">
            <ChevronLeft size={12} /> All collections
          </Link>
          <h1 className="text-lg font-semibold">{collection?.name ?? 'Collection'}</h1>
          <p className="text-xs text-zinc-500">Recently executed first · click a request to open its workspace</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => setEnvMenuOpen(!envMenuOpen)}
              className="flex items-center gap-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold">
              <Layers size={12} /> {activeEnv ? activeEnv.name : 'No Environment'} <ChevronDown size={12} />
            </button>
            {envMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-[#1c1c1e] border border-zinc-700 rounded shadow-lg z-40 text-xs">
                <button onClick={() => activateEnvMut.mutate(null)}
                  className={`block w-full text-left px-3 py-2 hover:bg-zinc-800 ${!activeEnv ? 'text-emerald-300' : ''}`}>No Environment</button>
                {environments.map((e) => (
                  <button key={e.id} onClick={() => activateEnvMut.mutate(e.id)}
                    className={`block w-full text-left px-3 py-2 hover:bg-zinc-800 ${activeEnv?.id === e.id ? 'text-emerald-300' : ''}`}>{e.name}</button>
                ))}
                <div className="border-t border-zinc-800">
                  <button onClick={() => { setEnvManageOpen(true); setEnvMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 hover:bg-zinc-800 text-zinc-400">Manage Environments…</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={openVariables}
            className="flex items-center gap-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold">
            <Braces size={12} /> Variables {variables.length > 0 && <span className="text-emerald-400">({variables.length})</span>}
          </button>
          <div className="relative">
            <button onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold">
              <Download size={12} /> Export <ChevronDown size={12} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-[#1c1c1e] border border-zinc-700 rounded shadow-lg z-40 text-xs">
                <button onClick={() => { downloadFrom(`/v1/collections/${collectionId}/export/postman`, 'collection.postman_collection.json'); setExportMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 hover:bg-zinc-800">Postman Collection</button>
                <button onClick={() => { downloadFrom(`/v1/collections/${collectionId}/export/json`, 'collection.json'); setExportMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 hover:bg-zinc-800">Native JSON</button>
              </div>
            )}
          </div>
          <button onClick={() => { setNewFolderParent(null); setNewFolderName(''); }}
            className="flex items-center gap-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold">
            <FolderPlus size={12} /> New Folder
          </button>
          <button onClick={() => navigate(`/tester/${collectionId}/new`)}
            className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={14} /> New Request
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] overflow-hidden">
        <div className={`${GRID_COLS} px-4 py-2.5 border-b border-zinc-800 text-zinc-500 text-xs font-medium`}>
          <span>API Name</span><span>Method</span><span>Path</span><span>Response Status</span><span>Last Run</span><span></span>
        </div>
        {rootFolders.map((f) => <FolderSection key={f.id} folder={f} />)}
        {rootRequests.map((r) => <RequestRow key={r.id} r={r} depth={0} />)}
        {rootFolders.length === 0 && rootRequests.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-zinc-600">No requests yet — click "New Request" to build one</div>
        )}
      </div>

      {/* New folder modal */}
      {newFolderParent !== undefined && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setNewFolderParent(undefined)}>
          <div className="bg-[#1c1c1e] border border-zinc-700 rounded-lg p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">{newFolderParent ? 'New Sub-folder' : 'New Folder'}</span>
              <button onClick={() => setNewFolderParent(undefined)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newFolderName.trim() && createFolderMut.mutate()}
              placeholder="Folder name" className={`${inputCls} w-full mb-3`} />
            <button onClick={() => createFolderMut.mutate()} disabled={!newFolderName.trim() || createFolderMut.isPending}
              className="w-full rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2 text-sm font-semibold text-white">Create</button>
          </div>
        </div>
      )}

      {/* Variables modal */}
      {variablesOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setVariablesOpen(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-700 rounded-lg p-4 w-[560px] max-h-[80vh] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">Collection Variables</span>
                <p className="text-xs text-zinc-500 mt-0.5">Always-on base values (e.g. from a Postman import). Use as <span className="font-mono text-emerald-300">{'{{key}}'}</span> anywhere in this collection's requests. An active environment overrides these.</p>
              </div>
              <button onClick={() => setVariablesOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <div className="overflow-auto">
              <KeyValueEditor items={draftVariables} onChange={setDraftVariables} keyPlaceholder="baseUrl" valuePlaceholder="https://api.example.com" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => saveVariablesMut.mutate()} disabled={saveVariablesMut.isPending}
                className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white">
                <Save size={13} /> Save Variables
              </button>
              {saveMessage && <span className="text-xs text-emerald-400">{saveMessage}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Environments management modal */}
      {envManageOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setEnvManageOpen(false); setEditingEnv(null); }}>
          <div className="bg-[#1c1c1e] border border-zinc-700 rounded-lg p-4 w-[640px] max-h-[80vh] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Environments</span>
              <button onClick={() => { setEnvManageOpen(false); setEditingEnv(null); }} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>

            {editingEnv ? (
              <div className="flex flex-col gap-3">
                <input value={editingEnv.name} onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                  placeholder="Environment name (e.g. Dev, QA, Prod)" className={inputCls} />
                <div className="overflow-auto max-h-72">
                  <KeyValueEditor items={editingEnv.variables} onChange={(variables) => setEditingEnv({ ...editingEnv, variables })}
                    keyPlaceholder="baseUrl" valuePlaceholder="https://dev.example.com" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEnvMut.mutate()} disabled={!editingEnv.name.trim() || saveEnvMut.isPending}
                    className="rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white">Save</button>
                  <button onClick={() => setEditingEnv(null)} className="rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-4 py-2 text-sm font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setEditingEnv({ name: '', variables: [] })}
                  className="flex items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white w-fit">
                  <Plus size={14} /> New Environment
                </button>
                <div className="flex flex-col divide-y divide-zinc-900 border border-zinc-800 rounded">
                  {environments.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <Layers size={13} className="text-emerald-400" />
                      <span className="text-zinc-200">{e.name}</span>
                      {activeEnv?.id === e.id && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-300">ACTIVE</span>}
                      <span className="text-zinc-600">{(JSON.parse(e.variables || '[]')).length} var(s)</span>
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => setEditingEnv({ id: e.id, name: e.name, variables: JSON.parse(e.variables || '[]') })}
                          className="text-zinc-500 hover:text-zinc-300"><Pencil size={13} /></button>
                        <button onClick={() => deleteEnvMut.mutate(e.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                  {environments.length === 0 && <div className="px-3 py-4 text-center text-xs text-zinc-600">No environments yet</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
