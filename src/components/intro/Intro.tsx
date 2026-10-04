import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { isReducedMotion } from '../../store/settings';

const WORD = 'sabot'.split('');

/** Intro d'entrée : emblème, wordmark lettre par lettre, accroche. */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = isReducedMotion();
  useEffect(() => {
    const t = setTimeout(onDone, reduced ? 500 : 2300);
    const skip = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') onDone();
    };
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone, reduced]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid cursor-pointer place-items-center overflow-hidden bg-bg-1"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ y: reduced ? 0 : '-100%', opacity: reduced ? 0 : 1 }}
      transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.76, 0, 0.24, 1] }}
      role="presentation"
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(31,224,122,0.12), transparent 70%)' }}
      />
      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-4 sm:gap-6">
          <motion.svg
            width="84"
            height="84"
            viewBox="0 0 40 40"
            aria-hidden="true"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: reduced ? 0 : 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-14 w-14 sm:h-[84px] sm:w-[84px]"
          >
            <rect width="40" height="40" rx="11" fill="var(--color-accent)" />
            <use href="#suit-S" x="9" y="9" width="22" height="22" fill="var(--color-accent-ink)" />
          </motion.svg>
          <h1 className="flex overflow-hidden text-7xl font-extrabold italic leading-[1.05] tracking-[-0.05em] sm:text-9xl" aria-label="sabot">
            {WORD.map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block pr-[0.02em]"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.35 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden="true"
              >
                {ch}
              </motion.span>
            ))}
          </h1>
        </div>
        <motion.p
          className="mt-5 text-sm font-semibold uppercase tracking-[0.4em] text-fg-2 sm:text-base"
          initial={{ opacity: 0, y: 8, letterSpacing: '0.8em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.4em' }}
          transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Le blackjack, joué juste
        </motion.p>
        <motion.div
          className="mt-8 h-[3px] w-40 overflow-hidden rounded-full bg-bg-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.9 }}
        >
          <motion.div
            className="h-full bg-accent"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: reduced ? 0.3 : 1.2, delay: reduced ? 0 : 0.95, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
