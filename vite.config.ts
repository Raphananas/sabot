/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

/** 404.html de secours pour GitHub Pages : renvoie vers l'app (HashRouter) en conservant le chemin demandé. */
function pages404(base: string): Plugin {
  return {
    name: 'sabot-404',
    apply: 'build',
    generateBundle() {
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Sabot</title>
<script>(function(){var b=${JSON.stringify(base)};var p=location.pathname;var rest=p.indexOf(b)===0?p.slice(b.length):p.replace(/^\\//,'');location.replace(b+'#/'+rest.replace(/^#?\\/?/,'')+location.search);})();</script>
<meta http-equiv="refresh" content="2;url=${base}"></head><body style="background:#0f212e;color:#fff;font-family:system-ui;display:grid;place-items:center;height:100vh"><a href="${base}" style="color:#1fe07a">Retour à Sabot</a></body></html>`;
      this.emitFile({ type: 'asset', fileName: '404.html', source: html });
    },
  };
}

// GitHub Pages sert le site sous https://<user>.github.io/<repo>/ :
// VITE_BASE=/<repo>/ en CI, "/" par défaut en local.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawBase = process.env.VITE_BASE ?? env.VITE_BASE ?? '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      pages404(base),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Sabot — Blackjack français',
          short_name: 'Sabot',
          description: 'Blackjack français : Practice avec debrief, mode Rush, quiz et comptage Hi-Lo.',
          lang: 'fr',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'any',
          background_color: '#0f212e',
          theme_color: '#0f212e',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
          globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '404.html'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    worker: { format: 'es' },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 600,
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/engine/**/*.ts', 'src/strategy/**/*.ts', 'src/probability/**/*.ts'],
        exclude: ['**/*.test.ts', '**/testutils.ts', 'src/probability/worker.ts', 'src/probability/client.ts'],
        thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
      },
    },
  };
});
