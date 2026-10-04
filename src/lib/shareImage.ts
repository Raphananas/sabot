import { formatEuro } from './format';

interface ShareData {
  score: number;
  peak: number;
  title: string;
  hands: number;
  accuracy: number;
  daily: string | null;
  curve: { hand: number; bankroll: number }[];
}

/** Génère une image de score (canvas) et la partage, ou la télécharge à défaut. */
export async function shareScoreImage(d: ShareData): Promise<string> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return 'Partage indisponible sur ce navigateur.';
  await document.fonts?.ready;
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--color-accent').trim() || '#1fe07a';

  g.fillStyle = '#0f212e';
  g.fillRect(0, 0, W, H);
  const grad = g.createRadialGradient(W / 2, 380, 50, W / 2, 380, 800);
  grad.addColorStop(0, '#17384a');
  grad.addColorStop(1, '#0f212e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // Logo
  g.fillStyle = accent;
  roundRect(g, 80, 80, 72, 72, 20);
  g.fill();
  g.fillStyle = '#032412';
  g.font = '800 48px "Inter Variable", Inter, sans-serif';
  g.textAlign = 'center';
  g.fillText('♠', 116, 134);
  g.textAlign = 'left';
  g.fillStyle = '#fff';
  g.font = 'italic 800 60px "Inter Variable", Inter, sans-serif';
  g.fillText('sabot', 172, 136);

  g.fillStyle = '#8191aa';
  g.font = '700 30px "Inter Variable", Inter, sans-serif';
  g.fillText(d.daily ? `DÉFI DU JOUR · ${d.daily}` : 'MODE RUSH', 80, 300);

  g.fillStyle = d.score >= 500 ? accent : '#ffffff';
  g.font = '800 170px "Inter Variable", Inter, sans-serif';
  g.fillText(formatEuro(d.score), 72, 470);

  g.fillStyle = '#ffb547';
  g.font = '800 46px "Inter Variable", Inter, sans-serif';
  g.fillText(`♛ ${d.title}`, 80, 560);

  // Courbe
  const pts = d.curve;
  if (pts.length > 1) {
    const x0 = 80;
    const y0 = 640;
    const w = W - 160;
    const h = 360;
    const ys = pts.map((p) => p.bankroll);
    const min = Math.min(...ys) * 0.95;
    const max = Math.max(...ys) * 1.05 + 1;
    g.strokeStyle = accent;
    g.lineWidth = 8;
    g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => {
      const x = x0 + (i / (pts.length - 1)) * w;
      const y = y0 + (1 - (p.bankroll - min) / (max - min)) * h;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  }

  g.fillStyle = '#b1bad3';
  g.font = '600 38px "Inter Variable", Inter, sans-serif';
  g.fillText(`Pic ${formatEuro(d.peak)}  ·  ${d.hands} mains  ·  ${Math.round(d.accuracy * 100)} % de bonnes décisions`, 80, 1110);
  g.fillStyle = '#8191aa';
  g.font = '600 30px "Inter Variable", Inter, sans-serif';
  g.fillText('Blackjack français · stratégie de base', 80, 1250);

  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!blob) return 'Impossible de générer l’image.';
  const file = new File([blob], `sabot-score-${d.daily ?? 'rush'}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Mon score Sabot', text: `J’ai encaissé ${formatEuro(d.score)} au blackjack !` });
      return 'Image partagée.';
    } catch {
      return 'Partage annulé.';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'Image enregistrée.';
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
