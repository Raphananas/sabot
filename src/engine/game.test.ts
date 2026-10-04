import { describe, expect, it } from 'vitest';
import { act, availableActions, decideInsurance, dealerDone, dealerMustPlay, dealerStep, playDealer, settle, startRound, stakedOnTable, type Round } from './game';
import { DEFAULT_RULES, type Rules } from './rules';
import { stackedShoe } from './testutils';
import type { Rank } from './cards';
import { createShoe } from './shoe';

const R = (patch: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...patch });

function start(ranks: Rank[], bets = [10], rules = R()): Round {
  return startRound(stackedShoe(ranks), bets, rules);
}

describe('Donne initiale', () => {
  it('distribue joueur, croupier, joueur — une seule carte au croupier (pas de carte cachée)', () => {
    const r = start(['9', '6', '7']);
    expect(r.hands[0].cards.map((c) => c.rank)).toEqual(['9', '7']);
    expect(r.dealer.map((c) => c.rank)).toEqual(['6']);
    expect(r.phase).toBe('playing');
    expect(r.dealOrder).toHaveLength(3);
  });

  it('plusieurs mains : P1, P2, P3, croupier, puis secondes cartes', () => {
    const r = start(['2', '3', '4', '5', '6', '7', '8'], [10, 20, 30]);
    expect(r.hands.map((h) => h.cards.map((c) => c.rank).join(''))).toEqual(['26', '37', '48']);
    expect(r.dealer[0].rank).toBe('5');
    expect(stakedOnTable(r)).toBe(60);
  });

  it('refuse des mises invalides', () => {
    expect(() => start(['2', '3', '4'], [])).toThrow();
    expect(() => start(['2', '3', '4'], [0])).toThrow();
  });

  it('remélange quand la carte de coupe est sortie', () => {
    const shoe = { ...createShoe(6, 0.75, 1), pos: 250 };
    const r = startRound(shoe, [10], R());
    expect(r.reshuffled).toBe(true);
    expect(r.shoe.pos).toBe(3);
    expect(r.startShoe.pos).toBe(0);
  });

  it('remélange si le nombre de jeux a changé dans les règles', () => {
    const r = startRound(createShoe(6, 0.75, 1), [10], R({ decks: 4 }));
    expect(r.reshuffled).toBe(true);
    expect(r.shoe.cards).toHaveLength(208);
  });
});

describe('Blackjack naturel', () => {
  it('payé 3:2 contre un 6, sans que le croupier tire', () => {
    let r = start(['A', '6', 'K']);
    expect(r.hands[0].status).toBe('blackjack');
    expect(r.phase).toBe('dealer');
    expect(dealerMustPlay(r)).toBe(false);
    r = dealerStep(r);
    expect(r.phase).toBe('settled');
    expect(r.dealer).toHaveLength(1);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'blackjack', net: 15, returned: 25 });
  });

  it('égalité si le croupier fait aussi blackjack (10 visible puis As)', () => {
    let r = start(['A', 'K', 'Q', 'A']);
    expect(dealerMustPlay(r)).toBe(true);
    r = playDealer(r);
    expect(r.result!.dealerBlackjack).toBe(true);
    expect(r.result!.hands[0].outcome).toBe('push');
  });

  it('contre un 10 visible sans blackjack croupier : le croupier ne tire que sa 2e carte', () => {
    let r = start(['A', 'K', 'Q', '5']);
    r = playDealer(r);
    expect(r.dealer).toHaveLength(2);
    expect(r.result!.hands[0].outcome).toBe('blackjack');
  });

  it("21 après un split n'est pas un blackjack", () => {
    let r = start(['A', '5', 'A', 'K', '9', 'K', 'K']);
    r = act(r, 'split');
    expect(r.hands[0].status).toBe('stood');
    expect(r.hands[1].status).toBe('stood');
    r = playDealer(r);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'win', net: 10 });
  });
});

describe('Assurance', () => {
  it("est proposée quand le croupier montre un As", () => {
    const r = start(['10', 'A', '9']);
    expect(r.phase).toBe('insurance');
    expect(availableActions(r).hit).toBe(false);
    expect(() => act(r, 'hit')).toThrow();
  });

  it('prise + blackjack du croupier : assurance payée 2:1, main perdue', () => {
    let r = start(['10', 'A', '9', 'K']);
    r = decideInsurance(r, true);
    expect(r.insurance.amount).toBe(5);
    expect(r.decisions[0].action).toBe('insurance');
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.dealerBlackjack).toBe(true);
    expect(r.result!.insuranceNet).toBe(10);
    expect(r.result!.net).toBe(0);
  });

  it('prise sans blackjack : assurance perdue ; le croupier reste sur 17 souple', () => {
    let r = start(['10', 'A', '9', '6']);
    r = decideInsurance(r, true);
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.dealerTotal).toBe(17);
    expect(r.result!.insuranceNet).toBe(-5);
    expect(r.result!.hands[0].outcome).toBe('win');
    expect(r.result!.net).toBe(5);
  });

  it('refusée : enregistrée comme décision « no-insurance »', () => {
    const r = decideInsurance(start(['10', 'A', '9']), false);
    expect(r.decisions[0].action).toBe('no-insurance');
    expect(r.phase).toBe('playing');
    expect(() => decideInsurance(r, true)).toThrow();
  });

  it('assurance prise mais main brûlée : le croupier tire quand même sa 2e carte pour régler', () => {
    let r = start(['10', 'A', '6', '9', 'K']);
    r = decideInsurance(r, true);
    r = act(r, 'hit');
    expect(r.hands[0].status).toBe('bust');
    expect(dealerMustPlay(r)).toBe(true);
    r = playDealer(r);
    expect(r.dealer).toHaveLength(2);
    expect(r.result!.insuranceNet).toBe(10);
  });

  it('blackjack du joueur contre As : le croupier vérifie seulement son blackjack', () => {
    let r = start(['A', 'A', 'K', '7']);
    r = decideInsurance(r, false);
    expect(r.phase).toBe('dealer');
    r = playDealer(r);
    expect(r.dealer).toHaveLength(2);
    expect(r.result!.hands[0].net).toBe(15);
  });
});

