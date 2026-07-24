import { useMemo } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Shared pagination footer for every list/table in API Testing — Previous/Next,
// numbered page buttons, a page-size selector, and a "showing X-Y of Z" label.
// Hides itself entirely once totalRecords <= 5, per the platform-wide pagination rule.
export function Pagination({ page, pageSize, totalRecords, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (safePage > 3) pages.push('…');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  if (totalRecords <= 5) return null;

  const startRecord = (safePage - 1) * pageSize + 1;
  const endRecord = Math.min(safePage * pageSize, totalRecords);

  const btnCls = 'flex items-center justify-center w-7 h-7 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[var(--text-muted)] px-1 py-2">
      <span>Showing {startRecord} to {endRecord} of {totalRecords} records</span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs px-1.5 outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className={btnCls} disabled={safePage === 1} onClick={() => onPageChange(1)} title="First page"><ChevronsLeft size={14} /></button>
          <button className={btnCls} disabled={safePage === 1} onClick={() => onPageChange(Math.max(1, safePage - 1))} title="Previous page"><ChevronLeft size={14} /></button>
          {pageNumbers.map((p, i) => p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[var(--text-muted)]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === safePage ? 'page' : undefined}
              className={`min-w-[28px] h-7 px-1.5 rounded border text-xs font-semibold ${p === safePage
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white cursor-default'
                : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {p}
            </button>
          ))}
          <button className={btnCls} disabled={safePage === totalPages} onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} title="Next page"><ChevronRight size={14} /></button>
          <button className={btnCls} disabled={safePage === totalPages} onClick={() => onPageChange(totalPages)} title="Last page"><ChevronsRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}
