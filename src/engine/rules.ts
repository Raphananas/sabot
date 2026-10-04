/** Règles paramétrables du blackjack français. */
export interface Rules {
  /** Nombre de jeux de 52 cartes dans le sabot. */
  decks: number;
  /** Position de la carte de coupe (fraction du sabot distribuée avant remélange). */
  penetration: number;
  /** Abandon (surrender) autorisé sur les deux premières cartes. */
  surrender: boolean;
  /** Doubler après un split. */
  doubleAfterSplit: boolean;
  /** Nombre maximum de mains issues de splits (2 = un seul split). */
  maxSplitHands: number;
  /** Sur blackjack du croupier : ne perdre que la mise initiale (au lieu de toutes les mises). */
  dealerBjLosesOnlyOriginal: boolean;
  /** Paiement du blackjack naturel (1.5 = 3:2). */
  blackjackPayout: number;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  penetration: 0.75,
  surrender: true,
  doubleAfterSplit: true,
  maxSplitHands: 2,
  dealerBjLosesOnlyOriginal: false,
  blackjackPayout: 1.5,
};
