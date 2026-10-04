import type { Advice } from './advisor';

/**
 * Dictionnaire pédagogique : une explication courte par famille de situations.
 * `up` = valeur visible du croupier (1 = As).
 */

const upLabel = (up: number) => (up === 1 ? 'un As' : up === 10 ? 'un 10' : `un ${up}`);
const weak = (up: number) => up >= 2 && up <= 6;

export function explain(a: Advice, up: number): string {
  const U = upLabel(up);
  if (a.offTable) {
    if (a.action === 'stand') return 'La main est déjà terminée : aucune décision à prendre.';
    return 'Total très bas, absent du tableau : aucun risque de dépasser 21, on tire.';
  }
  if (a.starApplied) {
    return 'Exception du tableau (astérisque) : avec un 16 en trois cartes ou plus, les petites cartes qui vous sauveraient sont déjà sorties. Rester devient légèrement meilleur que tirer.';
  }

  // Abandon
  if (a.code === 'AbT' || a.code === 'AbR') {
    if (a.action === 'surrender') {
      return `Main très défavorable contre ${U} : vous perdez en moyenne plus de 50 % de la mise en la jouant. L’abandon vous rend la moitié de la mise, c’est le moindre mal.`;
    }
    if (a.code === 'AbR') return `L’abandon n’étant pas permis, on reste : tirer sur 17 dur fait dépasser plus d’une fois sur deux.`;
    return `L’abandon n’étant pas permis, on tire : contre ${U}, rester sur ce total perd trop souvent.`;
  }

  if (a.table === 'pair') {
    const v = a.row;
    if (v === 1) {
      return a.action === 'split'
        ? 'Deux As font un 12 souple médiocre. Séparés, chaque As a environ 30 % de chances de recevoir un 10 et devient une main forte.'
        : 'Contre un As, sans carte cachée, le croupier peut encore faire blackjack et vous prendre les deux mises : on se contente de tirer.';
    }
    if (v === 10) return '20 est l’une des meilleures mains possibles : on ne la casse jamais pour deux mains incertaines.';
    if (v === 5) {
      return a.action === 'double'
        ? 'Une paire de 5 vaut 10 dur : c’est une excellente base pour doubler, bien meilleure que deux mains partant de 5.'
        : 'Une paire de 5 vaut 10 dur ; contre un 10 ou un As, on tire sans doubler.';
    }
    if (v === 9) {
      if (a.action === 'stand') {
        return up === 7
          ? 'Contre un 7, le croupier finit souvent à 17 : votre 18 le bat déjà, inutile de diviser.'
          : `Contre ${U}, 18 tient raisonnablement et splitter exposerait deux mises à un croupier fort.`;
      }
      return `18 est correct, mais deux mains partant de 9 rapportent davantage contre ${U}.`;
    }
    if (v === 8 && a.action === 'split') return '16 est la pire main du jeu. Deux mains partant de 8 ont de bien meilleures perspectives.';
    if (a.action === 'split') {
      return weak(up)
        ? `Contre une carte faible (${U}), le croupier risque de dépasser : on multiplie les mises en sa défaveur en splittant.`
        : `Contre ${U}, deux mains partant de ${v} sont plus rentables qu’un ${2 * v} difficile à jouer.`;
    }
    return `Contre ${U}, splitter des ${v} créerait deux mains faibles face à un croupier solide : on joue le total (${2 * v}).`;
  }

  if (a.table === 'soft') {
    const total = a.row + 11;
    if (a.action === 'double') {
      return `Main souple : l’As peut repasser à 1, une carte ne peut pas vous faire dépasser. Contre ${U}, carte faible, le croupier risque de sauter : on double.`;
    }
    if (a.code === 'D' && a.fallback) {
      return `Le tableau conseille de doubler ce ${total} souple ; doubler n’étant plus possible, la règle « D » s’applique : on tire.`;
    }
    if (a.action === 'stand') {
      return total >= 19
        ? `${total} souple est une main forte : on reste.`
        : `18 souple tient bien contre ${U} : rester est le choix le plus rentable.`;
    }
    return total === 18
      ? `18 souple perd en moyenne contre ${U}. L’As vous protège du dépassement : on tire pour améliorer.`
      : `${total} souple est trop faible pour gagner tel quel, et tirer est sans risque grâce à l’As.`;
  }

  // Totaux durs
  const t = a.row;
  if (a.action === 'double') {
    if (t === 11) return 'Avec 11, une carte valant 10 (la plus fréquente : 4 sur 13) donne 21. Vous êtes favori : on double la mise.';
    if (t === 10) return 'Avec 10, une carte valant 10 ou un As donne 20 ou 21 : vous êtes favori, on double.';
    return `Avec 9 contre ${U}, carte faible, le croupier risque de dépasser : doubler maximise le gain.`;
  }
  if (a.code === 'D' && a.fallback) return `Le tableau conseille de doubler ce ${t} ; avec plus de deux cartes ce n’est plus possible, on tire.`;
  if (t >= 10 && t <= 11 && a.action === 'hit') {
    return `Contre ${U}, sans carte cachée, le croupier peut encore faire blackjack et vous perdriez la mise doublée : on tire sans doubler.`;
  }
  if (t >= 17) return `${t} dur : tirer ferait dépasser trop souvent. On reste.`;
  if (t >= 12 && t <= 16) {
    if (a.action === 'stand') {
      return `Le croupier montre une carte faible (${U}) : il devra tirer et risque de dépasser. Inutile de prendre ce risque vous-même sur ${t}.`;
    }
    if (t === 12 && (up === 2 || up === 3)) {
      return `12 contre ${U} : seule une carte 10 vous fait dépasser, et le croupier dépasse moins souvent avec 2 ou 3. On tire.`;
    }
    return `Contre ${U}, le croupier termine souvent entre 17 et 21. Rester sur ${t} perd très souvent : on tente d’améliorer.`;
  }
  return `Avec ${t}, impossible de dépasser 21 en tirant une carte : on tire.`;
}

export const INSURANCE_EXPLANATION =
  'L’assurance paie 2 contre 1 : elle ne serait rentable que si plus d’une carte sur trois valait 10. Dans un sabot normal, c’est environ 30,8 % (96 sur 311) : à long terme elle coûte de l’argent. Sans comptage, on ne la prend jamais.';

export const NO_INSURANCE_EXPLANATION =
  'Bon réflexe : sans comptage des cartes, l’assurance est un pari perdant (≈ −7 % de la mise assurée).';
