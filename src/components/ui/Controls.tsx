import type { ReactNode } from 'react';

export function Toggle({ checked, onChange, label, desc, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: ReactNode; id: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-fg-3">{desc}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-bg-4'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="py-3">
      <div className="mb-2 text-sm font-semibold">{label}</div>
      <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-lg bg-bg-0 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`h-9 rounded-md px-2 text-xs font-semibold transition-colors sm:text-sm ${value === o.value ? 'bg-bg-4 text-fg' : 'text-fg-3 hover:text-fg'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="panel p-4 sm:p-5" aria-labelledby={id ? `${id}-t` : undefined}>
      <h2 id={id ? `${id}-t` : undefined} className="mb-1 text-base font-bold">
        {title}
      </h2>
      <div className="divide-y divide-white/5">{children}</div>
    </section>
  );
}

export function PageShell({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto px-4 pb-16 pt-6 sm:px-6 sm:pt-10 ${wide ? 'max-w-[1200px]' : 'max-w-3xl'}`}>
      <h1 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      {children}
    </main>
  );
}
