import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, X, Layers, Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const GROUP_STATUS_BADGE = {
  SUCCESS: 'bg-emerald-600/15 text-emerald-300',
  PARTIAL: 'bg-amber-600/15 text-amber-300',
  FAILED: 'bg-red-600/15 text-red-300',
  RUNNING: 'bg-blue-600/15 text-blue-300',
};

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs outline-none focus:border-emerald-500';

const CLASS_COLORS = {
  '2xx': 'text-emerald-400', '3xx': 'text-sky-400', '4xx': 'text-amber-400',
  '5xx': 'text-red-400', ERROR: 'text-purple-400', TIMEOUT: 'text-rose-400',
};

function methodColor(m) {
  return {
    GET: 'text-emerald-400', POST: 'text-amber-400', PUT: 'text-blue-400',
    PATCH: 'text-teal-300', DELETE: 'text-red-400',
  }[m] || 'text-zinc-400';
}

export default function History() {
  const [view, setView] = useState('executions'); // executions | groupRuns
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ apiType: '', status: '', moduleId: '', method: '', from: '', to: '', groupExecutionId: '' });
  const [detailId, setDetailId] = useState(null);
  const [groupRunPage, setGroupRunPage] = useState(0);

  const { data } = useQuery({
    queryKey: ['history', page, filters],
    queryFn: async () => (await apiClient.get('/v1/history', {
      params: {
        page, size: 25,
        apiType: filters.apiType || undefined,
        status: filters.status || undefined,
        moduleId: filters.moduleId || undefined,
        method: filters.method || undefined,
        groupExecutionId: filters.groupExecutionId || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
      },
    })).data,
    refetchInterval: 10000,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get('/v1/groups')).data,
  });

  const { data: groupRuns } = useQuery({
    queryKey: ['group-runs', groupRunPage],
    queryFn: async () => (await apiClient.get('/v1/groups/executions', { params: { page: groupRunPage, size: 25 } })).data,
    enabled: view === 'groupRuns',
    refetchInterval: 10000,
  });

  const { data: detail } = useQuery({
    queryKey: ['history-detail', detailId],
    queryFn: async () => (await apiClient.get(`/v1/history/${detailId}`)).data,
    enabled: !!detailId,
  });

  const records = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const flatModules = flattenModules(modules);
  const groupName = (id) => groups.find((g) => g.group.id === id)?.group.name ?? `#${id}`;
  const setFilter = (patch) => { setFilters({ ...filters, ...patch }); setPage(0); };

  // Clicking a group run drills into its executions in the main table.
  const openGroupRun = (runId) => {
    setFilters({ apiType: '', status: '', moduleId: '', method: '', from: '', to: '', groupExecutionId: String(runId) });
    setPage(0);
    setView('executions');
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold">Execution History</h1>
          <p className="text-xs text-zinc-500">The testing record: request sent, response received, timing, validation</p>
        </div>
        <div className="flex rounded-md border border-zinc-700 overflow-hidden text-xs">
          <button onClick={() => setView('executions')}
            className={`px-3 py-1.5 ${view === 'executions' ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
            Executions
          </button>
          <button onClick={() => setView('groupRuns')}
            className={`px-3 py-1.5 flex items-center gap-1.5 ${view === 'groupRuns' ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <Layers size={12} /> Group Runs
          </button>
        </div>
        {view === 'executions' && (<>
        <select value={filters.apiType} onChange={(e) => setFilter({ apiType: e.target.value })} className={inputCls}>
          <option value="">All types</option>
          <option value="BASE">Base APIs</option>
          <option value="REGULAR">Regular APIs</option>
        </select>
        <select value={filters.method} onChange={(e) => setFilter({ method: e.target.value })} className={inputCls}>
          <option value="">All methods</option>
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} className={inputCls}>
          <option value="">All statuses</option>
          {['2xx', '3xx', '4xx', '5xx', 'ERROR', 'TIMEOUT'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.moduleId} onChange={(e) => setFilter({ moduleId: e.target.value })} className={inputCls}>
          <option value="">All modules</option>
          {flatModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          From <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} className={inputCls} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          To <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className={inputCls} />
        </label>
        </>)}
      </div>

      {filters.groupExecutionId && view === 'executions' && (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <Layers size={12} /> Showing executions of group run #{filters.groupExecutionId}
          <button onClick={() => setFilter({ groupExecutionId: '' })} className="text-zinc-500 hover:text-zinc-300"><X size={13} /></button>
        </div>
      )}

      {view === 'groupRuns' && (
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 font-medium">Run</th>
                <th className="text-left px-4 py-2.5 font-medium">Group</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Health</th>
                <th className="text-left px-4 py-2.5 font-medium">Passed / Failed</th>
                <th className="text-left px-4 py-2.5 font-medium">Trigger</th>
                <th className="text-left px-4 py-2.5 font-medium">Started</th>
                <th className="text-left px-4 py-2.5 font-medium">Finished</th>
              </tr>
            </thead>
            <tbody>
              {(groupRuns?.content ?? []).map((r) => (
                <tr key={r.id} onClick={() => openGroupRun(r.id)}
                  className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer">
                  <td className="px-4 py-2.5 text-zinc-300">#{r.id}</td>
                  <td className="px-4 py-2.5 text-zinc-200 flex items-center gap-1.5"><Layers size={11} className="text-emerald-400" /> {groupName(r.groupId)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${GROUP_STATUS_BADGE[r.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {r.status === 'RUNNING' && <Loader2 size={10} className="animate-spin" />}{r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-zinc-300">{r.healthPercent != null ? `${r.healthPercent}%` : '—'}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span className="text-emerald-400">{r.passedApis}</span>
                    <span className="text-zinc-600"> / </span>
                    <span className="text-red-400">{r.failedApis}</span>
                    <span className="text-zinc-600"> of {r.totalApis}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{r.triggeredBy}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{new Date(r.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {(groupRuns?.content ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-600">No group runs yet — execute a group from the Scheduler tab</td></tr>
              )}
            </tbody>
          </table>
          {(groupRuns?.totalPages ?? 0) > 1 && (
            <div className="flex items-center gap-3 text-xs text-zinc-500 px-4 py-2">
              <button disabled={groupRunPage === 0} onClick={() => setGroupRunPage(groupRunPage - 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-zinc-300"><ChevronLeft size={14} /> Prev</button>
              <span>Page {groupRunPage + 1} of {groupRuns.totalPages}</span>
              <button disabled={groupRunPage + 1 >= groupRuns.totalPages} onClick={() => setGroupRunPage(groupRunPage + 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-zinc-300">Next <ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      )}

      {view === 'executions' && (
      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left px-4 py-2.5 font-medium">API</th>
              <th className="text-left px-4 py-2.5 font-medium">Type</th>
              <th className="text-left px-4 py-2.5 font-medium">Method</th>
              <th className="text-left px-4 py-2.5 font-medium">URL</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Valid.</th>
              <th className="text-left px-4 py-2.5 font-medium">Time</th>
              <th className="text-left px-4 py-2.5 font-medium">Trigger</th>
              <th className="text-left px-4 py-2.5 font-medium">Executed At</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} onClick={() => setDetailId(r.id)}
                className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer">
                <td className="px-4 py-2.5 text-zinc-300">{r.apiName ?? <span className="text-zinc-600">ad-hoc</span>}</td>
                <td className="px-4 py-2.5 text-zinc-500">{r.apiType}</td>
                <td className={`px-4 py-2.5 font-semibold ${methodColor(r.requestMethod)}`}>{r.requestMethod}</td>
                <td className="px-4 py-2.5 text-zinc-400 max-w-xs truncate" title={r.requestUrl}>{r.requestUrl}</td>
                <td className={`px-4 py-2.5 font-semibold ${CLASS_COLORS[r.responseStatusClass] ?? 'text-zinc-400'}`}>
                  {r.responseStatusCode ?? r.responseStatusClass}
                </td>
                <td className="px-4 py-2.5">
                  {r.validationPassed == null ? <span className="text-zinc-700">—</span>
                    : r.validationPassed
                      ? <CheckCircle2 size={13} className="text-emerald-400" />
                      : <XCircle size={13} className="text-red-400" />}
                </td>
                <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{r.totalTimeMs} ms</td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    r.triggeredBy === 'SCHEDULE' ? 'bg-blue-600/15 text-blue-300'
                      : r.triggeredBy === 'CHAIN_DEPENDENCY' ? 'bg-purple-600/15 text-purple-300'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}>{r.triggeredBy === 'CHAIN_DEPENDENCY' ? 'CHAIN' : r.triggeredBy}</span>
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{new Date(r.executedAt).toLocaleString()}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-600">No executions match</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {view === 'executions' && totalPages > 1 && (
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-zinc-300"><ChevronLeft size={14} /> Prev</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-zinc-300">Next <ChevronRight size={14} /></button>
        </div>
      )}

      {/* Detail drawer */}
      {detailId && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setDetailId(null)}>
          <div className="w-[560px] h-full bg-[#1c1c1e] border-l border-zinc-700 overflow-auto p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Execution #{detailId}</h2>
              <button onClick={() => setDetailId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            {detail ? (
              <>
                <Section title="Request">
                  <Row k="Method / URL" v={`${detail.execution.requestMethod} ${detail.execution.requestUrl}`} mono />
                  <Row k="Headers (secrets masked)" v={prettyJson(detail.execution.requestHeaders)} mono pre />
                  {detail.execution.requestBody && <Row k="Body" v={detail.execution.requestBody} mono pre />}
                  {detail.execution.injectedVariables && (
                    <Row k="Injected Variables (from Base APIs, masked)" v={prettyJson(detail.execution.injectedVariables)} mono pre />
                  )}
                </Section>
                <Section title="Response">
                  <Row k="Status" v={`${detail.execution.responseStatusCode ?? '—'} ${detail.execution.responseStatusMessage ?? ''} (${detail.execution.responseStatusClass})`} />
                  {detail.execution.responseContentType && <Row k="Content Type" v={detail.execution.responseContentType} mono />}
                  {detail.execution.errorMessage && <Row k="Error" v={detail.execution.errorMessage} />}
                  {detail.execution.responseCookies && detail.execution.responseCookies !== '[]' && (
                    <Row k="Cookies" v={prettyJson(detail.execution.responseCookies)} mono pre />
                  )}
                  {detail.responseBody && <Row k="Body" v={prettyJson(detail.responseBody)} mono pre maxH />}
                  {detail.execution.responseBodyObjectKey && (
                    <Row k="Storage" v={`Offloaded (${fmtSize(detail.execution.responseSizeBytes)}) → ${detail.execution.responseBodyObjectKey}`} />
                  )}
                </Section>
                <Section title="Timing">
                  <div className="flex gap-4 text-xs">
                    <TimingCell label="TTFB" value={detail.execution.ttfbMs} />
                    <TimingCell label="Total" value={detail.execution.totalTimeMs} strong />
                  </div>
                  {detail.execution.startedAt && (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      {new Date(detail.execution.startedAt).toLocaleString()} → {detail.execution.finishedAt ? new Date(detail.execution.finishedAt).toLocaleString() : '—'}
                    </div>
                  )}
                </Section>
                {(detail.execution.correlationId || detail.execution.groupExecutionId || detail.execution.scheduleId) && (
                  <Section title="Trace">
                    {detail.execution.correlationId && <Row k="Correlation ID" v={detail.execution.correlationId} mono />}
                    {detail.execution.groupExecutionId && <Row k="Group Run" v={`#${detail.execution.groupExecutionId}`} />}
                    {detail.execution.scheduleId && <Row k="Schedule" v={`#${detail.execution.scheduleId}`} />}
                  </Section>
                )}
                <Section title={`Validation (${(detail.validationResults ?? []).length} rules)`}>
                  {(detail.validationResults ?? []).length === 0 && <div className="text-xs text-zinc-600">No rules evaluated.</div>}
                  {(detail.validationResults ?? []).map((v) => (
                    <div key={v.id} className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded mb-1 ${v.passed ? 'bg-emerald-600/5' : 'bg-red-600/10'}`}>
                      {v.passed ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <XCircle size={13} className="text-red-400 shrink-0" />}
                      <span className="font-mono text-sky-300">{v.jsonPath}</span>
                      <span className="text-zinc-500">{v.operator}</span>
                      {v.expectedValue != null && <span className="text-zinc-400">expected <b className="text-zinc-200">{v.expectedValue}</b></span>}
                      <span className="text-zinc-400 ml-auto">actual <b className={v.passed ? 'text-emerald-300' : 'text-red-300'}>{v.actualValue ?? 'null'}</b></span>
                    </div>
                  ))}
                </Section>
              </>
            ) : <div className="text-zinc-500 text-sm">Loading…</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-3">
      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v, mono, pre, maxH }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] text-zinc-600 uppercase">{k}</div>
      {pre
        ? <pre className={`text-xs text-zinc-300 bg-zinc-900/60 rounded p-2 overflow-auto ${maxH ? 'max-h-64' : 'max-h-40'}`}>{v}</pre>
        : <div className={`text-xs text-zinc-300 break-all ${mono ? 'font-mono' : ''}`}>{v}</div>}
    </div>
  );
}

function TimingCell({ label, value, strong }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-zinc-600 uppercase">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-zinc-100 font-semibold' : 'text-zinc-300'}`}>
        {value == null ? '—' : `${value} ms`}
      </span>
    </div>
  );
}

function prettyJson(s) {
  if (!s) return s;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function fmtSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
