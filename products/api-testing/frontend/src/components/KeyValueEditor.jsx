import { Trash2, Plus } from 'lucide-react';

export default function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  const update = (idx, field, value) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    onChange(next);
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { key: '', value: '', enabled: true }]);

  return (
    <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center bg-[var(--bg-surface-2)]">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => update(idx, 'enabled', e.target.checked)}
            className="mx-3 accent-[var(--accent)]"
          />
          <input
            value={item.key}
            onChange={(e) => update(idx, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-l border-[var(--border)]"
          />
          <input
            value={item.value}
            onChange={(e) => update(idx, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-l border-[var(--border)]"
          />
          <button onClick={() => remove(idx)} className="px-3 text-[var(--text-muted)] hover:text-[var(--danger-text)]" title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
      >
        <Plus size={14} /> Add new
      </button>
    </div>
  );
}
