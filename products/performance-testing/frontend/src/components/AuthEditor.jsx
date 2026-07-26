import { INPUT_CLASS } from '../lib/statusColors.js';

// Auth block shared by Virtual Users, Performance Tests, and Load Tests — all
// three entities carry the identical authType/authValue/authKeyName/authKeyIn
// fields (see V1__initial_schema.sql). Basic auth has no separate
// username/password columns — authValue is sent verbatim as `Basic <value>`
// (see K6ScriptGenerator), so it's a single field here too, matching the
// source app's actual form exactly rather than a friendlier two-field split
// that wouldn't match what the backend expects.
export function AuthEditor({ authType, authValue, authKeyName, authKeyIn, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Auth Type</label>
        <select className={INPUT_CLASS} value={authType} onChange={(e) => onChange({ authType: e.target.value, authValue: '' })}>
          <option value="NONE">No Auth</option>
          <option value="BEARER">Bearer Token</option>
          <option value="BASIC">Basic Auth</option>
          <option value="API_KEY">API Key</option>
        </select>
      </div>
      {authType !== 'NONE' && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            {authType === 'BASIC' ? 'Base64 user:pass value' : 'Credentials / token value'}
          </label>
          <input type="password" className={INPUT_CLASS} value={authValue} onChange={(e) => onChange({ authValue: e.target.value })} />
        </div>
      )}
      {authType === 'API_KEY' && (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Key name (e.g. X-Api-Key)</label>
            <input className={INPUT_CLASS} value={authKeyName || ''} onChange={(e) => onChange({ authKeyName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Placed in</label>
            <select className={INPUT_CLASS} value={authKeyIn || 'HEADER'} onChange={(e) => onChange({ authKeyIn: e.target.value })}>
              <option value="HEADER">HTTP Header</option>
              <option value="QUERY">Query Parameter</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
