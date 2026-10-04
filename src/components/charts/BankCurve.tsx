import { motion } from 'framer-motion';
import { useId } from 'react';
import { dur } from '../../store/settings';
import { formatEuro } from '../../lib/format';

interface Point {
  hand: number;
  bankroll: number;
}

/** Courbe de bankroll main après main (SVG). */
export function BankCurve({ points, height = 120, start, showAxis = false, peakHand }: { points: Point[]; height?: number; start?: number; showAxis?: boolean; peakHand?: number }) {
  const id = useId().replace(/:/g, '');
  const W = 600;
  const H = height;
  const pad = showAxis ? 26 : 6;
  if (points.length < 2) {
    return <div className="grid place-items-center text-xs text-fg-3" style={{ height }}>La courbe apparaîtra après la première main.</div>;
  }
  const xs = points.map((p) => p.hand);
  const ys = points.map((p) => p.bankroll);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, start ?? Infinity) * 0.97;
  const maxY = Math.max(...ys, start ?? -Infinity) * 1.03 + 1;
  const x = (v: number) => pad + ((v - minX) / Math.max(1, maxX - minX)) * (W - pad - 6);
  const y = (v: number) => 6 + (1 - (v - minY) / Math.max(1, maxY - minY)) * (H - 12 - (showAxis ? 10 : 0));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.hand).toFixed(1)} ${y(p.bankroll).toFixed(1)}`).join(' ');
  const area = `${d} L${x(maxX)} ${H} L${x(minX)} ${H} Z`;
  const last = points[points.length - 1];
  const up = start === undefined || last.bankroll >= start;
  const color = up ? 'var(--color-accent)' : 'var(--color-danger)';
  const peak = peakHand !== undefined ? points.find((p) => p.hand === peakHand) : undefined;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height }} role="img" aria-label={`Évolution de la bankroll : ${formatEuro(points[0].bankroll)} → ${formatEuro(last.bankroll)}`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {start !== undefined && <line x1={pad} x2={W} y1={y(start)} y2={y(start)} stroke="#fff" strokeOpacity="0.12" strokeDasharray="4 4" />}
      {showAxis && (
        <>
          <text x={0} y={y(Math.max(...ys)) + 4} fontSize="10" fill="var(--color-fg-3)">{formatEuro(Math.max(...ys))}</text>
          <text x={0} y={y(Math.min(...ys))} fontSize="10" fill="var(--color-fg-3)">{formatEuro(Math.min(...ys))}</text>
        </>
      )}
      <path d={area} fill={`url(#g${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur(0.8) }} />
      {peak && (
        <g>
          <circle cx={x(peak.hand)} cy={y(peak.bankroll)} r="5" fill="var(--color-warn)" />
          <text x={Math.min(W - 70, x(peak.hand) + 8)} y={Math.max(12, y(peak.bankroll) - 6)} fontSize="11" fontWeight="700" fill="var(--color-warn)">Pic {formatEuro(peak.bankroll)}</text>
        </g>
      )}
      <circle cx={x(last.hand)} cy={y(last.bankroll)} r="4" fill={color} />
    </svg>
  );
}