describe('Tirer, rester, brûler, égalité', () => {
  it('tirer jusqu’à 21 termine la main automatiquement', () => {
    let r = start(['5', '9', '6', 'K']);
    r = act(r, 'hit');
    expect(r.hands[0].status).toBe('stood');
    expect(r.phase).toBe('dealer');
  });

  it('brûler : perte, le croupier ne tire pas', () => {
    let r = start(['10', '9', '6', 'K']);
    r = act(r, 'hit');
    expect(r.hands[0].status).toBe('bust');
    expect(dealerMustPlay(r)).toBe(false);
    r = dealerStep(r);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'bust', net: -10, returned: 0 });
  });

  it('égalité (push)', () => {
    let r = start(['10', 'K', '9', '9']);
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'push', net: 0, returned: 10 });
  });

  it('le croupier tire jusqu’à 17 et peut brûler', () => {
    let r = start(['10', '6', '8', '5', '2', 'K']);
    r = act(r, 'stand');
    expect(dealerDone(r)).toBe(false);
    r = dealerStep(r);
    r = dealerStep(r);
    r = dealerStep(r);
    expect(r.dealer.map((c) => c.rank)).toEqual(['6', '5', '2', 'K']);
    r = dealerStep(r);
    expect(r.result!.dealerBust).toBe(true);
    expect(r.result!.hands[0].outcome).toBe('win');
    expect(() => dealerStep(r)).toThrow();
  });

  it('défaite simple', () => {
    let r = start(['10', '10', '7', '9']);
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'lose', net: -10 });
  });

  it('plusieurs mains brûlées : le croupier ne joue pas', () => {
    let r = start(['10', '10', '5', '6', '6', 'K', 'Q'], [10, 10]);
    r = act(r, 'hit');
    r = act(r, 'hit');
    expect(r.phase).toBe('dealer');
    r = dealerStep(r);
    expect(r.dealer).toHaveLength(1);
    expect(r.result!.net).toBe(-20);
  });
});

describe('Doubler', () => {
  it('une seule carte, mise doublée', () => {
    let r = start(['6', '9', '5', 'K', '8', '2']);
    r = act(r, 'double');
    expect(r.hands[0]).toMatchObject({ bet: 20, doubled: true, status: 'stood' });
    r = playDealer(r);
    expect(r.result!.hands[0].net).toBe(20);
  });

  it('doubler et brûler', () => {
    let r = start(['10', '6', '2', 'K']);
    r = act(r, 'double');
    expect(r.hands[0].status).toBe('bust');
  });

  it('impossible après avoir tiré ou sans budget suffisant', () => {
    let r = start(['2', '9', '3', '2']);
    expect(availableActions(r, 5).double).toBe(false);
    expect(availableActions(r, 10).double).toBe(true);
    r = act(r, 'hit');
    expect(availableActions(r).double).toBe(false);
  });

  it('blackjack du croupier : perte de la mise doublée (règle par défaut)', () => {
    let r = start(['6', 'K', '5', '9', 'A']);
    r = act(r, 'double');
    r = playDealer(r);
    expect(r.result!.dealerBlackjack).toBe(true);
    expect(r.result!.hands[0].net).toBe(-20);
  });

  it('option « mise initiale seulement » : le doublement est rendu', () => {
    let r = start(['6', 'K', '5', '9', 'A'], [10], R({ dealerBjLosesOnlyOriginal: true }));
    r = act(r, 'double');
    r = playDealer(r);
    expect(r.result!.hands[0]).toMatchObject({ net: -10, returned: 10 });
  });
});

