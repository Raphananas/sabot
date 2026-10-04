import type { Analysis, Counts, EvAction, EvOptions } from './ev';
import type { AnalyzeRequest } from './worker';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (a: Analysis) => void; reject: (e: unknown) => void }>();
const cache = new Map<string, Promise<Analysis>>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: Analysis; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.result) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
  }
  return worker;
}

/** Analyse d'une décision dans le Web Worker (résultats mis en cache). */
export function analyzeAsync(
  player: number[],
  up: number,
  counts: Counts,
  allowed: Partial<Record<EvAction, boolean>>,
  options: EvOptions,
): Promise<Analysis> {
  const key = JSON.stringify([player, up, counts, allowed, options]);
  const hit = cache.get(key);
  if (hit) return hit;
  const id = ++seq;
  const req: AnalyzeRequest = { id, player, up, counts, allowed, options };
  const p = new Promise<Analysis>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(req);
  });
  cache.set(key, p);
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return p;
}
