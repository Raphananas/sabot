import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTable, RUSH_START } from '../../store/table';
import { useStats, rushTitle } from '../../store/stats';
import { dur } from '../../store/settings';
import { formatEuro, formatSignedEuro } from '../../lib/format';
import { BankCurve } from '../charts/BankCurve';
import { AnimatedEuro } from '../ui/AnimatedNumber';
import { DebriefContent } from '../debrief/Debrief';
import { shareScoreImage } from '../../lib/shareImage';
import { IconShare, IconReplay } from '../ui/Icons';

/** Écran d'encaissement / fin de Rush. */
export function RushSummary() {
  const s = useTable();
  const navigate = useNavigate();
  const recorded = useRef(false);
  const [showErrors, setShowErrors] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const score = s.bankroll < 0.01 ? 0 : Math.round(s.bankroll * 100) / 100;
  const atPeak = score >= s.peak - 0.001;

  const summary = useMemo(() => {
    const all = s.history.flatMap((h) => h.verdicts);
    const ok = all.filter((v) => v.correct).length;
    const nets = s.history.map((h) => h.net);
    const biggestWin = nets.length ? Math.max(0, ...nets) : 0;
    const biggestLoss = nets.length ? Math.min(0, ...nets) : 0;
    return { decisions: all.length, accuracy: all.length ? ok / all.length : 1, biggestWin, biggestLoss, errors: s.history.filter((h) => h.verdicts.some((v) => !v.correct)) };
  }, [s.history]);

  const rushScores = useStats((st) => st.rushScores);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    useStats.getState().addRushScore({
      t: Date.now(),
      score,
      peak: s.peak,
      hands: s.history.length,
      accuracy: summary.accuracy,
      daily: s.dailyKey,
    });
    if (s.peak >= 1000) useStats.getState().unlock('rush-1000');
    if (s.peak >= 2500) useStats.getState().unlock('rush-2500');
  }, [score, s.peak, s.history.length, summary.accuracy, s.dailyKey]);

  const rank = rushScores.findIndex((r) => r.score === score) + 1;
  const title = rushTitle(score);

  const restart = () => {
    if (s.mode === 'daily') navigate('/rush');
    else s.init('rush');
  };

  return (
    <motion.div className="fixed inset-0 z-[70] overflow-y-auto bg-bg-0/85 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mx-auto flex min-h-full max-w-2xl items-center p-3 sm:p-6">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Résultat de la partie"
          initial={{ y: 30, scale: 0.97 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: dur(0.45), ease: [0.16, 1, 0.3, 1] }}
          className="panel w-full overflow-hidden"
        >
          <div className="bg-bg-3 px-5 pb-6 pt-7 text-center sm:px-8">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-fg-3">{s.mode === 'daily' ? `Défi du ${s.dailyKey}` : score > 0 ? 'Vous encaissez' : 'Partie terminée'}</div>
            <div className={`mt-2 text-5xl font-extrabold sm:text-6xl ${score >= RUSH_START ? 'text-accent' : score > 0 ? 'text-fg' : 'text-danger'}`}>
              <AnimatedEuro value={score} />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-bg-1 px-3 py-1 text-sm font-bold">
              <span className="text-warn">♛</span> {title}
              {rank > 0 && rank <= 20 && <span className="text-fg-3">· n° {rank} du classement</span>}
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm text-fg-2">
              {score === 0
                ? `Tombé à 0 € : le score est nul. Votre pic était de ${formatEuro(s.peak)} — le tout est de savoir s’arrêter.`
                : atPeak
                  ? 'Vous avez encaissé au sommet. Parfait timing.'
                  : `Vous auriez pu repartir avec ${formatEuro(s.peak)} (${s.peakHand === 0 ? 'sans jouer' : `après la main ${s.peakHand}`}), vous encaissez ${formatEuro(score)}.`}
            </p>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <BankCurve points={s.curve} start={s.startBankroll} height={140} showAxis peakHand={s.peakHand} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Mains jouées" value={String(s.history.length)} />
              <Tile label="Bonnes décisions" value={`${Math.round(summary.accuracy * 100)} %`} tone={summary.accuracy >= 0.9 ? 'ok' : summary.accuracy >= 0.75 ? undefined : 'ko'} />
              <Tile label="Plus gros gain" value={formatSignedEuro(summary.biggestWin)} tone="ok" />
              <Tile label="Plus grosse perte" value={formatSignedEuro(summary.biggestLoss)} tone="ko" />
            </div>
            <div className="rounded-lg bg-bg-3 p-3 text-sm text-fg-2">
              <span className="font-bold text-fg">Meilleur moment pour encaisser :</span>{' '}
              {s.peakHand === 0 ? 'avant la première main (vous n’avez jamais dépassé votre mise de départ).' : `après la main ${s.peakHand}, à ${formatEuro(s.peak)}.`}
            </div>

            {summary.errors.length > 0 && (
              <div>
                <button type="button" className="btn btn-ghost h-10 w-full justify-between px-3 text-sm" onClick={() => setShowErrors((v) => !v)} aria-expanded={showErrors}>
                  <span>Bilan des erreurs ({summary.errors.reduce((a, h) => a + h.verdicts.filter((v) => !v.correct).length, 0)})</span>
                  <span>{showErrors ? '−' : '+'}</span>
                </button>
                {showErrors && (
                  <div className="mt-2 space-y-4">
                    {summary.errors.map((h) => (
                      <div key={h.no}>
                        <div className="mb-1.5 text-xs font-bold text-fg-3">Main {h.no}</div>
                        <DebriefContent verdicts={h.verdicts.filter((v) => !v.correct)} net={h.net} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {shareMsg && <p className="text-center text-xs text-fg-2" role="status">{shareMsg}</p>}
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                className="btn btn-secondary h-12"
                onClick={async () => setShareMsg(await shareScoreImage({ score, peak: s.peak, title, hands: s.history.length, accuracy: summary.accuracy, daily: s.dailyKey, curve: s.curve }))}
              >
                <IconShare size={18} /> Partager
              </button>
              <button type="button" className="btn btn-secondary h-12" onClick={() => navigate('/')}>
                Accueil
              </button>
              <button type="button" className="btn btn-primary h-12" onClick={restart} data-autofocus>
                <IconReplay size={18} /> Nouvelle partie
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'ko' }) {
  return (
    <div className="rounded-lg bg-bg-3 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">{label}</div>
      <div className={`tabular text-base font-bold ${tone === 'ok' ? 'text-accent' : tone === 'ko' ? 'text-danger' : 'text-fg'}`}>{value}</div>
    </div>
  );
}
