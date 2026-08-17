import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../api.js';
import { Field } from '../shared/Field.jsx';

const OTP_IDLE = 'idle';
const OTP_SENDING = 'sending';
const OTP_SENT = 'sent';
const OTP_VERIFYING = 'verifying';
const OTP_VERIFIED = 'verified';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

const MODULE_OPTIONS = [
  { value: 'AUTOMATION_SELENIUM', label: 'Automation Testing — Selenium' },
  { value: 'AUTOMATION_PLAYWRIGHT', label: 'Automation Testing — Playwright' },
  { value: 'API_TESTING', label: 'API Testing' },
  { value: 'PERFORMANCE_TESTING', label: 'Performance Testing' }
];

const initialForm = {
  projectName: '', organizationName: '', projectDescription: '',
  backendTech: '', frontendTech: '', databaseTech: '', cicdTool: '',
  requestedModules: [],
  workspaceName: '', preferredWorkspaceSlug: '', projectManagerName: '',
  email: '', phone: '', expectedTeamSize: '', additionalNotes: ''
};

function validate(form) {
  const errors = {};
  if (!form.projectName.trim()) errors.projectName = 'Project name is required';
  if (!form.organizationName.trim()) errors.organizationName = 'Organization name is required';
  if (form.requestedModules.length === 0) errors.requestedModules = 'Select at least one testing module';
  if (!form.workspaceName.trim()) errors.workspaceName = 'Workspace name is required';
  if (!form.preferredWorkspaceSlug.trim()) errors.preferredWorkspaceSlug = 'Preferred workspace code is required';
  else if (!SLUG_RE.test(form.preferredWorkspaceSlug.trim())) errors.preferredWorkspaceSlug = 'Lowercase letters, numbers and hyphens only';
  if (!form.projectManagerName.trim()) errors.projectManagerName = 'Project manager name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
  return errors;
}

