import { handValueFromValues } from '../engine/hand';
import { isStar, lookup, type Code, type DealerCol, type TableKind } from './strategy';

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface AdviceContext {
  /** Valeurs des cartes du joueur (1 = As, 10 = figures). */
  cards: readonly number[];
  /** Valeur de la carte visible du croupier (1 = As). */
  dealerUp: number;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

export interface Advice {
  action: Action;
  /** Code lu dans le tableau. */
  code: Code;
  /** Case du tableau consultée (pour la mini-grille). */
  table: TableKind;
  row: number;
  col: DealerCol;
  /** Règle de l'astérisque appliquée (16 en 3 cartes ou plus contre 10). */
  starApplied: boolean;
  /** Le code n'a pas pu être appliqué tel quel (ex. D sans doublement possible). */
  fallback: boolean;
  /** Case hors tableau (ex. 4 dur, A-A sans split possible) : défaut documenté. */
  offTable: boolean;
}

export function toCol(v: number): DealerCol {
  return (v === 1 ? 1 : Math.min(10, Math.max(2, v))) as DealerCol;
}

interface Cell {
  table: TableKind;
  row: number;
  code: Code;
  offTable: boolean;
}

/** Case consultée pour une main, selon l'ordre paire → souple → dur. */
export function findCell(ctx: AdviceContext): Cell {
  const col = toCol(ctx.dealerUp);
  const { cards } = ctx;
  const isPair = cards.length === 2 && cards[0] === cards[1];

  if (isPair) {
    const code = lookup('pair', cards[0], col)!;
    // Une case P sans split possible renvoie au total souple/dur.
    if (code !== 'P' || ctx.canSplit) return { table: 'pair', row: cards[0], code, offTable: false };
  }

  const v = handValueFromValues(cards);
  if (v.soft) {
    const x = v.total - 11;
    if (x >= 2 && x <= 10) return { table: 'soft', row: x, code: lookup('soft', x, col)!, offTable: false };
    // Souple 12 (A-A non splittable) : absent du tableau → tirer.
    return { table: 'soft', row: 1, code: 'T', offTable: true };
  }
  if (v.total >= 5 && v.total <= 21) return { table: 'hard', row: v.total, code: lookup('hard', v.total, col)!, offTable: false };
  // Dur 4 (2-2 non splittable) : absent du tableau → tirer.
  return { table: 'hard', row: Math.min(21, v.total), code: v.total > 21 ? 'R' : 'T', offTable: true };
}

/** Action recommandée par le tableau dans le contexte donné. */
export function advise(ctx: AdviceContext): Advice {
  const col = toCol(ctx.dealerUp);
  const cell = findCell(ctx);
  const base = { code: cell.code, table: cell.table, row: cell.row, col, offTable: cell.offTable };
  const star = isStar(cell.table, cell.row, col);

  switch (cell.code) {
    case 'R':
      return { ...base, action: 'stand', starApplied: false, fallback: false };
    case 'T':
      return { ...base, action: 'hit', starApplied: false, fallback: false };
    case 'P':
      // findCell garantit canSplit pour une case P.
      return { ...base, action: 'split', starApplied: false, fallback: false };
    case 'D':
      return ctx.canDouble
        ? { ...base, action: 'double', starApplied: false, fallback: false }
        : { ...base, action: 'hit', starApplied: false, fallback: true };
    case 'AbR':
      return ctx.canSurrender
        ? { ...base, action: 'surrender', starApplied: false, fallback: false }
        : { ...base, action: 'stand', starApplied: false, fallback: true };
    case 'AbT':
      if (star && ctx.cards.length >= 3) return { ...base, action: 'stand', starApplied: true, fallback: true };
      return ctx.canSurrender
        ? { ...base, action: 'surrender', starApplied: false, fallback: false }
        : { ...base, action: 'hit', starApplied: false, fallback: true };
  }
}

/** L'assurance n'est jamais conseillée par la stratégie de base. */
export const INSURANCE_ADVICE = false;

export const ACTION_LABELS: Record<Action, string> = {
  hit: 'Tirer',
  stand: 'Rester',
  double: 'Doubler',
  split: 'Partager',
  surrender: 'Abandonner',
};
