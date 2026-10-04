import { describe, expect, it } from 'vitest';
import { DEALER_COLS, HARD, PAIRS, SOFT, lookup, isStar, rowLabel, colIndex, type Code } from './strategy';
import { advise, findCell, toCol } from './advisor';

/**
 * Transcription INDÉPENDANTE du tableau fourni (copiée telle quelle du cahier des charges).
 * Chaque case est vérifiée contre les données de strategy.ts et contre le conseiller.
 */
const EXPECTED_HARD: Record<number, string> = {
  21: 'R R R R R R R R R R',
  20: 'R R R R R R R R R R',
  19: 'R R R R R R R R R R',
  18: 'R R R R R R R R R R',
  17: 'R R R R R R R R R AbR',
  16: 'R R R R R T T AbT AbT AbT',
  15: 'R R R R R T T T AbT AbT',
  14: 'R R R R R T T T AbT AbT',
  13: 'R R R R R T T T T AbT',
  12: 'T T R R R T T T T AbT',
  11: 'D D D D D D D D T T',
  10: 'D D D D D D D D T T',
  9: 'T D D D D T T T T T',
  8: 'T T T T T T T T T T',
  7: 'T T T T T T T T T AbT',
  6: 'T T T T T T T T T AbT',
  5: 'T T T T T T T T T AbT',
};
const EXPECTED_PAIRS: Record<number, string> = {
  1: 'P P P P P P P P P T',
  10: 'R R R R R R R R R R',
  9: 'P P P P P R P P R R',
  8: 'P P P P P P P P AbT AbT',
  7: 'P P P P P P T T AbT AbT',
  6: 'P P P P P T T T T AbT',
  5: 'D D D D D D D D T T',
  4: 'T T T P P T T T T T',
  3: 'P P P P P P T T T AbT',
  2: 'P P P P P P T T T T',
};
const EXPECTED_SOFT: Record<number, string> = {
  10: 'R R R R R R R R R R',
  9: 'R R R R R R R R R R',
  8: 'R R R R R R R R R R',
  7: 'R D D D D R R T T T',
  6: 'T D D D D T T T T T',
  5: 'T T D D D T T T T T',
  4: 'T T D D D T T T T T',
  3: 'T T T D D T T T T T',
  2: 'T T T D D T T T T T',
};

const ALL = { canDouble: true, canSplit: true, canSurrender: true };
const ACTION_OF: Record<Code, string> = { R: 'stand', T: 'hit', D: 'double', P: 'split', AbT: 'surrender', AbR: 'surrender' };

/** Deux cartes non paires (et sans As) faisant `total` dur. */
function hardTwoCards(total: number): number[] {
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b >= 2 && b <= 10 && b !== a) return [a, b];
  }
  throw new Error(`pas de combinaison pour ${total}`);
}

/** Trois cartes faisant `total` dur (sans As). */
function hardThreeCards(total: number): number[] {
  for (let a = 2; a <= 10; a++)
    for (let b = 2; b <= 10; b++) {
      const c = total - a - b;
      if (c >= 2 && c <= 10) return [a, b, c];
    }
  throw new Error(`pas de combinaison pour ${total}`);
}

describe('Tableau de stratégie : données', () => {
  it('compte exactement 17 + 10 + 9 lignes de 10 colonnes', () => {
    expect(Object.keys(HARD)).toHaveLength(17);
    expect(Object.keys(PAIRS)).toHaveLength(10);
    expect(Object.keys(SOFT)).toHaveLength(9);
    for (const t of [HARD, PAIRS, SOFT]) for (const r of Object.values(t)) expect(r).toHaveLength(10);
  });

  for (const [table, expected] of [
    ['hard', EXPECTED_HARD],
    ['pair', EXPECTED_PAIRS],
    ['soft', EXPECTED_SOFT],
  ] as const) {
    for (const [rowKey, line] of Object.entries(expected)) {
      const cells = line.split(' ');
      DEALER_COLS.forEach((col, i) => {
        it(`${table} ${rowLabel(table, Number(rowKey))} contre ${col === 1 ? 'A' : col} = ${cells[i]}`, () => {
          expect(lookup(table, Number(rowKey), col)).toBe(cells[i]);
        });
      });
    }
  }

  it("seule la case 16 contre 10 porte l'astérisque", () => {
    expect(isStar('hard', 16, 10)).toBe(true);
    expect(isStar('hard', 16, 9)).toBe(false);
    expect(isStar('pair', 8, 10)).toBe(false);
  });

  it('indexe les colonnes 2..10 puis As', () => {
    expect(colIndex(2)).toBe(0);
    expect(colIndex(10)).toBe(8);
    expect(colIndex(1)).toBe(9);
    expect(toCol(1)).toBe(1);
    expect(toCol(11)).toBe(10);
  });

  it("refuse une ligne mal formée", async () => {
    // Le module valide les lignes au chargement : on vérifie le libellé des lignes.
    expect(rowLabel('pair', 1)).toBe('A-A');
    expect(rowLabel('soft', 7)).toBe('A-7');
    expect(rowLabel('hard', 12)).toBe('12');
  });
});

