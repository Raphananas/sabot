export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-hand', title: 'Première donne', desc: 'Jouer sa première main.', icon: '🂠' },
  { id: 'hands-100', title: 'Habitué', desc: 'Jouer 100 mains.', icon: '💯' },
  { id: 'hands-1000', title: 'Pilier de salon', desc: 'Jouer 1 000 mains.', icon: '🏛' },
  { id: 'perfect-10', title: 'Sans faute', desc: '10 mains parfaites d’affilée.', icon: '✦' },
  { id: 'perfect-50', title: 'Métronome', desc: '50 mains parfaites d’affilée.', icon: '⏱' },
  { id: 'session-zero', title: 'Session immaculée', desc: '0 erreur sur une session d’au moins 20 mains.', icon: '◎' },
  { id: 'blackjack', title: 'Vingt-et-un', desc: 'Obtenir un blackjack naturel.', icon: '♠' },
  { id: 'no-insurance-10', title: 'Pas d’assurance', desc: 'Refuser l’assurance 10 fois.', icon: '☂' },
  { id: 'rush-1000', title: 'Premier millier', desc: 'Atteindre 1 000 € en Rush.', icon: '€' },
  { id: 'rush-2500', title: 'High Roller', desc: 'Atteindre 2 500 € en Rush.', icon: '♛' },
  { id: 'rush-peak', title: 'Au sommet', desc: 'Encaisser au pic de sa session Rush (au-dessus de 500 €).', icon: '⛰' },
  { id: 'daily', title: 'Rendez-vous', desc: 'Terminer un défi du jour.', icon: '📅' },
  { id: 'quiz-10', title: 'Réflexes', desc: 'Série de 10 au quiz éclair.', icon: '⚡' },
  { id: 'quiz-30', title: 'Automatismes', desc: 'Série de 30 au quiz éclair.', icon: '🧠' },
  { id: 'counter', title: 'Compteur', desc: 'Réussir un entraînement de comptage Hi-Lo.', icon: '±' },
  { id: 'scholar', title: 'Érudit', desc: '95 % de précision sur au moins 200 décisions.', icon: '🎓' },
];