// ── Request Workspace — public registration form (docs/version2.1.md Workspace Request Flow).
// Submitting does not create a Workspace immediately: it queues a request for Super Admin review. ──
export function RequestWorkspacePage({ onBack }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [otpStatus, setOtpStatus] = useState(OTP_IDLE);
  const [otpValue, setOtpValue] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const update = (field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const emailVerified = otpStatus === OTP_VERIFIED && verifiedEmail === form.email.trim();

  const updateEmail = (value) => {
    update('email', value);
    if (otpStatus !== OTP_IDLE) {
      setOtpStatus(OTP_IDLE);
      setOtpValue('');
      setOtpMessage('');
      setOtpError('');
    }
  };

  const sendOtp = async () => {
    const email = form.email.trim();
    if (!EMAIL_RE.test(email)) {
      setErrors((e) => ({ ...e, email: 'Enter a valid email address' }));
      return;
    }
    setOtpError('');
    setOtpMessage('');
    setOtpStatus(OTP_SENDING);
    try {
      await api.sendWorkspaceRequestOtp({ email });
      setOtpStatus(OTP_SENT);
      setOtpMessage(`OTP sent to ${email}. It expires in 10 minutes.`);
    } catch (error) {
      setOtpStatus(OTP_IDLE);
      setOtpError(error.detail || error.message);
    }
  };

  const verifyOtp = async () => {
    const email = form.email.trim();
    if (!otpValue.trim()) {
      setOtpError('Enter the OTP sent to your email');
      return;
    }
    setOtpError('');
    setOtpStatus(OTP_VERIFYING);
    try {
      await api.verifyWorkspaceRequestOtp({ email, otp: otpValue.trim() });
      setOtpStatus(OTP_VERIFIED);
      setVerifiedEmail(email);
      setOtpMessage('Email verified.');
    } catch (error) {
      setOtpStatus(OTP_SENT);
      setOtpError(error.detail || error.message);
    }
  };

  const toggleModule = (value) => {
    setForm((c) => ({
      ...c,
      requestedModules: c.requestedModules.includes(value)
        ? c.requestedModules.filter((m) => m !== value)
        : [...c.requestedModules, value]
    }));
    if (errors.requestedModules) setErrors((e) => ({ ...e, requestedModules: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError('');
    const errs = validate(form);
    if (!emailVerified) errs.email = errs.email || 'Please verify your email with the OTP before submitting';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await api.submitWorkspaceRequest({
        ...form,
        preferredWorkspaceSlug: form.preferredWorkspaceSlug.trim().toLowerCase(),
        expectedTeamSize: form.expectedTeamSize ? Number(form.expectedTeamSize) : null
      });
      setSubmitted(true);
    } catch (error) {
      setServerError(error.detail || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="auth-panel auth-panel-wide ws-submitted">
        <div className="ws-submitted-icon"><CheckCircle2 size={30} /></div>
        <h3>Request submitted</h3>
        <p className="ws-submitted-lede">
          A Super Admin will review <strong>{form.workspaceName || form.projectName}</strong> and get back to you at <strong>{form.email}</strong>.
        </p>
        <ul className="ws-submitted-next">
          <li>You'll get an email once it's approved</li>
          <li>Login access is sent to the same address</li>
        </ul>
        <button type="button" className="primary-action" onClick={onBack}>Back to Login</button>
      </section>
    );
  }

  return (
    <section className="auth-panel auth-panel-wide ws-request-panel">
      <div className="ws-request-header">
        <h3 style={{ marginTop: 0 }}>Request a Workspace</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 20 }}>
          Tell us about your project — a Super Admin will review and approve your workspace.
        </p>
      </div>
      <form onSubmit={submit} className="auth-form ws-request-scroll" noValidate>
        <div className="ws-request-section-label">Project Information</div>
        <Field label="Project Name" required value={form.projectName} onChange={(v) => update('projectName', v)} error={errors.projectName} />
        <Field label="Organization Name" required value={form.organizationName} onChange={(v) => update('organizationName', v)} error={errors.organizationName} />
        <TextAreaField label="Project Description" value={form.projectDescription} onChange={(v) => update('projectDescription', v)} />
        <div className="ws-request-grid">
          <Field label="Backend Technology" value={form.backendTech} onChange={(v) => update('backendTech', v)} />
          <Field label="Frontend Technology" value={form.frontendTech} onChange={(v) => update('frontendTech', v)} />
          <Field label="Database" value={form.databaseTech} onChange={(v) => update('databaseTech', v)} />
          <Field label="CI/CD Tool (Optional)" value={form.cicdTool} onChange={(v) => update('cicdTool', v)} />
        </div>

        <div className="ws-request-section-label">Required Testing Modules</div>
        <div className={`form-field${errors.requestedModules ? ' has-error' : ''}`}>
          <div className="ws-module-checks">
            {MODULE_OPTIONS.map((opt) => (
              <label key={opt.value} className="check-row">
                <input
                  type="checkbox"
                  checked={form.requestedModules.includes(opt.value)}
                  onChange={() => toggleModule(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {errors.requestedModules && <span className="field-error">{errors.requestedModules}</span>}
        </div>

        <div className="ws-request-section-label">Workspace Information</div>
        <div className="ws-request-grid">
          <Field label="Workspace Name" required value={form.workspaceName} onChange={(v) => update('workspaceName', v)} error={errors.workspaceName} />
          <Field label="Preferred Workspace Code" required value={form.preferredWorkspaceSlug} onChange={(v) => update('preferredWorkspaceSlug', v)} error={errors.preferredWorkspaceSlug} />
          <Field label="Project Manager Name" required value={form.projectManagerName} onChange={(v) => update('projectManagerName', v)} error={errors.projectManagerName} />
          <div className="ws-email-verify-field">
            <Field label="Email" required type="email" value={form.email} onChange={updateEmail} error={errors.email} />
            {emailVerified ? (
              <div className="ws-otp-status">
                <CheckCircle2 size={14} /> Email verified
              </div>
            ) : (
              <div className="ws-otp-panel">
                <button
                  type="button"
                  className="ws-otp-btn"
                  disabled={!EMAIL_RE.test(form.email.trim()) || otpStatus === OTP_SENDING}
                  onClick={sendOtp}
                >
                  {otpStatus === OTP_SENDING ? 'Sending…' : otpStatus === OTP_SENT || otpStatus === OTP_VERIFYING ? 'Resend OTP' : 'Send OTP'}
                </button>
                {(otpStatus === OTP_SENT || otpStatus === OTP_VERIFYING) && (
                  <div className="ws-otp-verify-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="ws-otp-input"
                      placeholder="Enter OTP"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <button
                      type="button"
                      className="ws-otp-btn"
                      disabled={otpStatus === OTP_VERIFYING || !otpValue.trim()}
                      onClick={verifyOtp}
                    >
                      {otpStatus === OTP_VERIFYING ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                )}
                {otpMessage && <p className="ws-otp-message">{otpMessage}</p>}
                {otpError && <p className="ws-otp-error">{otpError}</p>}
              </div>
            )}
          </div>
          <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v.replace(/\D/g, '').slice(0, 15))} />
          <Field label="Expected Team Size" type="number" value={form.expectedTeamSize} onChange={(v) => update('expectedTeamSize', v)} />
        </div>
        <TextAreaField label="Additional Notes" value={form.additionalNotes} onChange={(v) => update('additionalNotes', v)} />

        <button className="primary-action" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
        {serverError && (
          <p role="alert" style={{ color: '#c0392b', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: '10px 0 0' }}>
            {serverError}
          </p>
        )}
        <button type="button" className="back-login-link" onClick={onBack}>Back to Login</button>
      </form>
    </section>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="form-field">
      <label className="form-row">
        <span>{label}</span>
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="ws-request-textarea" />
      </label>
    </div>
  );
}
