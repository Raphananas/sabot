import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Verdict } from '../../strategy/evaluate';
import { ACTION_LABELS } from '../../strategy/advisor';
import { analyzeDecision, type DecisionAnalysis } from '../../lib/analysis';
import { useSettings, dur } from '../../store/settings';
import { formatPct, formatSignedEuro, formatEuro } from '../../lib/format';
import { StrategyChart } from '../strategy/StrategyChart';
import { PlayingCard } from '../cards/PlayingCard';
import type { Outcomes } from '../../probability/ev';
import { IconCheck, IconX } from '../ui/Icons';

const PLAYED_LABEL: Record<string, string> = {
  ...ACTION_LABELS,
  insurance: 'Prendre l’assurance',
  'no-insurance': 'Refuser l’assurance',
};

export function VerdictHeader({ verdicts, net }: { verdicts: Verdict[]; net: number }) {
  const errors = verdicts.filter((v) => !v.correct).length;
  const none = verdicts.length === 0;
  const tone = none ? 'neutral' : errors === 0 ? 'ok' : 'ko';
  const title = none ? 'Aucune décision' : errors === 0 ? 'Main parfaite' : errors === 1 ? 'Une erreur' : `${errors} erreurs`;
  const sub = none
    ? 'Blackjack naturel ou main réglée sans choix de votre part.'
    : errors === 0
      ? `${verdicts.length} décision${verdicts.length > 1 ? 's' : ''} conforme${verdicts.length > 1 ? 's' : ''} à la stratégie de base.`
      : `${verdicts.length - errors} sur ${verdicts.length} décision${verdicts.length > 1 ? 's' : ''} conforme${verdicts.length - errors > 1 ? 's' : ''}.`;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-bg-3 p-4">
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === 'ok' ? 'bg-accent text-accent-ink' : tone === 'ko' ? 'bg-danger text-white' : 'bg-bg-4 text-fg'}`}
        aria-hidden="true"
      >
        {tone === 'ko' ? <IconX size={22} /> : <IconCheck size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-extrabold leading-tight">{title}</div>
        <div className="text-sm text-fg-2">{sub}</div>
      </div>
      <div className={`tabular text-right text-lg font-bold ${net > 0 ? 'text-accent' : net < 0 ? 'text-danger' : 'text-warn'}`}>{net === 0 ? '±0 €' : formatSignedEuro(net)}</div>
    </div>
  );
}

function OutcomeBar({ label, o, tone }: { label: string; o: Outcomes | null; tone: 'played' | 'rec' }) {
  if (!o) return null;
  const seg = [
    { k: 'Victoire', v: o.win, c: 'var(--color-accent)' },
    { k: 'Égalité', v: o.push, c: 'var(--color-warn)' },
    { k: 'Défaite', v: o.lose, c: 'var(--color-danger)' },
  ];
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className={`font-semibold ${tone === 'rec' ? 'text-fg' : 'text-fg-2'}`}>{label}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-bg-0" role="img" aria-label={`${label} : victoire ${formatPct(o.win)}, égalité ${formatPct(o.push)}, défaite ${formatPct(o.lose)}`}>
        {seg.map((s) => (
          <motion.div
            key={s.k}
            initial={{ width: '0%' }}
            animate={{ width: `${s.v * 100}%` }}
            transition={{ duration: dur(0.7), ease: [0.16, 1, 0.3, 1] }}
            style={{ background: s.c }}
          />
        ))}
      </div>
      <div className="tabular mt-1 flex justify-between text-[11px] text-fg-3">
        <span>V {formatPct(o.win)}</span>
        <span>É {formatPct(o.push)}</span>
        <span>D {formatPct(o.lose)}</span>
      </div>
    </div>
  );
}

function DealerBars({ a }: { a: DecisionAnalysis }) {
  const d = a.analysis.dealer;
  const rows: [string, number][] = [
    ['17', d[17]],
    ['18', d[18]],
    ['19', d[19]],
    ['20', d[20]],
    ['21', d[21]],
    ['BJ', d.blackjack],
    ['Brûle', d.bust],
  ];
  const max = Math.max(...rows.map((r) => r[1]), 0.01);
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-fg-2">Résultat final du croupier</div>
      <div className="flex h-20 items-end gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-1 flex-col items-center gap-1">
            <span className="tabular text-[10px] text-fg-3">{Math.round(v * 100)}%</span>
            <motion.div
              className="w-full rounded-t"
              style={{ background: k === 'Brûle' ? 'var(--color-accent)' : k === 'BJ' ? 'var(--color-danger)' : 'var(--color-bg-5)' }}
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 44}px` }}
              transition={{ duration: dur(0.6), ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="text-[10px] font-semibold text-fg-2">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionCard({ v, index }: { v: Verdict; index: number }) {
  const rules = useSettings((s) => s.rules);
  const [a, setA] = useState<DecisionAnalysis | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    analyzeDecision(v, rules)
      .then((res) => alive && setA(res))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [v, rules]);
  const d = v.decision;
  const ins = d.kind === 'insurance';
  return (
    <motion.article
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: dur(0.35), delay: dur(0.06) * index }}
      className="rounded-xl bg-bg-3 p-4"
    >
      <header className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-1 [--card-w:30px]">
          {d.cards.map((c) => (
            <PlayingCard key={c.id} card={c} dealt={false} />
          ))}
          <span className="mx-1 text-xs font-bold text-fg-3">vs</span>
          <PlayingCard card={d.dealerUp} dealt={false} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{v.situation}</div>
          <div className="text-xs text-fg-3">Décision {index + 1}{d.fromSplit ? ' · main splittée' : ''}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.correct ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}>{v.correct ? 'Correct' : 'Erreur'}</span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-bg-2 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Vous avez joué</div>
          <div className={`font-bold ${v.correct ? 'text-fg' : 'text-danger'}`}>{PLAYED_LABEL[d.action]}</div>
        </div>
        <div className="rounded-lg bg-bg-2 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Le tableau dit</div>
          <div className="font-bold text-accent">{PLAYED_LABEL[v.recommended]}</div>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-fg-2">{v.explanation}</p>

      {err && <p className="text-xs text-fg-3">Probabilités indisponibles.</p>}
      {!a && !err && <div className="h-24 animate-pulse rounded-lg bg-bg-2" aria-label="Calcul des probabilités…" />}
      {a && !ins && (
        <div className="space-y-4">
          <div className="space-y-3">
            {!v.correct && <OutcomeBar label={`Joué : ${PLAYED_LABEL[d.action]}`} o={a.played} tone="played" />}
            <OutcomeBar label={`${v.correct ? 'Joué et conseillé' : 'Conseillé'} : ${PLAYED_LABEL[v.recommended]}`} o={a.recommended} tone="rec" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="EV jouée" value={formatSignedEuro(a.evPlayed)} tone={a.evPlayed >= 0 ? 'ok' : 'ko'} />
            <Stat label="EV conseillée" value={formatSignedEuro(a.evRec)} tone={a.evRec >= 0 ? 'ok' : 'ko'} />
            <Stat label="Coût de l’erreur" value={v.correct ? '0 €' : formatEuro(Math.max(0, a.cost))} tone={v.correct ? 'ok' : 'ko'} />
          </div>
          <DealerBars a={a} />
          {a.nuance && (
            <p className="rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-warn">
              Nuance : avec la composition exacte du sabot à ce moment, « {PLAYED_LABEL[a.nuance]} » rapportait très légèrement plus. Le tableau reste le bon réflexe : l’écart vient de quelques cartes et s’inverse d’un sabot à l’autre.
            </p>
          )}
        </div>
      )}
      {a && ins && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Probabilité d’un 10" value={formatPct(a.analysis.pTen)} tone={a.analysis.pTen > 1 / 3 ? 'ok' : 'ko'} />
          <Stat label="EV de l’assurance" value={formatSignedEuro(a.analysis.insuranceEv * d.bet)} tone={a.analysis.insuranceEv >= 0 ? 'ok' : 'ko'} />
          <p className="col-span-2 text-left text-xs text-fg-3">Seuil de rentabilité : 33,3 % de cartes valant 10.</p>
        </div>
      )}
      {v.advice && !v.advice.offTable && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-fg-2">Dans le tableau</div>
          <StrategyChart compact only={v.advice.table} highlight={{ table: v.advice.table, row: v.advice.row, col: v.advice.col }} />
        </div>
      )}
    </motion.article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'ko' }) {
  return (
    <div className="rounded-lg bg-bg-2 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">{label}</div>
      <div className={`tabular text-sm font-bold ${tone === 'ok' ? 'text-accent' : 'text-danger'}`}>{value}</div>
    </div>
  );
}

export function DebriefContent({ verdicts, net }: { verdicts: Verdict[]; net: number }) {
  return (
    <div className="space-y-3">
      <VerdictHeader verdicts={verdicts} net={net} />
      {verdicts.map((v, i) => (
        <DecisionCard key={`${v.decision.handId}-${i}`} v={v} index={i} />
      ))}
    </div>
  );
}
