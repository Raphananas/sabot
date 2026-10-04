import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SvgDefs } from './components/svg/SvgDefs';
import { Intro } from './components/intro/Intro';
import { useSettings } from './store/settings';
import { Toasts } from './components/ui/Toasts';

/** Import paresseux tolérant à un déploiement entre-temps (chunk disparu → rechargement unique). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((err) => {
      try {
        if (!sessionStorage.getItem('sabot:reloaded')) {
          sessionStorage.setItem('sabot:reloaded', '1');
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      } catch {
        /* stockage indisponible */
      }
      throw err;
    }),
  );
}

const Home = page(() => import('./pages/Home'));
const Play = page(() => import('./pages/Play'));
const Stats = page(() => import('./pages/Stats'));
const Settings = page(() => import('./pages/Settings'));
const Rules = page(() => import('./pages/Rules'));
const Quiz = page(() => import('./pages/Quiz'));
const Counting = page(() => import('./pages/Counting'));
const Tutorial = page(() => import('./pages/Tutorial'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function useThemeSync() {
  const theme = useSettings((s) => s.theme);
  const cvd = useSettings((s) => s.colorblind);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.cvd = String(cvd);
  }, [theme, cvd]);
}

function introSeen() {
  try {
    return sessionStorage.getItem('sabot:intro') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  useThemeSync();
  useEffect(() => {
    // Chargement réussi : on réarme le rechargement automatique.
    const t = setTimeout(() => {
      try {
        sessionStorage.removeItem('sabot:reloaded');
      } catch {
        /* ignoré */
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  const [intro, setIntro] = useState(() => !introSeen());
  const done = useCallback(() => {
    try {
      sessionStorage.setItem('sabot:intro', '1');
    } catch {
      /* stockage indisponible */
    }
    setIntro(false);
  }, []);
  return (
    <HashRouter>
      <SvgDefs />
      <ScrollTop />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Aller au contenu
      </a>
      <div id="contenu">
        <Suspense fallback={<div className="min-h-dvh bg-bg-1" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Play mode="practice" />} />
            <Route path="/rush" element={<Play mode="rush" />} />
            <Route path="/defi" element={<Play mode="daily" />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/reglages" element={<Settings />} />
            <Route path="/regles" element={<Rules />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/comptage" element={<Counting />} />
            <Route path="/tutoriel" element={<Tutorial />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </div>
      <Toasts />
      <AnimatePresence>{intro && <Intro onDone={done} />}</AnimatePresence>
    </HashRouter>
  );
}
