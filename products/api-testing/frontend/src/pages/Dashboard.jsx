import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Send, CalendarClock, CheckCircle2, XCircle, Timer, Activity, AlertTriangle,
  Boxes, Layers, Gauge, Rabbit, Turtle, Cpu,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';
import { Panel } from '../components/Panel.jsx';
import { Button } from '../components/Button.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { healthColor } from '../lib/statusColors.js';
import { useDateRange } from '../../../../../shared/ui/useDateRange.js';
import { DateRangeFilter } from '../../../../../shared/ui/DateRangeFilter.jsx';
import { DATE_RANGE_SCOPES, rangeLabel } from '../../../../../shared/ui/date-range.js';
import '../../../../../shared/ui/refreshing.css';
import { StatTile } from '../../../../../shared/ui/dashboard/StatTile.jsx';
import { ExecutionTrendChart } from '../../../../../shared/ui/dashboard/ExecutionTrendChart.jsx';
import { StatusMixDonut } from '../../../../../shared/ui/dashboard/StatusMixDonut.jsx';
import { Table } from '../../../../../shared/ui/dashboard/Table.jsx';
import { ListRow } from '../../../../../shared/ui/dashboard/ListRow.jsx';
import { EmptyState } from '../../../../../shared/ui/dashboard/EmptyState.jsx';
import { LoadingBlock } from '../../../../../shared/ui/dashboard/LoadingBlock.jsx';

