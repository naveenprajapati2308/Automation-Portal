import { useCallback, useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, ToggleLeft, ToggleRight, RefreshCw,
  Layers, Play, Activity, Pause, Loader2, Plus, Trash2, X,
} from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/Button.jsx';
import { StatusBadge, TypeBadge } from '../components/StatusBadge.jsx';
import { INPUT_CLASS } from '../lib/statusColors.js';

function QueueStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-[var(--bg-hover)] rounded-lg px-3.5 py-3 border border-[var(--border-soft)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={14} className={tone} />
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function QueueStatusPanel() {
  const [status, setStatus] = useState(null);

  const fetchStatus = useCallback(async () => {
    try { setStatus(await api.get('/queue/status')); } catch { /* queue endpoint might be briefly unreachable */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!status) return null;
  const runningPct = status.maxConcurrentRuns > 0 ? Math.round((status.runningCount / status.maxConcurrentRuns) * 100) : 0;
  const barTone = status.isAtCapacity ? 'bg-[var(--danger-text)]' : runningPct > 60 ? 'bg-[var(--warning-text)]' : 'bg-[var(--accent)]';

  return (
    <div className={`rounded-xl border p-5 ${status.isAtCapacity ? 'border-[var(--danger-text)]/30 bg-[var(--danger-bg-soft)]' : 'border-[var(--accent-border-soft)] bg-[var(--accent-bg-soft)]'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--accent-text)]" />
          <span className="font-bold text-sm">Execution Queue Status</span>
          {status.isAtCapacity && <span className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] border border-[var(--danger-text)]/30 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide">AT CAPACITY</span>}
        </div>
        <button onClick={fetchStatus} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Refresh"><RefreshCw size={14} /></button>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <QueueStat icon={Loader2} label="Running" value={`${status.runningCount} / ${status.maxConcurrentRuns}`} tone="text-[var(--info-text)]" />
        <QueueStat icon={Pause} label="Pending" value={status.pendingCount} tone="text-[var(--warning-text)]" />
        <QueueStat icon={XCircle} label="Failed" value={status.failedCount} tone="text-[var(--danger-text)]" />
        <QueueStat icon={CheckCircle2} label="Completed" value={status.completedCount} tone="text-[var(--success-text)]" />
      </div>
      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
        <span>Capacity ({runningPct}%)</span>
        <span>{status.isAtCapacity ? 'Throttling — new jobs wait for a free slot' : 'Accepting jobs'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${Math.min(runningPct, 100)}%` }} />
      </div>
    </div>
  );
}

const CRON_HUMAN = {
  '0 0 8 * * ?': 'Every day at 8:00 AM',
  '0 0 2 * * ?': 'Every day at 2:00 AM',
  '0 30 6 * * ?': 'Every day at 6:30 AM',
  '0 0 0 * * ?': 'Every midnight',
  '0 0 * * * ?': 'Every hour',
  '0 0/30 * * * ?': 'Every 30 minutes',
  '0 0 8 ? * MON-FRI': 'Weekdays at 8:00 AM',
};
const cronHuman = (cron) => (!cron ? 'Manual only' : CRON_HUMAN[cron] || cron);

const NEW_SCHEDULE = { targetType: 'PERF_TEST', targetId: '', cronExpression: '', timezone: 'Asia/Kolkata', isEnabled: true };

export default function Scheduler() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(NEW_SCHEDULE);
  const [targets, setTargets] = useState({ PERF_TEST: [], LOAD_TEST: [], GROUP: [] });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/schedules');
      setSchedules(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    Promise.all([api.get('/performance-tests'), api.get('/load-tests'), api.get('/test-groups')])
      .then(([pt, lt, g]) => setTargets({ PERF_TEST: pt, LOAD_TEST: lt, GROUP: g }))
      .catch(() => {});
  }, [fetchSchedules]);

  const toggleActive = async (schedule) => {
    try { await api.post(`/schedules/${schedule.id}/toggle`); fetchSchedules(); }
    catch (err) { alert(err.message); }
  };

  const deleteSchedule = async (schedule) => {
    if (!window.confirm(`Delete the schedule for "${schedule.name}"?`)) return;
    try { await api.delete(`/schedules/${schedule.id}`); fetchSchedules(); }
    catch (err) { alert(err.message); }
  };

  const triggerNow = async (schedule) => {
    setTriggering(schedule.id);
    try {
      const path = schedule.type === 'LOAD' ? `/load-tests/${schedule.refId}/run`
        : schedule.type === 'GROUP' ? `/test-groups/${schedule.refId}/run`
        : `/performance-tests/${schedule.refId}/run`;
      await api.post(path);
      fetchSchedules();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setTriggering(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedules', { ...form, targetId: Number(form.targetId) });
      setCreating(false);
      setForm(NEW_SCHEDULE);
      fetchSchedules();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading schedules…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[var(--text-muted)] max-w-xl">
          Scheduled performance tests, load tests, and groups appear here. Toggle them on/off, trigger
          immediately, or view last execution status. Scheduled runs are <strong>queued</strong> and
          dispatched at controlled concurrency to keep the module healthy.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={fetchSchedules}><RefreshCw size={14} /> Refresh</Button>
          <Button onClick={() => setCreating(true)}><Plus size={14} /> New Schedule</Button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-4 max-w-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">New Schedule</h3>
            <button type="button" onClick={() => setCreating(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Target Type</label>
              <select className={INPUT_CLASS} value={form.targetType} onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value, targetId: '' }))}>
                <option value="PERF_TEST">Performance Test</option>
                <option value="LOAD_TEST">Load Test</option>
                <option value="GROUP">Test Group</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Target</label>
              <select required className={INPUT_CLASS} value={form.targetId} onChange={(e) => setForm((p) => ({ ...p, targetId: e.target.value }))}>
                <option value="">Select…</option>
                {targets[form.targetType].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">CRON Expression</label>
              <input required className={`${INPUT_CLASS} font-mono`} placeholder="0 0 8 * * ?" value={form.cronExpression} onChange={(e) => setForm((p) => ({ ...p, cronExpression: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Timezone</label>
              <input className={INPUT_CLASS} value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit">Create Schedule</Button>
          </div>
        </form>
      )}

      <QueueStatusPanel />

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-surface-2)] text-left text-xs text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Schedule</th>
              <th className="px-4 py-2.5 font-semibold">Last Run</th>
              <th className="px-4 py-2.5 font-semibold">Next Run</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Active</th>
              <th className="px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {schedules.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                No scheduled tests yet. Click "New Schedule" to add one.
              </td></tr>
            ) : schedules.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-semibold">{s.name}</td>
                <td className="px-4 py-3"><TypeBadge type={s.type} /></td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{cronHuman(s.cronExpression)}</div>
                  {s.cronExpression && <div className="text-[10px] text-[var(--text-muted)] font-mono">{s.cronExpression}</div>}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">{s.lastRunStatus ? <StatusBadge status={s.lastRunStatus} /> : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s)} className={s.isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'} title={s.isActive ? 'Disable' : 'Enable'}>
                    {s.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => triggerNow(s)} disabled={triggering === s.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50">
                      {triggering === s.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run Now
                    </button>
                    <button onClick={() => deleteSchedule(s)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--accent-bg-soft)] border border-[var(--accent-border-soft)] rounded-lg p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers size={16} /> How Scheduling &amp; Queueing Works</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-[var(--text-muted)]">
          <div>
            <div className="text-[var(--text-primary)] font-semibold mb-1.5">CRON Format (Spring)</div>
            <div>sec min hr dom mon dow</div>
            <div className="font-mono mt-1.5 leading-relaxed text-xs">
              0 0 8 * * ? → 8am daily<br />0 0/30 * * * ? → Every 30 min<br />0 0 8 ? * MON-FRI → Weekdays 8am
            </div>
          </div>
          <div>
            <div className="text-[var(--text-primary)] font-semibold mb-1.5">Queue Protection</div>
            Scheduled runs are enqueued first — k6 is not launched immediately. The queue worker
            dispatches them at capped concurrency so the module stays healthy even if many schedules
            fire at once.
          </div>
          <div>
            <div className="text-[var(--text-primary)] font-semibold mb-1.5">Run Now vs Scheduled</div>
            <strong>Run Now</strong> bypasses the queue and dispatches immediately.
            <div className="mt-2">Status <span className="text-[var(--warning-text)] font-semibold">QUEUED</span> means the cron fired but a concurrency slot isn't free yet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
