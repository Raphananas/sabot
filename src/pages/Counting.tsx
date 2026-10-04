import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/layout/TopBar';
import { PageShell, Segmented } from '../components/ui/Controls';
import { PlayingCard } from '../components/cards/PlayingCard';
import { createShoe } from '../engine/shoe';
import { randomSeed } from '../engine/rng';
import { hiLo } from '../engine/hilo';
import type { Card } from '../engine/cards';
import { useStats } from '../store/stats';
import { dur } from '../store/settings';
import { sfx } from '../lib/sound';

type Phase = 'setup' | 'show' | 'answer' | 'result';

export default function Counting() {
  const [count, setCount] = useState(20);
  const [speed, setSpeed] = useState(900);
  const [phase, setPhase] = useState<Phase>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const best = useStats((s) => s.countingBest);

  const truth = cards.reduce((a, c) => a + hiLo(c), 0);

  const start = () => {
    const shoe = createShoe(6, 0.75, randomSeed());
    setCards(shoe.cards.slice(0, count) as Card[]);
    setI(0);
    setGuess('');
    setPhase('show');
  };

  useEffect(() => {
    if (phase !== 'show') return;
    if (i >= cards.length) {
      setPhase('answer');
      setTimeout(() => input.current?.focus(), 50);
      return;
    }
    sfx('deal');
    const t = setTimeout(() => setI((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [phase, i, cards.length, speed]);

  const submit = () => {
    const ok = Number(guess) === truth;
    setPhase('result');
    sfx(ok ? 'win' : 'error');
    if (ok) useStats.getState().setCounting(count * (1500 / speed));
  };

  const current = cards[i];

  return (
    <div className="min-h-dvh bg-bg-1 [--card-w:clamp(90px,26vw,130px)]">
      <TopBar title="Comptage Hi-Lo" />
      <PageShell title="Entraînement au comptage Hi-Lo">
        <div className="panel mb-4 space-y-2 p-5 text-sm leading-relaxed text-fg-2">
          <p>
            Le Hi-Lo attribue <b className="text-fg">+1</b> aux cartes 2 à 6, <b className="text-fg">0</b> aux 7, 8, 9 et <b className="text-fg">−1</b> aux 10, figures et As. Le <b className="text-fg">compte courant</b> est la somme depuis le mélange ; le <b className="text-fg">vrai compte</b> le divise par le nombre de jeux restants. Un compte positif signifie un sabot riche en 10 et en As, favorable au joueur.
          </p>
          <p className="text-xs text-fg-3">Outil pédagogique : compter les cartes n’est pas illégal, mais c’est très mal vu dans les casinos, qui peuvent refuser un joueur. Ici, il sert surtout à comprendre pourquoi l’assurance ou certaines décisions changent selon la composition du sabot.</p>
        </div>

        <div className="table-surface relative grid min-h-[340px] place-items-center overflow-hidden rounded-xl p-6">
          {phase === 'setup' && (
            <div className="w-full max-w-sm">
              <Segmented label="Nombre de cartes" value={count} onChange={setCount} options={[10, 20, 30, 52].map((v) => ({ value: v, label: String(v) }))} />
              <Segmented
                label="Vitesse"
                value={speed}
                onChange={setSpeed}
                options={[
                  { value: 1400, label: 'Calme' },
                  { value: 900, label: 'Normal' },
                  { value: 550, label: 'Rapide' },
                  { value: 320, label: 'Pro' },
                ]}
              />
              <button type="button" className="btn btn-primary mt-4 h-12 w-full text-base" onClick={start} data-autofocus>
                Lancer la série
              </button>
              {best > 0 && <p className="mt-3 text-center text-xs text-fg-3">Meilleur score : {Math.round(best)} pts</p>}
            </div>
          )}
          {phase === 'show' && (
            <div className="flex flex-col items-center gap-4" aria-live="off">
              <AnimatePresence mode="popLayout">
                {current && (
                  <motion.div key={current.id} initial={{ x: 60, opacity: 0, rotate: 8 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: dur(0.18) }}>
                    <PlayingCard card={current} dealt={false} />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="tabular text-sm text-fg-3">
                {Math.min(i + 1, cards.length)} / {cards.length}
              </span>
            </div>
          )}
          {phase === 'answer' && (
            <form
              className="w-full max-w-xs text-center"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label htmlFor="rc" className="text-lg font-bold">
                Quel est le compte courant ?
              </label>
              <div className="input mt-4 flex h-14 items-center px-4">
                <input ref={input} id="rc" inputMode="numeric" pattern="-?[0-9]*" className="tabular h-full w-full bg-transparent text-center text-2xl font-bold outline-none" value={guess} onChange={(e) => setGuess(e.target.value.replace(/[^0-9-]/g, ''))} />
              </div>
              <button type="submit" className="btn btn-primary mt-4 h-12 w-full" disabled={guess === '' || guess === '-'}>
                Valider
              </button>
            </form>
          )}
          {phase === 'result' && (
            <div className="w-full max-w-xl text-center">
              <div className={`text-3xl font-extrabold ${Number(guess) === truth ? 'text-accent' : 'text-danger'}`}>{Number(guess) === truth ? 'Exact !' : `Le compte était ${truth > 0 ? '+' : ''}${truth}`}</div>
              <div className="mt-5 flex flex-wrap justify-center gap-1.5 [--card-w:38px]">
                {cards.map((c) => (
                  <div key={c.id} className="flex flex-col items-center gap-0.5">
                    <PlayingCard card={c} dealt={false} />
                    <span className={`tabular text-[11px] font-bold ${hiLo(c) > 0 ? 'text-accent' : hiLo(c) < 0 ? 'text-danger' : 'text-fg-3'}`}>{hiLo(c) > 0 ? '+1' : hiLo(c) < 0 ? '−1' : '0'}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary mt-6 h-12 px-8" onClick={() => setPhase('setup')} data-autofocus>
                Recommencer
              </button>
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
}
