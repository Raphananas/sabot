import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { isReducedMotion } from '../../store/settings';

const COLORS = ['var(--color-accent)', '#ffffff', 'var(--color-accent-hi)', '#b1bad3'];

/** Confettis sobres (une salve) pour un beau gain. */
export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: `${burst}-${i}`,
        x: (Math.random() - 0.5) * 520,
        y: -120 - Math.random() * 260,
        r: Math.random() * 540 - 270,
        d: 0.9 + Math.random() * 0.7,
        c: COLORS[i % COLORS.length],
        w: 5 + Math.random() * 5,
      })),
    [burst],
  );
  if (!burst || isReducedMotion()) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 block rounded-[2px]"
          style={{ width: p.w, height: p.w * 0.45, background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 420], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: p.d, ease: 'easeOut', times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
