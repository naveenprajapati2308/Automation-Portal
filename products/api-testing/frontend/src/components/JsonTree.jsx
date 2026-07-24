import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, PlusCircle } from 'lucide-react';

function Node({ nodeKey, value, path, depth, onExtract }) {
  const [open, setOpen] = useState(depth < 2);
  const isObject = value !== null && typeof value === 'object';

  if (!isObject) {
    return (
      <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: depth * 16 }}>
        <span className="text-[var(--info-text)]">{nodeKey}</span>
        <span className="text-[var(--text-muted)]">:</span>
        <span className={typeof value === 'string' ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}>
          {JSON.stringify(value)}
        </span>
        {onExtract && (
          <button
            onClick={() => onExtract(path, String(nodeKey).replace(/[^a-zA-Z0-9_]/g, '_'))}
            title={`Extract ${path} as variable`}
            className="ml-1 text-[var(--text-muted)] hover:text-[var(--success-text)]"
          >
            <PlusCircle size={13} />
          </button>
        )}
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [i, v])
    : Object.entries(value);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        style={{ paddingLeft: depth * 16 }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="text-[var(--info-text)]">{nodeKey}</span>
        <span className="text-[var(--text-muted)] text-[11px]">{Array.isArray(value) ? `[${value.length}]` : '{…}'}</span>
      </button>
      {open && entries.map(([k, v]) => (
        <Node
          key={k}
          nodeKey={k}
          value={v}
          path={Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`}
          depth={depth + 1}
          onExtract={onExtract}
        />
      ))}
    </div>
  );
}

export default function JsonTree({ json, onExtract }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }, [json]);

  if (parsed === undefined) {
    return <div className="text-xs text-[var(--text-muted)] p-3">Response is not JSON — nothing to extract.</div>;
  }

  return (
    <div className="font-mono text-xs overflow-auto p-2">
      <Node nodeKey="$" value={parsed} path="$" depth={0} onExtract={onExtract} />
    </div>
  );
}
