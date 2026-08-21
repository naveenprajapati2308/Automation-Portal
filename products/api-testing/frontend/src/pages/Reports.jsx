import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileText, Mail, Layers, Clock, X } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { ExecRow, Meta } from './GroupsPanel.jsx';
import { ModalOverlay } from '../components/ModalOverlay.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { STATUS_BADGE, healthColor } from '../lib/statusColors.js';
import { downloadFrom } from '../lib/download.js';
import { Loader } from '../../../../../shared/ui/Loader.jsx';

export default function Reports() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState(null); // { type, id, targetName }

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await apiClient.get('/v1/reports', { params: { size: 100 } })).data,
    refetchInterval: 15000,
  });

  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Every Scheduler and Group run — endpoint, payload, validation rules and results, plus the report emailed after each one.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="text-left px-4 py-2 font-medium">When</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Target</th>
              <th className="text-left px-4 py-2 font-medium">Trigger</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Health</th>
              <th className="text-left px-4 py-2 font-medium">Emailed</th>
              <th className="text-center px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={`${r.type}-${r.id}`}
                className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-hover)] cursor-pointer"
                onClick={() => setViewing(r)}>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2.5">
                  {r.type === 'GROUP'
                    ? <span className="inline-flex items-center gap-1 text-[var(--accent-text)]"><Layers size={11} /> Group</span>
                    : <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]"><Clock size={11} /> Scheduled API</span>}
                </td>
                <td className="px-4 py-2.5 text-[var(--text-primary)]">{r.targetName}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                  {r.triggeredBy}{r.triggeredByEmail ? ` · ${r.triggeredByEmail}` : ''}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[r.status] ?? 'bg-[var(--bg-surface-2)] text-[var(--text-muted)]'}`}>
                    {r.status}
                  </span>
                </td>
                <td className={`px-4 py-2.5 font-semibold ${healthColor(r.healthPercent)}`}>
                  {r.healthPercent != null ? `${r.healthPercent}%` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {r.emailSent
                    ? <span className="inline-flex items-center gap-1 text-[var(--success-text)]"><Mail size={12} /> Sent</span>
                    : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button title="Download PDF"
                      onClick={() => downloadFrom(reportUrl(r, 'pdf'), 'execution-report.pdf')}
                      className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                      <FileDown size={13} />
                    </button>
                    <button title="Download Markdown"
                      onClick={() => downloadFrom(reportUrl(r, 'md'), 'execution-report.md')}
                      className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                      <FileText size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">
                No reports yet — reports are generated after a Scheduler or Group run.
              </td></tr>
            )}
          </tbody>
        </table>
        {isLoading && <div className="p-4"><Loader size={16} label="Loading reports…" /></div>}
        <div className="px-4">
          <Pagination page={page} pageSize={pageSize} totalRecords={items.length}
            onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      </div>

      {viewing && <ReportDetailDrawer report={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function reportUrl(r, ext) {
  return r.type === 'GROUP' ? `/v1/reports/group/${r.id}/${ext}` : `/v1/reports/history/${r.id}/${ext}`;
}

function ReportDetailDrawer({ report, onClose }) {
  return (
    <ModalOverlay onClose={onClose} align="end">
      <div className="w-[620px] h-full bg-[var(--bg-surface)] border-l border-[var(--border)] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">{report.type === 'GROUP' ? 'Group Run' : 'Scheduled Run'} · {report.targetName}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-5 flex flex-col gap-3">
          {report.type === 'GROUP' ? <GroupReportBody groupExecutionId={report.id} /> : <ApiReportBody historyId={report.id} />}
        </div>
      </div>
    </ModalOverlay>
  );
}

function GroupReportBody({ groupExecutionId }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['group-exec-detail', groupExecutionId],
    queryFn: async () => (await apiClient.get(`/v1/groups/executions/${groupExecutionId}`)).data,
  });
  if (isLoading || !detail) return <div className="py-6 flex justify-center"><Loader size={28} label="Loading…" /></div>;
  return (
    <>
      <div className="flex flex-wrap gap-4 text-xs">
        <Meta k="Status" v={detail.execution.status} />
        <Meta k="Health" v={detail.execution.healthPercent != null ? `${detail.execution.healthPercent}%` : '—'} />
        <Meta k="Passed / Failed" v={`${detail.execution.passedApis} / ${detail.execution.failedApis}`} />
        <Meta k="Trigger" v={detail.execution.triggeredBy} />
        <Meta k="Started" v={new Date(detail.execution.startedAt).toLocaleString()} />
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {(detail.executions ?? []).length} API call(s) in this run — endpoint, payload, rules and result for each.
      </div>
      <div className="border border-[var(--border)] rounded divide-y divide-[var(--border-soft)]">
        {(detail.executions ?? []).map((h) => <ExecRow key={h.id} h={h} />)}
      </div>
    </>
  );
}

function ApiReportBody({ historyId }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['history-detail', historyId],
    queryFn: async () => (await apiClient.get(`/v1/history/${historyId}`)).data,
  });
  if (isLoading || !detail) return <div className="py-6 flex justify-center"><Loader size={28} label="Loading…" /></div>;
  return (
    <div className="border border-[var(--border)] rounded divide-y divide-[var(--border-soft)]">
      <ExecRow h={detail.execution} />
    </div>
  );
}
