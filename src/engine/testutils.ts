import type { Card, Rank } from './cards';
import { buildDeckCards, cutIndexFor, type Shoe } from './shoe';

/**
 * Sabot « truqué » pour les tests : les rangs donnés sortent dans l'ordre, puis le reste d'un sabot de 6 jeux.
 * Les As/10 sont désignés par 'A' / 'K' etc.
 */
export function stackedShoe(ranks: Rank[], penetration = 0.75): Shoe {
  const base = buildDeckCards(6, 0);
  const top: Card[] = [];
  const pool = base.slice();
  for (const r of ranks) {
    const idx = pool.findIndex((c) => c.rank === r);
    top.push(pool.splice(idx, 1)[0]);
  }
  const cards = [...top, ...pool];
  return { cards, pos: 0, cutIndex: cutIndexFor(cards.length, penetration), decks: 6, penetration, rngState: 42, shuffleNo: 0 };
}
