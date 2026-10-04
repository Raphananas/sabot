import type { Action } from '../../engine/game';

export const ACTION_META: Record<Action, { label: string; key: string; color: string }> = {
  hit: { label: 'Tirer', key: 'H', color: 'var(--color-act-t)' },
  stand: { label: 'Rester', key: 'S', color: 'var(--color-act-r)' },
  double: { label: 'Doubler', key: 'D', color: 'var(--color-act-d)' },
  split: { label: 'Partager', key: 'P', color: 'var(--color-act-p)' },
  surrender: { label: 'Abandonner', key: 'R', color: 'var(--color-act-ab)' },
};

const ORDER: Action[] = ['hit', 'stand', 'split', 'double'];

interface Props {
  available: Partial<Record<Action, boolean>>;
  onAction: (a: Action) => void;
  disabled?: boolean;
}

function Glyph({ a }: { a: Action }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (a) {
    case 'hit':
      return <svg {...common}><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M12 9v6M9 12h6" /></svg>;
    case 'stand':
      return <svg {...common}><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 15a1.5 1.5 0 0 1 2.4-1.8L8 15" /></svg>;
    case 'split':
      return <svg {...common}><rect x="2.5" y="5" width="8" height="14" rx="1.5" /><rect x="13.5" y="5" width="8" height="14" rx="1.5" /></svg>;
    case 'double':
      return <svg {...common}><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9.5" /></svg>;
    case 'surrender':
      return <svg {...common}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
  }
}

/** Boutons d'action (style plat). Aucun indice : le joueur décide seul. */
export function ActionBar({ available, onAction, disabled }: Props) {
  return (
    <div role="toolbar" aria-label="Actions de jeu" className="grid grid-cols-2 gap-2">
      {ORDER.map((a) => (
        <ActionButton key={a} a={a} enabled={!disabled && !!available[a]} onAction={onAction} />
      ))}
      <div className="col-span-2">
        <ActionButton a="surrender" enabled={!disabled && !!available.surrender} onAction={onAction} />
      </div>
    </div>
  );
}

function ActionButton({ a, enabled, onAction }: { a: Action; enabled: boolean; onAction: (a: Action) => void }) {
  const m = ACTION_META[a];
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onAction(a)}
      aria-keyshortcuts={m.key}
      aria-label={`${m.label} (touche ${m.key})`}
      className="btn btn-secondary h-12 w-full justify-between px-3.5 text-sm"
    >
      <span className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
          <Glyph a={a} />
        </span>
        {m.label}
      </span>
      <kbd className="hidden rounded bg-bg-1/60 px-1.5 py-0.5 font-mono text-[11px] text-fg-3 sm:inline">{m.key}</kbd>
    </button>
  );
}
