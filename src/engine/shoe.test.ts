import { describe, expect, it } from 'vitest';
import { createShoe, cutIndexFor, draw, fisherYates, fullCounts, needsReshuffle, remaining, remainingCounts, remainingFraction, rigTop, shuffleShoe } from './shoe';
import { createRng, dailySeed, randomSeed, seedFromString } from './rng';
import { card, cardLabel, cardValue, isRed, rankForValue, valueLabel } from './cards';
import { handValue, isBust, isNatural, isPair, totalLabel } from './hand';

describe('Sabot', () => {
  it('contient 312 cartes : 24 de chaque valeur 1..9 et 96 valeurs 10', () => {
    const s = createShoe(6, 0.75, 1);
    expect(s.cards).toHaveLength(312);
    const c = remainingCounts(s);
    expect(c.slice(1, 10).every((n) => n === 24)).toBe(true);
    expect(c[10]).toBe(96);
    expect(new Set(s.cards.map((x) => x.id)).size).toBe(312);
    expect(c).toEqual(fullCounts(6));
  });

  it('mélange déterministe pour une même graine, différent sinon', () => {
    const a = createShoe(6, 0.75, 123).cards.map((c) => c.id);
    const b = createShoe(6, 0.75, 123).cards.map((c) => c.id);
    const c = createShoe(6, 0.75, 124).cards.map((c) => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('Fisher-Yates conserve les éléments et donne des positions uniformes', () => {
    const rng = createRng(7);
    const firsts = new Array(4).fill(0);
    for (let i = 0; i < 8000; i++) {
      const p = fisherYates([0, 1, 2, 3], () => rng.next());
      expect([...p].sort()).toEqual([0, 1, 2, 3]);
      firsts[p[0]]++;
    }
    for (const f of firsts) expect(f / 8000).toBeGreaterThan(0.22);
  });

  it('carte de coupe à ~75 % et bornée', () => {
    expect(cutIndexFor(312, 0.75)).toBe(234);
    expect(cutIndexFor(312, 0.1)).toBe(Math.round(312 * 0.4));
    expect(cutIndexFor(312, 1)).toBe(Math.round(312 * 0.95));
  });

  it('signale le remélange quand la coupe est atteinte, puis remélange', () => {
    const s = createShoe(6, 0.75, 1);
    expect(needsReshuffle(s)).toBe(false);
    const past = { ...s, pos: 234 };
    expect(needsReshuffle(past)).toBe(true);
    const fresh = shuffleShoe(past);
    expect(fresh.pos).toBe(0);
    expect(fresh.shuffleNo).toBe(s.shuffleNo + 1);
    expect(fresh.cards[0].id).toMatch(/^s1/);
    expect(remaining(fresh)).toBe(312);
    expect(remainingFraction(past)).toBeCloseTo(78 / 312);
    expect(remainingFraction({ ...s, cards: [] })).toBe(0);
  });

  it('tire séquentiellement sans muter le sabot', () => {
    const s = createShoe(6, 0.75, 9);
    const { card: c, shoe } = draw(s);
    expect(c).toBe(s.cards[0]);
    expect(shoe.pos).toBe(1);
    expect(s.pos).toBe(0);
  });

  it('sabot épuisé : remélange en excluant les cartes en jeu', () => {
    const s = createShoe(1, 0.75, 3);
    const empty = { ...s, pos: s.cards.length };
    const inPlay = [s.cards[0], s.cards[1]];
    const { shoe } = draw(empty, inPlay);
    expect(shoe.cards).toHaveLength(50);
    expect(shoe.pos).toBe(1);
  });

  it('rigTop place des valeurs précises en tête sans changer la composition', () => {
    const s = createShoe(6, 0.75, 5);
    const rigged = rigTop(s, [8, 6, 8], () => 0.5)!;
    expect(rigged.cards.slice(0, 3).map((c) => cardValue(c.rank))).toEqual([8, 6, 8]);
    expect(remainingCounts(rigged)).toEqual(remainingCounts(s));
    const tiny = { ...createShoe(1, 0.75, 5) };
    expect(rigTop(tiny, [1, 1, 1, 1, 1])).toBeNull();
  });
});

describe('Générateur et graines', () => {
  it('reproductible et borné', () => {
    const a = createRng(99);
    const b = createRng(99);
    for (let i = 0; i < 50; i++) {
      const x = a.int(10);
      expect(x).toBe(b.int(10));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(10);
    }
    expect(a.state).toBe(b.state);
  });

  it('graine du jour stable pour une date', () => {
    const d = new Date(2026, 9, 4);
    expect(dailySeed(d).key).toBe('2026-10-04');
    expect(dailySeed(d).seed).toBe(dailySeed(new Date(2026, 9, 4, 23)).seed);
    expect(dailySeed(d).seed).not.toBe(dailySeed(new Date(2026, 9, 5)).seed);
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
    expect(Number.isInteger(randomSeed())).toBe(true);
  });
});

describe('Cartes et mains', () => {
  it('valeurs et libellés', () => {
    expect(cardValue('A')).toBe(1);
    expect(cardValue('K')).toBe(10);
    expect(cardValue('7')).toBe(7);
    expect(isRed('H')).toBe(true);
    expect(isRed('S')).toBe(false);
    expect(cardLabel(card('Q', 'H', 'x'))).toBe('Dame de cœur');
    expect(valueLabel(1)).toBe('A');
    expect(valueLabel(10)).toBe('10');
    expect(rankForValue(1)).toBe('A');
    expect(rankForValue(10, 2)).toBe('Q');
    expect(rankForValue(7)).toBe('7');
    expect(card('5').id).toBeTruthy();
  });

  it('totaux durs et souples', () => {
    const h = (...r: Parameters<typeof card>[0][]) => r.map((x) => card(x));
    expect(handValue(h('A', '6'))).toEqual({ total: 17, soft: true, hard: 7 });
    expect(handValue(h('A', '6', '9'))).toEqual({ total: 16, soft: false, hard: 16 });
    expect(handValue(h('A', 'A', '9'))).toEqual({ total: 21, soft: true, hard: 11 });
    expect(isBust(h('K', 'Q', '2'))).toBe(true);
    expect(isNatural(h('A', 'K'))).toBe(true);
    expect(isNatural(h('A', 'K'), true)).toBe(false);
    expect(isPair(h('K', 'Q'))).toBe(true);
    expect(isPair(h('K', '9'))).toBe(false);
    expect(totalLabel([])).toBe('');
    expect(totalLabel(h('A', 'K'))).toBe('Blackjack');
    expect(totalLabel(h('A', '6'))).toBe('7 / 17');
    expect(totalLabel(h('A', '5', '5'))).toBe('21');
    expect(totalLabel(h('10', '6'))).toBe('16');
  });
});
