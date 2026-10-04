const euro0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1 250 € ; 7,50 € si non entier. */
export function formatEuro(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? euro0.format(rounded) : euro2.format(rounded);
}

/** Montant signé : +12,50 € / −8 €. */
export function formatSignedEuro(n: number): string {
  const r = Math.round(n * 100) / 100;
  if (r === 0) return formatEuro(0);
  return `${r > 0 ? '+' : '−'}${formatEuro(Math.abs(r))}`;
}

export function formatPct(p: number, digits = 1): string {
  return `${(p * 100).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
