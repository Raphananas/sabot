import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';

interface Props {
  title?: string;
  right?: ReactNode;
  center?: ReactNode;
}

export function TopBar({ title, right, center }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg-2/95 backdrop-blur supports-[backdrop-filter]:bg-bg-2/80">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="sabot — retour à l’accueil" className="rounded-md">
            <Logo size="sm" />
          </Link>
          {title && <span className="hidden rounded-md bg-bg-3 px-2 py-1 text-xs font-semibold text-fg-2 sm:inline">{title}</span>}
        </div>
        {center && <div className="flex min-w-0 flex-1 justify-center">{center}</div>}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">{right}</div>
      </div>
    </header>
  );
}

export function IconButton({ label, onClick, children, active }: { label: string; onClick?: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid h-10 w-10 place-items-center rounded-lg transition-colors ${
        active ? 'bg-bg-4 text-fg' : 'text-fg-2 hover:bg-bg-3 hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}
