import { AnimatePresence, motion } from 'framer-motion';
import { breakdown, ChipSvg } from './Chip';
import { dur } from '../../store/settings';
import { formatEuro } from '../../lib/format';

interface Props {
  amount: number;
  size?: number;
  showLabel?: boolean;
  step?: number;
}

/** Pile de jetons + montant. */
export function ChipStack({ amount, size = 36, showLabel = true, step = 3 }: Props) {
  const chips = breakdown(amount, 10);
  const height = size + Math.max(0, chips.length - 1) * step;
  return (
    <div className="flex items-center gap-2" aria-label={`Mise : ${formatEuro(amount)}`}>
      <div className="relative" style={{ width: size, height }}>
        <AnimatePresence initial={false}>
          {chips.map((v, i) => (
            <motion.div
              key={`${i}-${v}`}
              className="chip-shadow absolute left-0"
              style={{ width: size, height: size, bottom: i * step, zIndex: i }}
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: dur(0.22), ease: [0.16, 1, 0.3, 1] }}
            >
              <ChipSvg value={v} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {showLabel && amount > 0 && <span className="tabular rounded-md bg-bg-0/70 px-1.5 py-0.5 text-xs font-semibold text-fg">{formatEuro(amount)}</span>}
    </div>
  );
}
