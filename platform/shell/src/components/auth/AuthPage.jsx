import { useState } from 'react';
import { api } from '../../api.js';
import { Field } from '../shared/Field.jsx';
import { Loader } from '../../../../../shared/ui/Loader.jsx';
import testrixLogo from '../../assets/testrix_logo.png';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Auth Page (Login + Forgot Password — no self-registration) ────────────────
export function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false });
  const [message, setMessage] = useState('Sign in to the unified testing platform.');
  const [otpDisplay, setOtpDisplay] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const update = (field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
    // Typing again clears that field's validation message.
    setErrors((c) => (c[field] ? { ...c, [field]: undefined } : c));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setOtpDisplay(null);
    setErrors({});
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (mode === 'login') {
      const username = (form.username || '').trim();
      if (!username) next.username = 'Username / Email is required.';
      else if (!EMAIL_RE.test(username)) next.username = 'Enter a valid email address.';
      const password = form.password || '';
      if (!password) next.password = 'Password is required.';
      else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    }
    if (mode === 'forgot' || mode === 'reset') {
      const email = (form.email || '').trim();
      if (!email) next.email = 'Email is required.';
      else if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address.';
    }
    if (mode === 'reset') {
      if (!(form.otp || '').trim()) next.otp = 'OTP code is required.';
      const newPassword = form.newPassword || '';
      if (!newPassword) next.newPassword = 'New password is required.';
      else if (newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters.';
    }
    setErrors(next);
    return Object.keys(next).every((key) => !next[key]);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError('');
    if (!validate()) return;
    setOtpDisplay(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        onAuthenticated(await api.login(form));
      } else if (mode === 'forgot') {
        const data = await api.forgotPassword({ email: form.email });
        setMode('reset');
        setMessage('OTP generated. Use the code below to reset your password.');
        setOtpDisplay(data.otp);
      } else if (mode === 'reset') {
        await api.resetPassword({ email: form.email, otp: form.otp, newPassword: form.newPassword });
        setMode('login');
        setOtpDisplay(null);
        setMessage('Password reset complete. You can sign in now.');
      }
    } catch (error) {
      const status = error.status;
      if (!status || status >= 500) {
        setServerError('500 Internal Server Error');
      } else {
        setServerError(error.detail || error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <img src={testrixLogo} alt="TESTRIX" className="brand-logo" style={{ width: 40, height: 40 }} />
          <div>
            <strong>TESTRIX</strong>

          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'login' && (
            <>
              <Field label="Username / Email" value={form.username ?? ''} onChange={(v) => update('username', v)} error={errors.username} />
              <Field label="Password" type="password" value={form.password ?? ''} onChange={(v) => update('password', v)} error={errors.password} />
              <div className="login-options">
                <label className="check-row">
                  <input type="checkbox" checked={Boolean(form.rememberMe)} onChange={(e) => update('rememberMe', e.target.checked)} />
                  Remember me
                </label>
                <button type="button" className="forgot-link" onClick={() => switchMode('forgot')}>
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <Field label="Email" type="email" value={form.email ?? ''} onChange={(v) => update('email', v)} error={errors.email} />
          )}

          {mode === 'reset' && (
            <>
              <Field label="OTP Code" value={form.otp ?? ''} onChange={(v) => update('otp', v)} error={errors.otp} />
              <Field label="New Password" type="password" value={form.newPassword ?? ''} onChange={(v) => update('newPassword', v)} error={errors.newPassword} />
            </>
          )}

          <button
            className="primary-action"
            type="submit"
            disabled={submitting}
            style={submitting ? { opacity: 0.8, cursor: 'wait' } : undefined}
          >
            {submitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader size={16} />
                {mode === 'login' ? 'Signing In…' : mode === 'forgot' ? 'Sending OTP…' : 'Resetting…'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Send OTP' : 'Reset Password'
            )}
          </button>
          {serverError && (
            <p
              role="alert"
              style={{
                color: '#c0392b',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                margin: '10px 0 0'
              }}
            >
              {serverError}
            </p>
          )}
          {mode !== 'login' && (
            <button type="button" className="back-login-link" onClick={() => switchMode('login')}>
              Back to Login
            </button>
          )}
        </form>

        {otpDisplay && (
          <div className="otp-reveal">
            <span className="otp-label">Your OTP Code</span>
            <span className="otp-code">{otpDisplay}</span>
            <span className="otp-hint">Copy this code and paste it into the OTP field above.</span>
          </div>
        )}

        <p className="auth-message">{message}</p>
      </section>
    </main>
  );
}
