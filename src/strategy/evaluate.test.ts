import { describe, expect, it } from 'vitest';
import { act, decideInsurance, startRound } from '../engine/game';
import { DEFAULT_RULES } from '../engine/rules';
import { stackedShoe } from '../engine/testutils';
import { evaluateRound } from './evaluate';
import { explain, INSURANCE_EXPLANATION } from './explanations';
import { advise } from './advisor';
import { DEALER_COLS, HARD, PAIRS, SOFT } from './strategy';

describe('Évaluation des décisions', () => {
  it('bonne décision : rester sur 16 contre 6', () => {
    let r = startRound(stackedShoe(['10', '6', '6']), [10], DEFAULT_RULES);
    r = act(r, 'stand');
    const [v] = evaluateRound(r);
    expect(v.correct).toBe(true);
    expect(v.family).toBe('hard');
    expect(v.cellKey).toBe('hard:16:6');
    expect(v.situation).toBe('Dur 16 contre 6');
  });

  it('erreur : tirer 11 contre 6 au lieu de doubler', () => {
    let r = startRound(stackedShoe(['6', '6', '5', '2']), [10], DEFAULT_RULES);
    r = act(r, 'hit');
    const [v] = evaluateRound(r);
    expect(v.correct).toBe(false);
    expect(v.recommended).toBe('double');
    expect(v.explanation).toMatch(/11/);
  });

  it('assurance prise = erreur, refusée = correct', () => {
    const r = startRound(stackedShoe(['10', 'A', '9']), [10], DEFAULT_RULES);
    const taken = evaluateRound(decideInsurance(r, true))[0];
    expect(taken.correct).toBe(false);
    expect(taken.family).toBe('insurance');
    expect(taken.explanation).toBe(INSURANCE_EXPLANATION);
    expect(evaluateRound(decideInsurance(r, false))[0].correct).toBe(true);
  });

  it('famille abandon et paires', () => {
    let r = startRound(stackedShoe(['10', 'K', '6']), [10], DEFAULT_RULES);
    r = act(r, 'hit');
    expect(evaluateRound(r)[0].family).toBe('surrender');
    let p = startRound(stackedShoe(['8', '6', '8']), [10], DEFAULT_RULES);
    p = act(p, 'split');
    const v = evaluateRound(p)[0];
    expect(v.family).toBe('pair');
    expect(v.correct).toBe(true);
    expect(v.situation).toBe('Paire 8-8 contre 6');
  });

  it('chaque case du tableau a une explication non vide', () => {
    const opts = { canDouble: true, canSplit: true, canSurrender: true };
    const tables: [Record<number, unknown>, (k: number) => number[]][] = [
      [HARD, (k) => (k >= 20 ? [10, k - 10] : k > 11 ? [10, k - 10] : k === 4 ? [2, 2] : [2, k - 2])],
      [PAIRS, (k) => [k, k]],
      [SOFT, (k) => [1, k]],
    ];
    for (const [t, mk] of tables)
      for (const k of Object.keys(t).map(Number))
        for (const col of DEALER_COLS) {
          for (const variant of [opts, { canDouble: false, canSplit: false, canSurrender: false }]) {
            const a = advise({ cards: mk(k), dealerUp: col, ...variant });
            expect(explain(a, col).length).toBeGreaterThan(20);
          }
        }
    const star = advise({ cards: [6, 4, 6], dealerUp: 10, canDouble: false, canSplit: false, canSurrender: false });
    expect(explain(star, 10)).toMatch(/astérisque/);
    const off = advise({ cards: [10, 9, 5], dealerUp: 10, canDouble: false, canSplit: false, canSurrender: false });
    expect(explain(off, 10)).toMatch(/terminée/);
    const low = advise({ cards: [2, 2], dealerUp: 5, canDouble: false, canSplit: false, canSurrender: false });
    expect(explain(low, 5)).toMatch(/tire/);
    const hardD = advise({ cards: [3, 3, 4], dealerUp: 5, canDouble: false, canSplit: false, canSurrender: false });
    expect(explain(hardD, 5)).toMatch(/doubler/);
  });
});
