import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { PageShell } from '../components/ui/Controls';
import { useStats, rushTitle, type Counter } from '../store/stats';
import { StrategyChart } from '../components/strategy/StrategyChart';
import { ACHIEVEMENTS } from '../lib/achievements';
import { ACTION_LABELS } from '../strategy/advisor';
import { formatEuro, formatDate, formatPct } from '../lib/format';
import { dur } from '../store/settings';
import { exportData } from '../lib/backup';
import type { Family } from '../strategy/evaluate';

const FAMILY_LABELS: Record<Family, string> = {
  hard: 'Totaux durs',
  soft: 'Totaux souples',
  pair: 'Paires',
  surrender: 'Abandons',
  insurance: 'Assurance',
};

const LABEL: Record<string, string> = { ...ACTION_LABELS, insurance: 'Assurance', 'no-insurance': 'Refus d’assurance' };

const pct = (c?: Counter) => (c && c.n ? 1 - c.err / c.n : null);

export default function Stats() {
  const st = useStats();
  const total = Object.values(st.families).reduce((a, c) => a + c.n, 0);
  const errs = Object.values(st.families).reduce((a, c) => a + c.err, 0);
  const acc = total ? 1 - errs / total : null;

  const frequent = useMemo(() => {
    const m = new Map<string, { n: number; cost: number; situation: string; played: string; rec: string }>();
    for (const d of st.decisions) {
      if (d.correct) continue;
      const k = `${d.situation}|${d.played}`;
      const e = m.get(k) ?? { n: 0, cost: 0, situation: d.situation, played: d.played, rec: d.rec };
      e.n++;
      e.cost += d.cost ?? 0;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || b.cost - a.cost).slice(0, 8);
  }, [st.decisions]);

  const days = useMemo(
    () =>
      Object.entries(st.days)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14),
    [st.days],
  );

  return (
    <div className="min-h-dvh bg-bg-1">
      <TopBar title="Statistiques" />
      <PageShell title="Statistiques" wide>
        {total === 0 && (
          <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-fg-2">Aucune décision enregistrée pour l’instant. Jouez quelques mains pour voir apparaître vos statistiques.</p>
            <Link to="/practice" className="btn btn-primary h-10 px-4 text-sm">
              Jouer en Practice
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Précision globale" value={acc === null ? '—' : formatPct(acc)} tone={acc !== null && acc >= 0.9 ? 'ok' : undefined} />
          <Kpi label="Mains jouées" value={String(st.hands)} />
          <Kpi label="Perdu à cause d’erreurs" value={formatEuro(st.errorCost)} tone={st.errorCost > 0 ? 'ko' : undefined} sub="Espérance (EV) sacrifiée" />
          <Kpi label="Meilleure série parfaite" value={`${st.bestPerfectStreak} mains`} sub={`En cours : ${st.perfectStreak}`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="panel p-5" aria-labelledby="fam">
            <h2 id="fam" className="mb-4 text-base font-bold">
              Précision par type de main
            </h2>
            <div className="space-y-3">
              {(Object.keys(FAMILY_LABELS) as Family[]).map((f) => {
                const p = pct(st.families[f]);
                return (
                  <div key={f}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{FAMILY_LABELS[f]}</span>
                      <span className="tabular text-fg-2">
                        {p === null ? '—' : `${Math.round(p * 100)} %`} <span className="text-fg-3">({st.families[f].n})</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-bg-0">
                      <motion.div
                        className="h-full w-full origin-left rounded-full"
                        style={{ background: p === null ? 'transparent' : p >= 0.9 ? 'var(--color-accent)' : p >= 0.75 ? 'var(--color-warn)' : 'var(--color-danger)' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: p ?? 0 }}
                        transition={{ duration: dur(0.8), ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel p-5" aria-labelledby="prog">
            <h2 id="prog" className="mb-4 text-base font-bold">
              Progression (précision par jour)
            </h2>
            {days.length === 0 ? (
              <p className="text-sm text-fg-3">Pas encore de données.</p>
            ) : (
              <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Précision quotidienne sur les 14 derniers jours joués">
                {days.map(([k, c]) => {
                  const p = 1 - c.err / c.n;
                  return (
                    <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="tabular text-[10px] text-fg-3">{Math.round(p * 100)}</span>
                      <motion.div
                        className="w-full rounded-t"
                        style={{ background: p >= 0.9 ? 'var(--color-accent)' : p >= 0.75 ? 'var(--color-warn)' : 'var(--color-danger)' }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, p * 120)}px` }}
                        transition={{ duration: dur(0.6) }}
                      />
                      <span className="truncate text-[10px] text-fg-3">{formatDate(new Date(k).getTime())}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="panel mt-4 p-5" aria-labelledby="freq">
          <h2 id="freq" className="mb-3 text-base font-bold">
            Erreurs les plus fréquentes
          </h2>
          {frequent.length === 0 ? (
            <p className="text-sm text-fg-3">Aucune erreur enregistrée. Bravo — ou jouez davantage !</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-fg-3">
                  <tr>
                    <th className="py-2 font-semibold">Situation</th>
                    <th className="py-2 font-semibold">Joué</th>
                    <th className="py-2 font-semibold">Conseillé</th>
                    <th className="py-2 text-right font-semibold">Fois</th>
                    <th className="py-2 text-right font-semibold">Coût (EV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {frequent.map((f) => (
                    <tr key={`${f.situation}${f.played}`}>
                      <td className="py-2.5 font-semibold">{f.situation}</td>
                      <td className="py-2.5 text-danger">{LABEL[f.played] ?? f.played}</td>
                      <td className="py-2.5 text-accent">{LABEL[f.rec] ?? f.rec}</td>
                      <td className="tabular py-2.5 text-right">{f.n}</td>
                      <td className="tabular py-2.5 text-right text-fg-2">{formatEuro(f.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel mt-4 p-5" aria-labelledby="heat">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="heat" className="text-base font-bold">
              Heatmap personnelle
            </h2>
            <div className="flex items-center gap-3 text-xs text-fg-3">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--color-accent) 55%, var(--color-bg-3))' }} /> 0 erreur
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--color-danger) 90%, var(--color-bg-3))' }} /> souvent raté
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-bg-3" /> jamais joué
              </span>
            </div>
          </div>
          <p className="mb-4 text-sm text-fg-2">Le tableau teinté selon votre taux d’erreur par case. Entraînez vos cases rouges avec le filtre « Mes points faibles » en Practice.</p>
          <StrategyChart heat={st.cells} />
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="panel p-5" aria-labelledby="lb">
            <h2 id="lb" className="mb-3 text-base font-bold">
              Classement Rush (local)
            </h2>
            {st.rushScores.length === 0 ? (
              <p className="text-sm text-fg-3">Encaissez une partie de Rush pour entrer au classement.</p>
            ) : (
              <ol className="divide-y divide-white/5">
                {st.rushScores.slice(0, 10).map((r, i) => (
                  <li key={`${r.t}-${i}`} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className={`tabular grid h-7 w-7 place-items-center rounded-md text-xs font-bold ${i === 0 ? 'bg-warn text-[#2a1700]' : 'bg-bg-3 text-fg-2'}`}>{i + 1}</span>
                    <span className="tabular w-24 font-bold">{formatEuro(r.score)}</span>
                    <span className="flex-1 text-fg-2">
                      {rushTitle(r.score)}
                      {r.daily ? ` · défi ${r.daily}` : ''}
                    </span>
                    <span className="text-xs text-fg-3">{formatDate(r.t)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section id="succes" className="panel p-5" aria-labelledby="ach">
            <h2 id="ach" className="mb-3 text-base font-bold">
              Succès <span className="text-fg-3">{Object.keys(st.achievements).length} / {ACHIEVEMENTS.length}</span>
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const got = st.achievements[a.id];
                return (
                  <li key={a.id} className={`flex items-center gap-3 rounded-lg p-2.5 ${got ? 'bg-bg-3' : 'bg-bg-1/50 opacity-60'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base ${got ? 'bg-accent text-accent-ink' : 'bg-bg-3 text-fg-3 grayscale'}`} aria-hidden="true">
                      {a.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{a.title}</div>
                      <div className="text-xs text-fg-3">{got ? `Débloqué le ${formatDate(got)}` : a.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary h-10 px-4 text-sm" onClick={exportData}>
            Exporter mes stats (JSON)
          </button>
          <Link to="/reglages" className="btn btn-ghost h-10 px-4 text-sm">
            Importer / réinitialiser…
          </Link>
        </div>
      </PageShell>
    </div>
  );
}

function Kpi({ label, value, tone, sub }: { label: string; value: string; tone?: 'ok' | 'ko'; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-semibold text-fg-3">{label}</div>
      <div className={`tabular mt-1 text-2xl font-extrabold ${tone === 'ok' ? 'text-accent' : tone === 'ko' ? 'text-danger' : 'text-fg'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-3">{sub}</div>}
    </div>
  );
}
