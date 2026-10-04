import { cardValue } from '../engine/cards';
import type { Decision, Round } from '../engine/game';
import { advise, type Advice } from './advisor';
import { explain, INSURANCE_EXPLANATION, NO_INSURANCE_EXPLANATION } from './explanations';
import { rowLabel } from './strategy';

export type Family = 'hard' | 'soft' | 'pair' | 'surrender' | 'insurance';

export interface Verdict {
  decision: Decision;
  correct: boolean;
  /** Action recommandée (ou 'no-insurance'). */
  recommended: Advice['action'] | 'no-insurance';
  advice: Advice | null;
  family: Family;
  /** Clé de case du tableau (heatmap) : « hard:16:10 ». */
  cellKey: string | null;
  situation: string;
  explanation: string;
}

export function familyOf(advice: Advice, played: string): Family {
  if (advice.code === 'AbT' || advice.code === 'AbR' || played === 'surrender') return 'surrender';
  return advice.table;
}

export function evaluateDecision(d: Decision): Verdict {
  const up = cardValue(d.dealerUp.rank);
  const upLabel = up === 1 ? 'As' : String(up);
  const values = d.cards.map((c) => cardValue(c.rank));
  if (d.kind === 'insurance') {
    const correct = d.action === 'no-insurance';
    return {
      decision: d,
      correct,
      recommended: 'no-insurance',
      advice: null,
      family: 'insurance',
      cellKey: null,
      situation: `Assurance proposée (croupier : As)`,
      explanation: correct ? NO_INSURANCE_EXPLANATION : INSURANCE_EXPLANATION,
    };
  }
  const advice = advise({
    cards: values,
    dealerUp: up,
    canDouble: d.available.double,
    canSplit: d.available.split,
    canSurrender: d.available.surrender,
  });
  const correct = advice.action === d.action;
  const cellKey = advice.offTable ? null : `${advice.table}:${advice.row}:${advice.col}`;
  const kindLabel = advice.table === 'pair' ? 'Paire' : advice.table === 'soft' ? 'Souple' : 'Dur';
  return {
    decision: d,
    correct,
    recommended: advice.action,
    advice,
    family: familyOf(advice, d.action),
    cellKey,
    situation: `${kindLabel} ${advice.offTable ? values.reduce((a, b) => a + b, 0) : rowLabel(advice.table, advice.row)} contre ${upLabel}`,
    explanation: explain(advice, up),
  };
}

export function evaluateRound(r: Round): Verdict[] {
  return r.decisions.map(evaluateDecision);
}
