import { DEALER_COLS, HARD, PAIRS, SOFT, colIndex, type DealerCol } from '../strategy/strategy';

export type PracticeFilter = 'none' | 'pairs' | 'soft' | 'stiff' | 'surrender' | 'doubles' | 'weak';

export const FILTERS: { id: PracticeFilter; label: string; hint: string }[] = [
  { id: 'none', label: 'Donne normale', hint: 'Sabot réel, sans forçage' },
  { id: 'pairs', label: 'Paires', hint: 'Uniquement des paires' },
  { id: 'soft', label: 'Mains souples', hint: 'As + une carte' },
  { id: 'stiff', label: '12–16 vs fort', hint: 'Totaux raides contre 7 à As' },
  { id: 'surrender', label: 'Abandons', hint: 'Cases « Ab » du tableau' },
  { id: 'doubles', label: 'Doublements', hint: 'Cases « D » du tableau' },
  { id: 'weak', label: 'Mes points faibles', hint: 'Cases où vous vous trompez le plus' },
];

type Situation = { kind: 'hard' | 'soft' | 'pair'; row: number; col: DealerCol };

function twoCardHard(total: number, next: () => number): [number, number] {
  const opts: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b >= 2 && b <= 10 && a !== b) opts.push([a, b]);
  }
  return opts[Math.floor(next() * opts.length)];
}

function cardsFor(s: Situation, next: () => number): number[] {
  const up = s.col;
  let p: [number, number];
  if (s.kind === 'pair') p = [s.row, s.row];
  else if (s.kind === 'soft') p = next() < 0.5 ? [1, s.row] : [s.row, 1];
  else p = twoCardHard(s.row, next);
  // ordre de distribution : joueur, croupier, joueur
  return [p[0], up, p[1]];
}

function all(): Situation[] {
  const out: Situation[] = [];
  for (const col of DEALER_COLS) {
    for (const r of Object.keys(HARD).map(Number)) if (r >= 5 && r <= 19 && r !== 4) out.push({ kind: 'hard', row: r, col });
    for (const r of Object.keys(PAIRS).map(Number)) out.push({ kind: 'pair', row: r, col });
    for (const r of Object.keys(SOFT).map(Number)) if (r <= 9) out.push({ kind: 'soft', row: r, col });
  }
  return out;
}

function codeOf(s: Situation) {
  const t = s.kind === 'hard' ? HARD : s.kind === 'soft' ? SOFT : PAIRS;
  return t[s.row][colIndex(s.col)];
}

let weakCells: string[] = [];
/** Renseigné par le module de statistiques : cases triées par taux d'erreur. */
export function setWeakCells(keys: string[]) {
  weakCells = keys;
}

/** Valeurs de cartes [joueur, croupier, joueur] pour une situation du filtre. */
export function pickSituation(filter: PracticeFilter, next: () => number = Math.random): number[] {
  let pool: Situation[] = all();
  switch (filter) {
    case 'pairs':
      pool = pool.filter((s) => s.kind === 'pair');
      break;
    case 'soft':
      pool = pool.filter((s) => s.kind === 'soft');
      break;
    case 'stiff':
      pool = pool.filter((s) => s.kind === 'hard' && s.row >= 12 && s.row <= 16 && (s.col >= 7 || s.col === 1));
      break;
    case 'surrender':
      pool = pool.filter((s) => codeOf(s).startsWith('Ab'));
      break;
    case 'doubles':
      pool = pool.filter((s) => codeOf(s) === 'D');
      break;
    case 'weak': {
      const keyed = weakCells
        .map((k) => {
          const [kind, row, col] = k.split(':');
          return { kind, row: Number(row), col: Number(col) } as Situation;
        })
        .filter((s) => s.kind === 'pair' || s.kind === 'soft' || (s.row >= 5 && s.row <= 19));
      if (keyed.length) pool = keyed.slice(0, 12);
      break;
    }
    default:
      break;
  }
  return cardsFor(pool[Math.floor(next() * pool.length)], next);
}
