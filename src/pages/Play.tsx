import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTable, useRoundActions, TABLE_MIN, TABLE_MAX, type Mode, type RoundSummary } from '../store/table';
import { useSettings, dur } from '../store/settings';
import { TopBar, IconButton } from '../components/layout/TopBar';
import { GameTable } from '../components/table/GameTable';
import { ActionBar } from '../components/table/ActionBar';
import { ChipRack } from '../components/chips/ChipRack';
import { Drawer } from '../components/ui/Drawer';
import { DebriefContent } from '../components/debrief/Debrief';
import { StrategyChart, ChartLegend } from '../components/strategy/StrategyChart';
import { BankCurve } from '../components/charts/BankCurve';
import { AnimatedEuro } from '../components/ui/AnimatedNumber';
import { useGameKeys } from '../hooks/useGameKeys';
import { FILTERS, type PracticeFilter } from '../lib/situations';
import { formatEuro, formatSignedEuro } from '../lib/format';
import { IconGrid, IconGear, IconChart, IconSound, IconMute, IconReplay, IconCash } from '../components/ui/Icons';
import { dailySeed } from '../engine/rng';
import { RushSummary } from '../components/rush/RushSummary';
import { useStats } from '../store/stats';
import type { Action } from '../engine/game';

const TITLES: Record<Mode, string> = { practice: 'Practice', rush: 'Rush', daily: 'Défi du jour' };
export const DAILY_HANDS = 25;

export default function Play({ mode }: { mode: Mode }) {
  const init = useTable((s) => s.init);
  useEffect(() => {
    if (mode === 'daily') {
      const { seed, key } = dailySeed();
      init('daily', { seed, handLimit: DAILY_HANDS, dailyKey: key });
    } else init(mode);
    useStats.getState().resetSession();
  }, [mode, init]);

  const round = useTable((s) => s.round);
  const busy = useTable((s) => s.busy);
  const bankroll = useTable((s) => s.bankroll);
  const debriefOpen = useTable((s) => s.debriefOpen);
  const verdicts = useTable((s) => s.verdicts);
  const cashedOut = useTable((s) => s.cashedOut);
  const tableMode = useTable((s) => s.mode);
  const t = useTable.getState;
  const sound = useSettings((s) => s.sound);
  const [chartOpen, setChartOpen] = useState(false);
  const [detail, setDetail] = useState<RoundSummary | null>(null);
  const actions = useRoundActions();
  const money = mode !== 'practice';

  const onAction = useCallback((a: Action) => void t().play(a), [t]);
  const onSpace = useCallback(() => {
    const s = t();
    if (s.busy || s.cashedOut) return;
    if (!s.round || s.round.phase === 'settled') void s.deal();
  }, [t]);
  const onInsurance = useCallback((take: boolean) => void t().insurance(take), [t]);
  useGameKeys({ onAction, onSpace, onInsurance, enabled: tableMode === mode && !cashedOut });

  if (tableMode !== mode) return <div className="min-h-dvh bg-bg-1" />;

  return (
    <div className="min-h-dvh bg-bg-1 [--card-w:clamp(58px,min(19vw,10.5vh),100px)]">
      <TopBar
        title={TITLES[mode]}
        center={
          <div className="flex items-center gap-2 rounded-lg bg-bg-0 px-3 py-1.5 sm:px-4">
            <span className="hidden text-xs font-semibold text-fg-3 sm:inline">{money ? 'Solde' : 'Banque fictive'}</span>
            <AnimatedEuro value={bankroll} className="text-sm font-bold sm:text-base" />
          </div>
        }
        right={
          <>
            <IconButton label="Tableau de stratégie" onClick={() => setChartOpen(true)}>
              <IconGrid />
            </IconButton>
            <Link to="/stats" aria-label="Statistiques" title="Statistiques" className="hidden h-10 w-10 place-items-center rounded-lg text-fg-2 hover:bg-bg-3 hover:text-fg sm:grid">
              <IconChart />
            </Link>
            <IconButton label={sound ? 'Couper le son' : 'Activer le son'} onClick={() => useSettings.getState().set({ sound: !sound })}>
              {sound ? <IconSound /> : <IconMute />}
            </IconButton>
            <Link to="/reglages" aria-label="Réglages" title="Réglages" className="grid h-10 w-10 place-items-center rounded-lg text-fg-2 hover:bg-bg-3 hover:text-fg">
              <IconGear />
            </Link>
          </>
        }
      />

      <h1 className="sr-only">{TITLES[mode]} — table de blackjack</h1>
      <main className="mx-auto grid max-w-[1400px] gap-3 p-2 sm:p-4 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-4">
        <aside className="panel order-2 flex flex-col gap-4 p-4 lg:order-1" aria-label="Commandes">
          <Controls mode={mode} actions={actions} busy={busy} onDetail={setDetail} />
        </aside>
        <section className="order-1 flex min-w-0 flex-col lg:order-2" aria-label="Table de jeu">
          <GameTable />
          {money && <RushStrip onDetail={setDetail} />}
        </section>
      </main>

      {/* Debrief (Practice) */}
      <Drawer
        open={debriefOpen && mode === 'practice' && !!round && round.phase === 'settled'}
        onClose={() => t().setDebrief(false)}
        title="Debrief de la main"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary h-11" onClick={() => void t().deal({ replay: true })}>
              <IconReplay size={18} /> Rejouer la situation
            </button>
            <button type="button" className="btn btn-primary h-11" data-autofocus onClick={() => void t().deal()}>
              Main suivante
            </button>
          </div>
        }
      >
        {round?.result && <DebriefContent verdicts={verdicts} net={round.result.net} />}
      </Drawer>

      {/* Détail d'une main (Rush) */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? `Main n° ${detail.no}` : ''}>
        {detail && <DebriefContent verdicts={detail.verdicts} net={detail.net} />}
      </Drawer>

      <Drawer open={chartOpen} onClose={() => setChartOpen(false)} title="Stratégie de base" width="sm:w-[560px]">
        <div className="space-y-5">
          <ChartLegend />
          <StrategyChart />
          <p className="text-xs text-fg-3">Lecture : paire → total souple → total dur. Colonnes = carte visible du croupier.</p>
        </div>
      </Drawer>

      <AnimatePresence>{cashedOut && money && <RushSummary />}</AnimatePresence>
    </div>
  );
}

