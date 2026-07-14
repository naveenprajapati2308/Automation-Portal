const inputCls = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-500';

export const EMPTY_AUTH = { type: 'NONE', username: '', password: '', token: '', keyName: '', keyValue: '', addTo: 'HEADER' };

export default function AuthEditor({ auth, onChange }) {
  const set = (patch) => onChange({ ...auth, ...patch });
  return (
    <div className="flex flex-col gap-3 max-w-md">
      <select value={auth.type} onChange={(e) => set({ type: e.target.value })} className={inputCls}>
        <option value="NONE">No Auth</option>
        <option value="BASIC">Basic Auth</option>
        <option value="BEARER">Bearer Token</option>
        <option value="API_KEY">API Key</option>
      </select>
      {auth.type === 'BASIC' && (
        <>
          <input placeholder="Username" value={auth.username} onChange={(e) => set({ username: e.target.value })} className={inputCls} />
          <input placeholder="Password" type="password" value={auth.password} onChange={(e) => set({ password: e.target.value })} className={inputCls} />
        </>
      )}
      {auth.type === 'BEARER' && (
        <input placeholder="Token (may contain {{variables}})" value={auth.token} onChange={(e) => set({ token: e.target.value })} className={inputCls} />
      )}
      {auth.type === 'API_KEY' && (
        <>
          <input placeholder="Key name (e.g. X-API-Key)" value={auth.keyName} onChange={(e) => set({ keyName: e.target.value })} className={inputCls} />
          <input placeholder="Key value" value={auth.keyValue} onChange={(e) => set({ keyValue: e.target.value })} className={inputCls} />
          <select value={auth.addTo} onChange={(e) => set({ addTo: e.target.value })} className={inputCls}>
            <option value="HEADER">Add to Header</option>
            <option value="QUERY">Add to Query Params</option>
          </select>
        </>
      )}
    </div>
  );
}
