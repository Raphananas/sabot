# Livraison : choix à valider

## Image du tableau

L'image `strategie.png` n'était pas jointe à la conversation et je ne l'ai pas trouvée sur le disque. **Déposez-la dans `reference/strategie.png`.**
La transcription fournie a été saisie dans `src/strategy/strategy.ts`. Elle est rendue telle quelle dans `reference/strategie-transcription.svg` (`node scripts/render-strategy.mts`) pour une comparaison visuelle case par case avec l'image.

## Incohérences possibles entre la transcription et la stratégie usuelle

1. **A-7 (18 souple) contre 3-6, « D » quand doubler est impossible.** La règle donnée (« D → Tirer ») fait tirer un 18 souple à 3 cartes contre 3 à 6. La stratégie usuelle note cette case « Ds » (doubler, sinon **rester**). J'ai appliqué la règle telle qu'écrite. Le debrief affichera alors une nuance EV (rester rapporte plus). À valider : si l'image porte « Ds », il suffit d'un code dédié.
2. **Cases P qui supposent le doublement après split** (4-4 contre 5-6, 2-2 / 3-3 contre 2-3, 6-6 contre 2). Elles ne sont optimales qu'avec DAS. Si l'on désactive DAS dans les réglages, le tableau reste appliqué tel quel (il n'existe qu'un seul tableau).
3. Les totaux **dur 4** (2-2 non splittable) et **souple 12** (A-A non splittable) sont absents du tableau. Repli : **Tirer**.

## Choix faits sur les règles ambiguës

**Lecture du tableau**
- Ordre paire → souple → dur. Si la case de la paire est « P » mais que le split est impossible (limite de splits, solde insuffisant en Rush), on lit le total souple ou dur. Si la case n'est pas « P » (5-5 = D, 10-10 = R, 8-8 contre 10 = AbT…), on garde la ligne des paires.
- **Astérisque** : seulement 16 contre 10. Avec 3 cartes ou plus, on reste. Avec 2 cartes, abandon si permis, sinon tirer. Un 16 à 3 cartes contre 9 ou As : tirer (l'abandon n'est plus possible).
- Une main souple à 3 cartes ou plus utilise la ligne A-x correspondante (A-2-4 → A-6).

**Abandon**
- Uniquement sur les 2 premières cartes de la main d'origine : ni après un split, ni après avoir tiré.
- Comme il n'y a pas de carte cachée, c'est de fait un abandon « précoce » : la moitié de la mise est rendue même si le croupier fait blackjack ensuite.

**Assurance**
- Une seule décision pour toutes les mains (multi-mains Practice). Elle coûte la moitié de la somme des mises initiales.
- Elle est aussi proposée quand le joueur a un blackjack (équivalent du « paiement égal »). La prendre compte comme une erreur dans tous les cas.

**Blackjack du croupier**
- Par défaut, toutes les mises encore en jeu sont perdues (doubles et splits).
- Option « mise initiale seulement » : la main d'origine perd sa mise de départ, et les doublements comme les mains issues d'un split sont remboursés. Une main déjà brûlée reste perdue, puisque le joueur a sauté avant le tirage du croupier.

**Déroulement du croupier**
- Il ne tire pas si toutes les mains ont sauté ou abandonné. Exception : une assurance à régler, auquel cas il tire sa 2e carte.
- Si seules des mains blackjack restent, il ne tire qu'avec un As ou un 10 visible, et une seule carte (vérification du blackjack). Sinon le blackjack est payé directement.

**Split**
- La 1re main reçoit sa 2e carte tout de suite. La 2e main la reçoit quand elle devient active.
- 21 après split n'est pas un blackjack (payé 1:1).
- Les 10, V, D et R se splittent entre eux (le tableau ne le conseille jamais).

**Sabot**
- Remélange à la fin du coup au cours duquel la carte de coupe est sortie.
- Si le sabot s'épuise en plein coup (pénétration à 90 % + 3 mains), les cartes qui ne sont pas sur la table sont remélangées.

**Multi-mains** : jusqu'à 3 mains en Practice, distribuées P1 P2 P3, croupier, P1 P2 P3.

**Situations forcées** : les cartes voulues sont déplacées en tête du sabot depuis le reste du sabot. La composition reste exacte. Une seule main est jouée.

## Choix produit

- **Mode indice supprimé** (votre demande du jour) : en Practice, aucune information pendant la main, tout est expliqué au debrief.
- **Rush** :
  - Le score est le solde encaissé ; à 0 €, le score est 0.
  - Si le solde passe sous la mise minimale (5 €) sans être nul, on peut encaisser le reste.
  - Limites de table : 5 à 1 000 €.
  - Titres selon le score : Ruiné < Novice < 500 € ≤ Joueur < 750 € ≤ Habile < 1 000 € ≤ Pro < 2 000 € ≤ High Roller < 5 000 € ≤ Légende du salon.
- **Défi du jour** : Rush de 25 mains maximum sur un sabot dont la graine dépend de la date locale. Le meilleur score du jour est conservé dans le classement local.
- **Probabilités** :
  - EV « tirer » = meilleure continuation (rester ou retirer), avec retrait exact des cartes tirées.
  - Le split est évalué sans re-split (approximation), avec DAS selon les réglages.
  - Coût de l'erreur = (EV conseillée − EV jouée) × mise de la main.
  - Quand l'EV exacte préfère une autre action que le tableau, le debrief l'affiche comme une **nuance**, sans changer le verdict.
- **Hi-Lo** : vrai compte = compte courant / nombre de jeux restants arrondi au demi-jeu.
- **Sons** : synthétisés en WebAudio, sans aucun fichier.
- **Nom et direction artistique** : « Sabot ». Interface sombre ardoise et accent vert, plate et moderne, inspirée de l'esthétique des casinos en ligne actuels, sans reprendre de marque existante.
