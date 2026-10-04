import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { PlayingCard } from '../components/cards/PlayingCard';
import { card } from '../engine/cards';
import { useSettings, dur, isReducedMotion } from '../store/settings';
import { StrategyChart } from '../components/strategy/StrategyChart';

const STEP_MS = 10000;

const STEPS: { title: string; text: string; visual: ReactNode }[] = [
  {
    title: 'Approchez 21, sans dépasser',
    text: 'Vous jouez contre le croupier. Celui qui est le plus proche de 21 gagne. Au-delà de 21, la main « saute » et perd immédiatement.',
    visual: (
      <div className="flex [--card-w:96px]">
        <PlayingCard card={card('K', 'S', 't1')} dealt={false} />
        <div style={{ marginLeft: -50 }}>
          <PlayingCard card={card('A', 'H', 't2')} dealt={false} />
        </div>
      </div>
    ),
  },
  {
    title: 'La valeur des cartes',
    text: '2 à 9 : leur valeur. 10, Valet, Dame, Roi : 10. L’As : 1 ou 11, au mieux. As + 6 = « 7 ou 17 », une main souple qui ne peut pas sauter si vous tirez.',
    visual: (
      <div className="flex gap-2 [--card-w:76px]">
        <PlayingCard card={card('7', 'D', 't3')} dealt={false} />
        <PlayingCard card={card('Q', 'C', 't4')} dealt={false} />
        <PlayingCard card={card('A', 'S', 't5')} dealt={false} />
      </div>
    ),
  },
  {
    title: 'Cinq décisions',
    text: 'Tirer (H), Rester (S), Doubler la mise pour une seule carte (D), Partager une paire en deux mains (P), Abandonner pour récupérer la moitié (R).',
    visual: (
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
        {['Tirer · H', 'Rester · S', 'Doubler · D', 'Partager · P'].map((l) => (
          <div key={l} className="rounded-lg bg-bg-4 px-4 py-3">
            {l}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Pas de carte cachée',
    text: 'En France, le croupier ne prend sa 2e carte qu’après vous. S’il fait blackjack, vous perdez tout ce que vous avez misé, doubles et splits compris. D’où la prudence contre un 10 ou un As.',
    visual: (
      <div className="flex [--card-w:96px]">
        <PlayingCard card={card('10', 'C', 't6')} dealt={false} />
        <div style={{ marginLeft: -50 }}>
          <PlayingCard faceDown dealt={false} dimmed />
        </div>
      </div>
    ),
  },
  {
    title: 'La stratégie de base',
    text: 'Pour chaque main et chaque carte du croupier, il existe une meilleure décision. Le tableau la résume. Après chaque main en Practice, le debrief vous dit si vous l’avez suivie, et pourquoi.',
    visual: (
      <div className="w-[300px] max-w-full">
        <StrategyChart compact only="soft" highlight={{ table: 'soft', row: 7, col: 6 }} />
      </div>
    ),
  },
  {
    title: 'Deux modes',
    text: 'Practice : mises libres et debrief détaillé. Rush : 500 € de départ, encaissez au bon moment, votre score est ce que vous gardez.',
    visual: (
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-bg-4 px-6 py-5 text-xl font-extrabold italic">Practice</div>
        <div className="rounded-xl bg-accent px-6 py-5 text-xl font-extrabold italic text-accent-ink">Rush</div>
      </div>
    ),
  },
];

export default function Tutorial() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const last = i === STEPS.length - 1;
  useEffect(() => {
    useSettings.getState().set({ tutorialSeen: true });
  }, []);
  useEffect(() => {
    if (last || isReducedMotion()) return;
    const t = setTimeout(() => setI((x) => x + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [i, last]);
  const s = STEPS[i];
  return (
    <div className="min-h-dvh bg-bg-1">
      <TopBar title="Tutoriel" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
        <div className="mb-4 flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-bg-3">
              {k < i && <div className="h-full w-full bg-accent" />}
              {k === i && (
                <motion.div key={i} className="h-full bg-accent" initial={{ width: '0%' }} animate={{ width: last ? '100%' : '100%' }} transition={{ duration: last || isReducedMotion() ? 0 : STEP_MS / 1000, ease: 'linear' }} />
              )}
            </div>
          ))}
        </div>
        <div className="panel overflow-hidden">
          <div className="table-surface grid h-64 place-items-center rounded-none border-0 sm:h-72">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: dur(0.3) }}>
                {s.visual}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="p-6" aria-live="polite">
            <div className="text-xs font-bold uppercase tracking-wider text-fg-3">
              Étape {i + 1} / {STEPS.length}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">{s.title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{s.text}</p>
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" className="btn btn-ghost h-11 px-4" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
                ← Précédent
              </button>
              {last ? (
                <button type="button" className="btn btn-primary h-11 px-6" onClick={() => navigate('/practice')} data-autofocus>
                  Jouer en Practice →
                </button>
              ) : (
                <button type="button" className="btn btn-secondary h-11 px-6" onClick={() => setI((x) => x + 1)}>
                  Suivant →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
