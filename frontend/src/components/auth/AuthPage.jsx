import { useState } from 'react';
import { api } from '../../api.js';
import appLogo from '../../assets/MPHIDB_Logo2.png';
import { Field } from '../shared/Field.jsx';

// ── Auth Page (Login + Forgot Password — no self-registration) ────────────────
export function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false });
  const [message, setMessage] = useState('Sign in to access the Automation Portal.');
  const [otpDisplay, setOtpDisplay] = useState(null);

  const update = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setOtpDisplay(null);
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
      setMessage(error.message);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <img className="brand-logo auth-logo" src={appLogo} alt="TESTRIX" />
          <div>
            <strong>Automation Portal</strong>
            <span>Enterprise Identity &amp; Access</span>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'login' && (
            <>
              <Field label="Username / Email" value={form.username ?? ''} onChange={(v) => update('username', v)} />
              <Field label="Password" type="password" value={form.password ?? ''} onChange={(v) => update('password', v)} />
              <div className="login-options">
                <label className="check-row">
                  <input type="checkbox" checked={Boolean(form.rememberMe)} onChange={(e) => update('rememberMe', e.target.checked)} />
                  Remember me
                </label>
                <button type="button" className="forgot-link" onClick={() => { setMode('forgot'); setOtpDisplay(null); }}>
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <Field label="Email" type="email" value={form.email ?? ''} onChange={(v) => update('email', v)} />
          )}

          {mode === 'reset' && (
            <>
              <Field label="OTP Code" value={form.otp ?? ''} onChange={(v) => update('otp', v)} />
              <Field label="New Password" type="password" value={form.newPassword ?? ''} onChange={(v) => update('newPassword', v)} />
            </>
          )}

          <button className="primary-action" type="submit">
            {mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Send OTP' : 'Reset Password'}
          </button>
          {mode !== 'login' && (
            <button type="button" className="back-login-link" onClick={() => { setMode('login'); setOtpDisplay(null); }}>
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
