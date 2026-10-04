import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_RULES, type Rules } from '../engine/rules';

export type Theme = 'minuit' | 'emeraude' | 'violet';
export type AnimSpeed = 'lente' | 'normale' | 'rapide' | 'eclair';

export interface SettingsState {
  rules: Rules;
  animSpeed: AnimSpeed;
  sound: boolean;
  volume: number;
  theme: Theme;
  colorblind: boolean;
  reduceMotion: boolean;
  showCount: boolean;
  showShoe: boolean;
  practiceHands: 1 | 2 | 3;
  tutorialSeen: boolean;
  setRules: (patch: Partial<Rules>) => void;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'setRules' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  rules: DEFAULT_RULES,
  animSpeed: 'normale' as AnimSpeed,
  sound: true,
  volume: 0.6,
  theme: 'minuit' as Theme,
  colorblind: false,
  reduceMotion: false,
  showCount: false,
  showShoe: true,
  practiceHands: 1 as const,
  tutorialSeen: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setRules: (patch) => set((s) => ({ rules: { ...s.rules, ...patch } })),
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULTS, tutorialSeen: true }),
    }),
    {
      name: 'sabot:settings',
      version: 2,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        const theme = (['minuit', 'emeraude', 'violet'] as const).includes(p.theme as Theme) ? p.theme : current.theme;
        return { ...current, ...p, theme: theme as Theme, rules: { ...DEFAULT_RULES, ...(p.rules ?? {}) } };
      },
    },
  ),
);

const SPEED_FACTOR: Record<AnimSpeed, number> = { lente: 1.5, normale: 1, rapide: 0.55, eclair: 0.25 };

let systemReduced = false;
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  systemReduced = mq.matches;
  mq.addEventListener?.('change', (e) => (systemReduced = e.matches));
}

export function isReducedMotion(): boolean {
  return systemReduced || useSettings.getState().reduceMotion;
}

/** Durée d'animation (secondes) ajustée à la vitesse choisie et à prefers-reduced-motion. */
export function dur(base: number): number {
  if (isReducedMotion()) return 0;
  return base * SPEED_FACTOR[useSettings.getState().animSpeed];
}

/** Délai d'enchaînement (ms) entre deux étapes de jeu. */
export function stepMs(base: number): number {
  const factor = SPEED_FACTOR[useSettings.getState().animSpeed];
  if (isReducedMotion()) return Math.min(base * factor, 120);
  return base * factor;
}
