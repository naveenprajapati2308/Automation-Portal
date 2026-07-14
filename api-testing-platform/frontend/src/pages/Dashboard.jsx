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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Status palettes validated for the #181818 dark surface (lightness band,
// chroma, CVD separation, contrast) — do not swap for lighter steps.
const PASS_COLOR = '#059669';
const FAIL_COLOR = '#ef4444';
const CLASS_COLORS = {
  '2xx': '#059669', '3xx': '#0284c7', '4xx': '#d97706',
  '5xx': '#ef4444', ERROR: '#9333ea', TIMEOUT: '#e11d48',
};

function StatTile({ icon: Icon, label, value, accent = 'text-zinc-100' }) {
  return (
    <div className="flex-1 min-w-[130px] rounded-lg border border-zinc-800 bg-[#1c1c1e] px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500"><Icon size={13} /> {label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState('');

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
      borderColor: '#181818',
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
    x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#71717a', precision: 0, font: { size: 11 } } },
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-zinc-500">Last 30 days{moduleId ? ' · filtered by module' : ''}</p>
        </div>
        <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-xs outline-none focus:border-emerald-500">
          <option value="">All modules</option>
          {flatModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button onClick={() => navigate('/tester')}
          className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white">
          <Send size={15} /> API Test
        </button>
        <button onClick={() => navigate('/scheduler')}
          className="flex items-center gap-2 rounded-md border border-emerald-700 text-emerald-300 hover:bg-emerald-600/10 px-4 py-2.5 text-sm font-semibold">
          <CalendarClock size={15} /> Schedule API Test
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatTile icon={Activity} label="Executions (30d)" value={summary?.totalExecutions ?? '—'} />
        <StatTile icon={CheckCircle2} label="Passed" value={summary?.passed ?? '—'} accent="text-emerald-400" />
        <StatTile icon={XCircle} label="Failed" value={summary?.failed ?? '—'} accent="text-red-400" />
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
          accent={summary?.schedulerStatus?.queueSize > 0 ? 'text-amber-400' : 'text-zinc-100'} />
      </div>

      {/* Fastest / slowest APIs (30d window) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] px-4 py-3 flex items-center gap-3">
          <Rabbit size={18} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Fastest API (30d)</div>
            {summary?.fastestApi
              ? <div className="text-sm text-zinc-200 truncate">{summary.fastestApi.apiName}
                  <span className="ml-2 text-emerald-400 font-semibold tabular-nums">{summary.fastestApi.avgMs} ms</span>
                  <span className="ml-2 text-zinc-600">avg over {summary.fastestApi.executions} runs</span>
                </div>
              : <div className="text-sm text-zinc-600">No data</div>}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] px-4 py-3 flex items-center gap-3">
          <Turtle size={18} className="text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Slowest API (30d)</div>
            {summary?.slowestApi
              ? <div className="text-sm text-zinc-200 truncate">{summary.slowestApi.apiName}
                  <span className="ml-2 text-amber-400 font-semibold tabular-nums">{summary.slowestApi.avgMs} ms</span>
                  <span className="ml-2 text-zinc-600">avg over {summary.slowestApi.executions} runs</span>
                </div>
              : <div className="text-sm text-zinc-600">No data</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Trend */}
        <div className="col-span-2 rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Execution Trend (7 days)</h2>
          <div className="h-52">
            <Bar data={trendData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', align: 'end', labels: { color: '#a1a1aa', boxWidth: 10, boxHeight: 10, usePointStyle: true } },
                tooltip: { mode: 'index', intersect: false },
              },
              scales: axisOpts,
            }} />
          </div>
        </div>

        {/* Status-class donut */}
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Status Classes (30d)</h2>
          <div className="h-40 flex items-center justify-center">
            {donutLabels.length > 0
              ? <Doughnut data={donutData} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '65%',
                  plugins: { legend: { display: false } },
                }} />
              : <span className="text-xs text-zinc-600">No data</span>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {donutLabels.map((k) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CLASS_COLORS[k] }} />
                {k} <span className="text-zinc-200 font-semibold ml-auto tabular-nums">{breakdown[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group health + module stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Layers size={14} className="text-emerald-400" /> Group Health
          </h2>
          {(summary?.groupHealth ?? []).length === 0
            ? <div className="text-xs text-zinc-600">No groups yet — create one in the Scheduler tab</div>
            : summary.groupHealth.map((g) => (
              <div key={g.groupId} className="flex items-center gap-2 text-xs py-1.5 border-b border-zinc-900">
                <span className="text-zinc-300">{g.name}</span>
                {g.status && (
                  <span className={`px-1.5 rounded-full text-[10px] font-semibold ${
                    g.status === 'SUCCESS' ? 'bg-emerald-600/15 text-emerald-300'
                      : g.status === 'RUNNING' ? 'bg-blue-600/15 text-blue-300'
                        : g.status === 'PARTIAL' ? 'bg-amber-600/15 text-amber-300' : 'bg-red-600/15 text-red-300'
                  }`}>{g.status}</span>
                )}
                <span className={`font-semibold tabular-nums ${
                  g.healthPercent == null ? 'text-zinc-600'
                    : g.healthPercent >= 99.9 ? 'text-emerald-400'
                      : g.healthPercent >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>{g.healthPercent != null ? `${g.healthPercent}%` : 'never ran'}</span>
                <span className="ml-auto text-zinc-600">{g.lastRunAt ? new Date(g.lastRunAt).toLocaleString() : ''}</span>
              </div>
            ))}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-2">Module-wise Statistics (30d)</h2>
          {(summary?.moduleStats ?? []).length === 0
            ? <div className="text-xs text-zinc-600">No module-tagged executions yet</div>
            : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-1.5 font-medium">Module</th>
                    <th className="text-right py-1.5 font-medium">Runs</th>
                    <th className="text-right py-1.5 font-medium">Passed</th>
                    <th className="text-right py-1.5 font-medium">Failed</th>
                    <th className="text-right py-1.5 font-medium">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.moduleStats.map((m) => (
                    <tr key={m.moduleId} className="border-b border-zinc-900">
                      <td className="py-1.5 text-zinc-300">{m.moduleName}</td>
                      <td className="py-1.5 text-right tabular-nums text-zinc-300">{m.executions}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-400">{m.passed}</td>
                      <td className="py-1.5 text-right tabular-nums text-red-400">{m.failed}</td>
                      <td className="py-1.5 text-right tabular-nums text-zinc-400">{m.avgMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* Schedule health */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" /> Failing Schedules
          </h2>
          {(summary?.failingSchedules ?? []).length === 0
            ? <div className="text-xs text-zinc-600">None — all schedules healthy</div>
            : (summary.failingSchedules).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-zinc-900">
                <XCircle size={12} className="text-red-400" />
                <span className="text-zinc-300">{s.name}</span>
                <span className="ml-auto text-zinc-600">next {s.nextRunAt ? new Date(s.nextRunAt).toLocaleTimeString() : '—'}</span>
              </div>
            ))}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <CalendarClock size={14} className="text-emerald-400" /> Next Runs Due
          </h2>
          {(summary?.nextRuns ?? []).length === 0
            ? <div className="text-xs text-zinc-600">No active schedules</div>
            : (summary.nextRuns).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-zinc-900">
                <span className="text-zinc-300">{s.name}</span>
                <span className={`px-1.5 rounded-full text-[10px] ${s.lastRunStatus === 'SUCCESS' ? 'bg-emerald-600/15 text-emerald-300' : s.lastRunStatus ? 'bg-red-600/15 text-red-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  {s.lastRunStatus ?? 'never ran'}
                </span>
                <span className="ml-auto text-zinc-600">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
