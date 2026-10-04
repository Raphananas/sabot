/** Emblème : pique dans un carré arrondi vert. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--color-accent)" />
      <use href="#suit-S" x="9" y="9" width="22" height="22" fill="var(--color-accent-ink)" />
    </svg>
  );
}

/** Wordmark « sabot ». */
export function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const text = size === 'lg' ? 'text-6xl sm:text-8xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const mark = size === 'lg' ? 64 : size === 'md' ? 30 : 26;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={mark} />
      <span className={`${text} font-extrabold italic leading-none tracking-[-0.04em] text-fg`}>sabot</span>
    </span>
  );
}
