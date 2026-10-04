import { useRef, useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { PageShell, Section, Segmented, Toggle } from '../components/ui/Controls';
import { useSettings, type AnimSpeed, type Theme } from '../store/settings';
import { useStats } from '../store/stats';
import { exportData, importFile } from '../lib/backup';
import { DEFAULT_RULES } from '../engine/rules';

export default function Settings() {
  const s = useSettings();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const r = s.rules;
  return (
    <div className="min-h-dvh bg-bg-1">
      <TopBar title="Réglages" />
      <PageShell title="Réglages">
        <div className="space-y-4">
          <Section title="Règles de la table">
            <Toggle id="surr" label="Abandon (surrender)" desc="Rendre la moitié de la mise sur les deux premières cartes. Désactivé, le tableau applique « sinon tirer / sinon rester »." checked={r.surrender} onChange={(v) => s.setRules({ surrender: v })} />
            <Toggle id="das" label="Doubler après un split" checked={r.doubleAfterSplit} onChange={(v) => s.setRules({ doubleAfterSplit: v })} />
            <Segmented
              label="Splits (nombre de mains maximum)"
              value={r.maxSplitHands}
              onChange={(v) => s.setRules({ maxSplitHands: v })}
              options={[
                { value: 2, label: '1 split' },
                { value: 3, label: '3 mains' },
                { value: 4, label: '4 mains' },
              ]}
            />
            <Toggle
              id="orig"
              label="Blackjack du croupier : ne perdre que la mise initiale"
              desc="Par défaut (règle française), toutes les mises sont perdues, doubles et splits compris."
              checked={r.dealerBjLosesOnlyOriginal}
              onChange={(v) => s.setRules({ dealerBjLosesOnlyOriginal: v })}
            />
            <div className="py-3">
              <label htmlFor="pen" className="flex items-baseline justify-between text-sm font-semibold">
                Pénétration (carte de coupe) <span className="tabular text-fg-2">{Math.round(r.penetration * 100)} %</span>
              </label>
              <input id="pen" type="range" min={50} max={90} step={5} value={Math.round(r.penetration * 100)} onChange={(e) => s.setRules({ penetration: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[var(--color-accent)]" />
              <p className="mt-1 text-xs text-fg-3">Pris en compte au prochain mélange du sabot.</p>
            </div>
            <div className="py-3">
              <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={() => s.setRules(DEFAULT_RULES)}>
                Rétablir les règles par défaut
              </button>
            </div>
          </Section>

          <Section title="Affichage">
            <Segmented<Theme>
              label="Thème de la table"
              value={s.theme}
              onChange={(v) => s.set({ theme: v })}
              options={[
                { value: 'minuit', label: 'Minuit' },
                { value: 'emeraude', label: 'Émeraude' },
                { value: 'violet', label: 'Violet' },
              ]}
            />
            <Toggle id="cvd" label="Mode daltonien" desc="Palette Okabe-Ito pour les actions et les résultats ; les lettres restent toujours affichées." checked={s.colorblind} onChange={(v) => s.set({ colorblind: v })} />
            <Toggle id="shoe" label="Composition du sabot" desc="Cartes restantes par valeur (clic sur le sabot)." checked={s.showShoe} onChange={(v) => s.set({ showShoe: v })} />
            <Toggle id="count" label="Compteur Hi-Lo" desc="Compte courant et vrai compte affichés sur la table (outil pédagogique)." checked={s.showCount} onChange={(v) => s.set({ showCount: v })} />
          </Section>

          <Section title="Animations et son">
            <Segmented<AnimSpeed>
              label="Vitesse d’animation"
              value={s.animSpeed}
              onChange={(v) => s.set({ animSpeed: v })}
              options={[
                { value: 'lente', label: 'Lente' },
                { value: 'normale', label: 'Normale' },
                { value: 'rapide', label: 'Rapide' },
                { value: 'eclair', label: 'Éclair' },
              ]}
            />
            <Toggle id="rm" label="Réduire les animations" desc="Respecte aussi automatiquement le réglage système « réduire les animations »." checked={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
            <Toggle id="snd" label="Sons" checked={s.sound} onChange={(v) => s.set({ sound: v })} />
            <div className="py-3">
              <label htmlFor="vol" className="flex items-baseline justify-between text-sm font-semibold">
                Volume <span className="tabular text-fg-2">{Math.round(s.volume * 100)} %</span>
              </label>
              <input id="vol" type="range" min={0} max={100} value={Math.round(s.volume * 100)} onChange={(e) => s.set({ volume: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[var(--color-accent)]" disabled={!s.sound} />
            </div>
          </Section>

          <Section title="Données">
            <div className="flex flex-wrap gap-2 py-3">
              <button type="button" className="btn btn-secondary h-10 px-4 text-sm" onClick={exportData}>
                Exporter (JSON)
              </button>
              <button type="button" className="btn btn-secondary h-10 px-4 text-sm" onClick={() => file.current?.click()}>
                Importer…
              </button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setMsg(await importFile(f));
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="btn h-10 bg-danger/15 px-4 text-sm text-danger hover:bg-danger/25"
                onClick={() => {
                  if (window.confirm('Effacer toutes les statistiques, records et succès ? Cette action est définitive.')) {
                    useStats.getState().resetAll();
                    setMsg('Statistiques réinitialisées.');
                  }
                }}
              >
                Tout réinitialiser
              </button>
            </div>
            {msg && (
              <p className="py-2 text-sm text-fg-2" role="status">
                {msg}
              </p>
            )}
            <p className="py-3 text-xs text-fg-3">Tout reste dans ce navigateur (localStorage) : aucun compte, aucun serveur.</p>
          </Section>
        </div>
      </PageShell>
    </div>
  );
}
