import { Trash2, Plus } from 'lucide-react';

// Reusable add/remove key-value table — used for headers, query params, and
// (with `masked`) Virtual User variables. Same shape as api-testing's
// KeyValueEditor, adapted to accept plain {key, value} rows (this module's
// entities don't carry an `enabled` toggle per row).
export function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', maskable = false }) {
  const update = (idx, field, value) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    onChange(next);
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, maskable ? { key: '', value: '', masked: false } : { key: '', value: '' }]);

  return (
    <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center bg-[var(--bg-surface-2)]">
          <input
            value={item.key}
            onChange={(e) => update(idx, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <input
            type={maskable && item.masked ? 'password' : 'text'}
            value={item.value}
            onChange={(e) => update(idx, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-l border-[var(--border)]"
          />
          {maskable && (
            <label className="flex items-center gap-1.5 px-3 text-xs text-[var(--text-muted)] whitespace-nowrap border-l border-[var(--border)]">
              <input type="checkbox" checked={!!item.masked} onChange={(e) => update(idx, 'masked', e.target.checked)} className="accent-[var(--accent)]" />
              Masked
            </label>
          )}
          <button onClick={() => remove(idx)} className="px-3 text-[var(--text-muted)] hover:text-[var(--danger-text)]" title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
      >
        <Plus size={14} /> Add row
      </button>
    </div>
  );
}