describe('Partager (split)', () => {
  it('split + double + blackjack du croupier : toutes les mises perdues', () => {
    let r = start(['8', 'K', '8', '3', 'K', '2', 'A']);
    r = act(r, 'split');
    expect(r.hands).toHaveLength(2);
    expect(r.hands[0].cards.map((c) => c.rank)).toEqual(['8', '3']);
    expect(r.hands[1].cards).toHaveLength(1);
    r = act(r, 'double');
    expect(r.hands[0].bet).toBe(20);
    // La seconde main reçoit sa 2e carte en devenant active
    expect(r.hands[1].cards.map((c) => c.rank)).toEqual(['8', '2']);
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.dealerBlackjack).toBe(true);
    expect(r.result!.net).toBe(-30);
  });

  it('split + blackjack croupier, option mise initiale : seule la mise d’origine est perdue', () => {
    let r = start(['8', 'K', '8', '3', 'K', '2', 'A'], [10], R({ dealerBjLosesOnlyOriginal: true }));
    r = act(r, 'split');
    r = act(r, 'double');
    r = act(r, 'stand');
    r = playDealer(r);
    expect(r.result!.net).toBe(-10);
  });

  it('As splittés : une carte chacun, pas de re-split', () => {
    let r = start(['A', '6', 'A', 'A', '9'], [10], R({ maxSplitHands: 4 }));
    r = act(r, 'split');
    expect(r.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    expect(r.hands.every((h) => h.status === 'stood')).toBe(true);
    expect(r.phase).toBe('dealer');
  });

  it('re-split interdit par défaut, autorisé si paramétré', () => {
    let r = start(['8', '6', '8', '8', '3']);
    r = act(r, 'split');
    expect(availableActions(r).split).toBe(false);
    let r2 = start(['8', '6', '8', '8', '3', '2', 'K'], [10], R({ maxSplitHands: 3 }));
    r2 = act(r2, 'split');
    expect(availableActions(r2).split).toBe(true);
    r2 = act(r2, 'split');
    expect(r2.hands).toHaveLength(3);
  });

  it('les figures se splittent entre elles (10-V-D-R)', () => {
    const r = start(['K', '6', 'Q']);
    expect(availableActions(r).split).toBe(true);
  });

  it('doubler après split : paramétrable', () => {
    let r = start(['5', '6', '5', '6', '3'], [10], R({ doubleAfterSplit: false }));
    r = act(r, 'split');
    expect(availableActions(r).double).toBe(false);
    let r2 = start(['5', '6', '5', '6', '3']);
    r2 = act(r2, 'split');
    expect(availableActions(r2).double).toBe(true);
  });

  it('split impossible sans budget', () => {
    const r = start(['8', '6', '8']);
    expect(availableActions(r, 9).split).toBe(false);
  });

  it('21 sur la première main splittée : passe automatiquement à la seconde', () => {
    let r = start(['K', '6', 'K', 'A', '4']);
    r = act(r, 'split');
    expect(r.hands[0].status).toBe('stood');
    expect(r.active).toBe(1);
    expect(r.hands[1].cards).toHaveLength(2);
  });

  it('seconde main splittée qui reçoit 21 : terminée directement', () => {
    let r = start(['K', '6', 'K', '5', 'A', 'K']);
    r = act(r, 'split');
    r = act(r, 'stand');
    expect(r.hands[1].status).toBe('stood');
    expect(r.phase).toBe('dealer');
  });
});

describe('Abandon (surrender)', () => {
  it('rend la moitié de la mise, le croupier ne joue pas', () => {
    let r = start(['10', 'K', '6']);
    r = act(r, 'surrender');
    expect(r.phase).toBe('dealer');
    expect(dealerMustPlay(r)).toBe(false);
    r = settle(r);
    expect(r.result!.hands[0]).toMatchObject({ outcome: 'surrender', net: -5, returned: 5 });
  });

  it('abandon avant la 2e carte du croupier : seulement la moitié perdue même si blackjack ensuite', () => {
    let r = start(['10', 'K', '6', 'A'], [10, 10].slice(0, 1));
    r = act(r, 'surrender');
    r = { ...r, dealer: [...r.dealer, r.shoe.cards[r.shoe.pos]] };
    r = settle(r);
    expect(r.result!.dealerBlackjack).toBe(true);
    expect(r.result!.hands[0].net).toBe(-5);
  });

  it('indisponible si désactivé, après une carte ou après un split', () => {
    expect(availableActions(start(['10', 'K', '6'], [10], R({ surrender: false }))).surrender).toBe(false);
    let r = start(['2', 'K', '3', '4']);
    r = act(r, 'hit');
    expect(availableActions(r).surrender).toBe(false);
    let s = start(['8', 'K', '8', '3']);
    s = act(s, 'split');
    expect(availableActions(s).surrender).toBe(false);
  });
});

describe('Journal des décisions', () => {
  it('enregistre la situation, les options et la composition du sabot', () => {
    let r = start(['10', '6', '6', 'K']);
    r = act(r, 'hit');
    const d = r.decisions[0];
    expect(d.action).toBe('hit');
    expect(d.cards.map((c) => c.rank)).toEqual(['10', '6']);
    expect(d.dealerUp.rank).toBe('6');
    expect(d.available).toEqual({ hit: true, stand: true, double: true, split: false, surrender: true });
    expect(d.counts.slice(1).reduce((a, b) => a + b, 0)).toBe(312 - 3);
  });

  it("aucune action hors phase de jeu", () => {
    let r = start(['10', '6', '9']);
    r = act(r, 'stand');
    expect(availableActions(r)).toEqual({ hit: false, stand: false, double: false, split: false, surrender: false });
  });
});
