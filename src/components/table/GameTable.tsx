import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useTable } from '../../store/table';
import { useSettings, dur } from '../../store/settings';
import { HandView, type HandBadge } from './HandView';
import { PlayingCard } from '../cards/PlayingCard';
import { ChipStack } from '../chips/ChipStack';
import { anchors } from './anchors';
import { remainingCounts, remainingFraction } from '../../engine/shoe';
import { runningCount, trueCount } from '../../engine/hilo';
import { formatEuro, formatSignedEuro } from '../../lib/format';
import { Confetti } from '../ui/Confetti';
import type { Outcome, Round } from '../../engine/game';

const OUTCOME_TEXT: Record<Outcome, string> = {
  blackjack: 'Blackjack',
  win: 'Gagné',
  push: 'Égalité',
  lose: 'Perdu',
  bust: 'Brûlé',
  surrender: 'Abandon',
};

function badgeFor(r: Round, handId: string): HandBadge {
  const res = r.result?.hands.find((h) => h.handId === handId);
  if (!res) return null;
  const tone = res.net > 0 ? 'win' : res.net < 0 ? 'lose' : 'push';
  const amount = res.net !== 0 ? ` ${formatSignedEuro(res.net)}` : '';
  return { text: `${OUTCOME_TEXT[res.outcome]}${amount}`, tone };
}

function centerMessage(r: Round | null): string | null {
  if (!r) return null;
  if (r.phase === 'insurance') return 'Le croupier montre un As — assurance ?';
  if (r.phase === 'playing') {
    const n = r.hands.length;
    return n > 1 ? `Main ${r.active + 1} sur ${n}` : null;
  }
  if (r.phase === 'dealer') return 'Le croupier tire…';
  return null;
}

