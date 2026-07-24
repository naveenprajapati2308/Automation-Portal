
export function Panel({ children, className = '', padded = true }) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] ${padded ? 'p-4' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}
