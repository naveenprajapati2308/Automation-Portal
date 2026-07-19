import { Fragment, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Play, Pause, Plus, CheckCircle2, XCircle, Clock, Layers, Pencil, Zap, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';
import GroupsPanel, { ActionBtn, MemberRow, HistoryDetailPanel } from './GroupsPanel.jsx';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';

const FREQ_LABEL = {
  EVERY_X_MIN: (v) => `Every ${v} min`,
  HOURLY: () => 'Hourly',
  DAILY: (v) => (v ? `Daily at ${v}` : 'Daily'),
  WEEKLY: (v) => (v ? `Weekly · ${v}` : 'Weekly'),
  CRON: (v) => `Cron: ${v}`,
};

export const WEEK_DAYS = [
  ['MON', 'Monday'], ['TUE', 'Tuesday'], ['WED', 'Wednesday'], ['THU', 'Thursday'],
  ['FRI', 'Friday'], ['SAT', 'Saturday'], ['SUN', 'Sunday'],
];

export default function Scheduler() {
  const qc = useQueryClient();
  const [view, setView] = useState('groups'); // groups | schedules
  const emptyForm = {
    name: '', targetType: 'API', regularApiId: '', groupId: '',
    frequencyType: 'EVERY_X_MIN', frequencyValue: '5',
    dailyTime: '10:00', weeklyDay: 'MON', weeklyTime: '10:00',
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null); // schedule row drill-down
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

  const frequencyValueFor = () => {
    switch (form.frequencyType) {
      case 'EVERY_X_MIN': case 'CRON': return form.frequencyValue;
      case 'DAILY': return form.dailyTime;                          // "10:00" → fires daily at 10:00
      case 'WEEKLY': return `${form.weeklyDay} ${form.weeklyTime}`; // "MON 10:00" → fires weekly on that day/time
      default: return null;
    }
  };

  const createMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        targetType: form.targetType,
        regularApiId: form.targetType === 'API' ? Number(form.regularApiId) : null,
        groupId: form.targetType === 'GROUP' ? Number(form.groupId) : null,
        frequencyType: form.frequencyType,
        frequencyValue: frequencyValueFor(),
      };
      return editingId
        ? apiClient.put(`/v1/schedules/${editingId}`, payload)
        : apiClient.post('/v1/schedules', payload);
    },
    onSuccess: () => { setForm(emptyForm); setEditingId(null); invalidate(); },
  });

  const runNowMut = useMutation({
    mutationFn: (id) => apiClient.post(`/v1/schedules/${id}/run-now`),
    onSuccess: invalidate,
  });

  // Load a schedule into the form, mapping frequencyValue back to the pickers.
  const startEdit = (s) => {
    const f = { ...emptyForm, name: s.name, targetType: s.targetType, frequencyType: s.frequencyType };
    if (s.targetType === 'API') f.regularApiId = String(s.regularApiId ?? '');
    else f.groupId = String(s.groupId ?? '');
    const v = s.frequencyValue ?? '';
    if (s.frequencyType === 'DAILY' && v) f.dailyTime = v;
    else if (s.frequencyType === 'WEEKLY' && v.includes(' ')) {
      const [day, time] = v.split(/\s+/);
      f.weeklyDay = day; f.weeklyTime = time;
    } else if (['EVERY_X_MIN', 'CRON'].includes(s.frequencyType)) f.frequencyValue = v;
    setForm(f);
    setEditingId(s.id);
  };

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
    && (!['EVERY_X_MIN', 'CRON'].includes(form.frequencyType) || form.frequencyValue.trim())
    && (form.frequencyType !== 'DAILY' || form.dailyTime)
    && (form.frequencyType !== 'WEEKLY' || (form.weeklyDay && form.weeklyTime));

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
          {form.frequencyType === 'DAILY' && (
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Run at (every day)
              <input type="time" className={`${inputCls} w-32`} value={form.dailyTime}
                onChange={(e) => setForm({ ...form, dailyTime: e.target.value })} />
            </label>
          )}
          {form.frequencyType === 'WEEKLY' && (
            <>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Day of week
                <select className={inputCls} value={form.weeklyDay}
                  onChange={(e) => setForm({ ...form, weeklyDay: e.target.value })}>
                  {WEEK_DAYS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Run at
                <input type="time" className={`${inputCls} w-32`} value={form.weeklyTime}
                  onChange={(e) => setForm({ ...form, weeklyTime: e.target.value })} />
              </label>
            </>
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
            {editingId ? <><Pencil size={14} /> Update Schedule</> : <><Plus size={14} /> Create Schedule</>}
          </button>
          {editingId && (
            <button onClick={() => { setForm(emptyForm); setEditingId(null); }}
              className="rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3 py-2 text-sm">
              Cancel
            </button>
          )}
          {createMut.isError && (
            <span className="text-xs text-red-400">{createMut.error?.response?.data?.message ?? 'Failed to save'}</span>
          )}
          {runNowMut.isError && (
            <span className="text-xs text-red-400">{runNowMut.error?.response?.data?.message ?? 'Failed to trigger run'}</span>
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
                  <th className="text-center px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ schedule: s, apiName, groupName }) => (<Fragment key={s.id}>
                  <tr onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    className={`border-b border-zinc-900 hover:bg-zinc-900/40 cursor-pointer ${expandedId === s.id ? 'bg-zinc-900/30' : ''}`}>
                    <td className="px-4 py-2.5 text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <ChevronRight size={12} className={`shrink-0 text-zinc-600 transition-transform ${expandedId === s.id ? 'rotate-90' : ''}`} />
                        {s.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">
                      {s.targetType === 'GROUP'
                        ? <span className="inline-flex items-center gap-1 text-emerald-300"><Layers size={11} /> {groupName}</span>
                        : apiName}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">{FREQ_LABEL[s.frequencyType]?.(s.frequencyValue)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === 'ACTIVE' ? 'bg-emerald-600/15 text-emerald-300'
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
                      <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                        <ActionBtn icon={Zap} label="Run Now" tone="run"
                          onClick={() => runNowMut.mutate(s.id)} disabled={runNowMut.isPending} />
                        <ActionBtn icon={Pencil} label="Edit" tone="edit" active={editingId === s.id}
                          onClick={() => startEdit(s)} />
                        {s.status === 'ACTIVE'
                          ? <ActionBtn icon={Pause} label="Pause" tone="warn" onClick={() => pauseMut.mutate(s.id)} />
                          : <ActionBtn icon={Play} label="Resume" tone="run" onClick={() => resumeMut.mutate(s.id)} />}
                        <ActionBtn icon={Trash2} label="Delete" tone="danger" onClick={() => deleteMut.mutate(s.id)} />
                      </div>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="border-b border-zinc-900">
                      <td colSpan={9} className="p-0">
                        {s.targetType === 'GROUP'
                          ? <ScheduleGroupExpand groupId={s.groupId} regularApis={regularApis} />
                          : <ScheduleApiExpand apiId={s.regularApiId} regularApis={regularApis} />}
                      </td>
                    </tr>
                  )}
                </Fragment>))}
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

/**
 * Drill-down for an API-target schedule: which API it runs + the full data
 * of its latest run (status, response body, validation).
 */
function ScheduleApiExpand({ apiId, regularApis }) {
  const api = regularApis.find((r) => r.id === apiId);
  const { data: latest, isLoading } = useQuery({
    queryKey: ['latest-history', apiId],
    queryFn: async () => (await apiClient.get('/v1/history', {
      params: { apiType: 'REGULAR', apiId, size: 1 },
    })).data,
    enabled: !!apiId,
  });
  const latestId = latest?.content?.[0]?.id;

  return (
    <div className="bg-zinc-950/40">
      <div className="px-4 pt-2.5 pb-1 text-[11px] text-zinc-500">
        This schedule runs 1 API — latest run data below.
      </div>
      {api && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs">
          <span className="font-semibold text-emerald-400">{api.method}</span>
          <span className="text-zinc-200">{api.name}</span>
          <span className="text-zinc-600 truncate">{api.urlTemplate}</span>
        </div>
      )}
      {isLoading
        ? <div className="px-4 pb-3 text-xs text-zinc-500">Loading last run…</div>
        : latestId
          ? <HistoryDetailPanel historyId={latestId} />
          : <div className="px-4 pb-3 text-xs text-zinc-600">This API has never run yet — no data to show.</div>}
    </div>
  );
}

