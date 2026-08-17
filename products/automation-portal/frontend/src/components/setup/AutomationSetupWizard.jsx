import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import {
  Rocket,
  Download,
  FolderTree,
  PackagePlus,
  Globe2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import './setup.css';

const FRAMEWORK_OPTIONS = [
  { type: 'SELENIUM', label: 'Selenium (Java / TestNG)', runnerType: 'MAVEN_TESTNG' },
  { type: 'PLAYWRIGHT', label: 'Playwright (TypeScript)', runnerType: 'PLAYWRIGHT' },
];

const STEP_LABELS = ['Get your code', 'Set the path', 'First module', 'Environment', 'Done'];

// Shown instead of the normal Dashboard for a Project Admin whose project has no Test Engine
// with a framework path set yet — every project gets its own isolated framework folder
// (PROJECT_FRAMEWORKS_ROOT/<a-name-you-choose>), never the one static shared checkout other
// projects (including the MPHIDB pilot's legacy setup) still use.
export function AutomationSetupWizard({ onFinish }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [frameworkType, setFrameworkType] = useState('SELENIUM');
  const [engineName, setEngineName] = useState('Primary Selenium Engine');
  const [nameTouched, setNameTouched] = useState(false);
  const [engine, setEngine] = useState(null);

  const [rootPath, setRootPath] = useState('');
  const [subfolder, setSubfolder] = useState('');

  const [moduleForm, setModuleForm] = useState({ code: '', name: '', xmlFile: '', reportPath: '' });
  const [createdModuleId, setCreatedModuleId] = useState(null);
  const [envForm, setEnvForm] = useState({ code: '', name: '', baseUrl: '' });

  useEffect(() => {
    api.testEngineConfig().then((cfg) => setRootPath(cfg.projectFrameworksRoot || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (nameTouched) return;
    setEngineName(frameworkType === 'PLAYWRIGHT' ? 'Primary Playwright Engine' : 'Primary Selenium Engine');
  }, [frameworkType, nameTouched]);

  const currentRunnerType = FRAMEWORK_OPTIONS.find((o) => o.type === frameworkType)?.runnerType;

  const handleGetCode = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api.registerTestEngine({
        engineType: frameworkType,
        name: engineName.trim() || `${frameworkType} Engine`,
      });
      setEngine(result.engine);
      await api.downloadEngineStarterKit(result.engine.id, result.credential?.plaintextKey);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRedownload = async () => {
    if (!engine) return;
    setBusy(true);
    setError('');
    try {
      await api.downloadEngineStarterKit(engine.id, null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSavePath = async () => {
    const folder = subfolder.trim();
    if (!folder) {
      setError('Enter the folder name you extracted the starter kit into.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateTestEngine(engine.id, { frameworkPath: folder });
      setEngine(updated);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateModule = async () => {
    const code = moduleForm.code.trim().toUpperCase();
    const name = moduleForm.name.trim();
    const xmlFile = moduleForm.xmlFile.trim();
    if (!code || !name || !xmlFile) {
      setError('Code, Name and Suite/Spec file are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api.createModule({
        code,
        name,
        xmlFile,
        reportPath: moduleForm.reportPath.trim() || null,
        runnerType: currentRunnerType,
        testEngineId: engine.id,
      });
      setCreatedModuleId(created.id);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEnvironment = async () => {
    const code = envForm.code.trim().toUpperCase();
    const name = envForm.name.trim();
    if (!code || !name) {
      setError('Code and Name are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api.createEnvironment({ code, name, baseUrl: envForm.baseUrl.trim() || null, active: true });
      // A Module can't actually run against an Environment until this link is enabled — without
      // it, the wizard would create both and still leave the very first execution blocked.
      if (createdModuleId) {
        await api.enableModuleForEnvironment(createdModuleId, created.id);
      }
      setStep(5);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="su-page">
      <header className="su-head">
        <div className="su-head-icon"><Rocket size={20} /></div>
        <div>
          <h2>Set up Automation for this workspace</h2>
          <p>
            A few quick steps and your team can start running real tests — this project gets its
            own isolated framework folder, never shared with another project.
          </p>
        </div>
      </header>

      <ol className="su-steps">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className={i + 1 === step ? 'su-step-active' : i + 1 < step ? 'su-step-done' : ''}>
            <span className="su-step-num">{i + 1 < step ? <CheckCircle2 size={14} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {error && <p className="su-error">{error}</p>}

      <div className="su-card">
        {step === 1 && (
          <>
            <h3><Download size={16} /> Step 1 — Get your framework code</h3>
            <p className="su-hint">
              Pick a framework. We'll register it for this project and give you a ready-to-run
              starter kit — just add your own test scripts to it.
            </p>
            <div className="su-framework-choice">
              {FRAMEWORK_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className={`su-framework-card ${frameworkType === opt.type ? 'su-framework-card-selected' : ''}`}
                  onClick={() => setFrameworkType(opt.type)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="su-field">
              <span>Engine name</span>
              <input
                value={engineName}
                onChange={(e) => { setEngineName(e.target.value); setNameTouched(true); }}
              />
            </label>
            <div className="su-actions">
              <button className="su-primary-btn" onClick={handleGetCode} disabled={busy}>
                {busy ? 'Preparing…' : <>Create &amp; Download Starter Kit <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3><FolderTree size={16} /> Step 2 — Tell us where you put it</h3>
            <p className="su-hint">
              Unzip the starter kit, write your scripts, then place the folder under:
            </p>
            <code className="su-path-box">
              {rootPath || '(ask your Super Admin for the configured path)'}\<b>your-folder-name</b>
            </code>
            <p className="su-hint">Enter just the folder name you used — not the full path.</p>
            <label className="su-field">
              <span>Folder name</span>
              <input
                placeholder="e.g. mphidb-selenium"
                value={subfolder}
                onChange={(e) => setSubfolder(e.target.value)}
              />
            </label>
            <div className="su-actions">
              <button className="su-secondary-btn" onClick={handleRedownload} disabled={busy}>
                Re-download starter kit
              </button>
              <button className="su-primary-btn" onClick={handleSavePath} disabled={busy}>
                {busy ? 'Saving…' : <>Save &amp; Continue <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3><PackagePlus size={16} /> Step 3 — Create your first Module</h3>
            <p className="su-hint">
              A Module points at one suite/spec inside your framework folder — you can add more
              later from Manage Modules.
            </p>
            <div className="su-form-grid">
              <label className="su-field">
                <span>Module code</span>
                <input
                  placeholder="e.g. LOGIN"
                  value={moduleForm.code}
                  onChange={(e) => setModuleForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </label>
              <label className="su-field">
                <span>Module name</span>
                <input
                  placeholder="e.g. Login Suite"
                  value={moduleForm.name}
                  onChange={(e) => setModuleForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="su-field">
                <span>Suite / spec file</span>
                <input
                  placeholder={frameworkType === 'PLAYWRIGHT' ? 'e.g. tests/login.spec.ts' : 'e.g. testng.xml'}
                  value={moduleForm.xmlFile}
                  onChange={(e) => setModuleForm((f) => ({ ...f, xmlFile: e.target.value }))}
                />
              </label>
              <label className="su-field">
                <span>Report path (optional)</span>
                <input
                  value={moduleForm.reportPath}
                  onChange={(e) => setModuleForm((f) => ({ ...f, reportPath: e.target.value }))}
                />
              </label>
            </div>
            <div className="su-actions">
              <button className="su-primary-btn" onClick={handleCreateModule} disabled={busy}>
                {busy ? 'Creating…' : <>Create Module <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3><Globe2 size={16} /> Step 4 — Add an Environment</h3>
            <p className="su-hint">
              Where should tests run against? You can add more environments any time from the
              Environments tab.
            </p>
            <div className="su-form-grid">
              <label className="su-field">
                <span>Code</span>
                <input
                  placeholder="e.g. UAT"
                  value={envForm.code}
                  onChange={(e) => setEnvForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </label>
              <label className="su-field">
                <span>Name</span>
                <input
                  placeholder="e.g. UAT"
                  value={envForm.name}
                  onChange={(e) => setEnvForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="su-field su-field-wide">
                <span>Base URL (optional)</span>
                <input
                  placeholder="https://…"
                  value={envForm.baseUrl}
                  onChange={(e) => setEnvForm((f) => ({ ...f, baseUrl: e.target.value }))}
                />
              </label>
            </div>
            <div className="su-actions">
              <button className="su-primary-btn" onClick={handleCreateEnvironment} disabled={busy}>
                {busy ? 'Creating…' : <>Create Environment <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3><CheckCircle2 size={16} color="var(--success-text)" /> You're all set</h3>
            <p className="su-hint">
              Your framework is registered, your first module and environment are ready. From here
              you can:
            </p>
            <ul className="su-done-list">
              <li>Run your first execution from the Execution Center</li>
              <li>Add teammates from Team Management, with access based on their role</li>
              <li>Read the full setup &amp; usage manual from the Integration Guide</li>
            </ul>
            <div className="su-actions">
              <button className="su-primary-btn" onClick={onFinish}>
                Go to Dashboard <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Shown to any non-Project-Admin project member while Automation isn't set up yet — they can't
// complete the wizard themselves (Module/Environment creation is Project-Admin-gated), so it
// would be a dead end for them.
export function AutomationSetupPending() {
  return (
    <section className="su-page">
      <div className="su-pending-card">
        <Rocket size={28} />
        <h3>Automation isn't set up for this workspace yet</h3>
        <p>
          Ask your Project Admin to complete the one-time Automation setup — pick a framework,
          download the starter kit, and add the first module &amp; environment. Once that's done,
          this page will show the usual dashboard for everyone.
        </p>
      </div>
    </section>
  );
}
