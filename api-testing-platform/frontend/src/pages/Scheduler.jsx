import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Play, Pause, Plus, CheckCircle2, XCircle, Clock, Layers } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';
import GroupsPanel from './GroupsPanel.jsx';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';

const FREQ_LABEL = {
  EVERY_X_MIN: (v) => `Every ${v} min`,
  HOURLY: () => 'Hourly',
  DAILY: () => 'Daily',
  WEEKLY: () => 'Weekly',
  CRON: (v) => `Cron: ${v}`,
};

export default function Scheduler() {
  const qc = useQueryClient();
  const [view, setView] = useState('groups'); // groups | schedules
  const [form, setForm] = useState({ name: '', targetType: 'API', regularApiId: '', groupId: '', frequencyType: 'EVERY_X_MIN', frequencyValue: '5' });
  const [groupBy, setGroupBy] = useState('module'); // module | cadence

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => (await apiClient.get('/v1/schedules')).data,
    refetchInterval: 10000,
  });
  const { data: regularApis = [] } = useQuery({
    queryKey: ['regular-apis'],
    queryFn: async () => (await apiClient.get('/v1/regular-apis')).data,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });
  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get('/v1/groups')).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['schedules'] });

  const createMut = useMutation({
    mutationFn: () => apiClient.post('/v1/schedules', {
      name: form.name,
      targetType: form.targetType,
      regularApiId: form.targetType === 'API' ? Number(form.regularApiId) : null,
      groupId: form.targetType === 'GROUP' ? Number(form.groupId) : null,
      frequencyType: form.frequencyType,
      frequencyValue: ['EVERY_X_MIN', 'CRON'].includes(form.frequencyType) ? form.frequencyValue : null,
    }),
    onSuccess: () => { setForm({ name: '', targetType: 'API', regularApiId: '', groupId: '', frequencyType: 'EVERY_X_MIN', frequencyValue: '5' }); invalidate(); },
  });

  const pauseMut = useMutation({ mutationFn: (id) => apiClient.patch(`/v1/schedules/${id}/pause`), onSuccess: invalidate });
  const resumeMut = useMutation({ mutationFn: (id) => apiClient.patch(`/v1/schedules/${id}/resume`), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: (id) => apiClient.delete(`/v1/schedules/${id}`), onSuccess: invalidate });

  const flatModules = flattenModules(modules);
  const moduleName = (id) => flatModules.find((m) => m.id === id)?.label ?? 'Ungrouped';

  const groups = useMemo(() => {
    const map = new Map();
    for (const v of schedules) {
      const key = groupBy === 'module'
        ? (v.schedule.targetType === 'GROUP' ? 'Groups' : moduleName(v.moduleId))
        : FREQ_LABEL[v.schedule.frequencyType]?.(v.schedule.frequencyValue) ?? v.schedule.frequencyType;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(v);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [schedules, groupBy, flatModules]);

  const canCreate = form.name.trim()
    && (form.targetType === 'API' ? form.regularApiId : form.groupId)
    && (!['EVERY_X_MIN', 'CRON'].includes(form.frequencyType) || form.frequencyValue.trim());

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">Scheduler</h1>
          <p className="text-xs text-zinc-500">Distributed-safe scheduling — claimed with row locks, bounded worker pool, retry with backoff</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-zinc-700 overflow-hidden text-xs">
            <button onClick={() => setView('groups')}
              className={`px-3 py-1.5 flex items-center gap-1.5 ${view === 'groups' ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
              <Layers size={12} /> Groups
            </button>
            <button onClick={() => setView('schedules')}
              className={`px-3 py-1.5 flex items-center gap-1.5 ${view === 'schedules' ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
              <Clock size={12} /> Schedules
            </button>
          </div>
          {view === 'schedules' && (
            <div className="flex rounded-md border border-zinc-700 overflow-hidden text-xs">
              {['module', 'cadence'].map((g) => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 capitalize ${groupBy === g ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  By {g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === 'groups' && <GroupsPanel />}

      {view === 'schedules' && (<>
      {/* Create */}
      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Schedule name
          <input className={inputCls} placeholder="e.g. Profile health check" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Target
          <select className={inputCls} value={form.targetType}
            onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
            <option value="API">Single API</option>
            <option value="GROUP">Group</option>
          </select>
        </label>
        {form.targetType === 'API' ? (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Regular API
            <select className={inputCls} value={form.regularApiId}
              onChange={(e) => setForm({ ...form, regularApiId: e.target.value })}>
              <option value="">Select API…</option>
              {regularApis.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.method})</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Group
            <select className={inputCls} value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Select group…</option>
              {allGroups.map(({ group: g, memberCount }) => (
                <option key={g.id} value={g.id}>{g.name} ({memberCount} APIs)</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Frequency
          <select className={inputCls} value={form.frequencyType}
            onChange={(e) => setForm({ ...form, frequencyType: e.target.value, frequencyValue: e.target.value === 'CRON' ? '0 0 * * * *' : '5' })}>
            <option value="EVERY_X_MIN">Every X minutes</option>
            <option value="HOURLY">Hourly</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="CRON">Cron expression</option>
          </select>
        </label>
        {form.frequencyType === 'EVERY_X_MIN' && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Minutes
            <input type="number" min="1" className={`${inputCls} w-24`} value={form.frequencyValue}
              onChange={(e) => setForm({ ...form, frequencyValue: e.target.value })} />
          </label>
        )}
        {form.frequencyType === 'CRON' && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Cron (sec min hour day month weekday)
            <input className={`${inputCls} w-52 font-mono`} value={form.frequencyValue}
              onChange={(e) => setForm({ ...form, frequencyValue: e.target.value })} />
          </label>
        )}
        <button disabled={!canCreate || createMut.isPending} onClick={() => createMut.mutate()}
          className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={14} /> Create Schedule
        </button>
        {createMut.isError && (
          <span className="text-xs text-red-400">{createMut.error?.response?.data?.message ?? 'Failed to create'}</span>
        )}
        {regularApis.length === 0 && (
          <p className="w-full text-xs text-amber-400">No Regular APIs yet — create one on the Regular APIs page first.</p>
        )}
      </div>

      {/* Grouped list */}
      {groups.map(([groupName, items]) => (
        <div key={groupName} className="rounded-lg border border-zinc-800 bg-[#1c1c1e]">
          <div className="px-4 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {groupName} <span className="text-zinc-600 normal-case">({items.length})</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">API</th>
                <th className="text-left px-4 py-2 font-medium">Frequency</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Last Run</th>
                <th className="text-left px-4 py-2 font-medium">Result</th>
                <th className="text-left px-4 py-2 font-medium">Next Run</th>
                <th className="text-left px-4 py-2 font-medium">Retries</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ schedule: s, apiName, groupName }) => (
                <tr key={s.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-4 py-2.5 text-zinc-200">{s.name}</td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {s.targetType === 'GROUP'
                      ? <span className="inline-flex items-center gap-1 text-emerald-300"><Layers size={11} /> {groupName}</span>
                      : apiName}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{FREQ_LABEL[s.frequencyType]?.(s.frequencyValue)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      s.status === 'ACTIVE' ? 'bg-emerald-600/15 text-emerald-300'
                        : s.status === 'PAUSED' ? 'bg-zinc-800 text-zinc-400' : 'bg-red-600/15 text-red-300'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2.5">
                    {s.lastRunStatus == null ? <span className="text-zinc-600">—</span>
                      : s.lastRunStatus === 'SUCCESS'
                        ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> SUCCESS</span>
                        : s.lastRunStatus === 'TIMEOUT'
                          ? <span className="inline-flex items-center gap-1 text-amber-400"><Clock size={12} /> TIMEOUT</span>
                          : <span className="inline-flex items-center gap-1 text-red-400"><XCircle size={12} /> FAILED</span>}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{s.status === 'ACTIVE' && s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{s.retryCount}/{s.maxRetries}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {s.status === 'ACTIVE'
                        ? <button onClick={() => pauseMut.mutate(s.id)} className="text-zinc-500 hover:text-amber-400" title="Pause"><Pause size={14} /></button>
                        : <button onClick={() => resumeMut.mutate(s.id)} className="text-zinc-500 hover:text-emerald-400" title="Resume"><Play size={14} /></button>}
                      <button onClick={() => deleteMut.mutate(s.id)} className="text-zinc-500 hover:text-red-400" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {schedules.length === 0 && (
        <div className="text-center text-zinc-600 text-sm py-8">No schedules yet</div>
      )}
      </>)}
    </div>
  );
}
