import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { PageShell } from '../components/ui/Controls';
import { StrategyChart, ChartLegend } from '../components/strategy/StrategyChart';
import { useSettings } from '../store/settings';
import type { ReactNode } from 'react';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}

export default function Rules() {
  const r = useSettings((s) => s.rules);
  return (
    <div className="min-h-dvh bg-bg-1">
      <TopBar title="Règles" />
      <PageShell title="Le blackjack français">
        <div className="space-y-4">
          <Block title="Le but">
            <p>Battre le croupier en s’approchant le plus possible de 21 sans le dépasser. Les cartes de 2 à 9 valent leur valeur, les 10, valets, dames et rois valent 10, l’As vaut 1 ou 11. Une main avec un As compté 11 est dite <b className="text-fg">souple</b> (elle ne peut pas sauter en tirant une carte) ; sinon elle est <b className="text-fg">dure</b>.</p>
          </Block>
          <Block title="Le matériel">
            <p>Sabot de {r.decks} jeux de 52 cartes ({r.decks * 52} cartes), mélangés à la main (Fisher-Yates). Une carte de coupe est placée à environ {Math.round(r.penetration * 100)} % : quand elle sort, on termine le coup puis on remélange.</p>
          </Block>
          <Block title="La particularité française : pas de carte cachée">
            <p>Le croupier ne reçoit qu’<b className="text-fg">une seule carte</b> au départ. Sa seconde carte n’est tirée qu’une fois que vous avez fini de jouer.</p>
            <p>Conséquence : s’il fait blackjack à ce moment-là, vous perdez <b className="text-fg">toutes vos mises</b>, doublements et splits compris{r.dealerBjLosesOnlyOriginal ? ' (option activée dans vos réglages : vous ne perdez que la mise initiale)' : ''}. C’est pourquoi la stratégie française évite de doubler ou de splitter contre un 10 ou un As.</p>
          </Block>
          <Block title="Le croupier">
            <p>Il tire jusqu’à 17 et reste sur tous les 17, y compris 17 souple (As + 6). Il n’a aucun choix.</p>
          </Block>
          <Block title="Vos options">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><b className="text-fg">Tirer</b> une carte, autant de fois que vous voulez.</li>
              <li><b className="text-fg">Rester</b> : vous gardez votre total.</li>
              <li><b className="text-fg">Doubler</b> sur vos deux premières cartes, quel que soit le total : la mise double et vous recevez une seule carte.</li>
              <li><b className="text-fg">Partager</b> (splitter) une paire de même valeur (10, V, D, R se valent) en deux mains. {r.maxSplitHands === 2 ? 'Un seul split.' : `Jusqu’à ${r.maxSplitHands} mains.`} Après un split d’As, une seule carte par As et pas de nouveau split. Doubler après un split : {r.doubleAfterSplit ? 'autorisé' : 'interdit'}. Un 21 obtenu après un split n’est pas un blackjack.</li>
              <li><b className="text-fg">Abandonner</b> {r.surrender ? '(autorisé)' : '(désactivé dans vos réglages)'} sur les deux premières cartes : vous récupérez la moitié de la mise.</li>
              <li><b className="text-fg">Assurance</b> : proposée quand le croupier montre un As. Elle coûte la moitié de la mise et paie 2 contre 1 s’il fait blackjack. La stratégie de base dit de ne jamais la prendre.</li>
            </ul>
          </Block>
          <Block title="Paiements">
            <ul className="space-y-1">
              <li>Blackjack naturel (As + 10 en deux cartes) : <b className="text-fg">3 contre 2</b></li>
              <li>Main gagnante : <b className="text-fg">1 contre 1</b></li>
              <li>Égalité : mise rendue (push)</li>
              <li>Assurance : <b className="text-fg">2 contre 1</b></li>
            </ul>
          </Block>
          <section className="panel p-5">
            <h2 className="mb-3 text-lg font-bold">La stratégie de base</h2>
            <p className="mb-4 text-[15px] text-fg-2">Lecture : d’abord la ligne des paires, puis les totaux souples, puis les totaux durs. Colonne = carte visible du croupier.</p>
            <div className="mb-4">
              <ChartLegend />
            </div>
            <StrategyChart />
          </section>
          <div className="flex flex-wrap gap-2">
            <Link to="/tutoriel" className="btn btn-secondary h-11 px-5">
              Tutoriel en 60 s
            </Link>
            <Link to="/practice" className="btn btn-primary h-11 px-5">
              S’entraîner
            </Link>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
