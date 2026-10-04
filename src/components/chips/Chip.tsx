import { memo } from 'react';

export const CHIP_VALUES = [5, 10, 25, 50, 100, 500] as const;
export type ChipValue = (typeof CHIP_VALUES)[number] | 1000;

export const CHIP_COLORS: Record<ChipValue, { base: string; edge: string; text: string }> = {
  5: { base: '#e5334b', edge: '#ffffff', text: '#ffffff' },
  10: { base: '#3b82f6', edge: '#ffffff', text: '#ffffff' },
  25: { base: '#16a34a', edge: '#ffffff', text: '#ffffff' },
  50: { base: '#f59e0b', edge: '#ffffff', text: '#2a1700' },
  100: { base: '#1e2a35', edge: '#1fe07a', text: '#ffffff' },
  500: { base: '#8b5cf6', edge: '#ffffff', text: '#ffffff' },
  1000: { base: '#f8fafc', edge: '#0f212e', text: '#0f212e' },
};

const CIRC = 2 * Math.PI * 41;

function short(v: number) {
  return v >= 1000 ? `${v / 1000}K` : String(v);
}

/** Jeton plat moderne : disque, encoches de bord, valeur centrale. */
export const ChipSvg = memo(function ChipSvg({ value }: { value: ChipValue }) {
  const c = CHIP_COLORS[value];
  const seg = CIRC / 6;
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill={c.base} />
      <circle cx="50" cy="50" r="41" fill="none" stroke={c.edge} strokeWidth="9" strokeDasharray={`${seg * 0.32} ${seg * 0.68}`} strokeOpacity="0.9" />
      <circle cx="50" cy="50" r="31" fill={c.base} stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="'Inter Variable', Inter, sans-serif"
        fontWeight={800}
        fontSize={value >= 100 ? 22 : 25}
        letterSpacing="-1"
        fill={c.text}
      >
        {short(value)}
      </text>
    </svg>
  );
});

export function Chip({ value, size = 48, className = '' }: { value: ChipValue; size?: number | string; className?: string }) {
  return (
    <div className={`chip-shadow ${className}`} style={{ width: size, height: size }}>
      <ChipSvg value={value} />
    </div>
  );
}

/** Décompose un montant en jetons (plus gros en bas de la pile). */
export function breakdown(amount: number, max = 12): ChipValue[] {
  const values: ChipValue[] = [1000, 500, 100, 50, 25, 10, 5];
  const out: ChipValue[] = [];
  let rest = Math.round(amount);
  for (const v of values) {
    while (rest >= v && out.length < max) {
      out.push(v);
      rest -= v;
    }
  }
  return out;
}
