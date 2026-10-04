import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Après un nouveau déploiement, une page restée ouverte peut réclamer d'anciens chunks : on recharge une fois.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadOnce();
});

function reloadOnce() {
  try {
    if (sessionStorage.getItem('sabot:reloaded')) return;
    sessionStorage.setItem('sabot:reloaded', '1');
  } catch {
    /* stockage indisponible */
  }
  window.location.reload();
}

// Service worker (hors développement) : mise à jour automatique, fonctionne sous le sous-chemin GitHub Pages.
if (import.meta.env.PROD) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
