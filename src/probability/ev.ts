/**
 * Moteur de probabilités — calcul exact à partir de la composition réelle du sabot.
 * Blackjack français : le croupier tire sa 2e carte après le joueur, reste sur tous les 17.
 *
 * counts : tableau indexé 1..10 (index 0 ignoré) = cartes non vues par valeur.
 */

export type Counts = number[];

/** Distribution finale du croupier. */
export interface DealerDist {
  17: number;
  18: number;
  19: number;
  20: number;
  21: number;
  bust: number;
  blackjack: number;
}

export interface Outcomes {
  win: number;
  push: number;
  lose: number;
  /** Espérance en unités de mise initiale. */
  ev: number;
}

export type EvAction = 'stand' | 'hit' | 'double' | 'split' | 'surrender';

export interface EvOptions {
  /** Sur blackjack du croupier, ne perdre que la mise initiale. */
  onlyOriginal?: boolean;
  /** Doublement après split autorisé. */
  das?: boolean;
  blackjackPayout?: number;
}

export interface Analysis {
  dealer: DealerDist;
  actions: Partial<Record<EvAction, Outcomes>>;
  /** EV de l'assurance pour une mise de 1 (assurance = 0,5). */
  insuranceEv: number;
  /** Probabilité que la prochaine carte vaille 10. */
  pTen: number;
}

const EMPTY = (): number[] => [0, 0, 0, 0, 0, 0, 0];
// indices : 0..4 = 17..21, 5 = bust, 6 = blackjack

function sum(c: Counts): number {
  let s = 0;
  for (let v = 1; v <= 10; v++) s += c[v];
  return s;
}

function key(c: Counts): string {
  return c.join(',');
}

/** Distribution du croupier pour une carte visible et une composition donnée. */
export function dealerDistribution(countsIn: Counts, up: number): DealerDist {
  const arr = dealerArray(countsIn, up, new Map());
  return toDist(arr);
}

function toDist(a: number[]): DealerDist {
  return { 17: a[0], 18: a[1], 19: a[2], 20: a[3], 21: a[4], bust: a[5], blackjack: a[6] };
}

