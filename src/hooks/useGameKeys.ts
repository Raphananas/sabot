import { useEffect } from 'react';
import type { Action } from '../engine/game';

interface Handlers {
  onAction: (a: Action) => void;
  onSpace: () => void;
  onInsurance?: (take: boolean) => void;
  enabled?: boolean;
}

const MAP: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };

/** Raccourcis : H tirer, S rester, D doubler, P partager, R abandon, Espace distribuer / main suivante. */
export function useGameKeys({ onAction, onSpace, onInsurance, enabled = true }: Handlers) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter') {
        if (t && t.tagName === 'BUTTON' && k === 'enter') return;
        e.preventDefault();
        onSpace();
        return;
      }
      if (onInsurance && (k === 'o' || k === 'n')) {
        onInsurance(k === 'o');
        return;
      }
      const a = MAP[k];
      if (a) {
        e.preventDefault();
        onAction(a);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAction, onSpace, onInsurance, enabled]);
}
