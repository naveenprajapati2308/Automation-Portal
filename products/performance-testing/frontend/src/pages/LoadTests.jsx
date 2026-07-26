import { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Play, StopCircle, Users, X } from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/Button.jsx';
import { KeyValueEditor } from '../components/KeyValueEditor.jsx';
import { AuthEditor } from '../components/AuthEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { INPUT_CLASS } from '../lib/statusColors.js';

const DEFAULT_FORM = {
  name: '', description: '', targetUrl: '', httpMethod: 'GET',
  authType: 'NONE', authValue: '', authKeyName: '', authKeyIn: 'HEADER',
  virtualUserCount: 10, rampUpSeconds: 30, steadyDurationSeconds: 60, rampDownSeconds: 15, maxVirtualUsers: 100,
  thresholdP95Ms: '', thresholdErrorRatePct: 5, thresholdMinRps: '',
  requestHeaders: [], requestBody: '', scheduleCron: '',
};

function VuChart({ metrics }) {
  if (!metrics || metrics.length === 0) return null;
  const max = Math.max(...metrics.map((m) => m.vus || 0), 1);
  const w = 400, h = 70;
  const pts = metrics.map((m, i) => `${(i / (metrics.length - 1 || 1)) * w},${h - (m.vus / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px] border border-[var(--border)] rounded-md">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={pts} />
    </svg>
  );
}

export default function LoadTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [streamData, setStreamData] = useState({});
  const [liveIds, setLiveIds] = useState({});
  const eventSources = useRef({});

  useEffect(() => {
    fetchTests();
    return () => { Object.values(eventSources.current).forEach((es) => es.close()); };
  }, []);

  const fetchTests = async () => {
    try {
      const data = await api.get('/load-tests');
      setTests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => { setEditMode('new'); setFormData({ ...DEFAULT_FORM }); };
  const handleEdit = (t) => setEditMode(t) || setFormData({ ...DEFAULT_FORM, ...t, requestHeaders: t.requestHeaders || [] });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this load test?')) return;
    try { await api.delete(`/load-tests/${id}`); fetchTests(); }
    catch (err) { alert(err.message); }
  };

  const openStream = (testId, runId) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const es = new EventSource(`${base}/api/v1/runs/${runId}/stream`);
    eventSources.current[testId] = es;
    setLiveIds((p) => ({ ...p, [testId]: true }));

    es.addEventListener('metric', (evt) => {
      const metric = JSON.parse(evt.data);
      setStreamData((prev) => ({ ...prev, [testId]: [...(prev[testId] || []).slice(-50), metric] }));
    });
    const stop = () => {
      es.close();
      delete eventSources.current[testId];
      setLiveIds((p) => { const n = { ...p }; delete n[testId]; return n; });
    };
    es.addEventListener('complete', () => { stop(); fetchTests(); });
    es.addEventListener('error', stop);
  };

  const handleRun = async (test) => {
    try {
      const run = await api.post(`/load-tests/${test.id}/run`);
      openStream(test.id, run.id);
    } catch (err) {
      alert('Failed to start run: ' + err.message);
    }
  };

  const handleAbort = async (testId) => {
    const live = streamData[testId];
    const runId = live?.[live.length - 1]?.runId;
    try {
      if (runId) await api.post(`/runs/${runId}/abort`);
      if (eventSources.current[testId]) { eventSources.current[testId].close(); delete eventSources.current[testId]; }
      setLiveIds((p) => { const n = { ...p }; delete n[testId]; return n; });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      virtualUserCount: Number(formData.virtualUserCount),
      rampUpSeconds: Number(formData.rampUpSeconds),
      steadyDurationSeconds: Number(formData.steadyDurationSeconds),
      rampDownSeconds: Number(formData.rampDownSeconds),
      maxVirtualUsers: Number(formData.maxVirtualUsers),
      thresholdP95Ms: formData.thresholdP95Ms ? Number(formData.thresholdP95Ms) : null,
      thresholdErrorRatePct: formData.thresholdErrorRatePct ? Number(formData.thresholdErrorRatePct) : null,
      thresholdMinRps: formData.thresholdMinRps ? Number(formData.thresholdMinRps) : null,
      requestHeaders: formData.requestHeaders.filter((h) => h.key.trim()),
      // stages/vuAssignments are the flexible engine inputs — the simple form only
      // edits the discrete ramp fields, so send an empty stage array here; the
      // backend's K6ScriptGenerator derives the actual ramp shape from the
      // virtualUserCount/rampUp/steady/rampDown/maxVirtualUsers fields directly.
      stages: formData.stages || [],
    };
    try {
      if (editMode === 'new') await api.post('/load-tests', payload);
      else await api.put(`/load-tests/${editMode.id}`, payload);
      setEditMode(null);
      fetchTests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading load tests…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  if (editMode !== null) {
    return (
      <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 max-w-3xl flex flex-col gap-6">
        <h2 className="text-lg font-bold">{editMode === 'new' ? 'New Load Test' : `Edit: ${editMode.name}`}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Test Name *</label>
            <input required className={INPUT_CLASS} placeholder="Checkout API Surge" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">HTTP Method</label>
            <select className={INPUT_CLASS} value={formData.httpMethod} onChange={(e) => setFormData((p) => ({ ...p, httpMethod: e.target.value }))}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Target URL *</label>
          <input required type="url" className={INPUT_CLASS} placeholder="https://api.example.com/checkout" value={formData.targetUrl} onChange={(e) => setFormData((p) => ({ ...p, targetUrl: e.target.value }))} />
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Auth</h3>
          <AuthEditor authType={formData.authType} authValue={formData.authValue} authKeyName={formData.authKeyName} authKeyIn={formData.authKeyIn} onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))} />
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Virtual User Load Shape</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['virtualUserCount', 'Initial VUs'], ['maxVirtualUsers', 'Max VUs (Peak)'],
              ['rampUpSeconds', 'Ramp-Up (sec)'], ['steadyDurationSeconds', 'Steady State (sec)'], ['rampDownSeconds', 'Ramp-Down (sec)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>
                <input type="number" min={0} className={INPUT_CLASS} value={formData[key]} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-[var(--bg-hover)] rounded-md text-xs text-[var(--text-muted)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Load Shape Preview:</strong><br />
            0 → {formData.rampUpSeconds}s: Ramp {formData.virtualUserCount} → {formData.maxVirtualUsers} VUs<br />
            {formData.rampUpSeconds}s → {Number(formData.rampUpSeconds) + Number(formData.steadyDurationSeconds)}s: Hold at {formData.maxVirtualUsers} VUs<br />
            → +{formData.rampDownSeconds}s: Ramp down to 0 VUs
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[['thresholdP95Ms', 'P95 Max (ms)'], ['thresholdErrorRatePct', 'Max Error Rate (%)'], ['thresholdMinRps', 'Min RPS']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>
              <input type="number" step="0.1" className={INPUT_CLASS} value={formData[key]} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Request Headers</h3>
          <KeyValueEditor items={formData.requestHeaders} onChange={(requestHeaders) => setFormData((p) => ({ ...p, requestHeaders }))} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Request Body (JSON)</label>
          <textarea className={`${INPUT_CLASS} font-mono text-xs`} rows={4} value={formData.requestBody} onChange={(e) => setFormData((p) => ({ ...p, requestBody: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Schedule (CRON — optional)</label>
          <input className={INPUT_CLASS} placeholder="0 0 2 * * ? (2am daily)" value={formData.scheduleCron} onChange={(e) => setFormData((p) => ({ ...p, scheduleCron: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setEditMode(null)}>Cancel</Button>
          <Button type="submit">Save Load Test</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-muted)]">Simulate concurrent virtual users ramping from zero to peak load. Watch live P95, error rate, and RPS while the test runs.</p>
        <Button onClick={handleNew}><Plus size={16} /> New Load Test</Button>
      </div>

      <div className="flex flex-col gap-4">
        {tests.length === 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-center py-12 text-[var(--text-muted)]">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            No load tests yet. Create one to simulate traffic spikes.
          </div>
        )}
        {tests.map((test) => {
          const live = streamData[test.id];
          const latest = live ? live[live.length - 1] : null;
          const isLive = !!liveIds[test.id];
          return (
            <div key={test.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{test.name}</h3>
                  <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">{test.httpMethod} {test.targetUrl}</div>
                </div>
                <div className="flex gap-2">
                  {isLive ? (
                    <button onClick={() => handleAbort(test.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]"><StopCircle size={14} /> Abort</button>
                  ) : (
                    <button onClick={() => handleRun(test)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"><Play size={14} /> Run</button>
                  )}
                  <button onClick={() => handleEdit(test)} className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(test.id)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="flex gap-6 flex-wrap text-xs bg-[var(--bg-hover)] rounded-md p-3">
                <span><span className="text-[var(--text-muted)]">Peak VUs: </span><strong>{test.maxVirtualUsers}</strong></span>
                <span><span className="text-[var(--text-muted)]">Ramp-Up: </span><strong>{test.rampUpSeconds}s</strong></span>
                <span><span className="text-[var(--text-muted)]">Steady: </span><strong>{test.steadyDurationSeconds}s</strong></span>
                <span><span className="text-[var(--text-muted)]">Ramp-Down: </span><strong>{test.rampDownSeconds}s</strong></span>
                {test.thresholdP95Ms && <span><span className="text-[var(--text-muted)]">P95 Limit: </span><strong>{test.thresholdP95Ms}ms</strong></span>}
                {test.thresholdErrorRatePct && <span><span className="text-[var(--text-muted)]">Err Limit: </span><strong>{test.thresholdErrorRatePct}%</strong></span>}
              </div>

              {latest ? (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">{isLive ? '● Live ' : ''}Metrics</div>
                  <div className="flex gap-3 flex-wrap mb-3">
                    {[
                      ['VUs', latest.vus],
                      ['P95 (ms)', latest.p95Ms != null ? latest.p95Ms.toFixed(1) : '—'],
                      ['RPS', latest.rps != null ? latest.rps.toFixed(2) : '—'],
                      ['Error %', latest.errorRate != null ? `${(latest.errorRate * 100).toFixed(2)}%` : '0%'],
                      ['Total Reqs', latest.totalRequests],
                    ].map(([label, value]) => (
                      <div key={label} className="px-4 py-2 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-md text-center min-w-[90px]">
                        <div className="text-base font-bold font-mono">{value}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
                      </div>
                    ))}
                  </div>
                  <VuChart metrics={live} />
                </div>
              ) : (
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                  Last run: <StatusBadge status={test.lastRunStatus} />
                  {test.lastRunAt && ` at ${new Date(test.lastRunAt).toLocaleString()}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
