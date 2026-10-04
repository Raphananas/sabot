import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TopBar } from '../components/layout/TopBar';
import { PlayingCard } from '../components/cards/PlayingCard';
import { Chip } from '../components/chips/Chip';
import { card } from '../engine/cards';
import { useStats } from '../store/stats';
import { useSettings, dur } from '../store/settings';
import { formatEuro } from '../lib/format';
import { IconChart, IconGear, IconBolt, IconCalendar, IconBook, IconBrain, IconTarget, IconTrophy } from '../components/ui/Icons';
import { dailySeed } from '../engine/rng';
import type { ReactNode } from 'react';

const A = card('A', 'S', 'home-a');
const K = card('K', 'H', 'home-k');
const Q = card('Q', 'D', 'home-q');

export default function Home() {
  const best = useStats((s) => s.rushScores[0]?.score);
  const fam = useStats((s) => s.families);
  const quizBest = useStats((s) => s.quizBest);
  const daily = useStats((s) => s.daily[dailySeed().key]);
  const tutorialSeen = useSettings((s) => s.tutorialSeen);
  const total = Object.values(fam).reduce((a, c) => a + c.n, 0);
  const err = Object.values(fam).reduce((a, c) => a + c.err, 0);
  const acc = total ? Math.round((1 - err / total) * 100) : null;

  return (
    <div className="min-h-dvh bg-bg-1">
      <TopBar
        right={
          <>
            <Link to="/stats" className="btn btn-ghost h-10 px-3 text-sm" aria-label="Statistiques">
              <IconChart size={18} /> <span className="hidden sm:inline">Statistiques</span>
            </Link>
            <Link to="/reglages" className="btn btn-ghost h-10 w-10 p-0" aria-label="Réglages" title="Réglages">
              <IconGear size={18} />
            </Link>
          </>
        }
      />
      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: dur(0.6), ease: [0.16, 1, 0.3, 1] }}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Blackjack français</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            Deux tables.
            <br />
            <span className="text-fg-3">Une seule bonne façon de jouer.</span>
          </h1>
          {!tutorialSeen && (
            <Link to="/tutoriel" className="mt-6 inline-flex items-center gap-2 rounded-full bg-bg-3 px-4 py-2 text-sm font-semibold text-fg-2 hover:bg-bg-4 hover:text-fg">
              <span className="h-2 w-2 rounded-full bg-accent" /> Débutant ? Le tutoriel dure 60 secondes →
            </Link>
          )}
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ModeCard
            to="/practice"
            delay={0.1}
            tag="Entraînement"
            title="Practice"
            text="Mises libres, aucune pression. Vous jouez seul vos décisions ; à la fin de chaque main, le debrief vous dit si vous avez suivi la stratégie, pourquoi, et avec quelles probabilités."
            points={['Debrief après chaque main', 'Rejouer une situation', 'Paires, souples, abandons…']}
            cta="Jouer en Practice"
            stat={acc !== null ? `${acc} % de bonnes décisions` : 'Aucune main jouée'}
            visual={
              <div className="relative h-full w-full [--card-w:88px] sm:[--card-w:104px]">
                <div className="absolute left-1/2 top-1/2 -translate-x-[95%] -translate-y-1/2 -rotate-12">
                  <PlayingCard card={A} dealt={false} />
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-[50%] -translate-y-[56%]">
                  <PlayingCard card={K} dealt={false} />
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-[5%] -translate-y-1/2 rotate-12">
                  <PlayingCard card={Q} dealt={false} />
                </div>
              </div>
            }
          />
          <ModeCard
            to="/rush"
            delay={0.18}
            tag="Le jeu"
            title="Rush"
            primary
            text="500 € de départ. Jouez, montez, et encaissez quand vous voulez : votre score, c’est ce que vous repartez avec. Tombez à zéro et c’est zéro. Tout l’art est de savoir s’arrêter."
            points={['500 € de départ', 'Encaisser à tout moment', 'Classement local et titres']}
            cta="Lancer un Rush"
            stat={best !== undefined ? `Meilleur score : ${formatEuro(best)}` : 'Pas encore de score'}
            visual={
              <div className="relative grid h-full w-full place-items-center">
                <div className="relative h-[120px] w-[200px]">
                  {[500, 100, 100, 50, 25].map((v, i) => (
                    <div key={i} className="absolute left-[30px]" style={{ bottom: i * 7 }}>
                      <Chip value={v as 500} size={70} />
                    </div>
                  ))}
                  {[100, 50, 10].map((v, i) => (
                    <div key={`b${i}`} className="absolute left-[110px]" style={{ bottom: i * 7 }}>
                      <Chip value={v as 100} size={70} />
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        <section className="mt-10" aria-labelledby="plus">
          <h2 id="plus" className="mb-3 text-sm font-bold text-fg-2">
            Pour aller plus loin
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Tool to="/defi" icon={<IconCalendar size={18} />} title="Défi du jour" sub={daily ? `Fait : ${formatEuro(daily.score)}` : 'Même sabot pour tous'} />
            <Tool to="/quiz" icon={<IconBolt size={18} />} title="Quiz éclair" sub={quizBest ? `Record : ${quizBest}` : '3 s par situation'} />
            <Tool to="/comptage" icon={<IconBrain size={18} />} title="Comptage Hi-Lo" sub="Outil pédagogique" />
            <Tool to="/stats" icon={<IconTarget size={18} />} title="Heatmap" sub="Vos points faibles" />
            <Tool to="/stats#succes" icon={<IconTrophy size={18} />} title="Succès" sub="Badges à débloquer" />
            <Tool to="/regles" icon={<IconBook size={18} />} title="Règles" sub="Blackjack français" />
          </div>
        </section>
      </main>
    </div>
  );
}

function ModeCard(props: { to: string; tag: string; title: string; text: string; points: string[]; cta: string; stat: string; visual: ReactNode; primary?: boolean; delay: number }) {
  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: dur(0.6), delay: dur(props.delay), ease: [0.16, 1, 0.3, 1] }}>
      <Link
        to={props.to}
        className="group panel flex h-full flex-col overflow-hidden ring-1 ring-white/5 transition-all duration-300 hover:-translate-y-1 hover:ring-accent/40 hover:shadow-[0_20px_60px_-20px_rgba(31,224,122,0.35)]"
      >
        <div className="table-surface relative h-48 overflow-hidden rounded-none border-0 sm:h-56">
          <div className="absolute left-4 top-4 rounded-md bg-bg-0/70 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-fg-2">{props.tag}</div>
          <div className="h-full transition-transform duration-500 group-hover:scale-[1.04]">{props.visual}</div>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-3xl font-extrabold italic tracking-[-0.03em]">{props.title}</h2>
            <span className="tabular text-xs font-semibold text-fg-3">{props.stat}</span>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{props.text}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {props.points.map((p) => (
              <li key={p} className="rounded-md bg-bg-3 px-2 py-1 text-xs font-semibold text-fg-2">
                {p}
              </li>
            ))}
          </ul>
          <span className={`btn mt-6 h-12 w-full text-base ${props.primary ? 'btn-primary' : 'btn-secondary'}`}>{props.cta} →</span>
        </div>
      </Link>
    </motion.div>
  );
}

function Tool({ to, icon, title, sub }: { to: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="panel group flex flex-col gap-2 p-3.5 transition-colors hover:bg-bg-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-bg-3 text-fg-2 transition-colors group-hover:bg-accent group-hover:text-accent-ink">{icon}</span>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs text-fg-3">{sub}</span>
    </Link>
  );
}
