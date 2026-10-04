import { Fragment } from 'react';
import { DEALER_COLS, DEALER_COL_LABELS, HARD, HARD_ROWS, PAIRS, PAIR_ROWS, SOFT, SOFT_ROWS, colIndex, isStar, rowLabel, type Code, type DealerCol, type TableKind } from '../../strategy/strategy';
import type { Counter } from '../../store/stats';

export const CODE_STYLE: Record<Code, { bg: string; fg: string; short: string }> = {
  R: { bg: 'var(--color-act-r)', fg: '#fff', short: 'R' },
  T: { bg: 'var(--color-act-t)', fg: '#04210f', short: 'T' },
  D: { bg: 'var(--color-act-d)', fg: '#fff', short: 'D' },
  P: { bg: 'var(--color-act-p)', fg: '#fff', short: 'P' },
  AbT: { bg: 'var(--color-act-ab)', fg: '#0f212e', short: 'AbT' },
  AbR: { bg: 'var(--color-act-ab)', fg: '#0f212e', short: 'AbR' },
};

export interface Highlight {
  table: TableKind;
  row: number;
  col: DealerCol;
}

interface Props {
  highlight?: Highlight | null;
  /** Heatmap : taux d'erreur par case (clé « table:row:col »). */
  heat?: Record<string, Counter> | null;
  compact?: boolean;
  only?: TableKind;
}

const SECTIONS: { table: TableKind; title: string; rows: readonly number[]; data: Record<number, readonly Code[]> }[] = [
  { table: 'hard', title: 'Totaux durs', rows: HARD_ROWS, data: HARD },
  { table: 'pair', title: 'Paires', rows: PAIR_ROWS, data: PAIRS },
  { table: 'soft', title: 'Totaux souples', rows: SOFT_ROWS, data: SOFT },
];

function heatColor(c: Counter | undefined): string {
  if (!c || c.n === 0) return 'var(--color-bg-3)';
  const rate = c.err / c.n;
  if (rate === 0) return 'color-mix(in srgb, var(--color-accent) 55%, var(--color-bg-3))';
  return `color-mix(in srgb, var(--color-danger) ${Math.round(25 + rate * 75)}%, var(--color-bg-3))`;
}

/** Tableau de stratégie coloré comme la référence (R rouge, T vert, D bleu, P magenta, Ab blanc). */
export function StrategyChart({ highlight, heat, compact, only }: Props) {
  const cell = compact ? 'h-5 text-[9px]' : 'h-7 text-[11px] sm:h-8 sm:text-xs';
  return (
    <div className="space-y-4">
      {SECTIONS.filter((s) => !only || s.table === only).map((sec) => (
        <section key={sec.table} aria-label={sec.title}>
          {!compact && <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-fg-2">{sec.title}</h3>}
          <div
            role="table"
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `${compact ? '34px' : '44px'} repeat(10, minmax(0, 1fr))` }}
          >
            <div role="columnheader" className="text-[10px] text-fg-3" />
            {DEALER_COL_LABELS.map((l, i) => {
              const lit = highlight && highlight.table === sec.table && colIndex(highlight.col) === i;
              return (
                <div
                  role="columnheader"
                  key={l}
                  className={`grid place-items-center rounded-sm font-bold ${compact ? 'text-[9px]' : 'text-[11px]'} ${lit ? 'bg-fg text-bg-1' : 'text-fg-2'}`}
                >
                  {l}
                </div>
              );
            })}
            {sec.rows.map((r) => {
              const rowLit = highlight && highlight.table === sec.table && highlight.row === r;
              return (
                <Fragment key={r}>
                  <div role="rowheader" className={`grid place-items-center rounded-sm font-bold ${compact ? 'text-[9px]' : 'text-[11px]'} ${rowLit ? 'bg-fg text-bg-1' : 'text-fg-2'}`}>
                    {rowLabel(sec.table, r)}
                  </div>
                  {DEALER_COLS.map((col) => {
                    const code = sec.data[r][colIndex(col)];
                    const st = CODE_STYLE[code];
                    const key = `${sec.table}:${r}:${col}`;
                    const isHi = highlight && highlight.table === sec.table && highlight.row === r && highlight.col === col;
                    const inCross = highlight && highlight.table === sec.table && (highlight.row === r || highlight.col === col);
                    const dimmed = highlight && !inCross;
                    const c = heat?.[key];
                    const star = isStar(sec.table, r, col);
                    return (
                      <div
                        role="cell"
                        key={col}
                        title={heat ? `${rowLabel(sec.table, r)} contre ${col === 1 ? 'A' : col} : ${c ? `${c.err} erreur(s) / ${c.n}` : 'jamais joué'}` : undefined}
                        className={`relative grid place-items-center rounded-[3px] font-bold transition-all ${cell} ${isHi ? 'z-10 scale-[1.25] ring-2 ring-fg shadow-lg' : ''}`}
                        style={{
                          background: heat ? heatColor(c) : st.bg,
                          color: heat ? '#fff' : st.fg,
                          opacity: dimmed ? 0.28 : 1,
                        }}
                      >
                        {st.short}
                        {star && <span className="absolute right-[1px] top-[-2px] text-[9px]">*</span>}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ChartLegend() {
  const items: [Code, string][] = [
    ['R', 'Rester'],
    ['T', 'Tirer'],
    ['D', 'Doubler (sinon tirer)'],
    ['P', 'Partager'],
    ['AbT', 'Abandon si permis, sinon tirer'],
    ['AbR', 'Abandon si permis, sinon rester'],
  ];
  return (
    <ul className="grid grid-cols-1 gap-1.5 text-xs text-fg-2 sm:grid-cols-2">
      {items.map(([c, l]) => (
        <li key={c} className="flex items-center gap-2">
          <span className="grid h-5 min-w-8 place-items-center rounded px-1 text-[10px] font-bold" style={{ background: CODE_STYLE[c].bg, color: CODE_STYLE[c].fg }}>
            {CODE_STYLE[c].short}
          </span>
          {l}
        </li>
      ))}
      <li className="flex items-center gap-2 sm:col-span-2">
        <span className="grid h-5 min-w-8 place-items-center rounded bg-bg-3 px-1 text-[10px] font-bold">*</span>
        16 contre 10 : abandon si permis, sinon tirer — mais rester si le 16 compte 3 cartes ou plus.
      </li>
    </ul>
  );
}
