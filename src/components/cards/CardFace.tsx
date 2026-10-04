import { memo } from 'react';
import { RANK_LABELS, isRed, type Rank, type Suit } from '../../engine/cards';

const W = 250;
const H = 350;

/** Face de carte épurée : grand index en haut à gauche, grande enseigne en bas à droite. */
export const CardFace = memo(function CardFace({ rank, suit }: { rank: Rank; suit: Suit }) {
  const color = isRed(suit) ? 'var(--suit-red)' : 'var(--suit-black)';
  const label = RANK_LABELS[rank];
  const wide = label.length > 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden="true">
      <rect x={0} y={0} width={W} height={H} rx={22} fill="#ffffff" />
      <rect x={0.75} y={0.75} width={W - 1.5} height={H - 1.5} rx={21} fill="none" stroke="#000" strokeOpacity={0.08} strokeWidth={1.5} />
      <g fill={color}>
        <text
          x={wide ? 20 : 28}
          y={104}
          fontFamily="'Inter Variable', Inter, sans-serif"
          fontWeight={800}
          fontSize={wide ? 92 : 104}
          letterSpacing={wide ? -8 : -2}
        >
          {label}
        </text>
        <use href={`#suit-${suit}`} x={26} y={124} width={62} height={62} />
        <use href={`#suit-${suit}`} x={118} y={206} width={110} height={110} opacity={0.95} />
      </g>
    </svg>
  );
});

export const CardBack = memo(function CardBack() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden="true">
      <rect x={0} y={0} width={W} height={H} rx={22} fill="url(#back-grad)" />
      <rect x={0} y={0} width={W} height={H} rx={22} fill="url(#back-lines)" />
      <rect x={14} y={14} width={W - 28} height={H - 28} rx={14} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={2} />
      <g transform={`translate(${W / 2 - 34} ${H / 2 - 34})`}>
        <rect width={68} height={68} rx={18} fill="var(--color-accent)" />
        <use href="#suit-S" x={14} y={14} width={40} height={40} fill="var(--color-accent-ink)" />
      </g>
    </svg>
  );
});
