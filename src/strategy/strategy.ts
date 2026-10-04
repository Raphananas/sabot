/**
 * TABLEAU DE STRATÉGIE DE BASE — source de vérité (transcription de reference/strategie.png).
 *
 * Colonnes : carte visible du croupier 2 3 4 5 6 7 8 9 10 A.
 * Codes : R = Rester, T = Tirer, D = Doubler (sinon Tirer), P = Partager,
 *         AbT = Abandon si permis sinon Tirer, AbR = Abandon si permis sinon Rester.
 * Astérisque : 16 contre 10 → AbT, SAUF si le 16 compte 3 cartes ou plus (alors Rester).
 * Ordre de lecture : paire → souple → dur.
 */

export type Code = 'R' | 'T' | 'D' | 'P' | 'AbT' | 'AbR';

/** Valeur de la carte du croupier : 2..10, 1 = As. */
export type DealerCol = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 1;
export const DEALER_COLS: readonly DealerCol[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];
export const DEALER_COL_LABELS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const;

export type TableKind = 'hard' | 'soft' | 'pair';

type Row = readonly [Code, Code, Code, Code, Code, Code, Code, Code, Code, Code];

function row(s: string): Row {
  const cells = s.trim().split(/\s+/) as Code[];
  if (cells.length !== 10) throw new Error(`Ligne invalide : ${s}`);
  return cells as unknown as Row;
}

/** Totaux durs : clé = total (5..21). */
export const HARD: Readonly<Record<number, Row>> = {
  21: row('R R R R R R R R R R'),
  20: row('R R R R R R R R R R'),
  19: row('R R R R R R R R R R'),
  18: row('R R R R R R R R R R'),
  17: row('R R R R R R R R R AbR'),
  16: row('R R R R R T T AbT AbT AbT'),
  15: row('R R R R R T T T AbT AbT'),
  14: row('R R R R R T T T AbT AbT'),
  13: row('R R R R R T T T T AbT'),
  12: row('T T R R R T T T T AbT'),
  11: row('D D D D D D D D T T'),
  10: row('D D D D D D D D T T'),
  9: row('T D D D D T T T T T'),
  8: row('T T T T T T T T T T'),
  7: row('T T T T T T T T T AbT'),
  6: row('T T T T T T T T T AbT'),
  5: row('T T T T T T T T T AbT'),
};

/** Paires : clé = valeur de la carte (1 = As, 10 = 10/V/D/R). */
export const PAIRS: Readonly<Record<number, Row>> = {
  1: row('P P P P P P P P P T'),
  10: row('R R R R R R R R R R'),
  9: row('P P P P P R P P R R'),
  8: row('P P P P P P P P AbT AbT'),
  7: row('P P P P P P T T AbT AbT'),
  6: row('P P P P P T T T T AbT'),
  5: row('D D D D D D D D T T'),
  4: row('T T T P P T T T T T'),
  3: row('P P P P P P T T T AbT'),
  2: row('P P P P P P T T T T'),
};

/** Totaux souples : clé = valeur de la carte accompagnant l'As (A-x, x = 2..10). */
export const SOFT: Readonly<Record<number, Row>> = {
  10: row('R R R R R R R R R R'),
  9: row('R R R R R R R R R R'),
  8: row('R R R R R R R R R R'),
  7: row('R D D D D R R T T T'),
  6: row('T D D D D T T T T T'),
  5: row('T T D D D T T T T T'),
  4: row('T T D D D T T T T T'),
  3: row('T T T D D T T T T T'),
  2: row('T T T D D T T T T T'),
};

/** Cases marquées d'un astérisque dans le tableau. */
export const STAR_CELLS: readonly { table: TableKind; row: number; col: DealerCol }[] = [{ table: 'hard', row: 16, col: 10 }];

export function colIndex(col: DealerCol): number {
  return col === 1 ? 9 : col - 2;
}

export function lookup(table: TableKind, rowKey: number, col: DealerCol): Code | undefined {
  const t = table === 'hard' ? HARD : table === 'soft' ? SOFT : PAIRS;
  return t[rowKey]?.[colIndex(col)];
}

export function isStar(table: TableKind, rowKey: number, col: DealerCol): boolean {
  return STAR_CELLS.some((c) => c.table === table && c.row === rowKey && c.col === col);
}

/** Ordre d'affichage des lignes (comme sur l'image). */
export const HARD_ROWS = [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5] as const;
export const PAIR_ROWS = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
export const SOFT_ROWS = [10, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function rowLabel(table: TableKind, key: number): string {
  if (table === 'hard') return String(key);
  if (table === 'pair') return key === 1 ? 'A-A' : `${key}-${key}`;
  return `A-${key}`;
}

export const CODE_LABELS: Record<Code, string> = {
  R: 'Rester',
  T: 'Tirer',
  D: 'Doubler',
  P: 'Partager',
  AbT: 'Abandon si permis, sinon tirer',
  AbR: 'Abandon si permis, sinon rester',
};
