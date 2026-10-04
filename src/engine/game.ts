import { cardValue, type Card } from './cards';
import { handValue, isNatural, isPair } from './hand';
import type { Rules } from './rules';
import { draw, needsReshuffle, remainingCounts, shuffleShoe, type Shoe } from './shoe';

/**
 * Moteur du blackjack français (sans carte cachée).
 * Fonctions pures : chaque action renvoie un nouvel état de coup.
 */

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export type Phase = 'insurance' | 'playing' | 'dealer' | 'settled';
export type HandStatus = 'playing' | 'stood' | 'bust' | 'surrendered' | 'blackjack';

export interface PlayerHand {
  id: string;
  seat: number;
  cards: Card[];
  /** Mise actuelle de la main (doublement compris). */
  bet: number;
  /** Mise avant doublement. */
  baseBet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  /** Main « d'origine » du siège (porte la mise initiale). */
  primary: boolean;
  status: HandStatus;
}

export interface Available {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
  surrender: boolean;
}

export interface Decision {
  kind: 'action' | 'insurance';
  handId: string;
  seat: number;
  /** Cartes du joueur avant la décision. */
  cards: Card[];
  dealerUp: Card;
  /** Action jouée (ou 'insurance' / 'no-insurance'). */
  action: Action | 'insurance' | 'no-insurance';
  available: Available;
  fromSplit: boolean;
  /** Mise de la main au moment de la décision. */
  bet: number;
  /** Composition des cartes non vues (index 1..10). */
  counts: number[];
  /** Nombre de mains du siège au moment de la décision (contexte split). */
  seatHands: number;
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender';

export interface HandResult {
  handId: string;
  outcome: Outcome;
  /** Gain net (négatif si perte). */
  net: number;
  /** Montant restitué au joueur (mise + gain). */
  returned: number;
}

export interface RoundResult {
  hands: HandResult[];
  insuranceNet: number;
  dealerTotal: number;
  dealerBust: boolean;
  dealerBlackjack: boolean;
  net: number;
  staked: number;
}

export interface Round {
  id: number;
  phase: Phase;
  rules: Rules;
  shoe: Shoe;
  /** Sabot avant le coup (pour « rejouer cette situation »). */
  startShoe: Shoe;
  reshuffled: boolean;
  seatBets: number[];
  hands: PlayerHand[];
  active: number;
  dealer: Card[];
  insurance: { offered: boolean; decided: boolean; taken: boolean; amount: number };
  decisions: Decision[];
  /** Identifiants des cartes de la donne initiale, dans l'ordre de distribution. */
  dealOrder: string[];
  result: RoundResult | null;
}

let handSeq = 0;
const nextHandId = () => `h${++handSeq}`;

function cardsInPlay(r: Pick<Round, 'hands' | 'dealer'>): Card[] {
  return [...r.dealer, ...r.hands.flatMap((h) => h.cards)];
}

/** Cartes non vues par le joueur : le reste du sabot (pas de carte cachée). */
export function unseenCounts(r: Round): number[] {
  return remainingCounts(r.shoe);
}

/**
 * Nouveau coup : distribue une carte à chaque main, une au croupier, puis la seconde carte à chaque main.
 * Remélange d'abord si la carte de coupe est sortie lors du coup précédent.
 */
export function startRound(shoeIn: Shoe, seatBets: number[], rules: Rules, id = 1): Round {
  if (seatBets.length < 1 || seatBets.some((b) => !(b > 0))) throw new Error('Mises invalides');
  let shoe = shoeIn;
  let reshuffled = false;
  if (needsReshuffle(shoe) || shoe.decks !== rules.decks) {
    shoe = shuffleShoe(shoe, rules.penetration, rules.decks);
    reshuffled = true;
  }
  const startShoe = shoe;
  const hands: PlayerHand[] = seatBets.map((bet, seat) => ({
    id: nextHandId(),
    seat,
    cards: [],
    bet,
    baseBet: bet,
    doubled: false,
    fromSplit: false,
    splitAces: false,
    primary: true,
    status: 'playing',
  }));
  const dealer: Card[] = [];
  const dealOrder: string[] = [];
  const take = () => {
    const res = draw(shoe, cardsInPlay({ hands, dealer }));
    shoe = res.shoe;
    dealOrder.push(res.card.id);
    return res.card;
  };
  for (const h of hands) h.cards.push(take());
  dealer.push(take());
  for (const h of hands) h.cards.push(take());
  for (const h of hands) if (isNatural(h.cards)) h.status = 'blackjack';

  const up = dealer[0];
  const round: Round = {
    id,
    phase: 'playing',
    rules,
    shoe,
    startShoe,
    reshuffled,
    seatBets: seatBets.slice(),
    hands,
    active: 0,
    dealer,
    insurance: { offered: false, decided: false, taken: false, amount: 0 },
    decisions: [],
    dealOrder,
    result: null,
  };
  if (up.rank === 'A') {
    round.phase = 'insurance';
    round.insurance.offered = true;
    return round;
  }
  return enterPlay(round);
}

/** Décision d'assurance (proposée quand le croupier montre un As). Coûte la moitié des mises initiales. */
export function decideInsurance(r: Round, take: boolean): Round {
  if (r.phase !== 'insurance') throw new Error("Pas d'assurance proposée");
  const amount = take ? r.seatBets.reduce((a, b) => a + b, 0) / 2 : 0;
  const decision: Decision = {
    kind: 'insurance',
    handId: r.hands[0].id,
    seat: 0,
    cards: r.hands[0].cards.slice(),
    dealerUp: r.dealer[0],
    action: take ? 'insurance' : 'no-insurance',
    available: { hit: false, stand: false, double: false, split: false, surrender: false },
    fromSplit: false,
    bet: r.hands[0].bet,
    counts: unseenCounts(r),
    seatHands: 1,
  };
  return enterPlay({
    ...r,
    insurance: { offered: true, decided: true, taken: take, amount },
    decisions: [...r.decisions, decision],
  });
}

function enterPlay(r: Round): Round {
  const idx = r.hands.findIndex((h) => h.status === 'playing');
  if (idx === -1) return { ...r, phase: 'dealer', active: -1 };
  return { ...r, phase: 'playing', active: idx };
}

/** Actions possibles pour la main active. `budget` = argent disponible pour une mise supplémentaire. */
export function availableActions(r: Round, budget = Infinity): Available {
  const none: Available = { hit: false, stand: false, double: false, split: false, surrender: false };
  if (r.phase !== 'playing' || r.active < 0) return none;
  const h = r.hands[r.active];
  if (!h || h.status !== 'playing') return none;
  const two = h.cards.length === 2;
  const seatHands = r.hands.filter((x) => x.seat === h.seat).length;
  return {
    hit: true,
    stand: true,
    double: two && !h.splitAces && (!h.fromSplit || r.rules.doubleAfterSplit) && budget >= h.bet,
    split: two && isPair(h.cards) && !h.splitAces && seatHands < r.rules.maxSplitHands && budget >= h.bet,
    surrender: two && r.rules.surrender && !h.fromSplit && seatHands === 1,
  };
}

function withHand(r: Round, idx: number, hand: PlayerHand): PlayerHand[] {
  const hands = r.hands.slice();
  hands[idx] = hand;
  return hands;
}

function drawFor(r: Round): { card: Card; shoe: Shoe } {
  return draw(r.shoe, cardsInPlay(r));
}

/** Applique une action du joueur sur la main active. */
export function act(r: Round, action: Action, budget = Infinity): Round {
  const avail = availableActions(r, budget);
  if (!avail[action]) throw new Error(`Action impossible : ${action}`);
  const h = r.hands[r.active];
  const decision: Decision = {
    kind: 'action',
    handId: h.id,
    seat: h.seat,
    cards: h.cards.slice(),
    dealerUp: r.dealer[0],
    action,
    available: avail,
    fromSplit: h.fromSplit,
    bet: h.bet,
    counts: unseenCounts(r),
    seatHands: r.hands.filter((x) => x.seat === h.seat).length,
  };
  let next: Round = { ...r, decisions: [...r.decisions, decision] };

  switch (action) {
    case 'hit': {
      const { card, shoe } = drawFor(next);
      const cards = [...h.cards, card];
      const t = handValue(cards).total;
      const status: HandStatus = t > 21 ? 'bust' : t === 21 ? 'stood' : 'playing';
      next = { ...next, shoe, hands: withHand(next, r.active, { ...h, cards, status }) };
      break;
    }
    case 'stand':
      next = { ...next, hands: withHand(next, r.active, { ...h, status: 'stood' }) };
      break;
    case 'double': {
      const { card, shoe } = drawFor(next);
      const cards = [...h.cards, card];
      const status: HandStatus = handValue(cards).total > 21 ? 'bust' : 'stood';
      next = { ...next, shoe, hands: withHand(next, r.active, { ...h, cards, bet: h.bet * 2, doubled: true, status }) };
      break;
    }
    case 'surrender':
      next = { ...next, hands: withHand(next, r.active, { ...h, status: 'surrendered' }) };
      break;
    case 'split': {
      const aces = h.cards[0].rank === 'A';
      const a: PlayerHand = { ...h, cards: [h.cards[0]], fromSplit: true, splitAces: aces, status: 'playing' };
      const b: PlayerHand = { ...h, id: nextHandId(), cards: [h.cards[1]], fromSplit: true, splitAces: aces, primary: false, status: 'playing' };
      const hands = next.hands.slice();
      hands.splice(r.active, 1, a, b);
      next = { ...next, hands };
      // La première main reçoit sa seconde carte tout de suite.
      next = dealSecondCard(next, r.active);
      if (aces) {
        // As splittés : une seule carte chacun, mains terminées.
        next = dealSecondCard(next, r.active + 1);
        const hs = next.hands.slice();
        hs[r.active] = { ...hs[r.active], status: hs[r.active].status === 'playing' ? 'stood' : hs[r.active].status };
        hs[r.active + 1] = { ...hs[r.active + 1], status: hs[r.active + 1].status === 'playing' ? 'stood' : hs[r.active + 1].status };
        next = { ...next, hands: hs };
      }
      break;
    }
  }
  return advance(next);
}

function dealSecondCard(r: Round, idx: number): Round {
  const h = r.hands[idx];
  const { card, shoe } = drawFor(r);
  const cards = [...h.cards, card];
  // 21 après split : pas un blackjack, la main est simplement terminée.
  const status: HandStatus = handValue(cards).total === 21 ? 'stood' : h.status;
  return { ...r, shoe, hands: withHand(r, idx, { ...h, cards, status }) };
}

/** Passe à la main suivante encore en jeu (en lui donnant sa seconde carte si elle vient d'un split). */
function advance(r: Round): Round {
  let next = r;
  for (let i = 0; i < next.hands.length; i++) {
    const h = next.hands[i];
    if (h.status !== 'playing') continue;
    if (h.cards.length === 1) {
      next = dealSecondCard(next, i);
      if (next.hands[i].status !== 'playing') continue;
    }
    return { ...next, active: i, phase: 'playing' };
  }
  return { ...next, active: -1, phase: 'dealer' };
}

/** Le croupier doit-il tirer (au moins sa seconde carte) ? */
export function dealerMustPlay(r: Round): boolean {
  if (r.insurance.taken) return true;
  const live = r.hands.filter((h) => h.status === 'stood' || h.status === 'blackjack');
  if (!live.length) return false;
  const up = cardValue(r.dealer[0].rank);
  const onlyNaturals = live.every((h) => h.status === 'blackjack');
  // Blackjacks seuls en jeu : le croupier ne tire que pour vérifier son propre blackjack (As ou 10 visible).
  if (onlyNaturals) return up === 1 || up === 10;
  return true;
}

/** Le croupier a-t-il fini de tirer ? */
export function dealerDone(r: Round): boolean {
  if (!dealerMustPlay(r)) return true;
  if (r.dealer.length < 2) return false;
  const v = handValue(r.dealer);
  if (r.dealer.length === 2 && v.total === 21) return true;
  const live = r.hands.filter((h) => h.status === 'stood' || h.status === 'blackjack');
  // Vérification de blackjack uniquement (assurance seule, ou blackjacks seuls) : on s'arrête à 2 cartes.
  if (live.length === 0 || live.every((h) => h.status === 'blackjack')) return true;
  return v.total >= 17;
}

/** Une étape du croupier : tire une carte, ou règle le coup s'il a terminé. */
export function dealerStep(r: Round): Round {
  if (r.phase !== 'dealer') throw new Error('Pas au tour du croupier');
  if (dealerDone(r)) return settle(r);
  const { card, shoe } = drawFor(r);
  return { ...r, shoe, dealer: [...r.dealer, card] };
}

/** Joue automatiquement tout le tour du croupier (utile pour les tests et le mode éclair). */
export function playDealer(r: Round): Round {
  let next = r;
  let guard = 0;
  while (next.phase === 'dealer' && guard++ < 30) next = dealerStep(next);
  return next;
}

/** Règlement du coup. */
export function settle(r: Round): Round {
  const dealerBJ = r.dealer.length === 2 && handValue(r.dealer).total === 21;
  const dv = handValue(r.dealer).total;
  const dealerBust = dv > 21;
  const onlyOriginal = r.rules.dealerBjLosesOnlyOriginal;

  const results: HandResult[] = r.hands.map((h) => {
    const pv = handValue(h.cards).total;
    let outcome: Outcome;
    let net: number;
    if (h.status === 'surrendered') {
      outcome = 'surrender';
      net = -h.bet / 2;
    } else if (h.status === 'bust') {
      outcome = 'bust';
      net = -h.bet;
    } else if (dealerBJ) {
      if (h.status === 'blackjack') {
        outcome = 'push';
        net = 0;
      } else {
        outcome = 'lose';
        // Règle par défaut : toutes les mises sont perdues (doubles et splits compris).
        net = onlyOriginal ? (h.primary ? -h.baseBet : 0) : -h.bet;
      }
    } else if (h.status === 'blackjack') {
      outcome = 'blackjack';
      net = h.bet * r.rules.blackjackPayout;
    } else if (dealerBust || pv > dv) {
      outcome = 'win';
      net = h.bet;
    } else if (pv === dv) {
      outcome = 'push';
      net = 0;
    } else {
      outcome = 'lose';
      net = -h.bet;
    }
    return { handId: h.id, outcome, net, returned: h.bet + net };
  });

  const insuranceNet = r.insurance.taken ? (dealerBJ ? r.insurance.amount * 2 : -r.insurance.amount) : 0;
  const staked = r.hands.reduce((a, h) => a + h.bet, 0) + r.insurance.amount;
  const net = results.reduce((a, x) => a + x.net, 0) + insuranceNet;
  return {
    ...r,
    phase: 'settled',
    active: -1,
    result: { hands: results, insuranceNet, dealerTotal: dv, dealerBust, dealerBlackjack: dealerBJ, net, staked },
  };
}

/** Total misé engagé sur la table (pour la bankroll disponible). */
export function stakedOnTable(r: Round): number {
  return r.hands.reduce((a, h) => a + h.bet, 0) + r.insurance.amount;
}
