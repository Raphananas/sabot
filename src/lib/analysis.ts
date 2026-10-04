import { cardValue } from '../engine/cards';
import type { Decision } from '../engine/game';
import type { Rules } from '../engine/rules';
import { analyzeAsync } from '../probability/client';
import type { Analysis, EvAction, Outcomes } from '../probability/ev';
import type { Verdict } from '../strategy/evaluate';

export interface DecisionAnalysis {
  analysis: Analysis;
  played: Outcomes | null;
  recommended: Outcomes | null;
  /** EV en € de l'action jouée / recommandée (mise de la main). */
  evPlayed: number;
  evRec: number;
  /** Coût de l'erreur en € (0 si bonne décision). */
  cost: number;
  /** L'EV exacte préfère une autre action que le tableau (nuance de composition). */
  nuance: EvAction | null;
}

/** Analyse probabiliste d'une décision (Web Worker, mise en cache). */
export async function analyzeDecision(v: Verdict, rules: Rules): Promise<DecisionAnalysis> {
  const d: Decision = v.decision;
  const values = d.cards.map((c) => cardValue(c.rank));
  const up = cardValue(d.dealerUp.rank);
  const allowed =
    d.kind === 'insurance'
      ? { stand: true }
      : { stand: true, hit: true, double: d.available.double, split: d.available.split, surrender: d.available.surrender };
  const analysis = await analyzeAsync(values, up, d.counts, allowed, {
    onlyOriginal: rules.dealerBjLosesOnlyOriginal,
    das: rules.doubleAfterSplit,
    blackjackPayout: rules.blackjackPayout,
  });
  if (d.kind === 'insurance') {
    const insEv = analysis.insuranceEv * d.bet;
    const evPlayed = d.action === 'insurance' ? insEv : 0;
    return { analysis, played: null, recommended: null, evPlayed, evRec: 0, cost: Math.max(0, -evPlayed) * (d.action === 'insurance' ? 1 : 0), nuance: null };
  }
  const played = analysis.actions[d.action as EvAction] ?? null;
  const recommended = analysis.actions[v.recommended as EvAction] ?? null;
  const evPlayed = (played?.ev ?? 0) * d.bet;
  const evRec = (recommended?.ev ?? 0) * d.bet;
  let best: EvAction | null = null;
  let bestEv = -Infinity;
  for (const [k, o] of Object.entries(analysis.actions) as [EvAction, Outcomes][]) {
    if (o.ev > bestEv + 1e-9) {
      bestEv = o.ev;
      best = k;
    }
  }
  const nuance = best && best !== v.recommended && bestEv - (recommended?.ev ?? 0) > 0.0005 ? best : null;
  return { analysis, played, recommended, evPlayed, evRec, cost: v.correct ? 0 : evRec - evPlayed, nuance };
}
