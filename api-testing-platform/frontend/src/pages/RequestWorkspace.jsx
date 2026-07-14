import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Save, ChevronLeft, Plus, Folder } from 'lucide-react';
import { apiClient } from '../api/client.js';
import KeyValueEditor from '../components/KeyValueEditor.jsx';
import ResponseViewer from '../components/ResponseViewer.jsx';
import RequestHistoryPanel from '../components/RequestHistoryPanel.jsx';
import { EMPTY_AUTH } from '../components/AuthEditor.jsx';
import AuthEditor from '../components/AuthEditor.jsx';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const METHOD_COLORS = {
  GET: 'text-emerald-400', POST: 'text-amber-400', PUT: 'text-blue-400',
  PATCH: 'text-teal-300', DELETE: 'text-red-400', OPTIONS: 'text-purple-400', HEAD: 'text-pink-400',
};

const BUILDER_SUBTABS = ['Parameters', 'Body', 'Headers', 'Authorization'];
const BODY_TYPES = ['NONE', 'JSON', 'XML', 'TEXT', 'HTML', 'FORM_URLENCODED'];

function flattenFolders(nodes, depth = 0) {
  const out = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    out.push(...flattenFolders(n.children ?? [], depth + 1));
  }
  return out;
}

export default function RequestWorkspace() {
  const { collectionId, requestId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = requestId === 'new';

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [bodyType, setBodyType] = useState('NONE');
  const [body, setBody] = useState('');
  const [auth, setAuth] = useState({ ...EMPTY_AUTH });
  const [builderSubTab, setBuilderSubTab] = useState('Parameters');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [folderId, setFolderId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['collection-request', collectionId, requestId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/requests/${requestId}`)).data,
    enabled: !isNew,
  });

  const { data: folderTree = [] } = useQuery({
    queryKey: ['collection-folders', collectionId],
    queryFn: async () => (await apiClient.get(`/v1/collections/${collectionId}/folders`)).data,
  });
  const flatFolders = flattenFolders(folderTree);

  // Reset to a blank builder when navigating to "new" (e.g. from another
  // request's workspace) — otherwise the previous request's fields would
  // still be in state when this route's own effect below has nothing to load.
  useEffect(() => {
    if (isNew) {
      setMethod('GET'); setUrl(''); setQueryParams([]); setHeaders([]);
      setBodyType('NONE'); setBody(''); setAuth({ ...EMPTY_AUTH });
      setRequestName(''); setFolderId(''); setResponse(null);
    }
  }, [requestId, isNew]);

  useEffect(() => {
    if (!existing) return;
    try {
      const cfg = JSON.parse(existing.configJson);
      setMethod(cfg.method ?? 'GET');
      setUrl(cfg.url ?? '');
      setQueryParams(cfg.queryParams ?? []);
      setHeaders(cfg.headers ?? []);
      setBodyType(cfg.bodyType ?? 'NONE');
      setBody(cfg.body ?? '');
      setAuth({ ...EMPTY_AUTH, ...(cfg.auth ?? {}) });
      setRequestName(existing.name);
      setFolderId(existing.folderId ?? '');
    } catch { /* corrupt config */ }
  }, [existing]);

  const buildConfig = () => ({
    method, url, queryParams, headers, bodyType, body, auth,
    timeoutMs: 30000, followRedirects: true, verifySsl: true,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { name: requestName.trim(), config: buildConfig(), folderId: folderId ? Number(folderId) : null };
      if (isNew) {
        return (await apiClient.post(`/v1/collections/${collectionId}/requests`, payload)).data;
      }
      return (await apiClient.put(`/v1/collections/${collectionId}/requests/${requestId}`, payload)).data;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['collection-requests', collectionId] });
      setSaveMessage('Saved ✓');
      setTimeout(() => setSaveMessage(''), 2000);
      if (isNew) navigate(`/tester/${collectionId}/${saved.id}`, { replace: true });
    },
  });

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      let activeRequestId = requestId;
      const name = requestName.trim() || existing?.name || `${method} ${url}`.slice(0, 80);
      const payload = { name, config: buildConfig(), folderId: folderId ? Number(folderId) : null };
      if (isNew) {
        // Auto-save into this collection before executing — otherwise an
        // unsaved "new" request has no id to tie history to, and it would
        // never show up in the collection's list even after running it.
        const { data: created } = await apiClient.post(`/v1/collections/${collectionId}/requests`, payload);
        activeRequestId = created.id;
        setRequestName(name);
      } else {
        // The tied /execute endpoint re-reads the config from the DB, not
        // from this form — so unsaved edits (e.g. switching GET to POST)
        // would silently execute the last-SAVED config instead of what's on
        // screen. Sync current form state first, every time, so Send always
        // runs exactly what's visible in the builder.
        await apiClient.put(`/v1/collections/${collectionId}/requests/${requestId}`, payload);
      }
      const { data } = await apiClient.post(`/v1/collections/${collectionId}/requests/${activeRequestId}/execute`);
      setResponse(data);
      qc.invalidateQueries({ queryKey: ['collection-requests', collectionId] });
      qc.invalidateQueries({ queryKey: ['collection-request-history', Number(activeRequestId)] });
      qc.invalidateQueries({ queryKey: ['collection-request', collectionId, requestId] });
      if (isNew) navigate(`/tester/${collectionId}/${activeRequestId}`, { replace: true });
    } catch (err) {
      setResponse({ success: false, errorMessage: err.response?.data?.message || err.message, durationMs: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-[#1c1c1e]">
        <Link to={`/tester/${collectionId}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 shrink-0">
          <ChevronLeft size={13} /> Back
        </Link>
        <input value={requestName} onChange={(e) => setRequestName(e.target.value)}
          placeholder="Request name"
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none placeholder-zinc-600 w-56 focus:border-emerald-500" />
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Folder size={12} />
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none max-w-[140px]">
            <option value="">Root (no folder)</option>
            {flatFolders.map((f) => <option key={f.id} value={f.id}>{'—'.repeat(f.depth)} {f.name}</option>)}
          </select>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={!requestName.trim() || saveMut.isPending}
          className="flex items-center gap-1.5 rounded border border-emerald-700 text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-40 px-3 py-1.5 text-xs font-semibold">
          <Save size={12} /> {isNew ? 'Save' : 'Update'}
        </button>
        {saveMessage && <span className="text-xs text-emerald-400">{saveMessage}</span>}
        {saveMut.isError && (
          <span className="text-xs text-red-400">{saveMut.error?.response?.data?.message ?? 'Save failed'}</span>
        )}
        <button onClick={() => navigate(`/tester/${collectionId}/new`)}
          className="flex items-center gap-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold ml-auto">
          <Plus size={12} /> New Request
        </button>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <div className="flex flex-1 items-stretch rounded-md border border-zinc-700 bg-zinc-900 overflow-hidden focus-within:border-emerald-500">
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className={`bg-zinc-900 px-3 py-2 text-sm font-semibold outline-none cursor-pointer ${METHOD_COLORS[method]}`}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Enter request URL"
            className="flex-1 bg-transparent border-l border-zinc-700 px-3 py-2 text-sm outline-none placeholder-zinc-600" />
        </div>
        <button onClick={run} disabled={loading}
          className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white">
          <Send size={14} /> Send
        </button>
      </div>

      {/* Request builder (top) + Response (below) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-[38%] flex flex-col border-b border-zinc-800 min-h-0">
          <div className="flex gap-1 px-4 pt-2 border-b border-zinc-800">
            {BUILDER_SUBTABS.map((t) => (
              <button key={t} onClick={() => setBuilderSubTab(t)}
                className={`px-3 py-2 text-xs border-b-2 -mb-px ${builderSubTab === t ? 'border-sky-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4 min-h-0">
            {builderSubTab === 'Parameters' && <KeyValueEditor items={queryParams} onChange={setQueryParams} keyPlaceholder="Parameter" />}
            {builderSubTab === 'Headers' && <KeyValueEditor items={headers} onChange={setHeaders} keyPlaceholder="Header" />}
            {builderSubTab === 'Body' && (
              <div className="h-full flex flex-col gap-2">
                <div className="flex gap-1">
                  {BODY_TYPES.map((bt) => (
                    <button key={bt} onClick={() => setBodyType(bt)}
                      className={`px-2.5 py-1 rounded text-[11px] ${bodyType === bt ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-700' : 'text-zinc-500 border border-zinc-800 hover:text-zinc-300'}`}>
                      {bt === 'FORM_URLENCODED' ? 'x-www-form-urlencoded' : bt}
                    </button>
                  ))}
                </div>
                {bodyType !== 'NONE' && (
                  <div className="flex-1 min-h-0 border border-zinc-800 rounded-md overflow-hidden">
                    <Editor height="100%" theme="vs-dark"
                      language={bodyType === 'JSON' ? 'json' : bodyType === 'XML' || bodyType === 'HTML' ? 'html' : 'plaintext'}
                      value={body} onChange={(v) => setBody(v ?? '')}
                      options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }} />
                  </div>
                )}
              </div>
            )}
            {builderSubTab === 'Authorization' && <AuthEditor auth={auth} onChange={setAuth} />}
          </div>
        </div>

        <ResponseViewer response={response} loading={loading} />

        {/* History for this specific API — pinned at the bottom, collapsible.
            Unrelated to the sidebar's global History page. */}
        <RequestHistoryPanel requestId={isNew ? null : Number(requestId)} />
      </div>
    </div>
  );
}
