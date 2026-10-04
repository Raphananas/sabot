import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/layout/TopBar';
import { PlayingCard } from '../components/cards/PlayingCard';
import { ActionBar } from '../components/table/ActionBar';
import { pickSituation } from '../lib/situations';
import { advise, ACTION_LABELS, type Action } from '../strategy/advisor';
import { explain } from '../strategy/explanations';
import { rankForValue, SUITS, type Card } from '../engine/cards';
import { useSettings, dur, isReducedMotion } from '../store/settings';
import { useStats } from '../store/stats';
import { useGameKeys } from '../hooks/useGameKeys';
import { sfx } from '../lib/sound';

const LIMIT = 3000;
let uid = 0;

interface Q {
  player: Card[];
  up: Card;
  values: number[];
  upValue: number;
}

function mkCard(v: number): Card {
  return { id: `q${++uid}`, rank: rankForValue(v as 1, Math.floor(Math.random() * 4)), suit: SUITS[Math.floor(Math.random() * 4)] };
}

function newQuestion(): Q {
  const [p1, d, p2] = pickSituation('none');
  return { player: [mkCard(p1), mkCard(p2)], up: mkCard(d), values: [p1, p2], upValue: d };
}

type State = 'idle' | 'ask' | 'right' | 'wrong';

export default function Quiz() {
  const surrender = useSettings((s) => s.rules.surrender);
  const best = useStats((s) => s.quizBest);
  const [q, setQ] = useState<Q>(newQuestion);
  const [state, setState] = useState<State>('idle');
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState<{ played: Action | null; correct: Action; why: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deadline, setDeadline] = useState(0);

  const ctx = { cards: q.values, dealerUp: q.upValue, canDouble: true, canSplit: q.values[0] === q.values[1], canSurrender: surrender };

  const finish = useCallback(
    (played: Action | null) => {
      if (timer.current) clearTimeout(timer.current);
      const a = advise({ cards: q.values, dealerUp: q.upValue, canDouble: true, canSplit: q.values[0] === q.values[1], canSurrender: surrender });
      if (played === a.action) {
        sfx('win');
        setStreak((s) => s + 1);
        if ((streak + 1) % 10 === 0) useStats.setState((st) => ({ quizBest: Math.max(st.quizBest, streak + 1) }));
        if (streak + 1 >= 10) useStats.getState().unlock('quiz-10');
        if (streak + 1 >= 30) useStats.getState().unlock('quiz-30');
        setState('right');
        setTimeout(() => next(), isReducedMotion() ? 250 : 550);
      } else {
        sfx('error');
        setAnswer({ played, correct: a.action, why: explain(a, q.upValue) });
        setState('wrong');
        useStats.getState().setQuiz(streak);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, surrender, streak],
  );

  const next = () => {
    setQ(newQuestion());
    setAnswer(null);
    setState('ask');
  };

  useEffect(() => {
    if (state !== 'ask') return;
    setDeadline(Date.now() + LIMIT);
    timer.current = setTimeout(() => finish(null), LIMIT);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, state, finish]);

  const start = () => {
    setStreak(0);
    next();
  };

  useGameKeys({
    onAction: (a) => state === 'ask' && finish(a),
    onSpace: () => (state === 'idle' || state === 'wrong' ? start() : undefined),
  });

  const avail = { hit: true, stand: true, double: true, split: ctx.canSplit, surrender };

  return (
    <div className="min-h-dvh bg-bg-1 [--card-w:clamp(70px,20vw,110px)]">
      <TopBar title="Quiz éclair" />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Quiz éclair</h1>
            <p className="mt-1 text-sm text-fg-2">3 secondes par situation. Une erreur et la série s’arrête.</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-fg-3">Série · record {best}</div>
            <motion.div key={streak} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="tabular text-4xl font-extrabold text-accent">
              {streak}
            </motion.div>
          </div>
        </div>

        <div className="table-surface relative overflow-hidden rounded-xl p-6 sm:p-8">
          {state === 'ask' && (
            <div className="absolute inset-x-0 top-0 h-1 bg-bg-0">
              <motion.div
                key={deadline}
                className="h-full bg-accent"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: LIMIT / 1000, ease: 'linear' }}
              />
            </div>
          )}
          {state === 'idle' ? (
            <div className="grid min-h-[300px] place-items-center text-center">
              <div>
                <p className="mx-auto max-w-sm text-fg-2">Une main, la carte du croupier, et vous choisissez l’action du tableau de stratégie. Raccourcis : H, S, D, P, R.</p>
                <button type="button" className="btn btn-primary mt-6 h-12 px-8 text-base" onClick={start} data-autofocus>
                  Commencer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">Croupier</span>
                <PlayingCard key={q.up.id} card={q.up} dealt={false} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex">
                  {q.player.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i ? 'calc(var(--card-w) * -0.55)' : 0 }}>
                      <PlayingCard card={c} dealt={false} />
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">Vous</span>
              </div>
              <AnimatePresence>
                {state === 'right' && (
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur(0.2) }} className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-ink">
                    Correct
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="mt-4">
          {state === 'wrong' && answer ? (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="panel space-y-3 p-5" role="alert">
              <div className="text-lg font-extrabold text-danger">{answer.played ? `Raté : ${ACTION_LABELS[answer.played]}` : 'Temps écoulé'}</div>
              <div className="text-sm">
                La bonne réponse : <span className="font-bold text-accent">{ACTION_LABELS[answer.correct]}</span>
              </div>
              <p className="text-sm leading-relaxed text-fg-2">{answer.why}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-fg-3">Série finale : {streak}</span>
                <button type="button" className="btn btn-primary h-11 px-6" onClick={start} data-autofocus>
                  Rejouer <kbd className="font-mono text-[11px] opacity-70">Espace</kbd>
                </button>
              </div>
            </motion.div>
          ) : (
            <ActionBar available={avail} onAction={(a) => state === 'ask' && finish(a)} disabled={state !== 'ask'} />
          )}
        </div>
      </main>
    </div>
  );
}