/**
 * Drill-down for a group-target schedule: every API in the group (each row
 * expands to its own latest run data) + add/remove APIs right here.
 */
function ScheduleGroupExpand({ groupId, regularApis }) {
  const qc = useQueryClient();
  const { data: detail, isLoading } = useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => (await apiClient.get(`/v1/groups/${groupId}`)).data,
    enabled: !!groupId,
    refetchInterval: 8000,
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['group-detail', groupId] });
    qc.invalidateQueries({ queryKey: ['groups'] });
  };
  const addMemberMut = useMutation({
    mutationFn: (regularApiId) => apiClient.post(`/v1/groups/${groupId}/members`, { regularApiId }),
    onSuccess: invalidate,
  });
  const removeMemberMut = useMutation({
    mutationFn: (regularApiId) => apiClient.delete(`/v1/groups/${groupId}/members/${regularApiId}`),
    onSuccess: invalidate,
  });
  const memberIds = new Set((detail?.members ?? []).map((m) => m.regularApiId));

  if (isLoading) return <div className="px-4 py-3 text-xs text-zinc-500 bg-zinc-950/40">Loading group…</div>;
  if (!detail) return <div className="px-4 py-3 text-xs text-red-400 bg-zinc-950/40">Group not found (deleted?)</div>;

  return (
    <div className="bg-zinc-950/40">
      <div className="px-4 pt-2.5 pb-1 text-[11px] text-zinc-500">
        This schedule runs group "{detail.group.name}" — {detail.members.length} API(s). Click any API for its latest run data.
      </div>
      {detail.members.map((m) => (
        <MemberRow key={m.regularApiId} m={m} onRemove={() => removeMemberMut.mutate(m.regularApiId)} />
      ))}
      {detail.members.length === 0 && (
        <div className="px-4 py-2 text-xs text-zinc-600">No APIs in this group yet — add one below.</div>
      )}
      <div className="px-4 py-2.5">
        <select className={`${inputCls} py-1.5 w-full max-w-md`} value=""
          onChange={(e) => e.target.value && addMemberMut.mutate(Number(e.target.value))}>
          <option value="">+ Add Regular API to this group…</option>
          {regularApis.filter((r) => !memberIds.has(r.id))
            .map((r) => <option key={r.id} value={r.id}>{r.name} ({r.method})</option>)}
        </select>
      </div>
    </div>
  );
}
