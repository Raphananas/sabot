import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { dur } from '../../store/settings';
import { formatEuro } from '../../lib/format';

/** Montant qui défile jusqu'à sa nouvelle valeur. */
export function AnimatedEuro({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    const d = dur(0.7);
    if (d === 0 || from === value) {
      el.textContent = formatEuro(value);
      return;
    }
    const c = animate(from, value, { duration: d, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => (el.textContent = formatEuro(Math.round(v * 100) / 100)) });
    return () => c.stop();
  }, [value]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {formatEuro(value)}
    </span>
  );
}
