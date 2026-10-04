# Sabot — blackjack français

Site de blackjack français jouable de bout en bout, 100 % statique. On joue contre un croupier simulé, et après chaque main le site indique si l'on a suivi la **stratégie de base**, explique pourquoi et montre les probabilités calculées sur la composition réelle du sabot.

- **Practice** : mises libres, aucune indication pendant la main, debrief détaillé à la fin de chaque main (verdict, explication, barres de probabilités, EV en €, coût de l'erreur, mini-grille du tableau), bouton « Rejouer la situation », filtres de situations (paires, souples, 12-16 contre un croupier fort, abandons, doublements, mes points faibles), jusqu'à 3 mains en parallèle.
- **Rush** : 500 € de départ, jetons de 5 à 500 €, table de 5 à 1 000 €. On peut encaisser entre deux mains. Le site garde le record de la session et trace la courbe de bankroll. Les verdicts apparaissent en pastilles discrètes. L'écran de fin récapitule la partie, avec classement local, titres et partage d'image.
- **Autres outils** : défi du jour (même sabot pour tous via une graine dérivée de la date), quiz éclair (3 s par situation), entraînement au comptage Hi-Lo, statistiques et heatmap personnelle, succès, règles, tutoriel de 60 s, réglages, export/import JSON.

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # tests Vitest
npm run coverage     # couverture (seuils : 90 % lignes/fonctions/instructions, 85 % branches)
npm run build        # build de production dans dist/
npm run preview      # sert dist/
```

Node 20.19+ requis (Vite 8).

## Déployer sur GitHub Pages

1. Créez un dépôt GitHub (par exemple `sabot`) et poussez-y le contenu de ce dossier, sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. (Facultatif) **Settings → Secrets and variables → Actions → Variables** : créez `VITE_BASE` = `/nom-du-repo/`.
   Sans cette variable, le workflow utilise automatiquement `/<nom-du-repo>/`. Pour un site utilisateur (`<user>.github.io`), mettez `VITE_BASE` = `/`.
4. Poussez sur `main`. Le workflow `.github/workflows/deploy.yml` enchaîne `npm ci`, les tests avec couverture, le build, puis `actions/deploy-pages`. **Si un test échoue, rien n'est déployé.**
5. Le site est publié sur `https://<user>.github.io/<repo>/`.

Pour vérifier localement le comportement sous sous-chemin :

```bash
VITE_BASE=/sabot/ npm run build
VITE_BASE=/sabot/ npm run preview   # http://localhost:4173/sabot/
```

Points liés au sous-chemin :

- `base` est lu depuis `VITE_BASE` dans `vite.config.ts`, avec `/` par défaut.
- **HashRouter** (`/#/practice`) évite les 404 au rafraîchissement. Un `404.html` est aussi généré au build : il redirige vers l'application en conservant la route demandée.
- Manifest PWA (`start_url`, `scope`), service worker (Workbox) et Web Worker des probabilités respectent le base path. Vérifié sous `/sabot-dor/` avec `vite build && vite preview` : SW actif avec la portée `/sabot-dor/` et worker fonctionnel.
- Polices embarquées (`@fontsource-variable`, Inter et JetBrains Mono), aucune requête CDN. Les sons sont synthétisés en WebAudio : 0 octet de fichier audio, fonctionne hors ligne.
- Build ≈ 1 Mo, précache PWA ≈ 0,8 Mo. Chaque page est chargée à la demande (code splitting par route et par mode).

## Architecture

```
src/
  engine/        moteur pur et testé
    cards.ts       cartes, valeurs, libellés
    rng.ts         PRNG déterministe (mulberry32), graine du jour
    shoe.ts        sabot immuable, Fisher-Yates, carte de coupe, composition, forçage de situations
    hand.ts        totaux durs/souples, blackjack, paires
    rules.ts       règles paramétrables (+ valeurs par défaut)
    game.ts        machine d'état d'un coup : donne, assurance, actions, croupier, règlement
    hilo.ts        comptage Hi-Lo
  strategy/
    strategy.ts    LE TABLEAU (source de vérité, données typées)
    advisor.ts     lecture paire → souple → dur, replis (D→T, Ab→T/R, astérisque)
    explanations.ts dictionnaire pédagogique par famille de situations
    evaluate.ts    verdict de chaque décision (famille, case, explication)
  probability/
    ev.ts          distribution exacte du croupier + EV rester/tirer/doubler/splitter/abandonner, assurance
    worker.ts      Web Worker
    client.ts      appel asynchrone + cache
  store/         Zustand (localStorage) : réglages, statistiques/succès, contrôleur de table
  components/    cartes et jetons SVG sur-mesure, table, debrief, tableau, graphiques, UI
  pages/         Accueil, Play (Practice / Rush / Défi), Stats, Réglages, Règles, Quiz, Comptage, Tutoriel
reference/       image du tableau (à déposer) + rendu SVG de la transcription
```

Le moteur est fait de **fonctions pures** : chaque action renvoie un nouvel état. Le contrôleur (`store/table.ts`) les enchaîne avec les temporisations d'animation. Le sabot est immuable (seule la position avance), ce qui rend « Rejouer cette situation » trivial et exact.

### Tests

- `strategy.test.ts` vérifie **chacune des 360 cases** du tableau contre une transcription indépendante, puis le conseiller sur chaque case, avec toutes les options et en replis.
- `game.test.ts` couvre les flux : blackjack naturel (3:2, égalité, contre As/10), assurance (prise/refusée, payée 2:1), brûler, push, croupier jusqu'à 17 (reste sur 17 souple), doubler (y compris sur blackjack croupier), split + double + blackjack croupier (perte totale et option « mise initiale »), As splittés, re-split, DAS, abandon, mains multiples, budget.
- `ev.test.ts` valide les probabilités : distributions qui somment à 1, blackjack croupier = 96/311, ~42 % de bust avec un 6, ordres d'EV attendus, assurance négative.

Couverture actuelle : ≈ 99 % sur `engine/`, `strategy/` et `probability/` (807 tests).

### Qualité

Lighthouse (build de production servi sous `/sabot-dor/`, mesures locales) : **performance 95-96, accessibilité 100, bonnes pratiques 100** sur l'accueil, la Practice et les statistiques.
Le jeu se joue entièrement au clavier : H tirer, S rester, D doubler, P partager, R abandonner, O/N assurance, Espace distribuer. Les focus sont visibles, `prefers-reduced-motion` est respecté et un mode daltonien est disponible.

## Règles retenues (par défaut)

| Règle | Valeur |
|---|---|
| Sabot | 6 jeux (312 cartes), Fisher-Yates, coupe à 75 % (réglable 50-90 %) |
| Carte cachée | **aucune** : 2e carte du croupier après le joueur |
| Blackjack du croupier | toutes les mises perdues (option : mise initiale seulement) |
| Croupier | tire jusqu'à 17, reste sur tous les 17 |
| Blackjack | 3:2 ; égalité = push |
| Doubler | 2 premières cartes, tout total ; après split : oui (réglable) |
| Split | paires de même valeur (10/V/D/R se valent), 1 split (réglable jusqu'à 4 mains) ; As : une carte chacun, pas de re-split |
| Abandon | autorisé (réglable), 2 premières cartes, hors split |
| Assurance | proposée sur As, coûte ½ mise, paie 2:1 |

Voir `LIVRAISON.md` pour la liste des choix faits sur les règles ambiguës.
