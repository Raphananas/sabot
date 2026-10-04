import { RANKS, SUITS, cardValue, type Card } from './cards';
import { createRng } from './rng';

/**
 * Sabot immuable : le tableau de cartes n'est jamais muté après mélange,
 * seule la position avance (partage structurel entre états).
 */
export interface Shoe {
  cards: readonly Card[];
  /** Index de la prochaine carte à distribuer. */
  pos: number;
  /** Index de la carte de coupe : quand pos l'atteint, on remélange à la fin du coup. */
  cutIndex: number;
  decks: number;
  penetration: number;
  /** État du générateur, pour des remélanges déterministes. */
  rngState: number;
  /** Numéro de mélange (sert à rendre les identifiants de cartes uniques). */
  shuffleNo: number;
}

export function buildDeckCards(decks: number, shuffleNo = 0): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        out.push({ id: `s${shuffleNo}d${d}${rank}${suit}`, rank, suit });
      }
    }
  }
  return out;
}

/** Mélange de Fisher-Yates (Durstenfeld) — renvoie une copie. */
export function fisherYates<T>(arr: readonly T[], next: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export function cutIndexFor(total: number, penetration: number): number {
  const p = Math.min(0.95, Math.max(0.4, penetration));
  return Math.round(total * p);
}

export function createShoe(decks: number, penetration: number, seed: number): Shoe {
  return shuffleShoe({ cards: [], pos: 0, cutIndex: 0, decks, penetration, rngState: seed >>> 0, shuffleNo: -1 });
}

/** Remélange complet du sabot (nouvel ordre, nouvelle carte de coupe). */
export function shuffleShoe(shoe: Shoe, penetration = shoe.penetration, decks = shoe.decks): Shoe {
  const rng = createRng(shoe.rngState);
  const shuffleNo = shoe.shuffleNo + 1;
  const cards = fisherYates(buildDeckCards(decks, shuffleNo), () => rng.next());
  return {
    cards,
    pos: 0,
    cutIndex: cutIndexFor(cards.length, penetration),
    decks,
    penetration,
    rngState: rng.state,
    shuffleNo,
  };
}

export function needsReshuffle(shoe: Shoe): boolean {
  return shoe.pos >= shoe.cutIndex;
}

export function remaining(shoe: Shoe): number {
  return shoe.cards.length - shoe.pos;
}

/**
 * Tire une carte. Si le sabot est vide (cas extrême, pénétration élevée + plusieurs mains),
 * on remélange les cartes qui ne sont pas sur la table.
 */
export function draw(shoe: Shoe, inPlay: readonly Card[] = []): { card: Card; shoe: Shoe } {
  let s = shoe;
  if (s.pos >= s.cards.length) s = refillExcluding(s, inPlay);
  return { card: s.cards[s.pos], shoe: { ...s, pos: s.pos + 1 } };
}

function refillExcluding(shoe: Shoe, inPlay: readonly Card[]): Shoe {
  const fresh = shuffleShoe(shoe);
  const used = new Set(inPlay.map((c) => `${c.rank}${c.suit}`));
  // Retire une occurrence de chaque carte en jeu pour garder une composition cohérente.
  const cards: Card[] = [];
  for (const c of fresh.cards) {
    const k = `${c.rank}${c.suit}`;
    if (used.has(k)) {
      used.delete(k);
      continue;
    }
    cards.push(c);
  }
  return { ...fresh, cards, cutIndex: cutIndexFor(cards.length, shoe.penetration) };
}

/** Composition des cartes restantes par valeur (index 1..10 ; index 0 inutilisé). */
export function remainingCounts(shoe: Shoe): number[] {
  const counts = new Array<number>(11).fill(0);
  for (let i = shoe.pos; i < shoe.cards.length; i++) counts[cardValue(shoe.cards[i].rank)]++;
  return counts;
}

/** Composition complète d'un sabot neuf. */
export function fullCounts(decks: number): number[] {
  const c = new Array<number>(11).fill(4 * decks);
  c[0] = 0;
  c[10] = 16 * decks;
  return c;
}

/** Fraction du sabot restante. */
export function remainingFraction(shoe: Shoe): number {
  return shoe.cards.length ? remaining(shoe) / shoe.cards.length : 0;
}

/**
 * Place des cartes précises en tête du sabot (en les prenant dans les cartes restantes),
 * pour forcer une situation d'entraînement sans fausser la composition.
 * `wanted` contient des valeurs (1..10) ; renvoie null si impossible.
 */
export function rigTop(shoe: Shoe, wanted: readonly number[], next: () => number = Math.random): Shoe | null {
  const cards = shoe.cards.slice();
  for (let k = 0; k < wanted.length; k++) {
    const target = shoe.pos + k;
    const candidates: number[] = [];
    for (let i = target; i < cards.length; i++) if (cardValue(cards[i].rank) === wanted[k]) candidates.push(i);
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(next() * candidates.length)];
    const tmp = cards[target];
    cards[target] = cards[pick];
    cards[pick] = tmp;
  }
  return { ...shoe, cards };
}
