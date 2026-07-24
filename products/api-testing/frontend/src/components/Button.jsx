// Primary/ghost CTA button — was the literal `bg-emerald-600 hover:bg-emerald-500
// ... text-white` string (18 occurrences) and its ghost/outline counterpart
// `border-emerald-700 text-emerald-300 ...` (6 occurrences), copy-pasted per
// call site. Now themed via the shared --accent tokens (Testrix's brand
// violet), matching the same active/CTA color used by the shell and
// Automation Portal's own nav/buttons.
const VARIANTS = {
  primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
  ghost: 'border border-[var(--accent-border-soft)] text-[var(--accent-text)] hover:bg-[var(--accent-bg-soft)]',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
