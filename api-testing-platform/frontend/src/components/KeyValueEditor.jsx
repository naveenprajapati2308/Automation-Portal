import { Trash2, Plus } from 'lucide-react';

export default function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  const update = (idx, field, value) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    onChange(next);
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { key: '', value: '', enabled: true }]);

  return (
    <div className="flex flex-col divide-y divide-zinc-800 border border-zinc-800 rounded-md overflow-hidden">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center bg-zinc-900/40">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => update(idx, 'enabled', e.target.checked)}
            className="mx-3 accent-emerald-500"
          />
          <input
            value={item.key}
            onChange={(e) => update(idx, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none border-l border-zinc-800"
          />
          <input
            value={item.value}
            onChange={(e) => update(idx, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none border-l border-zinc-800"
          />
          <button onClick={() => remove(idx)} className="px-3 text-zinc-600 hover:text-red-400" title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-zinc-900/60"
      >
        <Plus size={14} /> Add new
      </button>
    </div>
  );
}
