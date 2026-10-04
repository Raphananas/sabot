import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStats } from '../../store/stats';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { dur } from '../../store/settings';

/** Notification de succès débloqué. */
export function Toasts() {
  const toasts = useStats((s) => s.toasts);
  const pop = useStats((s) => s.popToast);
  const current = toasts[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(pop, 3200);
    return () => clearTimeout(t);
  }, [current, pop]);
  const a = ACHIEVEMENTS.find((x) => x.id === current);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-3" aria-live="polite">
      <AnimatePresence>
        {a && (
          <motion.div
            key={a.id}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: dur(0.35), ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl bg-bg-3 px-4 py-3 shadow-2xl ring-1 ring-accent/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-lg text-accent-ink" aria-hidden="true">
              {a.icon}
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent">Succès débloqué</div>
              <div className="text-sm font-bold">{a.title}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
