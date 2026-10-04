// Rend le tableau de strategy.ts en SVG (reference/strategie-transcription.svg) pour comparaison visuelle avec l'image source.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HARD, PAIRS, SOFT, HARD_ROWS, PAIR_ROWS, SOFT_ROWS, DEALER_COL_LABELS, rowLabel, type Code } from '../src/strategy/strategy.ts';

const COLORS: Record<Code, [string, string]> = { R: ['#d62828', '#fff'], T: ['#2a9d4b', '#fff'], D: ['#2563eb', '#fff'], P: ['#c026d3', '#fff'], AbT: ['#ffffff', '#111'], AbR: ['#ffffff', '#111'] };
const C = 46, H = 26, L = 70;
let y = 20;
let out = '';
const section = (title: string, rows: readonly number[], data: Record<number, readonly Code[]>, kind: 'hard' | 'pair' | 'soft') => {
  out += `<text x="10" y="${y + 16}" font-size="16" font-weight="700" fill="#111">${title}</text>`;
  y += 26;
  DEALER_COL_LABELS.forEach((l, i) => (out += `<text x="${L + i * C + C / 2}" y="${y + 17}" text-anchor="middle" font-size="13" font-weight="700">${l}</text>`));
  y += H;
  for (const r of rows) {
    out += `<text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="13" font-weight="700">${rowLabel(kind, r)}</text>`;
    data[r].forEach((code, i) => {
      const [bg, fg] = COLORS[code];
      const star = kind === 'hard' && r === 16 && i === 8 ? '*' : '';
      out += `<rect x="${L + i * C}" y="${y}" width="${C - 2}" height="${H - 2}" fill="${bg}" stroke="#999"/><text x="${L + i * C + C / 2 - 1}" y="${y + 17}" text-anchor="middle" font-size="12" font-weight="700" fill="${fg}">${code}${star}</text>`;
    });
    y += H;
  }
  y += 16;
};
section('TOTAUX DURS', HARD_ROWS, HARD, 'hard');
section('PAIRES', PAIR_ROWS, PAIRS, 'pair');
section('TOTAUX SOUPLES', SOFT_ROWS, SOFT, 'soft');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L + 10 * C + 10}" height="${y}" font-family="Arial, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${out}</svg>`;
writeFileSync(fileURLToPath(new URL('../reference/strategie-transcription.svg', import.meta.url)), svg);
console.log('reference/strategie-transcription.svg écrit');
