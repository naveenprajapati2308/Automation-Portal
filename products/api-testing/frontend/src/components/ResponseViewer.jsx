import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Clock, HardDrive, AlertTriangle, Loader2 } from 'lucide-react';

function statusColor(code) {
  if (!code) return 'text-zinc-400';
  if (code < 300) return 'text-emerald-400';
  if (code < 400) return 'text-amber-400';
  return 'text-red-400';
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseCookies(headers) {
  if (!headers) return [];
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'set-cookie');
  if (!key) return [];
  return headers[key].map((raw) => {
    const parts = raw.split(';').map((p) => p.trim());
    const [name, ...rest] = parts[0].split('=');
    const attrs = parts.slice(1);
    return { name, value: rest.join('='), attrs };
  });
}

export default function ResponseViewer({ response, loading }) {
  const cookies = useMemo(() => parseCookies(response?.headers), [response]);
  const TABS = ['Pretty', 'Raw', 'Headers', ...(cookies.length > 0 ? ['Cookies'] : [])];
  const [tab, setTab] = useState('Pretty');

  const prettyBody = useMemo(() => {
    if (!response?.body) return '';
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const isJson = useMemo(() => {
    if (!response?.body) return false;
    try { JSON.parse(response.body); return true; } catch { return false; }
  }, [response]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 gap-2">
        <Loader2 className="animate-spin" size={18} /> Sending request…
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Send a request to see the response here
      </div>
    );
  }

  if (!response.success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-400 px-6 text-center">
        <AlertTriangle size={22} />
        <div className="text-sm font-medium">Request failed</div>
        <div className="text-xs text-zinc-400 max-w-xl break-all">{response.errorMessage}</div>
        <div className="text-xs text-zinc-600">after {response.durationMs} ms</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-5 px-4 py-2 border-b border-zinc-800 text-xs">
        <span className={`font-semibold ${statusColor(response.statusCode)}`}>
          {response.statusCode} {response.statusText}
        </span>
        <span className="flex items-center gap-1 text-zinc-400">
          <Clock size={12} /> {response.durationMs} ms
        </span>
        <span className="flex items-center gap-1 text-zinc-400">
          <HardDrive size={12} /> {formatSize(response.sizeBytes)}
        </span>
        <div className="ml-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'Headers' ? (
          <div className="h-full overflow-auto p-4 text-xs font-mono">
            {Object.entries(response.headers || {}).map(([k, vals]) => (
              <div key={k} className="flex gap-2 py-1 border-b border-zinc-900">
                <span className="text-emerald-400 shrink-0">{k}:</span>
                <span className="text-zinc-300 break-all">{vals.join(', ')}</span>
              </div>
            ))}
          </div>
        ) : tab === 'Cookies' ? (
          <div className="h-full overflow-auto p-4 text-xs font-mono">
            {cookies.map((c, i) => (
              <div key={i} className="py-2 border-b border-zinc-900">
                <div><span className="text-emerald-400">{c.name}</span> = <span className="text-zinc-300 break-all">{c.value}</span></div>
                {c.attrs.length > 0 && <div className="text-zinc-600 mt-0.5">{c.attrs.join(' · ')}</div>}
              </div>
            ))}
          </div>
        ) : (
          <Editor
            height="100%"
            theme="vs-dark"
            language={tab === 'Pretty' && isJson ? 'json' : 'plaintext'}
            value={tab === 'Pretty' ? prettyBody : response.body}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        )}
      </div>
    </div>
  );
}
