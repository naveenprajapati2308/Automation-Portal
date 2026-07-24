import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import {
  Send, CalendarClock, CheckCircle2, XCircle, Timer, Activity, AlertTriangle,
  Boxes, Layers, Gauge, Rabbit, Turtle, Cpu,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';
import { Panel } from '../components/Panel.jsx';
import { Button } from '../components/Button.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { resolveThemeColors, healthColor } from '../lib/statusColors.js';
import { useThemeVersion } from '../lib/useThemeVersion.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);


const CLASS_COLOR_VARS = {
  '2xx': '--success-text', '3xx': '--info-text', '4xx': '--warning-text',
  '5xx': '--danger-text', ERROR: '--indigo-text', TIMEOUT: '--pink-text',
};

function StatTile({ icon: Icon, label, value, accent = 'text-[var(--text-primary)]' }) {
  return (
    <Panel className="flex-1 min-w-[130px]" padded={false}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Icon size={13} /> {label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState('');
  useThemeVersion();
  const tokens = resolveThemeColors([
    '--success-text', '--danger-text', '--info-text', '--warning-text',
    '--indigo-text', '--pink-text', '--text-muted', '--bg-surface', '--border-soft'
  ]);
  const PASS_COLOR = tokens['--success-text'];
  const FAIL_COLOR = tokens['--danger-text'];
  const CLASS_COLORS = Object.fromEntries(
    Object.entries(CLASS_COLOR_VARS).map(([key, varName]) => [key, tokens[varName]])
  );

  const params = moduleId ? { moduleId } : {};
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary', moduleId],
    queryFn: async () => (await apiClient.get('/v1/dashboard/summary', { params })).data,
    refetchInterval: 10000,
  });
  const { data: trend = [] } = useQuery({
    queryKey: ['dashboard-trend', moduleId],
    queryFn: async () => (await apiClient.get('/v1/dashboard/trend', { params: { ...params, days: 7 } })).data,
    refetchInterval: 30000,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });

  const flatModules = flattenModules(modules);
  const breakdown = summary?.statusClassBreakdown ?? {};
  const donutLabels = Object.keys(breakdown).filter((k) => breakdown[k] > 0);

  const donutData = {
    labels: donutLabels,
    datasets: [{
      data: donutLabels.map((k) => breakdown[k]),
      backgroundColor: donutLabels.map((k) => CLASS_COLORS[k]),
      borderColor: tokens['--bg-surface'],
      borderWidth: 2,
    }],
  };

  const trendData = {
    labels: trend.map((t) => t.date.slice(5)),
    datasets: [
      { label: 'Passed', data: trend.map((t) => t.passed), backgroundColor: PASS_COLOR, borderRadius: 4, maxBarThickness: 22 },
      { label: 'Failed', data: trend.map((t) => t.failed), backgroundColor: FAIL_COLOR, borderRadius: 4, maxBarThickness: 22 },
    ],
  };

  const axisOpts = {
    x: { grid: { display: false }, ticks: { color: tokens['--text-muted'], font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: tokens['--border-soft'] }, ticks: { color: tokens['--text-muted'], precision: 0, font: { size: 11 } } },
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)]">Last 30 days{moduleId ? ' · filtered by module' : ''}</p>
        </div>
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

      <div className="flex flex-wrap gap-3">
        <StatTile icon={Activity} label="Executions (30d)" value={summary?.totalExecutions ?? '—'} />
        <StatTile icon={CheckCircle2} label="Passed" value={summary?.passed ?? '—'} accent="text-[var(--success-text)]" />
        <StatTile icon={XCircle} label="Failed" value={summary?.failed ?? '—'} accent="text-[var(--danger-text)]" />
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
          accent={summary?.schedulerStatus?.queueSize > 0 ? 'text-[var(--warning-text)]' : 'text-[var(--text-primary)]'} />
      </div>

      {/* Fastest / slowest APIs (30d window) */}
      <div className="grid grid-cols-2 gap-4">
        <Panel className="flex items-center gap-3" padded={false}>
          <div className="px-4 py-3 flex items-center gap-3 w-full">
          <Rabbit size={18} className="text-[var(--success-text)] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">Fastest API (30d)</div>
            {summary?.fastestApi
              ? <div className="text-sm text-[var(--text-primary)] truncate">{summary.fastestApi.apiName}
                  <span className="ml-2 text-[var(--success-text)] font-semibold tabular-nums">{summary.fastestApi.avgMs} ms</span>
                  <span className="ml-2 text-[var(--text-muted)]">avg over {summary.fastestApi.executions} runs</span>
                </div>
              : <div className="text-sm text-[var(--text-muted)]">No data</div>}
          </div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3" padded={false}>
          <div className="px-4 py-3 flex items-center gap-3 w-full">
          <Turtle size={18} className="text-[var(--warning-text)] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">Slowest API (30d)</div>
            {summary?.slowestApi
              ? <div className="text-sm text-[var(--text-primary)] truncate">{summary.slowestApi.apiName}
                  <span className="ml-2 text-[var(--warning-text)] font-semibold tabular-nums">{summary.slowestApi.avgMs} ms</span>
                  <span className="ml-2 text-[var(--text-muted)]">avg over {summary.slowestApi.executions} runs</span>
                </div>
              : <div className="text-sm text-[var(--text-muted)]">No data</div>}
          </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Trend */}
        <Panel className="col-span-2">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Execution Trend (7 days)</h2>
          <div className="h-52">
            <Bar data={trendData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', align: 'end', labels: { color: tokens['--text-muted'], boxWidth: 10, boxHeight: 10, usePointStyle: true } },
                tooltip: { mode: 'index', intersect: false },
              },
              scales: axisOpts,
            }} />
          </div>
        </Panel>

        {/* Status-class donut */}
        <Panel>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Status Classes (30d)</h2>
          <div className="h-40 flex items-center justify-center">
            {donutLabels.length > 0
              ? <Doughnut data={donutData} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '65%',
                  plugins: { legend: { display: false } },
                }} />
              : <span className="text-xs text-[var(--text-muted)]">No data</span>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {donutLabels.map((k) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CLASS_COLORS[k] }} />
                {k} <span className="text-[var(--text-primary)] font-semibold ml-auto tabular-nums">{breakdown[k]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Group health + module stats */}
      <div className="grid grid-cols-2 gap-4">
        <Panel>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <Layers size={14} className="text-[var(--success-text)]" /> Group Health
          </h2>
          {(summary?.groupHealth ?? []).length === 0
            ? <div className="text-xs text-[var(--text-muted)]">No groups yet — create one in the Scheduler tab</div>
            : summary.groupHealth.map((g) => (
              <div key={g.groupId} className="flex items-center gap-2 text-xs py-1.5 border-b border-[var(--border-soft)]">
                <span className="text-[var(--text-secondary)]">{g.name}</span>
                {g.status && <StatusBadge status={g.status} />}
                <span className={`font-semibold tabular-nums ${healthColor(g.healthPercent)}`}>{g.healthPercent != null ? `${g.healthPercent}%` : 'never ran'}</span>
                <span className="ml-auto text-[var(--text-muted)]">{g.lastRunAt ? new Date(g.lastRunAt).toLocaleString() : ''}</span>
              </div>
            ))}
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Module-wise Statistics (30d)</h2>
          {(summary?.moduleStats ?? []).length === 0
            ? <div className="text-xs text-[var(--text-muted)]">No module-tagged executions yet</div>
            : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="text-left py-1.5 font-medium">Module</th>
                    <th className="text-right py-1.5 font-medium">Runs</th>
                    <th className="text-right py-1.5 font-medium">Passed</th>
                    <th className="text-right py-1.5 font-medium">Failed</th>
                    <th className="text-right py-1.5 font-medium">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.moduleStats.map((m) => (
                    <tr key={m.moduleId} className="border-b border-[var(--border-soft)]">
                      <td className="py-1.5 text-[var(--text-secondary)]">{m.moduleName}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--text-secondary)]">{m.executions}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--success-text)]">{m.passed}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--danger-text)]">{m.failed}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--text-secondary)]">{m.avgMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Panel>
      </div>

      {/* Schedule health */}
      <div className="grid grid-cols-2 gap-4">
        <Panel>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-[var(--warning-text)]" /> Failing Schedules
          </h2>
          {(summary?.failingSchedules ?? []).length === 0
            ? <div className="text-xs text-[var(--text-muted)]">None — all schedules healthy</div>
            : (summary.failingSchedules).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-[var(--border-soft)]">
                <XCircle size={12} className="text-[var(--danger-text)]" />
                <span className="text-[var(--text-secondary)]">{s.name}</span>
                <span className="ml-auto text-[var(--text-muted)]">next {s.nextRunAt ? new Date(s.nextRunAt).toLocaleTimeString() : '—'}</span>
              </div>
            ))}
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <CalendarClock size={14} className="text-[var(--success-text)]" /> Next Runs Due
          </h2>
          {(summary?.nextRuns ?? []).length === 0
            ? <div className="text-xs text-[var(--text-muted)]">No active schedules</div>
            : (summary.nextRuns).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-[var(--border-soft)]">
                <span className="text-[var(--text-secondary)]">{s.name}</span>
                <span className={`px-1.5 rounded-full text-[10px] ${s.lastRunStatus === 'SUCCESS' ? 'bg-[var(--success-bg-soft)] text-[var(--success-text)]' : s.lastRunStatus ? 'bg-[var(--danger-bg-soft)] text-[var(--danger-text)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                  {s.lastRunStatus ?? 'never ran'}
                </span>
                <span className="ml-auto text-[var(--text-muted)]">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</span>
              </div>
            ))}
        </Panel>
      </div>
    </div>
  );
}
