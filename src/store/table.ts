import { create } from 'zustand';
import { act as engineAct, availableActions, decideInsurance, dealerStep, startRound, type Action, type Round } from '../engine/game';
import { createShoe, rigTop, type Shoe } from '../engine/shoe';
import { createRng, randomSeed } from '../engine/rng';
import { evaluateRound, type Verdict } from '../strategy/evaluate';
import { useSettings, stepMs } from './settings';
import { recordRound, useStats } from './stats';
import { pickSituation, type PracticeFilter } from '../lib/situations';
import { sfx } from '../lib/sound';

export type Mode = 'practice' | 'rush' | 'daily';

export interface BankPoint {
  hand: number;
  bankroll: number;
}

export interface RoundSummary {
  no: number;
  net: number;
  verdicts: Verdict[];
  round: Round;
  bankrollAfter: number;
}

interface TableState {
  mode: Mode;
  shoe: Shoe;
  round: Round | null;
  roundNo: number;
  bets: number[];
  lastBets: number[];
  busy: boolean;
  bankroll: number;
  startBankroll: number;
  peak: number;
  peakHand: number;
  curve: BankPoint[];
  history: RoundSummary[];
  verdicts: Verdict[];
  debriefOpen: boolean;
  filter: PracticeFilter;
  /** Nombre de mains max (défi du jour). */
  handLimit: number | null;
  dailyKey: string | null;
  cashedOut: boolean;
  init: (mode: Mode, opts?: { seed?: number; bankroll?: number; handLimit?: number | null; dailyKey?: string | null }) => void;
  setSeats: (n: number) => void;
  addChip: (v: number, seat?: number) => void;
  setBet: (amount: number, seat?: number) => void;
  clearBets: () => void;
  deal: (opts?: { replay?: boolean }) => Promise<void>;
  insurance: (take: boolean) => Promise<void>;
  play: (a: Action) => Promise<void>;
  nextHand: () => void;
  setDebrief: (open: boolean) => void;
  setFilter: (f: PracticeFilter) => void;
  cashOut: () => void;
  budget: () => number;
}

