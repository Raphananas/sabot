// Génère les icônes PWA (PNG) depuis les SVG sources. Usage : npm run icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const any = readFileSync(new URL('./icon-any.svg', import.meta.url));
const mask = readFileSync(new URL('./icon-maskable.svg', import.meta.url));
const out = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));

await sharp(any, { density: 600 }).resize(192, 192).png().toFile(out('icons/icon-192.png'));
await sharp(any, { density: 600 }).resize(512, 512).png().toFile(out('icons/icon-512.png'));
await sharp(mask, { density: 600 }).resize(512, 512).png().toFile(out('icons/icon-maskable-512.png'));
await sharp(any, { density: 600 }).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
console.log('Icônes générées.');