/** Surface de jeu : croupier, mains du joueur, sabot. */
export function GameTable() {
  const round = useTable((s) => s.round);
  const bets = useTable((s) => s.bets);
  const shoe = useTable((s) => s.shoe);
  const showCount = useSettings((s) => s.showCount);
  const showShoe = useSettings((s) => s.showShoe);
  const controls = useAnimationControls();
  const [burst, setBurst] = useState(0);
  const lastSettled = useRef<number>(-1);

  useEffect(() => {
    if (!round || round.phase !== 'settled' || lastSettled.current === round.id) return;
    lastSettled.current = round.id;
    const net = round.result!.net;
    const staked = round.seatBets.reduce((a, b) => a + b, 0);
    if (net >= staked * 1.5 || round.result!.hands.some((h) => h.outcome === 'blackjack')) setBurst((b) => b + 1);
    else if (net < 0 && dur(1) > 0) void controls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: dur(0.35) } });
  }, [round, controls]);

  const dealerCards = round?.dealer ?? [];
  const dealerGhost = !!round && round.dealer.length === 1 && round.phase !== 'settled';
  const msg = centerMessage(round);
  const net = round?.phase === 'settled' ? round.result!.net : null;
  // Les délais de donne initiale ne valent que tant qu'aucune action n'a été jouée.
  const initialOrder = round && round.decisions.every((d) => d.kind === 'insurance') ? round.dealOrder : undefined;

  return (
    <motion.div animate={controls} className="table-surface relative flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-xl sm:min-h-[560px]">
      <Confetti burst={burst} />
      {/* En-tête de table */}
      <div className="pointer-events-none absolute inset-x-0 top-[44%] flex flex-col items-center gap-1 text-center sm:top-[42%]" aria-hidden="true">
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/20 sm:text-xs">Blackjack paie 3 à 2</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-white/12 sm:block">Le croupier reste sur tous les 17 · Assurance paie 2 à 1</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/12 sm:hidden">Le croupier reste sur 17</span>
      </div>

      {/* Sabot */}
      <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <DeckStack fraction={remainingFraction(shoe)} cut={1 - shoe.cutIndex / Math.max(1, shoe.cards.length)} counts={showShoe ? remainingCounts(shoe) : null} />
      </div>
      {showCount && (
        <div className="absolute left-3 top-3 z-20 rounded-lg bg-bg-0/70 px-2.5 py-1.5 text-xs sm:left-5 sm:top-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">Hi-Lo</div>
          <div className="tabular font-bold">
            CC {runningCount(shoe) > 0 ? '+' : ''}
            {runningCount(shoe)} <span className="text-fg-3">·</span> VC {trueCount(shoe).toFixed(1)}
          </div>
        </div>
      )}

      {/* Croupier */}
      <div className="relative z-10 flex min-h-[170px] items-start justify-center pt-8 sm:min-h-[220px] sm:pt-10">
        {round ? (
          <HandView key={`d-${round.id}`} cards={dealerCards} label="Croupier" dealOrder={initialOrder} ghost={dealerGhost} />
        ) : (
          <HandView cards={[]} label="Croupier" ghost static />
        )}
      </div>

      {/* Message central */}
      <div className="relative z-10 flex min-h-[56px] flex-1 items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {net !== null ? (
            <motion.div
              key={`net-${round!.id}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur(0.3), ease: [0.16, 1, 0.3, 1] }}
              className={`tabular rounded-xl px-4 py-2 text-2xl font-extrabold shadow-xl sm:text-3xl ${
                net > 0 ? 'bg-accent text-accent-ink' : net < 0 ? 'bg-bg-0/80 text-danger' : 'bg-bg-0/80 text-warn'
              }`}
              role="status"
            >
              {net === 0 ? 'Égalité' : formatSignedEuro(net)}
            </motion.div>
          ) : msg ? (
            <motion.div
              key={msg}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur(0.2) }}
              className="rounded-full bg-bg-0/70 px-4 py-1.5 text-sm font-semibold text-fg"
              role="status"
            >
              {msg}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Joueur */}
      <div className="relative z-10 flex items-end justify-center gap-5 px-2 pb-8 sm:gap-12 sm:pb-10">
        {round
          ? round.hands.map((h, i) => (
              <HandView
                key={h.id}
                cards={h.cards}
                fromSplit={h.fromSplit}
                active={round.phase === 'playing' && round.active === i && round.hands.length > 1}
                dim={round.phase === 'playing' && round.active !== i}
                bet={h.bet}
                badge={round.phase === 'settled' ? badgeFor(round, h.id) : null}
                dealOrder={initialOrder}
                label={round.hands.length > 1 ? `Main ${i + 1}` : undefined}
              />
            ))
          : bets.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                {bets.length > 1 && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">Main {i + 1}</div>}
                <div style={{ width: 'var(--card-w)', aspectRatio: '250/350' }} className="grid place-items-center rounded-[9%] border-2 border-dashed border-white/10">
                  {b > 0 ? <ChipStack amount={b} size={40} showLabel={false} /> : <span className="text-[11px] font-semibold text-fg-3">Misez</span>}
                </div>
                <span className="tabular text-sm font-semibold text-fg-2">{b > 0 ? formatEuro(b) : '—'}</span>
              </div>
            ))}
      </div>
    </motion.div>
  );
}

function DeckStack({ fraction, cut, counts }: { fraction: number; cut: number; counts: number[] | null }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    anchors.shoe = ref.current;
    return () => {
      if (anchors.shoe === ref.current) anchors.shoe = null;
    };
  }, []);
  const total = counts ? counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="relative flex flex-col items-end">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Sabot : ${Math.round(fraction * 100)} % des cartes restantes. Afficher la composition.`}
        className="relative h-[56px] w-[40px] rounded-md [--card-w:40px] sm:h-[70px] sm:w-[50px] sm:[--card-w:50px]"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="absolute left-0" style={{ top: -i * 2, left: i * 1 }}>
            <PlayingCard faceDown dealt={false} />
          </div>
        ))}
      </button>
      <div className="mt-2 h-1 w-[40px] overflow-hidden rounded-full bg-bg-0/70 sm:w-[50px]" aria-hidden="true">
        <div className="relative h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${fraction * 100}%` }} />
      </div>
      <div className="relative h-0 w-[40px] sm:w-[50px]" aria-hidden="true">
        <span className="absolute -top-[6px] h-[8px] w-[2px] rounded bg-danger" style={{ left: `${cut * 100}%` }} title="Carte de coupe" />
      </div>
      <AnimatePresence>
        {open && counts && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: dur(0.15) }}
            className="absolute right-0 top-[86px] w-[248px] rounded-xl bg-bg-2 p-3 shadow-2xl ring-1 ring-white/10"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-bold text-fg">Cartes restantes</span>
              <span className="tabular text-xs text-fg-2">{total} / {Math.round(total / Math.max(fraction, 0.001))}</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 1].map((v) => {
                const full = v === 10 ? 96 : 24;
                const pct = Math.min(1, counts[v] / full);
                return (
                  <div key={v} className="flex flex-col items-center gap-1">
                    <div className="relative h-12 w-full overflow-hidden rounded bg-bg-0">
                      <div className="absolute inset-x-0 bottom-0 bg-fg-2/70" style={{ height: `${pct * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-fg-2">{v === 1 ? 'A' : v}</span>
                    <span className="tabular text-[10px] text-fg-3">{counts[v]}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-fg-3">Le trait rouge sous le sabot marque la carte de coupe : on remélange quand elle sort.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