const CLASS_COLOR_VARS = {
  '2xx': '--success-text', '3xx': '--info-text', '4xx': '--warning-text',
  '5xx': '--danger-text', ERROR: '--indigo-text', TIMEOUT: '--pink-text',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState('');
  const [range, setRange] = useDateRange(DATE_RANGE_SCOPES.APITESTING, '7d');

  const params = moduleId ? { moduleId, range } : { range };
  const { data: summary, isFetching: summaryFetching, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', moduleId, range],
    queryFn: async () => (await apiClient.get('/v1/dashboard/summary', { params })).data,
    refetchInterval: 10000,
  });
  const { data: trend = [], isFetching: trendFetching } = useQuery({
    queryKey: ['dashboard-trend', moduleId, range],
    queryFn: async () => (await apiClient.get('/v1/dashboard/trend', { params })).data,
    refetchInterval: 30000,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });

  // "Refreshing" (not first-load) treatment for a filter-triggered refetch, shared look
  // with the other 3 dashboards via shared/ui/refreshing.css.
  const refreshing = (summaryFetching || trendFetching) && (summary !== undefined);

  const flatModules = flattenModules(modules);
  const breakdown = summary?.statusClassBreakdown ?? {};
  const donutSegments = Object.keys(CLASS_COLOR_VARS).map((key) => ({
    key, label: key, value: breakdown[key] ?? 0, color: CLASS_COLOR_VARS[key],
  }));

  if (summaryLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <LoadingBlock label="Loading dashboard..." minHeight={400} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)]">{rangeLabel(range)}{moduleId ? ' · filtered by module' : ''}</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
        <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
          className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded px-2 py-2 text-xs outline-none focus:border-[var(--accent)]">
          <option value="">All modules</option>
          {flatModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <Button onClick={() => navigate('/tester')}>
          <Send size={15} /> API Test
        </Button>
        <Button variant="ghost" onClick={() => navigate('/scheduler')}>
          <CalendarClock size={15} /> Schedule API Test
        </Button>
      </div>

      <div className={`flex flex-col gap-5 ${refreshing ? 'dr-refreshing' : ''}`}>
      <div className="flex flex-wrap gap-3">
        <StatTile icon={Activity} label={`Executions (${rangeLabel(range)})`} value={summary?.totalExecutions ?? '—'} />
        <StatTile icon={CheckCircle2} label="Passed" value={summary?.passed ?? '—'} tone="success" />
        <StatTile icon={XCircle} label="Failed" value={summary?.failed ?? '—'} tone="danger" />
        <StatTile icon={Activity} label="Success Rate" value={summary ? `${summary.successRate}%` : '—'} />
        <StatTile icon={Timer} label="Avg Response" value={summary ? `${summary.avgDurationMs} ms` : '—'} />
        <StatTile icon={CalendarClock} label="Active Schedules" value={summary ? `${summary.activeSchedules}/${summary.totalSchedules}` : '—'} />
      </div>

      {/* Inventory + scheduler live status */}
      <div className="flex flex-wrap gap-3">
        <StatTile icon={Boxes} label="Total APIs"
          value={summary ? `${summary.totalRegularApis + summary.totalBaseApis}` : '—'} />
        <StatTile icon={Boxes} label="Regular / Base"
          value={summary ? `${summary.totalRegularApis} / ${summary.totalBaseApis}` : '—'} />
        <StatTile icon={Boxes} label="Modules" value={summary?.totalModules ?? '—'} />
        <StatTile icon={Layers} label="Groups" value={summary?.totalGroups ?? '—'} />
        <StatTile icon={Cpu} label="Running Jobs"
          value={summary?.schedulerStatus ? summary.schedulerStatus.activeWorkers : '—'} />
        <StatTile icon={Gauge} label="Queue Size"
          value={summary?.schedulerStatus ? summary.schedulerStatus.queueSize : '—'}
          tone={summary?.schedulerStatus?.queueSize > 0 ? 'warning' : undefined} />
      </div>

      {/* Fastest / slowest APIs (range window) */}
      <div className="grid grid-cols-2 gap-4">
        <Panel className="flex items-center gap-3" padded={false}>
          <div className="px-4 py-3 flex items-center gap-3 w-full">
          <Rabbit size={18} className="text-[var(--success-text)] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">Fastest API ({rangeLabel(range)})</div>
            {summary?.fastestApi
              ? <div className="text-sm text-[var(--text-primary)] truncate">{summary.fastestApi.apiName}
                  <span className="ml-2 text-[var(--success-text)] font-semibold tabular-nums">{summary.fastestApi.avgMs} ms</span>
                  <span className="ml-2 text-[var(--text-muted)]">avg over {summary.fastestApi.executions} runs</span>
                </div>
              : <EmptyState message="No data" />}
          </div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3" padded={false}>
          <div className="px-4 py-3 flex items-center gap-3 w-full">
          <Turtle size={18} className="text-[var(--warning-text)] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">Slowest API ({rangeLabel(range)})</div>
            {summary?.slowestApi
              ? <div className="text-sm text-[var(--text-primary)] truncate">{summary.slowestApi.apiName}
                  <span className="ml-2 text-[var(--warning-text)] font-semibold tabular-nums">{summary.slowestApi.avgMs} ms</span>
                  <span className="ml-2 text-[var(--text-muted)]">avg over {summary.slowestApi.executions} runs</span>
                </div>
              : <EmptyState message="No data" />}
          </div>
          </div>
        </Panel>
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
          title={`Status Classes (${rangeLabel(range)})`}
          segments={donutSegments}
          centerLabel="Total"
        />
      </div>

      {/* Group health + module stats */}
      <div className="grid grid-cols-2 gap-4">
        <Panel>
          <h2 className="tx-card-title">
            <Layers size={14} className="text-[var(--success-text)]" /> Group Health
          </h2>
          {(summary?.groupHealth ?? []).length === 0
            ? <EmptyState message="No groups yet — create one in the Scheduler tab" />
            : summary.groupHealth.map((g) => (
              <ListRow key={g.groupId}>
                <span className="tx-list-row-main">{g.name}</span>
                {g.status && <StatusBadge status={g.status} />}
                <span className={`font-semibold tabular-nums ${healthColor(g.healthPercent)}`}>{g.healthPercent != null ? `${g.healthPercent}%` : 'never ran'}</span>
                <span className="tx-list-row-end">{g.lastRunAt ? new Date(g.lastRunAt).toLocaleString() : ''}</span>
              </ListRow>
            ))}
        </Panel>
        <Panel>
          <h2 className="tx-card-title">Module-wise Statistics ({rangeLabel(range)})</h2>
          {(summary?.moduleStats ?? []).length === 0
            ? <EmptyState message="No module-tagged executions yet" />
            : (
              <Table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th className="tx-align-right">Runs</th>
                    <th className="tx-align-right">Passed</th>
                    <th className="tx-align-right">Failed</th>
                    <th className="tx-align-right">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.moduleStats.map((m) => (
                    <tr key={m.moduleId}>
                      <td>{m.moduleName}</td>
                      <td className="tx-align-right">{m.executions}</td>
                      <td className="tx-align-right" style={{ color: 'var(--success-text)' }}>{m.passed}</td>
                      <td className="tx-align-right" style={{ color: 'var(--danger-text)' }}>{m.failed}</td>
                      <td className="tx-align-right">{m.avgMs}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
        </Panel>
      </div>

      {/* Schedule health */}
      <div className="grid grid-cols-2 gap-4">
        <Panel>
          <h2 className="tx-card-title">
            <AlertTriangle size={14} className="text-[var(--warning-text)]" /> Failing Schedules
          </h2>
          {(summary?.failingSchedules ?? []).length === 0
            ? <EmptyState message="None — all schedules healthy" />
            : (summary.failingSchedules).map((s) => (
              <ListRow key={s.id}>
                <XCircle size={12} className="text-[var(--danger-text)]" />
                <span className="tx-list-row-main">{s.name}</span>
                <span className="tx-list-row-end">next {s.nextRunAt ? new Date(s.nextRunAt).toLocaleTimeString() : '—'}</span>
              </ListRow>
            ))}
        </Panel>
        <Panel>
          <h2 className="tx-card-title">
            <CalendarClock size={14} className="text-[var(--success-text)]" /> Next Runs Due
          </h2>
          {(summary?.nextRuns ?? []).length === 0
            ? <EmptyState message="No active schedules" />
            : (summary.nextRuns).map((s) => (
              <ListRow key={s.id}>
                <span className="tx-list-row-main">{s.name}</span>
                <StatusBadge status={s.lastRunStatus ?? 'NEVER_RUN'} formatLabel={(v) => (v === 'NEVER_RUN' ? 'never ran' : v)} />
                <span className="tx-list-row-end">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</span>
              </ListRow>
            ))}
        </Panel>
      </div>
      </div>
    </div>
  );
}