/** Cache par composition (clé) : distribution en tableau. */
function dealerArray(countsIn: Counts, up: number, cache: Map<string, number[]>): number[] {
  const k = `${up}|${key(countsIn)}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const counts = countsIn.slice();
  const memo = new Map<string, number[]>();
  const drawn = new Array<number>(11).fill(0);

  const rec = (hard: number, ace: boolean, n: number): number[] => {
    const best = ace && hard + 10 <= 21 ? hard + 10 : hard;
    if (n === 2 && best === 21) {
      const r = EMPTY();
      r[6] = 1;
      return r;
    }
    if (best > 21) {
      const r = EMPTY();
      r[5] = 1;
      return r;
    }
    if (best >= 17) {
      const r = EMPTY();
      r[best - 17] = 1;
      return r;
    }
    const mk = drawn.join('');
    const m = memo.get(mk);
    if (m) return m;
    const total = sum(counts);
    const res = EMPTY();
    if (total === 0) {
      // Sabot vide (théorique) : on considère la main comme finale à son total.
      res[5] = 1;
      return res;
    }
    for (let v = 1; v <= 10; v++) {
      const c = counts[v];
      if (!c) continue;
      const p = c / total;
      counts[v]--;
      drawn[v]++;
      const sub = rec(hard + v, ace || v === 1, n + 1);
      drawn[v]--;
      counts[v]++;
      for (let i = 0; i < 7; i++) res[i] += p * sub[i];
    }
    memo.set(mk, res);
    return res;
  };

  const out = rec(up, up === 1, 1);
  cache.set(k, out);
  return out;
}

interface Ctx {
  up: number;
  opts: Required<EvOptions>;
  cache: Map<string, number[]>;
}

/**
 * Résultat de « rester » sur `total` avec une mise `stake`.
 * `bjLoss` = perte si le croupier fait blackjack (dépend de la règle de perte totale).
 */
function standOutcomes(total: number, dist: number[], stake: number, bjLoss: number): Outcomes {
  const pBJ = dist[6];
  if (total > 21) return { win: 0, push: 0, lose: 1, ev: -stake };
  let win = dist[5];
  let push = 0;
  let lose = pBJ;
  for (let t = 17; t <= 21; t++) {
    const p = dist[t - 17];
    if (total > t) win += p;
    else if (total === t) push += p;
    else lose += p;
  }
  const loseNoBJ = lose - pBJ;
  return { win, push, lose, ev: stake * (win - loseNoBJ) - bjLoss * pBJ };
}

function addScaled(acc: Outcomes, o: Outcomes, p: number) {
  acc.win += p * o.win;
  acc.push += p * o.push;
  acc.lose += p * o.lose;
  acc.ev += p * o.ev;
}

const zero = (): Outcomes => ({ win: 0, push: 0, lose: 0, ev: 0 });

/**
 * Meilleure continuation (rester ou tirer) pour une main, avec retrait réel des cartes tirées.
 * Mise 1 ; `bjLoss` = perte sur blackjack du croupier.
 */
function bestPlay(hard: number, ace: boolean, counts: Counts, ctx: Ctx, bjLoss: number, memo: Map<string, { stand: Outcomes; hit: Outcomes }>): { stand: Outcomes; hit: Outcomes } {
  const total = ace && hard + 10 <= 21 ? hard + 10 : hard;
  const mk = `${hard}|${ace}|${key(counts)}`;
  const m = memo.get(mk);
  if (m) return m;
  const dist = dealerArray(counts, ctx.up, ctx.cache);
  const stand = standOutcomes(total, dist, 1, bjLoss);
  const hit = zero();
  const n = sum(counts);
  if (total < 21 && n > 0) {
    for (let v = 1; v <= 10; v++) {
      const c = counts[v];
      if (!c) continue;
      const p = c / n;
      const nh = hard + v;
      const na = ace || v === 1;
      const nt = na && nh + 10 <= 21 ? nh + 10 : nh;
      counts[v]--;
      if (nt > 21) {
        addScaled(hit, { win: 0, push: 0, lose: 1, ev: -1 }, p);
      } else {
        const sub = bestPlay(nh, na, counts, ctx, bjLoss, memo);
        addScaled(hit, sub.hit.ev > sub.stand.ev ? sub.hit : sub.stand, p);
      }
      counts[v]++;
    }
  } else {
    Object.assign(hit, { win: 0, push: 0, lose: 1, ev: -1 });
  }
  const res = { stand, hit };
  memo.set(mk, res);
  return res;
}

function doubleOutcomes(hard: number, ace: boolean, counts: Counts, ctx: Ctx, stake: number, bjLoss: number): Outcomes {
  const out = zero();
  const n = sum(counts);
  for (let v = 1; v <= 10; v++) {
    const c = counts[v];
    if (!c) continue;
    const p = c / n;
    const nh = hard + v;
    const na = ace || v === 1;
    const nt = na && nh + 10 <= 21 ? nh + 10 : nh;
    counts[v]--;
    const dist = dealerArray(counts, ctx.up, ctx.cache);
    addScaled(out, standOutcomes(nt, dist, stake, bjLoss), p);
    counts[v]++;
  }
  return out;
}

function handOf(values: readonly number[]): { hard: number; ace: boolean } {
  let hard = 0;
  let ace = false;
  for (const v of values) {
    hard += v;
    if (v === 1) ace = true;
  }
  return { hard, ace };
}

/** Une main issue d'un split, partant de la carte `v` (mise 1 par main). */
function splitHand(v: number, counts: Counts, ctx: Ctx, perHandBjLoss: number, doubleBjLoss: number): Outcomes {
  const out = zero();
  const n = sum(counts);
  const memo = new Map<string, { stand: Outcomes; hit: Outcomes }>();
  for (let w = 1; w <= 10; w++) {
    const c = counts[w];
    if (!c) continue;
    const p = c / n;
    counts[w]--;
    const hard = v + w;
    const ace = v === 1 || w === 1;
    if (v === 1) {
      // As splittés : une seule carte, on reste.
      const dist = dealerArray(counts, ctx.up, ctx.cache);
      const t = ace && hard + 10 <= 21 ? hard + 10 : hard;
      addScaled(out, standOutcomes(t, dist, 1, perHandBjLoss), p);
    } else {
      const bp = bestPlay(hard, ace, counts, ctx, perHandBjLoss, memo);
      let best = bp.hit.ev > bp.stand.ev ? bp.hit : bp.stand;
      if (ctx.opts.das) {
        const d = doubleOutcomes(hard, ace, counts, ctx, 2, doubleBjLoss);
        if (d.ev > best.ev) best = d;
      }
      addScaled(out, best, p);
    }
    counts[w]++;
  }
  return out;
}

/**
 * Analyse complète d'une décision.
 * @param player valeurs des cartes du joueur
 * @param up carte visible du croupier (1 = As)
 * @param counts cartes non vues (le sabot restant)
 * @param allowed actions à évaluer
 */
export function analyze(
  player: readonly number[],
  up: number,
  counts: Counts,
  allowed: Partial<Record<EvAction, boolean>>,
  options: EvOptions = {},
): Analysis {
  const opts: Required<EvOptions> = { onlyOriginal: false, das: true, blackjackPayout: 1.5, ...options };
  const ctx: Ctx = { up, opts, cache: new Map() };
  const c = counts.slice();
  const dealerArr = dealerArray(c, up, ctx.cache);
  const { hard, ace } = handOf(player);
  const actions: Partial<Record<EvAction, Outcomes>> = {};
  const memo = new Map<string, { stand: Outcomes; hit: Outcomes }>();
  const bp = bestPlay(hard, ace, c, ctx, 1, memo);
  if (allowed.stand !== false) actions.stand = bp.stand;
  if (allowed.hit !== false) actions.hit = bp.hit;
  if (allowed.double && player.length === 2) {
    actions.double = doubleOutcomes(hard, ace, c, ctx, 2, opts.onlyOriginal ? 1 : 2);
  }
  if (allowed.split && player.length === 2 && player[0] === player[1]) {
    const v = player[0];
    // On remet la seconde carte de la paire « dans la main » de la seconde main : elle n'est pas dans counts.
    const perHand = opts.onlyOriginal ? 0.5 : 1;
    const dblLoss = opts.onlyOriginal ? 0.5 : 2;
    const one = splitHand(v, c, ctx, perHand, dblLoss);
    actions.split = { win: one.win, push: one.push, lose: one.lose, ev: 2 * one.ev };
  }
  if (allowed.surrender && player.length === 2) {
    actions.surrender = { win: 0, push: 0, lose: 1, ev: -0.5 };
  }
  const total = sum(c);
  const pTen = total ? c[10] / total : 0;
  return { dealer: toDist(dealerArr), actions, insuranceEv: 0.5 * (2 * pTen - (1 - pTen)), pTen };
}

/** Meilleure action selon l'EV parmi celles calculées. */
export function bestByEv(a: Analysis): EvAction | null {
  let best: EvAction | null = null;
  let ev = -Infinity;
  for (const [k, o] of Object.entries(a.actions) as [EvAction, Outcomes][]) {
    if (o.ev > ev + 1e-12) {
      ev = o.ev;
      best = k;
    }
  }
  return best;
}
