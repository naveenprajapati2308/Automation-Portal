import { Building2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api.js';

const MODULE_LABELS = {
  AUTOMATION_SELENIUM: 'Automation (Selenium)',
  AUTOMATION_PLAYWRIGHT: 'Automation (Playwright)',
  API_TESTING: 'API Testing',
  PERFORMANCE_TESTING: 'Performance Testing'
};

// ── Shown when a user belongs to more than one Project — picks which one to enter this session.
// Invisible/never rendered for the common single-project case (every backfilled user today). ────
export function SelectWorkspacePage({ pendingSession, onSelected, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (projectId) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await api.selectProject(projectId, pendingSession.refreshToken);
      onSelected(session);
    } catch (err) {
      setError(err.detail || err.message);
      setBusy(false);
    }
  };

  return (
    <section className="auth-panel auth-panel-wide">
      <h3 style={{ marginTop: 0 }}>Select a Workspace</h3>
      <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 20 }}>
        You belong to more than one workspace. Choose one to continue.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(pendingSession.availableProjects || []).map((project) => (
          <button
            key={project.id}
            type="button"
            className="ws-picker-card"
            disabled={busy}
            onClick={() => choose(project.id)}
          >
            <Building2 size={20} />
            <div className="ws-picker-info">
              <strong>{project.name}</strong>
              <span>{project.projectCode} · {(project.roles || []).join(', ')}</span>
              <span className="ws-picker-modules">
                {(project.enabledModules || []).map((m) => MODULE_LABELS[m] || m).join(' · ')}
              </span>
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ color: '#c0392b', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: '14px 0 0' }}>
          {error}
        </p>
      )}
      <button type="button" className="back-login-link" onClick={onCancel} style={{ marginTop: 16 }}>
        Back to Login
      </button>
    </section>
  );
}
