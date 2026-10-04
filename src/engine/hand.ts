import { cardValue, type Card, type CardValue } from './cards';

export interface HandValue {
  /** Meilleur total (≤ 21 si possible). */
  total: number;
  /** Un As compte pour 11 dans le meilleur total. */
  soft: boolean;
  /** Total dur (tous les As à 1). */
  hard: number;
}

export function valuesOf(cards: readonly Card[]): CardValue[] {
  return cards.map((c) => cardValue(c.rank));
}

export function handValueFromValues(values: readonly number[]): HandValue {
  let hard = 0;
  let aces = 0;
  for (const v of values) {
    hard += v;
    if (v === 1) aces++;
  }
  if (aces > 0 && hard + 10 <= 21) return { total: hard + 10, soft: true, hard };
  return { total: hard, soft: false, hard };
}

export function handValue(cards: readonly Card[]): HandValue {
  return handValueFromValues(valuesOf(cards));
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Blackjack naturel : deux cartes valant 21, hors main issue d'un split. */
export function isNatural(cards: readonly Card[], fromSplit = false): boolean {
  return !fromSplit && cards.length === 2 && handValue(cards).total === 21;
}

/** Paire de même valeur faciale (10-V-D-R se valent). */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank);
}

/** Libellé lisible du total : « 17 », « 7 / 17 », « Blackjack ». */
export function totalLabel(cards: readonly Card[], fromSplit = false): string {
  if (cards.length === 0) return '';
  if (isNatural(cards, fromSplit)) return 'Blackjack';
  const v = handValue(cards);
  if (v.soft && v.total < 21) return `${v.total - 10} / ${v.total}`;
  return String(v.total);
}
