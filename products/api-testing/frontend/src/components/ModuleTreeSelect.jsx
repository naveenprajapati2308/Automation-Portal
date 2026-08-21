import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ModuleApiTree from './ModuleApiTree.jsx';
import { INPUT_CLASS as inputCls } from '../lib/statusColors.js';

/**
 * A single-select dropdown over a module tree (same expand/collapse component the
 * Base/Regular API sidebars use) — for pickers where a flat list would bury APIs
 * from different modules together. Parents show first; only clicking a module
 * reveals its children, one level at a time, same as the sidebar tree.
 */
export default function ModuleTreeSelect({ modules, apis, selectedId, onSelect, placeholder, renderLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const selected = apis.find((a) => a.id === selectedId);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`${inputCls} w-full flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${selected ? '' : 'text-[var(--text-muted)]'}`}>
          {selected ? (renderLabel ? renderLabel(selected) : selected.name) : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg">
          <ModuleApiTree
            modules={modules}
            apis={apis}
            selectedId={selectedId}
            onSelect={(a) => { onSelect(a); setOpen(false); }}
            emptyMessage="Nothing to choose from."
            renderItem={(a) => (renderLabel ? renderLabel(a) : a.name)}
          />
        </div>
      )}
    </div>
  );
}
