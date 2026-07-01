import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// ── Shared: Field ─────────────────────────────────────────────────────────────
export function Field({ label, value, onChange, type = 'text', readOnly = false, required = false, error }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`form-field${error ? ' has-error' : ''}`}>
      <label className="form-row">
        <span>
          {label}
          {required && <span className="required-mark" aria-hidden="true">*</span>}
        </span>
        <div className={isPassword ? 'field-input-wrap password-input-wrap' : 'field-input-wrap'}>
          <input type={inputType} value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />
          {isPassword && !readOnly && (
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </label>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
