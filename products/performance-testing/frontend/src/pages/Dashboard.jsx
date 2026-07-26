import { useEffect, useState } from 'react';
import { Activity, Zap, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { api } from '../api/client.js';
import { StatusBadge, TypeBadge } from '../components/StatusBadge.jsx';
import { useDateRange } from '../../../../../shared/ui/useDateRange.js';
import { DateRangeFilter } from '../../../../../shared/ui/DateRangeFilter.jsx';
import { DATE_RANGE_SCOPES, rangeLabel } from '../../../../../shared/ui/date-range.js';
import '../../../../../shared/ui/refreshing.css';

function StatCard({ icon: Icon, label, value, sub, tone }) {
  const toneCls = {
    accent: 'text-[var(--accent-text)]',
    success: 'text-[var(--success-text)]',
    danger: 'text-[var(--danger-text)]',
  }[tone] || 'text-[var(--text-primary)]';
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-muted)] text-sm">{label}</span>
        <Icon size={18} className={toneCls} />
      </div>
      <div className={`text-3xl font-extrabold ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

function MiniHistoryBar({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.slice(-20).map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ${d.value}`}
          className="flex-1 min-w-[6px] bg-[var(--accent)] rounded-t"
          style={{ height: `${Math.max(4, (d.value / max) * 40)}px`, opacity: 0.7 + (i / data.length) * 0.3 }}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useDateRange(DATE_RANGE_SCOPES.PERFORMANCE, '7d');
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setRefreshing(true);
      try {
        const [s, runsPage] = await Promise.all([
          api.get('/dashboard/stats', { params: { range } }),
          api.get('/runs', { params: { page: 0, size: 8 } }),
        ]);
        setStats(s);
        setRecentRuns(runsPage.content || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFirstLoad(false);
        setRefreshing(false);
      }
    })();
  }, [range]);

  if (firstLoad) return <p className="text-[var(--text-muted)]">Loading dashboard…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  const passRate = stats?.totalRuns > 0 ? ((stats.passedRuns / stats.totalRuns) * 100).toFixed(1) : '—';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold mb-1">Performance Testing</h1>
          <p className="text-[var(--text-muted)] leading-relaxed max-w-2xl">
            Real-time visibility into API performance — latency percentiles, error rates, virtual user
            load shapes, and drift detection. All powered by k6 under the hood.
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className={`flex flex-col gap-8 ${refreshing && !firstLoad ? 'dr-refreshing' : ''}`}>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <StatCard icon={Activity} label="Total Runs" value={stats?.totalRuns ?? 0} sub={rangeLabel(range)} />
        <StatCard icon={CheckCircle2} label="Passed" tone="success" value={stats?.passedRuns ?? 0} sub={`${passRate}% pass rate`} />
        <StatCard icon={XCircle} label="Failed" tone="danger" value={stats?.failedRuns ?? 0} />
        <StatCard icon={Zap} label="Perf Tests" value={stats?.performanceTestCount ?? 0} sub="Configured" />
        <StatCard icon={TrendingUp} label="Load Tests" value={stats?.loadTestCount ?? 0} sub="Configured" />
        <StatCard icon={Clock} label="Scheduled" value={stats?.scheduledCount ?? 0} sub="Active CRON jobs" />
      </div>

      {stats?.dailyRuns?.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
          <h2 className="font-bold text-sm mb-4">Runs (Last 20 Days)</h2>
          <MiniHistoryBar data={stats.dailyRuns} />
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
        <h2 className="font-bold text-sm mb-4">Recent Runs</h2>
        {recentRuns.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-6">No runs yet. Run a test to see results.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-4 py-3">
                <StatusBadge status={run.status} />
                <span className="flex-1 font-semibold text-sm">{run.testName || `Run #${run.id}`}</span>
                <TypeBadge type={run.testType} />
                <span className="text-xs text-[var(--text-muted)] font-mono min-w-[80px] text-right">
                  {run.p95Ms ? `P95: ${run.p95Ms.toFixed(1)}ms` : ''}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--accent-bg-soft)] border border-[var(--accent-border-soft)] rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Zap size={16} className="text-[var(--accent-text)]" /> Performance Test</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Runs a fixed number of sequential iterations and measures P50–P99 latency. Ideal for
            validating SLAs on individual API endpoints.
          </p>
        </div>
        <div className="bg-[var(--warning-bg-soft)] border border-[var(--warning-text)]/20 rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-[var(--warning-text)]" /> Load Test</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Ramps virtual users from baseline to peak, holds steady, then ramps down. A live SSE
            stream shows VU count, RPS, and error rate as the test runs.
          </p>
        </div>
      </div>
    </div>
  );
}