export const TABLE_MIN = 5;
export const TABLE_MAX = 1000;
export const RUSH_START = 500;
export const PRACTICE_BANK = 10000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useTable = create<TableState>()((set, get) => {
  /** Empêche un enchaînement asynchrone de continuer si la table a été réinitialisée. */
  let epoch = 0;

  const isMoney = () => get().mode !== 'practice';

  async function runDealer(myEpoch: number) {
    let r = get().round!;
    // Révélation de la seconde carte, puis tirages successifs.
    while (r.phase === 'dealer') {
      await sleep(stepMs(r.dealer.length === 1 ? 450 : 620));
      if (epoch !== myEpoch) return;
      const before = r.dealer.length;
      r = dealerStep(r);
      if (r.dealer.length > before) sfx('deal');
      set({ round: r });
    }
    await sleep(stepMs(300));
    if (epoch !== myEpoch) return;
    finish(r);
  }

  function finish(r: Round) {
    const s = get();
    const res = r.result!;
    const returned = res.hands.reduce((a, h) => a + h.returned, 0) + (r.insurance.taken ? r.insurance.amount + res.insuranceNet : 0);
    const bankroll = s.bankroll + returned;
    const verdicts = evaluateRound(r);
    const no = s.roundNo;
    const peak = Math.max(s.peak, bankroll);
    const summary: RoundSummary = { no, net: res.net, verdicts, round: r, bankrollAfter: bankroll };
    if (res.net > 0) sfx(res.hands.some((h) => h.outcome === 'blackjack') ? 'bigwin' : 'win');
    else if (res.net < 0) sfx('lose');
    else sfx('push');
    set({
      busy: false,
      bankroll,
      peak,
      peakHand: peak > s.peak ? no : s.peakHand,
      curve: [...s.curve, { hand: no, bankroll }],
      history: [...s.history.slice(-199), summary],
      verdicts,
      debriefOpen: s.mode === 'practice',
      // Mise conservée pour la main suivante, plafonnée au solde.
      bets: s.mode === 'practice' ? s.bets : r.seatBets.map((b) => Math.min(b, Math.max(0, Math.floor(bankroll)))),
    });
    recordRound(s.mode, r, verdicts, s.dailyKey);
    if (s.mode !== 'practice') {
      if (bankroll >= 1000) useStats.getState().unlock('rush-1000');
      if (bankroll >= 2500) useStats.getState().unlock('rush-2500');
    }
  }

  /** Après une action : enchaîne sur le croupier si les mains sont terminées. */
  async function afterAction(r: Round, myEpoch: number) {
    set({ round: r });
    if (r.phase === 'dealer') {
      set({ busy: true });
      await runDealer(myEpoch);
    } else {
      set({ busy: false });
    }
  }

  return {
    mode: 'practice',
    shoe: createShoe(6, 0.75, randomSeed()),
    round: null,
    roundNo: 0,
    bets: [10],
    lastBets: [10],
    busy: false,
    bankroll: PRACTICE_BANK,
    startBankroll: PRACTICE_BANK,
    peak: PRACTICE_BANK,
    peakHand: 0,
    curve: [{ hand: 0, bankroll: PRACTICE_BANK }],
    history: [],
    verdicts: [],
    debriefOpen: false,
    filter: 'none',
    handLimit: null,
    dailyKey: null,
    cashedOut: false,

    init(mode, opts = {}) {
      epoch++;
      const rules = useSettings.getState().rules;
      const bank = opts.bankroll ?? (mode === 'practice' ? PRACTICE_BANK : RUSH_START);
      const seats = mode === 'practice' ? useSettings.getState().practiceHands : 1;
      set({
        mode,
        shoe: createShoe(rules.decks, rules.penetration, opts.seed ?? randomSeed()),
        round: null,
        roundNo: 0,
        bets: new Array(seats).fill(mode === 'practice' ? 10 : 0),
        lastBets: new Array(seats).fill(10),
        busy: false,
        bankroll: bank,
        startBankroll: bank,
        peak: bank,
        peakHand: 0,
        curve: [{ hand: 0, bankroll: bank }],
        history: [],
        verdicts: [],
        debriefOpen: false,
        handLimit: opts.handLimit ?? null,
        dailyKey: opts.dailyKey ?? null,
        cashedOut: false,
      });
    },

    budget() {
      return isMoney() ? get().bankroll : Infinity;
    },

    setSeats(n) {
      const s = get();
      if (s.round && s.round.phase !== 'settled') return;
      const bets = Array.from({ length: n }, (_, i) => s.bets[i] ?? s.bets[0] ?? 10);
      set({ bets, round: null });
    },

    addChip(v, seat = 0) {
      const s = get();
      if (s.busy || (s.round && s.round.phase !== 'settled')) return;
      const bets = s.bets.slice();
      const others = bets.reduce((a, b, i) => (i === seat ? a : a + b), 0);
      const cap = Math.min(TABLE_MAX, isMoney() ? s.bankroll - others : Infinity);
      bets[seat] = Math.min(cap, (bets[seat] ?? 0) + v);
      sfx('chip');
      set({ bets, round: s.round?.phase === 'settled' ? null : s.round });
    },

    setBet(amount, seat = 0) {
      const s = get();
      if (s.busy || (s.round && s.round.phase !== 'settled')) return;
      const bets = s.bets.slice();
      const others = bets.reduce((a, b, i) => (i === seat ? a : a + b), 0);
      const cap = Math.min(TABLE_MAX, isMoney() ? s.bankroll - others : Infinity);
      bets[seat] = Math.max(0, Math.min(cap, Math.floor(amount)));
      set({ bets });
    },

    clearBets() {
      const s = get();
      if (s.busy || (s.round && s.round.phase !== 'settled')) return;
      set({ bets: s.bets.map(() => 0) });
    },

    async deal(opts = {}) {
      const s = get();
      if (s.busy || s.cashedOut) return;
      if (s.round && s.round.phase !== 'settled') return;
      const rules = useSettings.getState().rules;
      const myEpoch = ++epoch;
      let shoe = s.shoe;
      let bets = s.bets;
      if (opts.replay && s.round) {
        shoe = s.round.startShoe;
        bets = s.round.seatBets;
      } else if (s.mode === 'practice' && s.filter !== 'none') {
        // Situation forcée : on place les bonnes cartes en tête du sabot (composition inchangée).
        const rng = createRng(randomSeed());
        const pick = pickSituation(s.filter, () => rng.next());
        const rigged = rigTop(shoe.pos >= shoe.cutIndex ? createShoe(rules.decks, rules.penetration, randomSeed()) : shoe, pick, () => rng.next());
        if (rigged) {
          shoe = rigged;
          bets = [s.bets[0] || 10];
        }
      }
      const total = bets.reduce((a, b) => a + b, 0);
      if (bets.some((b) => b < TABLE_MIN) || (isMoney() && total > s.bankroll)) return;

      const roundNo = s.roundNo + 1;
      const r = startRound(shoe, bets, rules, roundNo);
      set({
        round: null,
        busy: true,
        debriefOpen: false,
        verdicts: [],
        lastBets: bets,
        bets: s.bets.length === bets.length ? bets : s.bets,
        bankroll: s.bankroll - total,
        roundNo,
      });
      // Laisse React démonter l'ancienne donne avant d'animer la nouvelle.
      await sleep(30);
      if (epoch !== myEpoch) return;
      set({ round: r, shoe: r.shoe });
      for (let i = 0; i < r.dealOrder.length; i++) setTimeout(() => sfx('deal'), stepMs(160) * i);
      await sleep(stepMs(160) * r.dealOrder.length + stepMs(380));
      if (epoch !== myEpoch) return;
      if (r.phase === 'dealer') {
        await runDealer(myEpoch);
        return;
      }
      set({ busy: false });
    },

    async insurance(take) {
      const s = get();
      if (!s.round || s.round.phase !== 'insurance' || s.busy) return;
      const myEpoch = epoch;
      const amount = take ? s.round.seatBets.reduce((a, b) => a + b, 0) / 2 : 0;
      if (take && isMoney() && amount > s.bankroll) return;
      const r = decideInsurance(s.round, take);
      if (take) sfx('chip');
      set({ bankroll: s.bankroll - amount, shoe: r.shoe });
      await afterAction(r, myEpoch);
    },

    async play(a) {
      const s = get();
      if (!s.round || s.round.phase !== 'playing' || s.busy) return;
      const budget = get().budget();
      if (!availableActions(s.round, budget)[a]) return;
      const myEpoch = epoch;
      const hand = s.round.hands[s.round.active];
      const extra = a === 'double' || a === 'split' ? hand.bet : 0;
      const r = engineAct(s.round, a, budget);
      if (a === 'hit' || a === 'double') sfx('deal');
      if (extra) sfx('chip');
      set({ bankroll: s.bankroll - extra, shoe: r.shoe, busy: true });
      await sleep(a === 'stand' || a === 'surrender' ? stepMs(120) : stepMs(380));
      if (epoch !== myEpoch) return;
      await afterAction(r, myEpoch);
    },

    nextHand() {
      const s = get();
      if (s.busy) return;
      const bets = isMoney() ? s.lastBets.map((b) => Math.min(b, Math.max(0, s.bankroll))) : s.lastBets;
      set({ round: null, debriefOpen: false, bets });
    },

    setDebrief(open) {
      set({ debriefOpen: open });
    },

    setFilter(f) {
      set({ filter: f });
    },

    cashOut() {
      const s = get();
      if (s.busy || (s.round && s.round.phase !== 'settled')) return;
      epoch++;
      set({ cashedOut: true, round: null, debriefOpen: false });
    },
  };
});

export function useRoundActions() {
  const round = useTable((s) => s.round);
  const bankroll = useTable((s) => s.bankroll);
  const mode = useTable((s) => s.mode);
  if (!round) return null;
  return availableActions(round, mode === 'practice' ? Infinity : bankroll);
}

// Outils de test manuels (développement uniquement).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __sabot: unknown }).__sabot = { useTable, rigTop };
}
