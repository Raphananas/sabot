import { useStats } from '../store/stats';
import { useSettings } from '../store/settings';

/** Export JSON des stats + réglages. */
export function exportData() {
  const { toasts: _t, session: _s, ...stats } = useStats.getState();
  void _t;
  void _s;
  const settings = Object.fromEntries(Object.entries(useSettings.getState()).filter(([, v]) => typeof v !== 'function'));
  const data = { app: 'sabot', version: 1, exportedAt: new Date().toISOString(), stats: Object.fromEntries(Object.entries(stats).filter(([, v]) => typeof v !== 'function')), settings };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sabot-stats-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importFile(file: File): Promise<string> {
  try {
    const text = await file.text();
    useStats.getState().importData(text);
    return 'Données importées.';
  } catch {
    return 'Fichier invalide : import annulé.';
  }
}