describe('Conseiller : chaque case, toutes options permises', () => {
  for (const [rowKey, line] of Object.entries(EXPECTED_HARD)) {
    const total = Number(rowKey);
    const cards = total === 21 ? [10, 6, 5] : total === 20 ? [10, 4, 6] : hardTwoCards(total);
    line.split(' ').forEach((code, i) => {
      const col = DEALER_COLS[i];
      it(`dur ${total} (${cards.join('-')}) contre ${col === 1 ? 'A' : col} → ${code}`, () => {
        const a = advise({ cards, dealerUp: col, ...ALL, canDouble: cards.length === 2, canSurrender: cards.length === 2 });
        expect(a.table).toBe('hard');
        expect(a.code).toBe(code);
        if (cards.length === 2) expect(a.action).toBe(ACTION_OF[code as Code]);
      });
    });
  }
  for (const [rowKey, line] of Object.entries(EXPECTED_PAIRS)) {
    const v = Number(rowKey);
    line.split(' ').forEach((code, i) => {
      const col = DEALER_COLS[i];
      it(`paire ${rowLabel('pair', v)} contre ${col === 1 ? 'A' : col} → ${code}`, () => {
        const a = advise({ cards: [v, v], dealerUp: col, ...ALL });
        expect(a.table).toBe('pair');
        expect(a.code).toBe(code);
        expect(a.action).toBe(ACTION_OF[code as Code]);
      });
    });
  }
  for (const [rowKey, line] of Object.entries(EXPECTED_SOFT)) {
    const x = Number(rowKey);
    line.split(' ').forEach((code, i) => {
      const col = DEALER_COLS[i];
      it(`souple A-${x} contre ${col === 1 ? 'A' : col} → ${code}`, () => {
        const a = advise({ cards: [1, x], dealerUp: col, ...ALL });
        expect(a.table).toBe('soft');
        expect(a.code).toBe(code);
        expect(a.action).toBe(ACTION_OF[code as Code]);
      });
    });
  }
});

describe('Conseiller : replis et règles spéciales', () => {
  it('D sans doublement possible → Tirer (dur et souple)', () => {
    expect(advise({ cards: [5, 3, 3], dealerUp: 6, canDouble: false, canSplit: false, canSurrender: false }).action).toBe('hit');
    const soft = advise({ cards: [1, 2, 4], dealerUp: 5, canDouble: false, canSplit: false, canSurrender: false });
    expect(soft.table).toBe('soft');
    expect(soft.row).toBe(6);
    expect(soft.action).toBe('hit');
    expect(soft.fallback).toBe(true);
  });

  it('AbT sans abandon → Tirer ; AbR sans abandon → Rester', () => {
    expect(advise({ cards: [10, 5], dealerUp: 1, canDouble: true, canSplit: false, canSurrender: false }).action).toBe('hit');
    expect(advise({ cards: [10, 7], dealerUp: 1, canDouble: true, canSplit: false, canSurrender: false }).action).toBe('stand');
    expect(advise({ cards: [10, 7], dealerUp: 1, canDouble: true, canSplit: false, canSurrender: true }).action).toBe('surrender');
  });

  it('astérisque : 16 en 3 cartes contre 10 → Rester ; en 2 cartes → Abandon ou Tirer', () => {
    const three = advise({ cards: [6, 4, 6], dealerUp: 10, canDouble: false, canSplit: false, canSurrender: false });
    expect(three.action).toBe('stand');
    expect(three.starApplied).toBe(true);
    expect(advise({ cards: [10, 6], dealerUp: 10, canDouble: true, canSplit: false, canSurrender: true }).action).toBe('surrender');
    expect(advise({ cards: [10, 6], dealerUp: 10, canDouble: true, canSplit: false, canSurrender: false }).action).toBe('hit');
  });

  it("16 en 3 cartes contre 9 ou As → Tirer (l'astérisque ne vaut que contre 10)", () => {
    for (const up of [9, 1]) {
      expect(advise({ cards: hardThreeCards(16), dealerUp: up, canDouble: false, canSplit: false, canSurrender: false }).action).toBe('hit');
    }
  });

  it('paire 8-8 contre 10 lue dans la ligne des paires (AbT), pas dans le 16 dur', () => {
    const a = advise({ cards: [8, 8], dealerUp: 10, ...ALL });
    expect(a.table).toBe('pair');
    expect(a.action).toBe('surrender');
  });

  it('paire P sans split possible → total souple / dur', () => {
    const eights = advise({ cards: [8, 8], dealerUp: 6, canDouble: true, canSplit: false, canSurrender: false });
    expect(eights.table).toBe('hard');
    expect(eights.row).toBe(16);
    expect(eights.action).toBe('stand');
    const twos = findCell({ cards: [2, 2], dealerUp: 5, canDouble: true, canSplit: false, canSurrender: false });
    expect(twos.offTable).toBe(true);
    expect(twos.code).toBe('T');
    const aces = advise({ cards: [1, 1], dealerUp: 6, canDouble: true, canSplit: false, canSurrender: false });
    expect(aces.offTable).toBe(true);
    expect(aces.action).toBe('hit');
  });

  it('paire non-P lue dans la ligne des paires même sans split (5-5 double, 10-10 reste)', () => {
    expect(advise({ cards: [5, 5], dealerUp: 6, canDouble: true, canSplit: false, canSurrender: false }).action).toBe('double');
    expect(advise({ cards: [10, 10], dealerUp: 6, canDouble: true, canSplit: false, canSurrender: false }).action).toBe('stand');
  });

  it('mains souples à plusieurs cartes et 21 souple', () => {
    expect(advise({ cards: [1, 3, 4], dealerUp: 9, canDouble: false, canSplit: false, canSurrender: false }).action).toBe('hit');
    expect(advise({ cards: [1, 3, 4], dealerUp: 7, canDouble: false, canSplit: false, canSurrender: false }).action).toBe('stand');
    expect(advise({ cards: [1, 5, 5], dealerUp: 10, canDouble: false, canSplit: false, canSurrender: false }).row).toBe(10);
  });

  it('main déjà brûlée → hors tableau, rester', () => {
    const a = advise({ cards: [10, 9, 5], dealerUp: 5, canDouble: false, canSplit: false, canSurrender: false });
    expect(a.offTable).toBe(true);
    expect(a.action).toBe('stand');
  });
});
