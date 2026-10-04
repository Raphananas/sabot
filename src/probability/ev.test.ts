import { describe, expect, it } from 'vitest';
import { analyze, bestByEv, dealerDistribution } from './ev';
import { fullCounts } from '../engine/shoe';

/** Composition d'un sabot neuf de 6 jeux dont on a retiré les valeurs données. */
function minus(...values: number[]): number[] {
  const c = fullCounts(6);
  for (const v of values) c[v]--;
  return c;
}

const ALL = { stand: true, hit: true, double: true, split: true, surrender: true };

describe('Distribution du croupier', () => {
  it('somme à 1 pour chaque carte visible', () => {
    for (let up = 1; up <= 10; up++) {
      const d = dealerDistribution(minus(up), up);
      const s = d[17] + d[18] + d[19] + d[20] + d[21] + d.bust + d.blackjack;
      expect(s).toBeCloseTo(1, 10);
    }
  });

  it('blackjack possible seulement avec As ou 10 visible', () => {
    expect(dealerDistribution(minus(1), 1).blackjack).toBeCloseTo(96 / 311, 10);
    expect(dealerDistribution(minus(10), 10).blackjack).toBeCloseTo(24 / 311, 10);
    expect(dealerDistribution(minus(6), 6).blackjack).toBe(0);
  });

  it('le croupier brûle environ 42 % du temps avec un 6 visible, ~ 21 % avec un 10', () => {
    expect(dealerDistribution(minus(6), 6).bust).toBeGreaterThan(0.4);
    expect(dealerDistribution(minus(6), 6).bust).toBeLessThan(0.44);
    expect(dealerDistribution(minus(10), 10).bust).toBeGreaterThan(0.2);
    expect(dealerDistribution(minus(10), 10).bust).toBeLessThan(0.23);
  });

  it('sabot vide (cas limite) : pas de plantage', () => {
    const empty = new Array(11).fill(0);
    expect(dealerDistribution(empty, 5).bust).toBe(1);
  });
});

describe('EV des actions', () => {
  it('20 contre 6 : rester très favorable', () => {
    const a = analyze([10, 10], 6, minus(10, 10, 6), { stand: true, hit: true });
    expect(a.actions.stand!.ev).toBeGreaterThan(0.6);
    expect(bestByEv(a)).toBe('stand');
    const o = a.actions.stand!;
    expect(o.win + o.push + o.lose).toBeCloseTo(1, 10);
  });

  it('11 contre 6 : doubler > tirer > rester', () => {
    const a = analyze([6, 5], 6, minus(6, 5, 6), ALL);
    expect(a.actions.double!.ev).toBeGreaterThan(a.actions.hit!.ev);
    expect(a.actions.hit!.ev).toBeGreaterThan(a.actions.stand!.ev);
    expect(bestByEv(a)).toBe('double');
  });

  it("11 contre 10 sans carte cachée : tirer > doubler (perte totale sur blackjack)", () => {
    const a = analyze([6, 5], 10, minus(6, 5, 10), ALL);
    expect(a.actions.hit!.ev).toBeGreaterThan(a.actions.double!.ev);
  });

  it('16 contre 10 : abandonner est le moindre mal', () => {
    const a = analyze([10, 6], 10, minus(10, 6, 10), ALL);
    expect(a.actions.surrender!.ev).toBe(-0.5);
    expect(bestByEv(a)).toBe('surrender');
  });

  it('8-8 contre 6 : partager bat rester', () => {
    const a = analyze([8, 8], 6, minus(8, 8, 6), ALL);
    expect(a.actions.split!.ev).toBeGreaterThan(a.actions.stand!.ev);
  });

  it('A-A contre 6 : partager (une carte par As)', () => {
    const a = analyze([1, 1], 6, minus(1, 1, 6), ALL);
    expect(a.actions.split!.ev).toBeGreaterThan(a.actions.hit!.ev);
  });

  it('option « mise initiale » : doubler 11 contre 10 devient moins coûteux', () => {
    const lose = analyze([6, 5], 10, minus(6, 5, 10), ALL);
    const orig = analyze([6, 5], 10, minus(6, 5, 10), ALL, { onlyOriginal: true });
    expect(orig.actions.double!.ev).toBeGreaterThan(lose.actions.double!.ev);
    expect(orig.actions.split).toBeUndefined();
    const split = analyze([8, 8], 10, minus(8, 8, 10), ALL, { onlyOriginal: true, das: false });
    expect(split.actions.split!.ev).toBeGreaterThan(analyze([8, 8], 10, minus(8, 8, 10), ALL, { das: false }).actions.split!.ev);
  });

  it("l'assurance est à EV négative sur un sabot neuf (~ -7 %)", () => {
    const a = analyze([10, 9], 1, minus(10, 9, 1), { stand: true });
    expect(a.pTen).toBeCloseTo(95 / 309, 6);
    expect(a.insuranceEv).toBeLessThan(0);
    expect(a.insuranceEv).toBeGreaterThan(-0.06);
  });

  it("l'assurance devient positive avec un sabot riche en 10", () => {
    const c = new Array(11).fill(0);
    c[10] = 50;
    c[5] = 20;
    c[2] = 20;
    expect(analyze([9, 9], 1, c, { stand: true }).insuranceEv).toBeGreaterThan(0);
  });

  it('actions non demandées absentes ; 21 : tirer = perte', () => {
    const a = analyze([10, 1, 10], 5, minus(10, 1, 10, 5), { stand: true, hit: true, double: true });
    expect(a.actions.double).toBeUndefined();
    expect(a.actions.hit!.ev).toBe(-1);
    expect(analyze([10, 6], 10, new Array(11).fill(0), { stand: true }).pTen).toBe(0);
  });

  it('calcul rapide même pour une petite main (5 contre 2)', () => {
    const t0 = performance.now();
    const a = analyze([2, 3], 2, minus(2, 3, 2), ALL);
    expect(performance.now() - t0).toBeLessThan(4000);
    expect(bestByEv(a)).toBe('hit');
  });
});
