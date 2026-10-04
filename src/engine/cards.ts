export const SUITS = ['S', 'H', 'D', 'C'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

/** Valeur de jeu d'une carte : 1 (As) à 10 (10, V, D, R). */
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Card {
  /** Identifiant unique dans le sabot (jeu + rang + couleur). */
  id: string;
  rank: Rank;
  suit: Suit;
}

export const SUIT_NAMES: Record<Suit, string> = {
  S: 'pique',
  H: 'cœur',
  D: 'carreau',
  C: 'trèfle',
};

export const RANK_NAMES: Record<Rank, string> = {
  A: 'As',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'Valet',
  Q: 'Dame',
  K: 'Roi',
};

/** Index de rang français affiché sur la carte (V, D, R pour les figures). */
export const RANK_LABELS: Record<Rank, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'V',
  Q: 'D',
  K: 'R',
};

export function cardValue(rank: Rank): CardValue {
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 10;
  return Number(rank) as CardValue;
}

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function card(rank: Rank, suit: Suit = 'S', id?: string): Card {
  return { id: id ?? `${rank}${suit}-${Math.random().toString(36).slice(2, 8)}`, rank, suit };
}

export function cardLabel(c: Card): string {
  return `${RANK_NAMES[c.rank]} de ${SUIT_NAMES[c.suit]}`;
}

/** Libellé court d'une valeur (1 → « A », 10 → « 10 »). */
export function valueLabel(v: CardValue | number): string {
  return v === 1 ? 'A' : String(v);
}

/** Rang représentatif d'une valeur, utile pour fabriquer des situations. */
export function rankForValue(v: CardValue, variant = 0): Rank {
  if (v === 1) return 'A';
  if (v === 10) return (['10', 'J', 'Q', 'K'] as const)[variant % 4];
  return String(v) as Rank;
}
