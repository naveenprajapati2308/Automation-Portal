import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronRight, Clock, History, ArrowLeft } from 'lucide-react';
import { api } from '../api/client.js';
import { Pagination } from '../components/Pagination.jsx';
import { StatusBadge, TypeBadge } from '../components/StatusBadge.jsx';
import { INPUT_CLASS, resolveThemeColors } from '../lib/statusColors.js';
import { useThemeVersion } from '../lib/useThemeVersion.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const PERCENTILES = [
  ['p50Ms', 'P50'], ['p75Ms', 'P75'], ['p90Ms', 'P90'], ['p95Ms', 'P95'],
  ['p99Ms', 'P99'], ['maxMs', 'MAX'], ['minMs', 'MIN'], ['avgMs', 'AVG'],
];

function RunMetricsChart({ runId }) {
  const [samples, setSamples] = useState([]);
  const themeVersion = useThemeVersion();

  useEffect(() => {
    api.get(`/runs/${runId}/metrics`).then(setSamples).catch(() => setSamples([]));
  }, [runId]);

  if (samples.length === 0) return null;

  const colors = resolveThemeColors(['--accent', '--warning-text']);
  const data = {
    labels: samples.map((s) => new Date(s.sampledAt).toLocaleTimeString()),
    datasets: [
      { label: 'P95 (ms)', data: samples.map((s) => s.p95Ms), borderColor: colors['--accent'], backgroundColor: colors['--accent'], yAxisID: 'y', tension: 0.3 },
      { label: 'VUs', data: samples.map((s) => s.vus), borderColor: colors['--warning-text'], backgroundColor: colors['--warning-text'], yAxisID: 'y1', tension: 0.3 },
    ],
  };
  const options = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { type: 'linear', position: 'left', title: { display: true, text: 'ms' } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'VUs' }, grid: { drawOnChartArea: false } },
    },
  };
  // key={themeVersion} forces a re-render (and re-resolved colors) on theme toggle
  return <Line key={themeVersion} data={data} options={options} />;
}

