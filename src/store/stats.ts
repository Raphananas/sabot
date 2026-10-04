import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Round } from '../engine/game';
import type { Family, Verdict } from '../strategy/evaluate';
import { analyzeDecision } from '../lib/analysis';
import { useSettings } from './settings';
import { setWeakCells } from '../lib/situations';
import { ACHIEVEMENTS } from '../lib/achievements';

export interface DecisionStat {
  id: string;
  t: number;
  mode: string;
  family: Family;
  cell: string | null;
  correct: boolean;
  cost: number | null;
  situation: string;
  played: string;
  rec: string;
}

export interface Counter {
  n: number;
  err: number;
}

export interface RushScore {
  t: number;
  score: number;
  peak: number;
  hands: number;
  accuracy: number;
  daily?: string | null;
  name?: string;
}

interface StatsState {
  decisions: DecisionStat[];
  cells: Record<string, Counter>;
  families: Record<Family, Counter>;
  days: Record<string, Counter>;
  hands: number;
  perfectHands: number;
  perfectStreak: number;
  bestPerfectStreak: number;
  errorCost: number;
  noInsurance: number;
  rushScores: RushScore[];
  daily: Record<string, RushScore>;
  quizBest: number;
  quizPlayed: number;
  countingBest: number;
  achievements: Record<string, number>;
  /** Session en cours (non persistée de façon significative). */
  session: { hands: number; errors: number };
  toasts: string[];
  unlock: (id: string) => void;
  popToast: () => void;
  addRushScore: (s: RushScore) => void;
  setQuiz: (streak: number) => void;
  setCounting: (score: number) => void;
  resetSession: () => void;
  importData: (json: string) => void;
  resetAll: () => void;
}

const emptyFamilies = (): Record<Family, Counter> => ({
  hard: { n: 0, err: 0 },
  soft: { n: 0, err: 0 },
  pair: { n: 0, err: 0 },
  surrender: { n: 0, err: 0 },
  insurance: { n: 0, err: 0 },
});

const INITIAL = {
  decisions: [] as DecisionStat[],
  cells: {} as Record<string, Counter>,
  families: emptyFamilies(),
  days: {} as Record<string, Counter>,
  hands: 0,
  perfectHands: 0,
  perfectStreak: 0,
  bestPerfectStreak: 0,
  errorCost: 0,
  noInsurance: 0,
  rushScores: [] as RushScore[],
  daily: {} as Record<string, RushScore>,
  quizBest: 0,
  quizPlayed: 0,
  countingBest: 0,
  achievements: {} as Record<string, number>,
  session: { hands: 0, errors: 0 },
  toasts: [] as string[],
};

const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export const useStats = create<StatsState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      unlock(id) {
        if (get().achievements[id]) return;
        set((s) => ({ achievements: { ...s.achievements, [id]: Date.now() }, toasts: [...s.toasts, id] }));
      },
      popToast() {
        set((s) => ({ toasts: s.toasts.slice(1) }));
      },
      addRushScore(sc) {
        set((s) => {
          const rushScores = [...s.rushScores, sc].sort((a, b) => b.score - a.score).slice(0, 20);
          const daily = sc.daily ? { ...s.daily, [sc.daily]: !s.daily[sc.daily] || s.daily[sc.daily].score < sc.score ? sc : s.daily[sc.daily] } : s.daily;
          return { rushScores, daily };
        });
        if (sc.daily) get().unlock('daily');
        if (sc.score >= 500 && sc.score >= sc.peak) get().unlock('rush-peak');
      },
      setQuiz(streak) {
        set((s) => ({ quizBest: Math.max(s.quizBest, streak), quizPlayed: s.quizPlayed + 1 }));
        if (streak >= 10) get().unlock('quiz-10');
        if (streak >= 30) get().unlock('quiz-30');
      },
      setCounting(score) {
        set((s) => ({ countingBest: Math.max(s.countingBest, score) }));
        get().unlock('counter');
      },
      resetSession() {
        set({ session: { hands: 0, errors: 0 } });
      },
      importData(json) {
        const data = JSON.parse(json);
        if (!data || typeof data !== 'object' || !('stats' in data)) throw new Error('Fichier invalide');
        set({ ...INITIAL, ...data.stats, toasts: [] });
        if (data.settings) useSettings.setState(data.settings);
      },
      resetAll() {
        set({ ...INITIAL, families: emptyFamilies() });
      },
    }),
    {
      name: 'sabot:stats',
      version: 1,
      partialize: (s) => {
        const { toasts: _t, session: _s, ...rest } = s;
        void _t;
        void _s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function'));
      },
    },
  ),
);

