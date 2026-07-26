import { useEffect, useState } from 'react';
import { Activity, Zap, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { api } from '../api/client.js';
import { StatusBadge, TypeBadge } from '../components/StatusBadge.jsx';
import { useDateRange } from '../../../../../shared/ui/useDateRange.js';
import { DateRangeFilter } from '../../../../../shared/ui/DateRangeFilter.jsx';
import { DATE_RANGE_SCOPES, rangeLabel } from '../../../../../shared/ui/date-range.js';
import '../../../../../shared/ui/refreshing.css';
import { Card } from '../../../../../shared/ui/dashboard/Card.jsx';
import { StatTile } from '../../../../../shared/ui/dashboard/StatTile.jsx';
import { ExecutionTrendChart } from '../../../../../shared/ui/dashboard/ExecutionTrendChart.jsx';
import { StatusMixDonut } from '../../../../../shared/ui/dashboard/StatusMixDonut.jsx';
import { ListRow } from '../../../../../shared/ui/dashboard/ListRow.jsx';
import { EmptyState } from '../../../../../shared/ui/dashboard/EmptyState.jsx';
import { LoadingBlock } from '../../../../../shared/ui/dashboard/LoadingBlock.jsx';

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
  const [trend, setTrend] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setRefreshing(true);
      try {
        const [s, t, runsPage] = await Promise.all([
          api.get('/dashboard/stats', { params: { range } }),
          api.get('/dashboard/trend', { params: { range } }),
          api.get('/runs', { params: { page: 0, size: 8 } }),
        ]);
        setStats(s);
        setTrend(t || []);
        setRecentRuns(runsPage.content || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFirstLoad(false);
        setRefreshing(false);
      }
    })();
  }, [range]);

  if (firstLoad) {
    return (
      <div className="flex flex-col gap-8">
        <LoadingBlock label="Loading dashboard..." minHeight={400} />
      </div>
    );
  }
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
      <div className="flex flex-wrap gap-3">
        <StatTile icon={Activity} label="Total Runs" value={stats?.totalRuns ?? 0} />
        <StatTile icon={CheckCircle2} label="Passed" tone="success" value={`${stats?.passedRuns ?? 0} (${passRate}%)`} />
        <StatTile icon={XCircle} label="Failed" tone="danger" value={stats?.failedRuns ?? 0} />
        <StatTile icon={Zap} label="Perf Tests" value={stats?.performanceTestCount ?? 0} />
        <StatTile icon={TrendingUp} label="Load Tests" value={stats?.loadTestCount ?? 0} />
        <StatTile icon={Clock} label="Scheduled" value={stats?.scheduledCount ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ExecutionTrendChart
          className="col-span-2"
          title={`Execution Trend (${rangeLabel(range)})`}
          data={trend}
          series={[
            { key: 'passed', label: 'Passed', color: '--success-text' },
            { key: 'failed', label: 'Failed', color: '--danger-text' },
          ]}
        />
        <StatusMixDonut
          title="Run Status Mix"
          segments={[
            { key: 'passed', label: 'Passed', value: stats?.passedRuns ?? 0, color: '--success-text' },
            { key: 'failed', label: 'Failed', value: stats?.failedRuns ?? 0, color: '--danger-text' },
            { key: 'running', label: 'Running', value: stats?.runningRuns ?? 0, color: '--accent-text' },
          ]}
          centerLabel="Total"
        />
      </div>

      {stats?.dailyRuns?.length > 0 && (
        <Card>
          <h2 className="tx-card-title">Runs (Last 20 Days)</h2>
          <MiniHistoryBar data={stats.dailyRuns} />
        </Card>
      )}

      <Card>
        <h2 className="tx-card-title">Recent Runs</h2>
        {recentRuns.length === 0 ? (
          <EmptyState message="No runs yet. Run a test to see results." />
        ) : (
          <div className="flex flex-col">
            {recentRuns.map((run) => (
              <ListRow key={run.id}>
                <StatusBadge status={run.status} />
                <span className="flex-1 font-semibold text-sm tx-list-row-main">{run.testName || `Run #${run.id}`}</span>
                <TypeBadge type={run.testType} />
                <span className="text-xs text-[var(--text-muted)] font-mono min-w-[80px] text-right">
                  {run.p95Ms ? `P95: ${run.p95Ms.toFixed(1)}ms` : ''}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
                </span>
              </ListRow>
            ))}
          </div>
        )}
      </Card>
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
