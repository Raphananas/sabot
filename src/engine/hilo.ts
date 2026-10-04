import { cardValue, type Card } from './cards';
import type { Shoe } from './shoe';

/** Valeur Hi-Lo d'une carte : 2-6 = +1, 7-9 = 0, 10/As = −1. */
export function hiLo(c: Card): number {
  const v = cardValue(c.rank);
  if (v >= 2 && v <= 6) return 1;
  if (v === 1 || v === 10) return -1;
  return 0;
}

/** Compte courant depuis le dernier mélange (cartes déjà distribuées). */
export function runningCount(shoe: Shoe): number {
  let rc = 0;
  for (let i = 0; i < shoe.pos && i < shoe.cards.length; i++) rc += hiLo(shoe.cards[i]);
  return rc;
}

/** Vrai compte = compte courant / jeux restants (arrondi au demi-jeu, minimum 0,5). */
export function trueCount(shoe: Shoe): number {
  const decksLeft = Math.max(0.5, Math.round(((shoe.cards.length - shoe.pos) / 52) * 2) / 2);
  return runningCount(shoe) / decksLeft;
}