function bump(c: Counter | undefined, err: boolean): Counter {
  return { n: (c?.n ?? 0) + 1, err: (c?.err ?? 0) + (err ? 1 : 0) };
}

/** Met à jour les cases les plus ratées pour le filtre « Mes points faibles ». */
export function refreshWeakCells() {
  const cells = useStats.getState().cells;
  const keys = Object.entries(cells)
    .filter(([, c]) => c.err > 0)
    .sort((a, b) => b[1].err / b[1].n - a[1].err / a[1].n || b[1].err - a[1].err)
    .map(([k]) => k);
  setWeakCells(keys);
}

/** Enregistre un coup joué : précision, heatmap, séries, coût des erreurs (calculé dans le worker). */
export function recordRound(mode: string, r: Round, verdicts: Verdict[], _daily: string | null) {
  void _daily;
  const st = useStats.getState();
  const now = Date.now();
  const errors = verdicts.filter((v) => !v.correct).length;
  const perfect = errors === 0 && verdicts.length > 0;
  const cells = { ...st.cells };
  const families = { ...st.families };
  const days = { ...st.days };
  const newStats: DecisionStat[] = verdicts.map((v, i) => {
    if (v.cellKey) cells[v.cellKey] = bump(cells[v.cellKey], !v.correct);
    families[v.family] = bump(families[v.family], !v.correct);
    days[dayKey(now)] = bump(days[dayKey(now)], !v.correct);
    return {
      id: `${now}-${i}`,
      t: now,
      mode,
      family: v.family,
      cell: v.cellKey,
      correct: v.correct,
      cost: v.correct ? 0 : null,
      situation: v.situation,
      played: v.decision.action,
      rec: v.recommended,
    };
  });
  const streak = verdicts.length === 0 ? st.perfectStreak : perfect ? st.perfectStreak + 1 : 0;
  const session = { hands: st.session.hands + 1, errors: st.session.errors + errors };
  const noIns = st.noInsurance + verdicts.filter((v) => v.decision.action === 'no-insurance').length;
  useStats.setState({
    decisions: [...st.decisions, ...newStats].slice(-3000),
    cells,
    families,
    days,
    hands: st.hands + 1,
    perfectHands: st.perfectHands + (perfect ? 1 : 0),
    perfectStreak: streak,
    bestPerfectStreak: Math.max(st.bestPerfectStreak, streak),
    noInsurance: noIns,
    session,
  });

  const s = useStats.getState();
  s.unlock('first-hand');
  if (s.hands >= 100) s.unlock('hands-100');
  if (s.hands >= 1000) s.unlock('hands-1000');
  if (streak >= 10) s.unlock('perfect-10');
  if (streak >= 50) s.unlock('perfect-50');
  if (session.hands >= 20 && session.errors === 0) s.unlock('session-zero');
  if (r.result?.hands.some((h) => h.outcome === 'blackjack')) s.unlock('blackjack');
  if (noIns >= 10) s.unlock('no-insurance-10');
  const total = Object.values(s.families).reduce((a, c) => a + c.n, 0);
  const err = Object.values(s.families).reduce((a, c) => a + c.err, 0);
  if (total >= 200 && 1 - err / total >= 0.95) s.unlock('scholar');
  refreshWeakCells();

  // Coût des erreurs (EV) calculé en arrière-plan.
  const rules = useSettings.getState().rules;
  verdicts.forEach((v, i) => {
    if (v.correct) return;
    analyzeDecision(v, rules)
      .then((a) => {
        const id = newStats[i].id;
        useStats.setState((cur) => ({
          decisions: cur.decisions.map((d) => (d.id === id ? { ...d, cost: a.cost } : d)),
          errorCost: cur.errorCost + Math.max(0, a.cost),
        }));
      })
      .catch(() => {});
  });
}

export function achievementTitle(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id;
}

/** Titre de joueur selon le score Rush. */
export function rushTitle(score: number): string {
  if (score <= 0) return 'Ruiné';
  if (score < 500) return 'Novice';
  if (score < 750) return 'Joueur';
  if (score < 1000) return 'Habile';
  if (score < 2000) return 'Pro';
  if (score < 5000) return 'High Roller';
  return 'Légende du salon';
}