function RunDetail({ run, onBack }) {
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={14} /> Back to history
      </button>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{run.testName || `Run #${run.id}`}</h2>
          <StatusBadge status={run.status} />
        </div>

        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[
            ['Started', run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'],
            ['Duration', run.durationSec != null ? `${run.durationSec}s` : '—'],
            ['Test Type', run.testType || '—'],
            ['Trigger', run.runTrigger || '—'],
            ['Total Requests', run.totalRequests ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--bg-hover)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
              <div className="font-bold font-mono text-sm">{value}</div>
            </div>
          ))}
        </div>

        {(run.p50Ms != null || run.p95Ms != null) && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Latency Percentiles</h3>
            <div className="flex gap-3 flex-wrap">
              {PERCENTILES.map(([key, label]) => run[key] != null && (
                <div key={key} className={`px-5 py-3 rounded-lg text-center border ${key === 'p95Ms' ? 'border-[var(--accent)] bg-[var(--accent-bg-soft)]' : 'border-[var(--border)]'}`}>
                  <div className={`text-lg font-bold font-mono ${key === 'p95Ms' ? 'text-[var(--accent-text)]' : ''}`}>{run[key].toFixed(1)}ms</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(run.requestsPerSec != null || run.errorRatePct != null) && (
          <div className="flex gap-4 flex-wrap mb-6">
            {run.requestsPerSec != null && (
              <div className="px-5 py-3 bg-[var(--bg-hover)] rounded-lg text-center">
                <div className="text-lg font-bold font-mono">{run.requestsPerSec.toFixed(2)}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Req/Sec</div>
              </div>
            )}
            {run.errorRatePct != null && (
              <div className="px-5 py-3 bg-[var(--bg-hover)] rounded-lg text-center">
                <div className={`text-lg font-bold font-mono ${run.errorRatePct > 1 ? 'text-[var(--danger-text)]' : ''}`}>{run.errorRatePct.toFixed(2)}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">Error Rate</div>
              </div>
            )}
            {run.peakVus != null && (
              <div className="px-5 py-3 bg-[var(--bg-hover)] rounded-lg text-center">
                <div className="text-lg font-bold font-mono">{run.peakVus}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Peak VUs</div>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <RunMetricsChart runId={run.id} />
        </div>

        {run.thresholdResults?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Threshold Results</h3>
            <div className="flex flex-col gap-1.5">
              {run.thresholdResults.map((tr, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2 rounded-md bg-[var(--bg-hover)] text-sm">
                  <span className={tr.passed ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}>{tr.passed ? '✓' : '✗'}</span>
                  <span className="flex-1">{tr.name}</span>
                  <code className="text-xs text-[var(--text-muted)] font-mono">{typeof tr.value === 'number' ? tr.value.toFixed(1) : tr.value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {run.assertionResults?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Assertion Results</h3>
            <div className="flex flex-col gap-1.5">
              {run.assertionResults.map((ar, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2 rounded-md bg-[var(--bg-hover)] text-sm">
                  <span className={ar.passed ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}>{ar.passed ? '✓' : '✗'}</span>
                  <span className="flex-1">{ar.type} {ar.expected}</span>
                  {ar.actual && <code className="text-xs text-[var(--text-muted)] font-mono">actual: {ar.actual}</code>}
                </div>
              ))}
            </div>
          </div>
        )}

        {run.errorMessage && (
          <div className="p-3.5 bg-[var(--danger-bg-soft)] border border-[var(--danger-text)]/20 rounded-md font-mono text-xs text-[var(--danger-text)]">
            {run.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => { fetchRuns(); }, [page, pageSize, filterType, filterStatus]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const params = { page: page - 1, size: pageSize };
      if (filterType !== 'ALL') params.testType = filterType;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const data = await api.get('/runs', { params });
      setRuns(data.content || []);
      setTotalRecords(data.totalElements ?? (data.content || []).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (run) => {
    try {
      const detail = await api.get(`/runs/${run.id}`);
      setSelectedRun(detail);
    } catch {
      setSelectedRun(run);
    }
  };

  // While viewing a RUNNING run's detail, poll for the final result every 3s
  // (the run's own SSE stream is per-run-page, not needed for a summary view).
  useEffect(() => {
    if (selectedRun?.status !== 'RUNNING') return;
    pollRef.current = setInterval(async () => {
      try {
        const detail = await api.get(`/runs/${selectedRun.id}`);
        setSelectedRun(detail);
        if (detail.status !== 'RUNNING') clearInterval(pollRef.current);
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedRun?.id, selectedRun?.status]);

  if (selectedRun) return <RunDetail run={selectedRun} onBack={() => setSelectedRun(null)} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-muted)]">Test Type:</label>
          <select className={`${INPUT_CLASS} w-auto`} value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            {['ALL', 'PERF', 'LOAD', 'GROUP', 'VOLUME'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-muted)]">Status:</label>
          <select className={`${INPUT_CLASS} w-auto`} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            {['ALL', 'PASSED', 'FAILED', 'RUNNING', 'ABORTED', 'ERROR'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading run history…</p>
      ) : error ? (
        <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-surface-2)] text-left text-xs text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Test Name</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Started</th>
                <th className="px-4 py-2.5 font-semibold">Duration</th>
                <th className="px-4 py-2.5 font-semibold">P95 (ms)</th>
                <th className="px-4 py-2.5 font-semibold">Err %</th>
                <th className="px-4 py-2.5 font-semibold">RPS</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {runs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                  <History size={28} className="mx-auto mb-2 opacity-30" />
                  No runs yet. Run a test to see results here.
                </td></tr>
              ) : runs.map((run) => (
                <tr key={run.id} className="cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => openDetail(run)}>
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-1.5">{run.testName || `Run #${run.id}`} <ChevronRight size={13} className="opacity-50" /></span>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={run.testType} /></td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    <span className="flex items-center gap-1.5"><Clock size={11} /> {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{run.durationSec != null ? `${run.durationSec}s` : '—'}</td>
                  <td className="px-4 py-3 font-mono">{run.p95Ms != null ? run.p95Ms.toFixed(1) : '—'}</td>
                  <td className={`px-4 py-3 font-mono ${run.errorRatePct > 1 ? 'text-[var(--danger-text)]' : ''}`}>{run.errorRatePct != null ? `${run.errorRatePct.toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-3 font-mono">{run.requestsPerSec != null ? run.requestsPerSec.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-2">
            <Pagination page={page} pageSize={pageSize} totalRecords={totalRecords} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>
        </div>
      )}
    </div>
  );
}
