/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) à état sérialisable.
 * Permet de rejouer exactement un sabot (défi du jour, « rejouer cette situation »).
 */
export interface Rng {
  /** Nombre dans [0, 1). */
  next(): number;
  /** Entier dans [0, n). */
  int(n: number): number;
  /** État courant (uint32) pour sérialisation. */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n: number) {
      return Math.floor(this.next() * n);
    },
    get state() {
      return s;
    },
  };
}

/** Hachage d'une chaîne en graine 32 bits (cyrb53 tronqué). */
export function seedFromString(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

/** Graine aléatoire « vraie » (crypto si disponible). */
export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

/** Graine du défi du jour, identique pour tous les joueurs à une date donnée (heure locale). */
export function dailySeed(date = new Date()): { seed: number; key: string } {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { seed: seedFromString(`sabot-dor:${key}`), key };
}
