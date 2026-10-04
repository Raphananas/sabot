/// <reference lib="webworker" />
import { analyze, type Counts, type EvAction, type EvOptions } from './ev';

export interface AnalyzeRequest {
  id: number;
  player: number[];
  up: number;
  counts: Counts;
  allowed: Partial<Record<EvAction, boolean>>;
  options: EvOptions;
}

self.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  const { id, player, up, counts, allowed, options } = e.data;
  try {
    const result = analyze(player, up, counts, allowed, options);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
