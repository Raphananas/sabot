import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dur } from '../../store/settings';
import { IconClose } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  side?: 'right' | 'left';
}

/** Panneau latéral (bas d'écran sur mobile), fermeture Échap, focus géré. */
export function Drawer({ open, onClose, title, children, footer, width = 'sm:w-[480px]', side = 'right' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, select')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const desk = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 640px)').matches;
  const hidden = desk ? { x: side === 'right' ? '100%' : '-100%', y: 0 } : { y: '100%', x: 0 };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-bg-0/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur(0.2) }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`absolute bottom-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-2 shadow-2xl ring-1 ring-white/10 sm:top-0 sm:max-h-none sm:rounded-none ${side === 'right' ? 'sm:right-0' : 'sm:left-0'} ${width}`}
            initial={hidden}
            animate={{ y: 0, x: 0 }}
            exit={hidden}
            transition={{ duration: dur(0.38), ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-5">
              <h2 className="text-base font-bold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-lg text-fg-2 hover:bg-bg-3 hover:text-fg">
                <IconClose />
              </button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
            {footer && <div className="shrink-0 border-t border-white/5 bg-bg-2 px-4 py-3 sm:px-5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
