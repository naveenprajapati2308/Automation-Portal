import { Fragment, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Play, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client.js';
import { Button } from '../components/Button.jsx';
import { KeyValueEditor } from '../components/KeyValueEditor.jsx';
import { AuthEditor } from '../components/AuthEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { INPUT_CLASS } from '../lib/statusColors.js';

const ASSERTION_TYPES = ['STATUS', 'BODY_CONTAINS', 'JSON_PATH', 'HEADER_EXISTS', 'HEADER_VALUE', 'RESPONSE_TIME'];
const OPERATORS = ['EQ', 'NE', 'IN', 'LT', 'GT', 'CONTAINS'];

const DEFAULT_FORM = {
  name: '', description: '', targetUrl: '', httpMethod: 'GET',
  authType: 'NONE', authValue: '', authKeyName: '', authKeyIn: 'HEADER',
  requestHeaders: [], requestBody: '', timeoutMs: 10000, followRedirects: true,
  iterations: 100, thinkTimeMs: 1000,
  thresholdP50Ms: '', thresholdP75Ms: '', thresholdP90Ms: '', thresholdP95Ms: '', thresholdP99Ms: '', thresholdMaxMs: '',
  thresholdErrorRatePct: '', thresholdMinRps: '',
  assertions: [], scheduleCron: '', isActive: true,
};

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function PerformanceTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [runningId, setRunningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchTests(); }, []);

  const fetchTests = async () => {
    try {
      const data = await api.get('/performance-tests');
      setTests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => { setEditMode('new'); setFormData({ ...DEFAULT_FORM }); };
  const handleEdit = (test) => {
    setEditMode(test);
    setFormData({ ...DEFAULT_FORM, ...test, authValue: '', requestHeaders: test.requestHeaders || [], assertions: test.assertions || [] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this performance test?')) return;
    try { await api.delete(`/performance-tests/${id}`); fetchTests(); }
    catch (err) { alert(err.message); }
  };

  const handleRun = async (id) => {
    setRunningId(id);
    try {
      const run = await api.post(`/performance-tests/${id}/run`);
      alert(`Run started (Run #${run.id}) — check Run History for live results.`);
      fetchTests();
    } catch (err) {
      alert('Failed to start run: ' + err.message);
    } finally {
      setRunningId(null);
    }
  };

  const addAssertion = () => setFormData((p) => ({ ...p, assertions: [...p.assertions, { type: 'STATUS', operator: 'EQ', value: '200', path: '', key: '' }] }));
  const removeAssertion = (i) => setFormData((p) => ({ ...p, assertions: p.assertions.filter((_, idx) => idx !== i) }));
  const updateAssertion = (i, field, val) => {
    const next = [...formData.assertions];
    next[i] = { ...next[i], [field]: val };
    setFormData((p) => ({ ...p, assertions: next }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      requestHeaders: formData.requestHeaders.filter((h) => h.key.trim()),
      thresholdP50Ms: numOrNull(formData.thresholdP50Ms),
      thresholdP75Ms: numOrNull(formData.thresholdP75Ms),
      thresholdP90Ms: numOrNull(formData.thresholdP90Ms),
      thresholdP95Ms: numOrNull(formData.thresholdP95Ms),
      thresholdP99Ms: numOrNull(formData.thresholdP99Ms),
      thresholdMaxMs: numOrNull(formData.thresholdMaxMs),
      thresholdErrorRatePct: numOrNull(formData.thresholdErrorRatePct),
      thresholdMinRps: numOrNull(formData.thresholdMinRps),
    };
    try {
      if (editMode === 'new') await api.post('/performance-tests', payload);
      else await api.put(`/performance-tests/${editMode.id}`, payload);
      setEditMode(null);
      fetchTests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading performance tests…</p>;
  if (error) return <div className="bg-[var(--danger-bg-soft)] text-[var(--danger-text)] rounded-md px-4 py-3 text-sm">Error: {error}</div>;

  if (editMode !== null) {
    return (
      <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 max-w-3xl flex flex-col gap-6">
        <h2 className="text-lg font-bold">{editMode === 'new' ? 'New Performance Test' : `Edit: ${editMode.name}`}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Test Name *</label>
            <input required className={INPUT_CLASS} placeholder="Login API Test" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
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
          <input required type="url" className={INPUT_CLASS} placeholder="https://api.example.com/v1/users" value={formData.targetUrl} onChange={(e) => setFormData((p) => ({ ...p, targetUrl: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
          <textarea className={INPUT_CLASS} rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Auth Settings</h3>
          <AuthEditor authType={formData.authType} authValue={formData.authValue} authKeyName={formData.authKeyName} authKeyIn={formData.authKeyIn} onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Iterations</label>
            <input type="number" min={1} className={INPUT_CLASS} value={formData.iterations} onChange={(e) => setFormData((p) => ({ ...p, iterations: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Think Time (ms)</label>
            <input type="number" min={0} className={INPUT_CLASS} value={formData.thinkTimeMs} onChange={(e) => setFormData((p) => ({ ...p, thinkTimeMs: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Timeout (ms)</label>
            <input type="number" min={100} className={INPUT_CLASS} value={formData.timeoutMs} onChange={(e) => setFormData((p) => ({ ...p, timeoutMs: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Pass / Fail Thresholds</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['thresholdP50Ms', 'P50 Max (ms)'], ['thresholdP75Ms', 'P75 Max (ms)'], ['thresholdP90Ms', 'P90 Max (ms)'],
              ['thresholdP95Ms', 'P95 Max (ms)'], ['thresholdP99Ms', 'P99 Max (ms)'], ['thresholdMaxMs', 'Max Response (ms)'],
              ['thresholdErrorRatePct', 'Max Error Rate (%)'], ['thresholdMinRps', 'Min Requests/Sec'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>
                <input type="number" step="0.1" className={INPUT_CLASS} placeholder="Leave blank to skip" value={formData[key]} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Request Headers</h3>
          <KeyValueEditor items={formData.requestHeaders} onChange={(requestHeaders) => setFormData((p) => ({ ...p, requestHeaders }))} keyPlaceholder="Content-Type" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Request Body (JSON)</label>
          <textarea className={`${INPUT_CLASS} font-mono text-xs`} rows={5} placeholder='{"key": "value"}' value={formData.requestBody} onChange={(e) => setFormData((p) => ({ ...p, requestBody: e.target.value }))} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Response Assertions</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addAssertion}>+ Add Assertion</Button>
          </div>
          <div className="flex flex-col gap-2">
            {formData.assertions.map((a, i) => (
              <div key={i} className="flex gap-2 flex-wrap items-center">
                <select className={`${INPUT_CLASS} flex-1`} value={a.type} onChange={(e) => updateAssertion(i, 'type', e.target.value)}>
                  {ASSERTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                {a.type === 'JSON_PATH' && <input className={`${INPUT_CLASS} flex-1`} placeholder="$.status" value={a.path} onChange={(e) => updateAssertion(i, 'path', e.target.value)} />}
                {(a.type === 'HEADER_VALUE' || a.type === 'HEADER_EXISTS') && <input className={`${INPUT_CLASS} flex-1`} placeholder="Header name" value={a.key} onChange={(e) => updateAssertion(i, 'key', e.target.value)} />}
                <select className={`${INPUT_CLASS} flex-none w-24`} value={a.operator} onChange={(e) => updateAssertion(i, 'operator', e.target.value)}>
                  {OPERATORS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input className={`${INPUT_CLASS} flex-1`} placeholder="Expected value" value={a.value} onChange={(e) => updateAssertion(i, 'value', e.target.value)} />
                <button type="button" onClick={() => removeAssertion(i)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Schedule (CRON — optional)</label>
          <input className={INPUT_CLASS} placeholder="0 0 8 * * ? (every day at 8am)" value={formData.scheduleCron} onChange={(e) => setFormData((p) => ({ ...p, scheduleCron: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setEditMode(null)}>Cancel</Button>
          <Button type="submit">Save Test</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-muted)]">Test individual API response times across sequential iterations. Verify latency SLAs with P50–P99 thresholds.</p>
        <Button onClick={handleNew}><Plus size={16} /> New Test</Button>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-surface-2)] text-left text-xs text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Target URL</th>
              <th className="px-4 py-2.5 font-semibold">Iterations</th>
              <th className="px-4 py-2.5 font-semibold">P95 Threshold</th>
              <th className="px-4 py-2.5 font-semibold">Last P95</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tests.length > 0 ? tests.map((test) => (
              <Fragment key={test.id}>
                <tr>
                  <td className="px-4 py-3 font-semibold">
                    <button onClick={() => setExpandedId(expandedId === test.id ? null : test.id)} className="flex items-center gap-2">
                      {expandedId === test.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {test.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs max-w-[220px] truncate">{test.targetUrl}</td>
                  <td className="px-4 py-3">{test.iterations}</td>
                  <td className="px-4 py-3 font-mono">{test.thresholdP95Ms ? `${test.thresholdP95Ms}ms` : '—'}</td>
                  <td className="px-4 py-3 font-mono">{test.lastP95Ms ? `${test.lastP95Ms.toFixed(1)}ms` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={test.lastRunStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleRun(test.id)} disabled={runningId === test.id} className="p-1.5 rounded border border-[var(--accent-border-soft)] text-[var(--accent-text)] hover:bg-[var(--accent-bg-soft)] disabled:opacity-50" title="Run Now"><Play size={14} /></button>
                      <button onClick={() => handleEdit(test)} className="p-1.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(test.id)} className="p-1.5 rounded border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === test.id && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-[var(--bg-surface-2)]">
                      <div className="flex gap-8 flex-wrap text-sm">
                        <div><span className="text-[var(--text-muted)]">Method: </span><span className="font-semibold">{test.httpMethod}</span></div>
                        <div><span className="text-[var(--text-muted)]">Auth: </span>{test.authType}</div>
                        <div><span className="text-[var(--text-muted)]">Think Time: </span>{test.thinkTimeMs}ms</div>
                        <div><span className="text-[var(--text-muted)]">Timeout: </span>{test.timeoutMs}ms</div>
                        <div><span className="text-[var(--text-muted)]">Assertions: </span>{test.assertions?.length || 0}</div>
                        {test.scheduleCron && <div><span className="text-[var(--text-muted)]">CRON: </span><code className="font-mono">{test.scheduleCron}</code></div>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )) : (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No performance tests defined yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
