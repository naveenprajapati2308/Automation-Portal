import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, X, ChevronUp, ChevronDown, History as HistoryIcon } from 'lucide-react';
import { apiClient } from '../api/client.js';

/**
 * Bottom-docked history panel for one saved request's own runs (apiType=
 * COLLECTION, apiId=requestId). This is scoped to a single API's workspace —
 * unrelated to the sidebar's global History page (schedule-oriented), which
 * this panel never reads from or writes to.
 */
export default function RequestHistoryPanel({ requestId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data } = useQuery({
    queryKey: ['collection-request-history', requestId],
    queryFn: async () => (await apiClient.get('/v1/history', {
      params: { apiType: 'COLLECTION', apiId: requestId, size: 25 },
    })).data,
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  const { data: detail } = useQuery({
    queryKey: ['history-detail', detailId],
    queryFn: async () => (await apiClient.get(`/v1/history/${detailId}`)).data,
    enabled: !!detailId,
  });

  const records = data?.content ?? [];

  if (!requestId) {
    return (
      <div className="shrink-0 border-t border-zinc-800 bg-[#1c1c1e] px-4 py-2.5 text-xs text-zinc-600 flex items-center gap-2">
        <HistoryIcon size={13} /> Save this request to start tracking its history here.
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-[#1c1c1e] flex flex-col" style={{ maxHeight: collapsed ? 'auto' : 240 }}>
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-200">
        <HistoryIcon size={13} />
        History for this API ({records.length})
        {collapsed ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
      </button>

      {!collapsed && (
        <div className="overflow-auto border-t border-zinc-900">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-900 sticky top-0 bg-[#1c1c1e]">
                <th className="text-left px-4 py-1.5 font-medium">Time</th>
                <th className="text-left px-4 py-1.5 font-medium">Method</th>
                <th className="text-left px-4 py-1.5 font-medium">Status</th>
                <th className="text-left px-4 py-1.5 font-medium">Duration</th>
                <th className="text-left px-4 py-1.5 font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} onClick={() => setDetailId(r.id)}
                  className="border-b border-zinc-900/60 hover:bg-zinc-900/60 cursor-pointer">
                  <td className="px-4 py-1.5 text-zinc-500">{new Date(r.executedAt).toLocaleString()}</td>
                  <td className="px-4 py-1.5 font-semibold text-zinc-300">{r.requestMethod}</td>
                  <td className="px-4 py-1.5">
                    {r.responseStatusCode
                      ? <span className={`inline-flex items-center gap-1 ${r.responseStatusClass === '2xx' || r.responseStatusClass === '3xx' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.responseStatusClass === '2xx' || r.responseStatusClass === '3xx' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {r.responseStatusCode}
                        </span>
                      : <span className="inline-flex items-center gap-1 text-red-400"><XCircle size={11} /> {r.responseStatusClass}</span>}
                  </td>
                  <td className="px-4 py-1.5 text-zinc-400 tabular-nums">{r.totalTimeMs} ms</td>
                  <td className="px-4 py-1.5 text-zinc-500 tabular-nums">{fmtSize(r.responseSizeBytes)}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-zinc-600">No runs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailId && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setDetailId(null)}>
          <div className="w-[520px] h-full bg-[#1c1c1e] border-l border-zinc-700 overflow-auto p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Run #{detailId}</h2>
              <button onClick={() => setDetailId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            {detail ? (
              <>
                <Section title="Request">
                  <Row k="Method / URL" v={`${detail.execution.requestMethod} ${detail.execution.requestUrl}`} mono />
                  <Row k="Headers (secrets masked)" v={prettyJson(detail.execution.requestHeaders)} mono pre />
                  {detail.execution.requestBody && <Row k="Body" v={detail.execution.requestBody} mono pre />}
                </Section>
                <Section title="Response">
                  <Row k="Status" v={`${detail.execution.responseStatusCode ?? '—'} (${detail.execution.responseStatusClass})`} />
                  {detail.execution.errorMessage && <Row k="Error" v={detail.execution.errorMessage} />}
                  {detail.responseBody && <Row k="Body" v={prettyJson(detail.responseBody)} mono pre maxH />}
                </Section>
                <Section title="Timing">
                  <div className="flex gap-4 text-xs">
                    <TimingCell label="TTFB" value={detail.execution.ttfbMs} />
                    <TimingCell label="Total" value={detail.execution.totalTimeMs} strong />
                  </div>
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
