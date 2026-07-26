const VARIANTS = {
  primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
  secondary: 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
  danger: 'border border-[var(--danger-text)]/30 text-[var(--danger-text)] hover:bg-[var(--danger-bg-soft)]',
  ghost: 'border border-[var(--accent-border-soft)] text-[var(--accent-text)] hover:bg-[var(--accent-bg-soft)]',
};

const SIZES = {
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-2.5 py-1.5 text-xs',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${SIZES[size] ?? SIZES.md} ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