function Controls({ mode, actions, busy, onDetail }: { mode: Mode; actions: ReturnType<typeof useRoundActions>; busy: boolean; onDetail: (r: RoundSummary) => void }) {
  const round = useTable((s) => s.round);
  const bets = useTable((s) => s.bets);
  const bankroll = useTable((s) => s.bankroll);
  const filter = useTable((s) => s.filter);
  const roundNo = useTable((s) => s.roundNo);
  const handLimit = useTable((s) => s.handLimit);
  const history = useTable((s) => s.history);
  const practiceHands = useSettings((s) => s.practiceHands);
  const t = useTable.getState;
  const money = mode !== 'practice';
  const betting = !round || round.phase === 'settled';
  const total = bets.reduce((a, b) => a + b, 0);
  const limitReached = handLimit !== null && roundNo >= handLimit && betting;
  const broke = money && betting && bankroll < TABLE_MIN;
  const canDeal = betting && !busy && !limitReached && !broke && bets.every((b) => b >= TABLE_MIN) && (!money || total <= bankroll);

  const setAll = (v: number) => bets.forEach((_, i) => t().setBet(v, i));
  const per = bets[0] ?? 0;

  return (
    <>
      {betting ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="bet" className="label">
                Mise {bets.length > 1 ? 'par main' : ''}
              </label>
              <span className="tabular text-xs text-fg-3">
                {formatEuro(TABLE_MIN)} – {formatEuro(TABLE_MAX)}
              </span>
            </div>
            <div className="input flex h-12 items-center pl-3 pr-1">
              <span className="mr-1 text-fg-3">€</span>
              <input
                id="bet"
                inputMode="numeric"
                className="tabular h-full min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
                value={per || ''}
                placeholder="0"
                onChange={(e) => setAll(Number(e.target.value.replace(/\D/g, '')) || 0)}
                disabled={busy}
              />
              <button type="button" className="btn btn-ghost h-9 px-2.5 text-sm" onClick={() => setAll(Math.max(TABLE_MIN, Math.floor(per / 2)))} disabled={busy}>
                ½
              </button>
              <button type="button" className="btn btn-ghost h-9 px-2.5 text-sm" onClick={() => setAll(per * 2)} disabled={busy}>
                2×
              </button>
              <button type="button" className="btn btn-ghost h-9 px-2.5 text-xs" onClick={() => t().clearBets()} disabled={busy} aria-label="Effacer la mise">
                ✕
              </button>
            </div>
          </div>
          <ChipRack onPick={(v) => bets.forEach((_, i) => t().addChip(v, i))} maxAdd={money ? bankroll - total : Infinity} disabled={busy} />

          {mode === 'practice' && (
            <>
              <div>
                <div className="label mb-1.5">Mains en parallèle</div>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg-0 p-1" role="radiogroup" aria-label="Nombre de mains">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={practiceHands === n}
                      onClick={() => {
                        useSettings.getState().set({ practiceHands: n });
                        t().setSeats(n);
                      }}
                      className={`h-9 rounded-md text-sm font-semibold transition-colors ${practiceHands === n ? 'bg-bg-4 text-fg' : 'text-fg-3 hover:text-fg'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="filter" className="label mb-1.5 block">
                  Situations
                </label>
                <select
                  id="filter"
                  value={filter}
                  onChange={(e) => t().setFilter(e.target.value as PracticeFilter)}
                  className="input h-11 w-full px-3 text-sm font-medium"
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} — {f.hint}
                    </option>
                  ))}
                </select>
                {filter !== 'none' && <p className="mt-1.5 text-xs text-fg-3">Situation forcée : une seule main, composition du sabot inchangée.</p>}
              </div>
            </>
          )}

          {limitReached ? (
            <button type="button" className="btn btn-primary h-14 w-full text-base" onClick={() => t().cashOut()}>
              Voir le résultat du défi
            </button>
          ) : broke ? (
            <button type="button" className="btn btn-primary h-14 w-full text-base" onClick={() => t().cashOut()}>
              {bankroll > 0 ? `Encaisser ${formatEuro(bankroll)}` : 'Fin de partie'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary h-14 w-full text-base" disabled={!canDeal} onClick={() => void t().deal()}>
              Distribuer <kbd className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-[11px]">Espace</kbd>
            </button>
          )}

          {mode === 'practice' && round?.phase === 'settled' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary h-11 text-sm" onClick={() => void t().deal({ replay: true })} disabled={busy}>
                <IconReplay size={16} /> Rejouer
              </button>
              <button type="button" className="btn btn-secondary h-11 text-sm" onClick={() => t().setDebrief(true)}>
                Debrief
              </button>
            </div>
          )}
          {money && !limitReached && !broke && (
            <button type="button" className="btn btn-secondary h-11 w-full text-sm" onClick={() => t().cashOut()} disabled={busy || roundNo === 0}>
              <IconCash size={18} /> Encaisser {formatEuro(bankroll)}
            </button>
          )}
          {money && handLimit !== null && (
            <p className="text-center text-xs text-fg-3">
              Main {Math.min(roundNo, handLimit)} / {handLimit} · même sabot pour tout le monde aujourd’hui
            </p>
          )}
        </div>
      ) : round.phase === 'insurance' ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-bg-3 p-3 text-sm">
            <div className="font-bold">Assurance</div>
            <p className="mt-1 text-fg-2">
              Le croupier montre un As. L’assurance coûte {formatEuro(round.seatBets.reduce((a, b) => a + b, 0) / 2)} et paie 2 contre 1 s’il fait blackjack.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary h-12" onClick={() => void t().insurance(true)} disabled={busy}>
              Assurer <kbd className="font-mono text-[11px] text-fg-3">O</kbd>
            </button>
            <button type="button" className="btn btn-secondary h-12" onClick={() => void t().insurance(false)} disabled={busy}>
              Refuser <kbd className="font-mono text-[11px] text-fg-3">N</kbd>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ActionBar available={actions ?? {}} onAction={(a) => void t().play(a)} disabled={busy || round.phase !== 'playing'} />
          <p className="text-center text-xs text-fg-3">{round.phase === 'dealer' ? 'Le croupier joue…' : 'À vous de décider.'}</p>
        </div>
      )}

      {mode === 'practice' && history.length > 0 && <PracticeSession onDetail={onDetail} />}
    </>
  );
}

function PracticeSession({ onDetail }: { onDetail: (r: RoundSummary) => void }) {
  const history = useTable((s) => s.history);
  const stats = useMemo(() => {
    const all = history.flatMap((h) => h.verdicts);
    const ok = all.filter((v) => v.correct).length;
    return { n: all.length, ok, net: history.reduce((a, h) => a + h.net, 0) };
  }, [history]);
  return (
    <div className="mt-auto space-y-3 border-t border-white/5 pt-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Mains" value={String(history.length)} />
        <MiniStat label="Précision" value={stats.n ? `${Math.round((stats.ok / stats.n) * 100)} %` : '—'} />
        <MiniStat label="Résultat" value={formatSignedEuro(stats.net)} tone={stats.net >= 0 ? 'ok' : 'ko'} />
      </div>
      <HandDots history={history} onDetail={onDetail} />
    </div>
  );
}

export function HandDots({ history, onDetail }: { history: RoundSummary[]; onDetail: (r: RoundSummary) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Historique des mains">
      {history.slice(-24).map((h) => {
        const errors = h.verdicts.filter((v) => !v.correct).length;
        const none = h.verdicts.length === 0;
        return (
          <motion.button
            key={h.no}
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: dur(0.2) }}
            onClick={() => onDetail(h)}
            title={`Main ${h.no} : ${none ? 'aucune décision' : errors ? `${errors} erreur(s)` : 'parfaite'} · ${formatSignedEuro(h.net)}`}
            aria-label={`Main ${h.no} : ${none ? 'aucune décision' : errors ? `${errors} erreur(s)` : 'parfaite'}, ${formatSignedEuro(h.net)}. Voir le détail.`}
            className={`h-3.5 w-3.5 rounded-full ring-offset-2 ring-offset-bg-2 transition hover:scale-125 focus-visible:ring-2 ${none ? 'bg-bg-5' : errors ? 'bg-danger' : 'bg-accent'}`}
          />
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'ko' }) {
  return (
    <div className="rounded-lg bg-bg-3 px-2 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">{label}</div>
      <div className={`tabular text-sm font-bold ${tone === 'ok' ? 'text-accent' : tone === 'ko' ? 'text-danger' : 'text-fg'}`}>{value}</div>
    </div>
  );
}

/** Bandeau Rush : record, courbe, pastilles des verdicts. */
function RushStrip({ onDetail }: { onDetail: (r: RoundSummary) => void }) {
  const curve = useTable((s) => s.curve);
  const peak = useTable((s) => s.peak);
  const start = useTable((s) => s.startBankroll);
  const history = useTable((s) => s.history);
  const settled = curve[curve.length - 1]?.bankroll ?? start;
  return (
    <div className="panel mt-3 grid gap-4 p-4 sm:grid-cols-[200px_minmax(0,1fr)]">
      <div className="flex flex-row justify-between gap-3 sm:flex-col sm:justify-start">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Record de la session</div>
          <div className="tabular text-xl font-extrabold text-warn">{formatEuro(peak)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Depuis le départ</div>
          <div className={`tabular text-lg font-bold ${settled - start >= 0 ? 'text-accent' : 'text-danger'}`}>{formatSignedEuro(settled - start)}</div>
        </div>
      </div>
      <div className="min-w-0 space-y-3">
        <BankCurve points={curve} start={start} height={90} />
        {history.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Verdicts</span>
            <HandDots history={history} onDetail={onDetail} />
          </div>
        )}
      </div>
    </div>
  );
}
