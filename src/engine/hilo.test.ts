import { describe, expect, it } from 'vitest';
import { hiLo, runningCount, trueCount } from './hilo';
import { card } from './cards';
import { stackedShoe } from './testutils';

describe('Comptage Hi-Lo', () => {
  it('valeurs des cartes', () => {
    expect(hiLo(card('2'))).toBe(1);
    expect(hiLo(card('6'))).toBe(1);
    expect(hiLo(card('7'))).toBe(0);
    expect(hiLo(card('9'))).toBe(0);
    expect(hiLo(card('K'))).toBe(-1);
    expect(hiLo(card('A'))).toBe(-1);
  });
  it('compte courant et vrai compte', () => {
    const shoe = { ...stackedShoe(['2', '3', '4', '5', 'K']), pos: 5 };
    expect(runningCount(shoe)).toBe(3);
    expect(trueCount(shoe)).toBeCloseTo(3 / 6, 5);
    expect(runningCount({ ...shoe, pos: 0 })).toBe(0);
    const full = createSum();
    expect(full).toBe(0);
  });
});

function createSum() {
  const shoe = stackedShoe([]);
  return runningCount({ ...shoe, pos: shoe.cards.length });
}
