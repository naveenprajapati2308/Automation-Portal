import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, Play, Plus, CheckCircle2, XCircle, X, Layers, Clock,
  ChevronRight, Loader2, CalendarClock, AlertTriangle, Pencil,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { flattenModules } from './BaseApis.jsx';
import { WEEK_DAYS } from './Scheduler.jsx';

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';

const STATUS_BADGE = {
  SUCCESS: 'bg-emerald-600/15 text-emerald-300',
  PARTIAL: 'bg-amber-600/15 text-amber-300',
  FAILED: 'bg-red-600/15 text-red-300',
  RUNNING: 'bg-blue-600/15 text-blue-300',
};

export function healthColor(pct) {
  if (pct == null) return 'text-zinc-500';
  if (pct >= 99.9) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

/** Labeled row-action button: clear hit area, colored hover fill, press feedback. */
export function ActionBtn({ icon: Icon, label, onClick, disabled, tone = 'default', active }) {
  const tones = {
    default: 'border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 hover:border-zinc-500',
    run: 'border-emerald-800/70 text-emerald-400 hover:text-white hover:bg-emerald-600 hover:border-emerald-500',
    edit: 'border-sky-800/70 text-sky-400 hover:text-white hover:bg-sky-600 hover:border-sky-500',
    warn: 'border-amber-800/70 text-amber-400 hover:text-white hover:bg-amber-600 hover:border-amber-500',
    danger: 'border-red-900/70 text-red-400 hover:text-white hover:bg-red-600 hover:border-red-500',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[11px] font-semibold
        transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:pointer-events-none
        ${tones[tone] ?? tones.default} ${active ? 'ring-1 ring-sky-400 bg-sky-600/15' : ''}`}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

/**
 * Group management inside the Scheduler tab: latest groups with health,
 * drill-down into per-API status (incl. connected Base APIs and the actual
 * failure reason), run-now, membership and group scheduling.
 */
export default function GroupsPanel() {
  const qc = useQueryClient();
  const emptyGroupForm = { name: '', description: '', groupType: 'MODULE', moduleId: '', timeFrequency: 'NOW' };
  const [form, setForm] = useState(emptyGroupForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [execDetailId, setExecDetailId] = useState(null);
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedDay, setSchedDay] = useState('MON');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get('/v1/groups')).data,
    refetchInterval: 8000,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => (await apiClient.get('/v1/modules')).data,
  });
  const { data: regularApis = [] } = useQuery({
    queryKey: ['regular-apis'],
    queryFn: async () => (await apiClient.get('/v1/regular-apis')).data,
  });
  const { data: detail } = useQuery({
    queryKey: ['group-detail', selectedId],
    queryFn: async () => (await apiClient.get(`/v1/groups/${selectedId}`)).data,
    enabled: !!selectedId,
    refetchInterval: 8000,
  });
  const { data: executions } = useQuery({
    queryKey: ['group-executions', selectedId],
    queryFn: async () => (await apiClient.get('/v1/groups/executions', { params: { groupId: selectedId, size: 10 } })).data,
    enabled: !!selectedId,
    refetchInterval: 5000,
  });
  const { data: execDetail } = useQuery({
    queryKey: ['group-exec-detail', execDetailId],
    queryFn: async () => (await apiClient.get(`/v1/groups/executions/${execDetailId}`)).data,
    enabled: !!execDetailId,
    refetchInterval: 4000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['groups'] });
    qc.invalidateQueries({ queryKey: ['group-detail'] });
    qc.invalidateQueries({ queryKey: ['group-executions'] });
  };

  const createMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name, description: form.description || null, groupType: form.groupType,
        moduleId: form.groupType === 'MODULE' && form.moduleId ? Number(form.moduleId) : null,
        timeFrequency: form.groupType === 'TIME' ? form.timeFrequency : null,
      };
      return editingId
        ? apiClient.put(`/v1/groups/${editingId}`, payload)
        : apiClient.post('/v1/groups', payload);
    },
    onSuccess: () => { setForm(emptyGroupForm); setEditingId(null); invalidate(); },
  });

  const startEdit = (g) => {
    setForm({
      name: g.name, description: g.description ?? '', groupType: g.groupType,
      moduleId: g.moduleId != null ? String(g.moduleId) : '',
      timeFrequency: g.timeFrequency ?? 'NOW',
    });
    setEditingId(g.id);
  };
  const deleteMut = useMutation({
    mutationFn: (id) => apiClient.delete(`/v1/groups/${id}`),
    onSuccess: () => { setSelectedId(null); invalidate(); },
  });
  const runMut = useMutation({
    mutationFn: (id) => apiClient.post(`/v1/groups/${id}/execute`),
    onSuccess: invalidate,
  });
  const addMemberMut = useMutation({
    mutationFn: (regularApiId) => apiClient.post(`/v1/groups/${selectedId}/members`, { regularApiId }),
    onSuccess: invalidate,
  });
  const removeMemberMut = useMutation({
    mutationFn: (regularApiId) => apiClient.delete(`/v1/groups/${selectedId}/members/${regularApiId}`),
    onSuccess: invalidate,
  });
  const scheduleGroupMut = useMutation({
    mutationFn: (group) => apiClient.post('/v1/schedules', {
      name: `${group.name} (group)`, targetType: 'GROUP', groupId: group.id,
      frequencyType: group.timeFrequency === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
      // Anchored time — "10:00" fires daily at 10:00, "MON 10:00" weekly on Monday 10:00
      frequencyValue: group.timeFrequency === 'WEEKLY' ? `${schedDay} ${schedTime}` : schedTime,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const flatModules = flattenModules(modules);
  const moduleName = (id) => flatModules.find((m) => m.id === id)?.label ?? '—';
  const memberIds = useMemo(() => new Set((detail?.members ?? []).map((m) => m.regularApiId)), [detail]);
  const selectedGroup = groups.find((g) => g.group.id === selectedId)?.group;

  const canCreate = form.name.trim()
    && (form.groupType !== 'MODULE' || true); // module optional even for MODULE groups

  return (
    <div className="flex flex-col gap-5">
      {/* Create group */}
      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Group name
          <input className={inputCls} placeholder="e.g. Smoke Suite" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Type
          <select className={inputCls} value={form.groupType}
            onChange={(e) => setForm({ ...form, groupType: e.target.value })}>
            <option value="MODULE">Module-wise</option>
            <option value="TIME">Time-wise</option>
          </select>
        </label>
        {form.groupType === 'MODULE' && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Module
            <select className={inputCls} value={form.moduleId}
              onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
              <option value="">-Select Module-</option>
              {flatModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        )}
        {form.groupType === 'TIME' && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Cadence
            <select className={inputCls} value={form.timeFrequency}
              onChange={(e) => setForm({ ...form, timeFrequency: e.target.value })}>
              <option value="NOW">Execute now (on demand)</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-zinc-500 flex-1 min-w-[160px]">
          Description
          <input className={inputCls} placeholder="Optional" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <button disabled={!canCreate || createMut.isPending} onClick={() => createMut.mutate()}
          className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white">
          {editingId ? <><Pencil size={14} /> Update Group</> : <><Plus size={14} /> Create Group</>}
        </button>
        {editingId && (
          <button onClick={() => { setForm(emptyGroupForm); setEditingId(null); }}
            className="rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3 py-2 text-sm">
            Cancel
          </button>
        )}
        {createMut.isError && (
          <span className="text-xs text-red-400">{createMut.error?.response?.data?.message ?? 'Failed to save group'}</span>
        )}
      </div>

      {/* Latest groups with health */}
      <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e]">
        <div className="px-4 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Execution Groups <span className="text-zinc-600 normal-case">({groups.length})</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left px-4 py-2 font-medium">Group</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">APIs</th>
              <th className="text-left px-4 py-2 font-medium">Health</th>
              <th className="text-left px-4 py-2 font-medium">Last Run</th>
              <th className="text-left px-4 py-2 font-medium">Result</th>
              <th className="text-center px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group: g, memberCount, lastExecution: le }) => (
              <tr key={g.id} onClick={() => setSelectedId(g.id)}
                className={`border-b border-zinc-900 hover:bg-zinc-900/40 cursor-pointer ${selectedId === g.id ? 'bg-emerald-600/5' : ''}`}>
                <td className="px-4 py-2.5">
                  <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                    <Layers size={12} className="text-emerald-400" /> {g.name}
                    <span className="text-zinc-600 font-normal">#{g.id}</span>
                  </span>
                  {g.description && <div className="text-zinc-600">{g.description}</div>}
                </td>
                <td className="px-4 py-2.5 text-zinc-400">
                  {g.groupType === 'MODULE'
                    ? <span>Module · {moduleName(g.moduleId)}</span>
                    : <span className="inline-flex items-center gap-1"><Clock size={11} /> {g.timeFrequency}</span>}
                </td>
                <td className="px-4 py-2.5 text-zinc-300 tabular-nums">{memberCount}</td>
                <td className={`px-4 py-2.5 font-semibold tabular-nums ${healthColor(le?.healthPercent)}`}>
                  {le?.healthPercent != null ? `${le.healthPercent}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{le ? new Date(le.startedAt).toLocaleString() : 'never'}</td>
                <td className="px-4 py-2.5">
                  {le
                    ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[le.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {le.status === 'RUNNING' ? 'RUNNING…' : `${le.status} ${le.passedApis}/${le.totalApis}`}
                    </span>
                    : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <ActionBtn icon={Play} label="Run" tone="run"
                      onClick={() => runMut.mutate(g.id)} disabled={memberCount === 0 || runMut.isPending} />
                    <ActionBtn icon={Pencil} label="Edit" tone="edit" active={editingId === g.id}
                      onClick={() => startEdit(g)} />
                    <ActionBtn icon={Trash2} label="Delete" tone="danger"
                      onClick={() => deleteMut.mutate(g.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-600">No groups yet — create one above, then add Regular APIs to it</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Group detail */}
      {selectedId && detail && (
        <div className="rounded-lg border border-zinc-800 bg-[#1c1c1e] p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Layers size={14} className="text-emerald-400" /> {detail.group.name}
              <span className={`font-semibold tabular-nums ${healthColor(detail.lastExecution?.healthPercent)}`}>
                {detail.lastExecution?.healthPercent != null ? `${detail.lastExecution.healthPercent}% healthy` : ''}
              </span>
            </h2>
            <div className="ml-auto flex gap-2">
              {detail.group.groupType === 'TIME' && detail.group.timeFrequency !== 'NOW' && (
                <div className="flex items-center gap-1.5">
                  {detail.group.timeFrequency === 'WEEKLY' && (
                    <select className={`${inputCls} py-1.5 text-xs`} value={schedDay} title="Day of week"
                      onChange={(e) => setSchedDay(e.target.value)}>
                      {WEEK_DAYS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  )}
                  <input type="time" className={`${inputCls} py-1.5 text-xs w-28`} value={schedTime} title="Run at"
                    onChange={(e) => setSchedTime(e.target.value)} />
                  <button onClick={() => scheduleGroupMut.mutate(detail.group)} disabled={scheduleGroupMut.isPending}
                    className="flex items-center gap-1.5 rounded border border-emerald-700 text-emerald-300 hover:bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold">
                    <CalendarClock size={12} /> Schedule {detail.group.timeFrequency.toLowerCase()}
                  </button>
                </div>
              )}
              <button onClick={() => runMut.mutate(selectedId)} disabled={detail.members.length === 0 || runMut.isPending}
                className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-xs font-semibold text-white">
                <Play size={12} /> Run Group
              </button>
              <button onClick={() => setSelectedId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
          </div>
          {scheduleGroupMut.isSuccess && <div className="text-xs text-emerald-400">Schedule created — see the Schedules view.</div>}
          {scheduleGroupMut.isError && <div className="text-xs text-red-400">{scheduleGroupMut.error?.response?.data?.message ?? 'Failed to schedule'}</div>}

          {/* Members: per-API status + base API status + failure reason */}
          <div className="border border-zinc-800 rounded">
            <div className="px-3 py-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              APIs in this group ({detail.members.length})
            </div>
            {detail.members.map((m) => (
              <MemberRow key={m.regularApiId} m={m}
                onRemove={() => removeMemberMut.mutate(m.regularApiId)} />
            ))}
            {detail.members.length === 0 && <div className="px-3 py-3 text-xs text-zinc-600">No APIs in this group yet.</div>}
            {/* Add member */}
            <div className="px-3 py-2 flex items-center gap-2">
              <select className={`${inputCls} py-1.5 flex-1`} value=""
                onChange={(e) => e.target.value && addMemberMut.mutate(Number(e.target.value))}>
                <option value="">+ Add Regular API…</option>
                {regularApis.filter((r) => !memberIds.has(r.id))
                  .map((r) => <option key={r.id} value={r.id}>{r.name} ({r.method})</option>)}
              </select>
            </div>
          </div>

          {/* Recent group executions */}
          <div className="border border-zinc-800 rounded">
            <div className="px-3 py-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Recent Group Runs
            </div>
            {(executions?.content ?? []).map((e) => (
              <button key={e.id} onClick={() => setExecDetailId(e.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs border-b border-zinc-900 hover:bg-zinc-900/50 text-left">
                {e.status === 'RUNNING'
                  ? <Loader2 size={12} className="text-blue-400 animate-spin" />
                  : e.status === 'SUCCESS'
                    ? <CheckCircle2 size={12} className="text-emerald-400" />
                    : <XCircle size={12} className="text-red-400" />}
                <span className="text-zinc-300">Run #{e.id}</span>
                <span className={`px-1.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[e.status] ?? ''}`}>{e.status}</span>
                <span className="text-zinc-500">{e.passedApis}/{e.totalApis} passed</span>
                <span className={`tabular-nums ${healthColor(e.healthPercent)}`}>{e.healthPercent != null ? `${e.healthPercent}%` : ''}</span>
                <span className="text-zinc-600">{e.triggeredBy}</span>
                <span className="ml-auto text-zinc-600">{new Date(e.startedAt).toLocaleString()}</span>
                <ChevronRight size={12} className="text-zinc-600" />
              </button>
            ))}
            {(executions?.content ?? []).length === 0 && <div className="px-3 py-3 text-xs text-zinc-600">Never executed.</div>}
          </div>
        </div>
      )}

      {/* Group-run drill-down drawer */}
      {execDetailId && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setExecDetailId(null)}>
          <div className="w-[620px] h-full bg-[#1c1c1e] border-l border-zinc-700 overflow-auto p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Group Run #{execDetailId} {execDetail ? `· ${execDetail.groupName}` : ''}
              </h2>
              <button onClick={() => setExecDetailId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            {execDetail ? (
              <>
                <div className="flex flex-wrap gap-4 text-xs">
                  <Meta k="Status" v={execDetail.execution.status} />
                  <Meta k="Health" v={execDetail.execution.healthPercent != null ? `${execDetail.execution.healthPercent}%` : '—'} />
                  <Meta k="Passed / Failed" v={`${execDetail.execution.passedApis} / ${execDetail.execution.failedApis}`} />
                  <Meta k="Trigger" v={execDetail.execution.triggeredBy} />
                  <Meta k="Started" v={new Date(execDetail.execution.startedAt).toLocaleString()} />
                  <Meta k="Correlation" v={execDetail.execution.correlationId} mono />
                </div>
                <div className="text-[11px] text-zinc-500">
                  {(execDetail.executions ?? []).length} API call(s) in this run — click any row to see its full request/response data.
                </div>
                <div className="border border-zinc-800 rounded divide-y divide-zinc-900">
                  {(execDetail.executions ?? []).map((h) => <ExecRow key={h.id} h={h} />)}
                  {(execDetail.executions ?? []).length === 0 && (
                    <div className="px-3 py-3 text-xs text-zinc-600">
                      {execDetail.execution.status === 'RUNNING' ? 'Still running…' : 'No execution records.'}
                    </div>
                  )}
                </div>
              </>
            ) : <div className="text-zinc-500 text-sm">Loading…</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One API call inside a group run. Click to expand: fetches the full history
 * record (request, response body, validation results) on first open.
 */
function ExecRow({ h }) {
  const [open, setOpen] = useState(false);
  const passed = h.errorMessage == null
    && h.responseStatusCode != null && h.responseStatusCode < 400
    && h.validationPassed !== false;

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2 text-xs flex flex-col gap-0.5 text-left hover:bg-zinc-900/60 ${open ? 'bg-zinc-900/40' : ''}`}>
        <div className="flex items-center gap-2">
          <ChevronRight size={12} className={`text-zinc-600 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className={`px-1.5 rounded text-[10px] font-semibold ${h.apiType === 'BASE' ? 'bg-purple-600/15 text-purple-300' : 'bg-emerald-600/15 text-emerald-300'}`}>
            {h.apiType}
          </span>
          <span className="text-zinc-200">{h.apiName ?? '(ad-hoc)'}</span>
          <span className="font-semibold text-zinc-400">{h.requestMethod}</span>
          <StatusPill statusClass={h.responseStatusClass} statusCode={h.responseStatusCode} />
          {passed
            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400"><CheckCircle2 size={11} /> PASS</span>
            : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400"><XCircle size={11} /> FAIL</span>}
          <span className="ml-auto text-zinc-500 tabular-nums">{h.totalTimeMs} ms</span>
        </div>
        {h.errorMessage && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-400 pl-5">
            <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {h.errorMessage}
          </div>
        )}
      </button>

      {open && <HistoryDetailPanel historyId={h.id} totalTimeMs={h.totalTimeMs} />}
    </div>
  );
}

/**
 * Full request/response data for one execution record (same data the History
 * page shows): URL, status, timings, masked variables, validation, body.
 */
export function HistoryDetailPanel({ historyId, totalTimeMs }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['history-detail', historyId],
    queryFn: async () => (await apiClient.get(`/v1/history/${historyId}`)).data,
    enabled: !!historyId,
  });
  const exec = detail?.execution;

  return (
    <div className="px-4 pb-3 pt-1 flex flex-col gap-2 bg-zinc-950/40">
      {isLoading && <div className="text-xs text-zinc-500">Loading data…</div>}
      {exec && (
        <>
          <div className="flex flex-wrap gap-4 text-xs">
            <Meta k="URL" v={exec.requestUrl} mono />
            <Meta k="Status" v={`${exec.responseStatusCode ?? '—'} ${exec.responseStatusMessage ?? ''}`} />
            <Meta k="TTFB / Total" v={`${exec.ttfbMs ?? '—'} / ${totalTimeMs ?? exec.totalTimeMs ?? '—'} ms`} />
            <Meta k="Executed" v={exec.startedAt ? new Date(exec.startedAt).toLocaleString() : '—'} />
            {exec.injectedVariables && <Meta k="Variables (masked)" v={exec.injectedVariables} mono />}
          </div>
          {exec.errorMessage && (
            <div className="flex items-start gap-1.5 text-[11px] text-red-400">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {exec.errorMessage}
            </div>
          )}
          {(detail.validationResults ?? []).length > 0 && (
            <div className="border border-zinc-800 rounded divide-y divide-zinc-900">
              {detail.validationResults.map((v) => (
                <div key={v.id} className="px-2.5 py-1.5 text-[11px] flex items-center gap-2">
                  {v.passed ? <CheckCircle2 size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-red-400" />}
                  <span className="font-mono text-zinc-300">{v.jsonPath}</span>
                  <span className="text-zinc-500">{v.operator}</span>
                  {v.expectedValue != null && <span className="text-zinc-400">expected <span className="text-zinc-200">{v.expectedValue}</span></span>}
                  <span className="text-zinc-400">actual <span className={v.passed ? 'text-emerald-300' : 'text-red-300'}>{v.actualValue ?? 'null'}</span></span>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="text-[10px] text-zinc-600 uppercase mb-1">Response body</div>
            <pre className="text-[11px] text-zinc-300 bg-zinc-900/80 border border-zinc-800 rounded p-2.5 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              {prettyJson(detail.responseBody) ?? '(empty body)'}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * One API in the group member list. Click to expand its latest run's full
 * data — resolves the newest history record for this API, then shows it.
 */
export function MemberRow({ m, onRemove }) {
  const [open, setOpen] = useState(false);
  const { data: latest, isLoading } = useQuery({
    queryKey: ['latest-history', m.regularApiId],
    queryFn: async () => (await apiClient.get('/v1/history', {
      params: { apiType: 'REGULAR', apiId: m.regularApiId, size: 1 },
    })).data,
    enabled: open,
  });
  const latestId = latest?.content?.[0]?.id;

  return (
    <div className="border-b border-zinc-900">
      <button onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 flex flex-col gap-1 text-left hover:bg-zinc-900/60 ${open ? 'bg-zinc-900/40' : ''}`}>
        <div className="flex items-center gap-2 text-xs">
          <ChevronRight size={12} className={`text-zinc-600 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="font-semibold text-emerald-400">{m.method}</span>
          <span className="text-zinc-200">{m.name}</span>
          {m.dynamic && <span className="text-[9px] px-1 rounded bg-purple-600/20 text-purple-300">DYN</span>}
          <StatusPill statusClass={m.lastStatusClass} statusCode={m.lastStatusCode} />
          <span className="text-zinc-600 ml-auto">{m.lastExecutedAt ? new Date(m.lastExecutedAt).toLocaleString() : 'never ran'}</span>
          <span onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-zinc-600 hover:text-red-400 cursor-pointer" title="Remove from group"><Trash2 size={13} /></span>
        </div>
        <div className="text-zinc-600 text-[11px] truncate pl-5">{m.url}</div>
        {m.lastErrorMessage && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-400 pl-5">
            <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {m.lastErrorMessage}
          </div>
        )}
        {(m.baseApis ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1 pl-5">
            {m.baseApis.map((b) => (
              <span key={b.baseApiId} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-zinc-800 text-[10px] text-zinc-400"
                title={b.lastErrorMessage ?? ''}>
                Base: {b.name}
                <StatusPill statusClass={b.lastStatusClass} statusCode={b.lastStatusCode} small />
                {b.lastErrorMessage && <AlertTriangle size={10} className="text-red-400" />}
              </span>
            ))}
          </div>
        )}
      </button>
      {open && (isLoading
        ? <div className="px-4 pb-3 text-xs text-zinc-500">Loading last run…</div>
        : latestId
          ? <HistoryDetailPanel historyId={latestId} />
          : <div className="px-4 pb-3 text-xs text-zinc-600">This API has never run yet — no data to show.</div>)}
    </div>
  );
}

function prettyJson(s) {
  if (!s) return null;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function StatusPill({ statusClass, statusCode, small }) {
  const color = {
    '2xx': 'bg-emerald-600/15 text-emerald-300', '3xx': 'bg-sky-600/15 text-sky-300',
    '4xx': 'bg-amber-600/15 text-amber-300', '5xx': 'bg-red-600/15 text-red-300',
    ERROR: 'bg-purple-600/15 text-purple-300', TIMEOUT: 'bg-rose-600/15 text-rose-300',
  }[statusClass] ?? 'bg-zinc-800 text-zinc-500';
  return (
    <span className={`${small ? 'px-1' : 'px-1.5 py-0.5'} rounded-full text-[10px] font-semibold ${color}`}>
      {statusCode ?? statusClass ?? 'never'}
    </span>
  );
}

function Meta({ k, v, mono }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-zinc-600 uppercase">{k}</span>
      <span className={`text-zinc-300 ${mono ? 'font-mono text-[10px] break-all max-w-[180px]' : ''}`}>{v}</span>
    </div>
  );
}
