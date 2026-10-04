import { AnimatePresence, motion } from 'framer-motion';
import type { Card } from '../../engine/cards';
import { totalLabel, handValue } from '../../engine/hand';
import { PlayingCard } from '../cards/PlayingCard';
import { ChipStack } from '../chips/ChipStack';
import { dur, stepMs } from '../../store/settings';

export type HandTone = 'win' | 'lose' | 'push' | 'neutral';
export type HandBadge = { text: string; tone: HandTone } | null;

interface Props {
  cards: readonly Card[];
  fromSplit?: boolean;
  active?: boolean;
  bet?: number;
  badge?: HandBadge;
  label?: string;
  dim?: boolean;
  /** Ordre de distribution initial (pour décaler l'animation des premières cartes). */
  dealOrder?: readonly string[];
  /** Pas d'animation d'arrivée (aperçus). */
  static?: boolean;
  /** Emplacement réservé pour la carte du croupier pas encore tirée. */
  ghost?: boolean;
}

const RING: Record<HandTone, string> = {
  win: 'ring-2 ring-accent shadow-[0_0_30px_rgba(31,224,122,0.35)]',
  lose: 'ring-2 ring-danger/90',
  push: 'ring-2 ring-warn/90',
  neutral: '',
};
const BADGE: Record<HandTone, string> = {
  win: 'bg-accent text-accent-ink',
  lose: 'bg-danger text-white',
  push: 'bg-warn text-[#2a1700]',
  neutral: 'bg-bg-4 text-fg',
};

export function HandView({ cards, fromSplit, active, bet, badge, label, dim, dealOrder, static: isStatic, ghost }: Props) {
  const total = cards.length ? totalLabel(cards, fromSplit) : '';
  const v = cards.length ? handValue(cards).total : 0;
  const bust = v > 21;
  const good = total === 'Blackjack' || v === 21;
  return (
    <div className={`flex flex-col items-center transition-opacity duration-300 ${dim ? 'opacity-50' : ''}`}>
      {label && <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">{label}</div>}
      <div className="relative">
        <AnimatePresence>
          {total && (
            <motion.div
              key={total}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: dur(0.18) }}
              className={`tabular absolute -left-3 -top-3 z-30 min-w-8 whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[13px] font-bold shadow-lg ${
                bust ? 'bg-danger text-white' : good ? 'bg-accent text-accent-ink' : 'bg-bg-4 text-fg'
              }`}
            >
              {total}
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className={`flex rounded-[12px] transition-shadow duration-300 ${badge ? RING[badge.tone] : ''} ${
            active ? 'ring-2 ring-fg/80 ring-offset-4 ring-offset-transparent' : ''
          }`}
        >
          {cards.map((c, i) => {
            const order = dealOrder?.indexOf(c.id) ?? -1;
            return (
              <div
                key={c.id}
                style={{
                  marginLeft: i === 0 ? 0 : 'calc(var(--card-w) * -0.66)',
                  marginTop: `${i * 3}px`,
                  zIndex: i,
                }}
              >
                <PlayingCard card={c} dealt={!isStatic} delay={order >= 0 ? (stepMs(160) * order) / 1000 : 0} />
              </div>
            );
          })}
          {ghost && (
            <div style={{ marginLeft: cards.length ? 'calc(var(--card-w) * -0.66)' : 0, marginTop: `${cards.length * 3}px`, zIndex: 0 }}>
              <PlayingCard faceDown dealt={false} dimmed />
            </div>
          )}
          {cards.length === 0 && !ghost && (
            <div style={{ width: 'var(--card-w)', aspectRatio: '250/350' }} className="rounded-[9%] border-2 border-dashed border-white/10" />
          )}
        </div>
        <AnimatePresence>
          {badge && (
            <motion.div
              initial={{ y: 6, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur(0.25), ease: [0.16, 1, 0.3, 1] }}
              className={`tabular absolute -bottom-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold shadow-lg ${BADGE[badge.tone]}`}
            >
              {badge.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {bet !== undefined && bet > 0 && (
        <div className="mt-5">
          <ChipStack amount={bet} size={34} step={3} />
        </div>
      )}
    </div>
  );
}
