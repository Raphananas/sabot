import { motion } from 'framer-motion';
import { CHIP_VALUES, ChipSvg, type ChipValue } from './Chip';

interface Props {
  onPick: (v: ChipValue) => void;
  /** Montant maximal ajoutable (bankroll restante / plafond de table). */
  maxAdd?: number;
  disabled?: boolean;
}

/** Rangée de jetons cliquables pour miser. */
export function ChipRack({ onPick, maxAdd = Infinity, disabled }: Props) {
  return (
    <div role="group" aria-label="Jetons" className="flex items-center justify-center gap-1.5 sm:gap-3">
      {CHIP_VALUES.map((v) => {
        const ok = !disabled && v <= maxAdd;
        return (
          <motion.button
            key={v}
            type="button"
            disabled={!ok}
            onClick={() => onPick(v)}
            whileHover={ok ? { y: -5 } : undefined}
            whileTap={ok ? { scale: 0.92, y: 0 } : undefined}
            className={`chip-shadow h-12 w-12 rounded-full sm:h-14 sm:w-14 ${ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-30 grayscale'}`}
            aria-label={`Ajouter un jeton de ${v} €`}
          >
            <ChipSvg value={v} />
          </motion.button>
        );
      })}
    </div>
  );
}
