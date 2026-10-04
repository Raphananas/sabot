import { useSettings } from '../store/settings';

/**
 * Sons synthétisés en WebAudio : aucun fichier à télécharger (0 octet dans le build),
 * fonctionne hors ligne. Volumes volontairement bas, enveloppes courtes.
 */
export type Sfx = 'deal' | 'chip' | 'flip' | 'win' | 'bigwin' | 'lose' | 'push' | 'click' | 'tick' | 'error';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise) return noise;
  const len = Math.floor(ac.sampleRate * 0.4);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

function out(ac: AudioContext, gain: number): GainNode {
  const g = ac.createGain();
  g.gain.value = gain * useSettings.getState().volume;
  g.connect(ac.destination);
  return g;
}

function tone(ac: AudioContext, freq: number, start: number, length: number, gain: number, type: OscillatorType = 'sine') {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  o.connect(g).connect(out(ac, 1));
  o.start(start);
  o.stop(start + length + 0.02);
}

function swish(ac: AudioContext, t: number, length: number, gain: number, from: number, to: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + length);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(g).connect(out(ac, 1));
  src.start(t);
  src.stop(t + length + 0.02);
}

export function sfx(name: Sfx) {
  const s = useSettings.getState();
  if (!s.sound) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  switch (name) {
    case 'deal':
      swish(ac, t, 0.09, 0.35, 5200, 1800);
      break;
    case 'flip':
      swish(ac, t, 0.06, 0.3, 3000, 6000);
      break;
    case 'chip':
      tone(ac, 2400, t, 0.05, 0.08, 'triangle');
      tone(ac, 3300, t + 0.012, 0.06, 0.05, 'triangle');
      swish(ac, t, 0.03, 0.12, 7000, 4000);
      break;
    case 'click':
      tone(ac, 900, t, 0.04, 0.05, 'triangle');
      break;
    case 'tick':
      tone(ac, 1500, t, 0.03, 0.04, 'square');
      break;
    case 'win':
      tone(ac, 660, t, 0.18, 0.08);
      tone(ac, 990, t + 0.08, 0.26, 0.07);
      break;
    case 'bigwin':
      [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, t + i * 0.07, 0.35, 0.07));
      break;
    case 'push':
      tone(ac, 520, t, 0.16, 0.05);
      break;
    case 'lose':
      tone(ac, 220, t, 0.22, 0.07, 'triangle');
      tone(ac, 165, t + 0.09, 0.3, 0.06, 'triangle');
      break;
    case 'error':
      tone(ac, 180, t, 0.15, 0.06, 'square');
      break;
  }
}
