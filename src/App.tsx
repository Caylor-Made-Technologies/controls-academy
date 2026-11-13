import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AppMark, Footer, RouteHead, Wordmark } from './components/Brand';
import { headFor } from './content/heads';
import { Icon, type IconName } from './components/Icon';
import { SkeletonPage } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toast';
import { href, navigate, useRoute, type RouteSeg } from './lib/router';
import { sfx } from './lib/sound';
import { installSpotlight } from './lib/spotlight';
import { PowerOn } from './components/PowerOn';
import { applyTheme, usePrefs } from './state/prefs';
import { useProgress } from './state/progress';

const Onboarding = lazy(() => import('./features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })));
const CommandPalette = lazy(() => import('./features/CommandPalette').then((m) => ({ default: m.CommandPalette })));
const LearnPage = lazy(() => import('./features/learn/LearnPage'));
const LessonPage = lazy(() => import('./features/learn/LessonPage'));
const ReviewPage = lazy(() => import('./features/learn/ReviewPage'));
const SkillMapPage = lazy(() => import('./features/learn/SkillMapPage'));
const WiringPage = lazy(() => import('./features/wiring/WiringPage'));
const ExamPage = lazy(() => import('./features/learn/ExamPage'));
const SummaryPage = lazy(() => import('./features/learn/SummaryPage'));
const SimulatorPage = lazy(() => import('./features/simulator/SimulatorPage'));
const TroubleshootPage = lazy(() => import('./features/troubleshoot/TroubleshootPage'));
const ReferencePage = lazy(() => import('./features/reference/ReferencePage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const AboutPage = lazy(() => import('./features/profile/AboutPage'));
const StyleguidePage = lazy(() => import('./features/styleguide/StyleguidePage'));

type TabId = 'learn' | 'sim' | 'troubleshoot' | 'reference' | 'profile';
const TABS: { id: TabId; label: string; icon: IconName; path: string }[] = [
  { id: 'learn', label: 'Learn', icon: 'learn', path: 'learn' },
  { id: 'sim', label: 'Simulator', icon: 'sim', path: 'sim' },
  { id: 'troubleshoot', label: 'Troubleshoot', icon: 'wrench', path: 'troubleshoot' },
  { id: 'reference', label: 'Reference', icon: 'book', path: 'reference' },
  { id: 'profile', label: 'Profile', icon: 'user', path: 'profile' },
];

const ORDER: Record<TabId, number> = { learn: 0, sim: 1, troubleshoot: 2, reference: 3, profile: 4 };

function tabFor(seg: string | undefined): TabId {
  switch (seg) {
    case 'sim': case 'wiring': return 'sim';
    case 'troubleshoot': return 'troubleshoot';
    case 'reference': return 'reference';
    case 'profile': case 'about': case 'styleguide': return 'profile';
    default: return 'learn';
  }
}

/** One entry per first path segment. The keys must match src/routes.json, which the e2e gate and the
 *  screenshot script read, so a new screen cannot ship without being tested and photographed. */
const PAGES: Record<RouteSeg, (route: string[]) => ReactNode> = {
  learn: () => <LearnPage />,
  lesson: (r) => <LessonPage id={r[1] ?? ''} />,
  review: () => <ReviewPage />,
  skills: () => <SkillMapPage />,
  exam: (r) => <ExamPage id={r[1]} />,
  summary: (r) => <SummaryPage track={r[1]} />,
  sim: () => <SimulatorPage />,
  wiring: (r) => <WiringPage id={r[1]} />,
  troubleshoot: (r) => <TroubleshootPage huntId={r[1]} />,
  reference: (r) => <ReferencePage section={r[1]} item={r[2]} />,
  profile: () => <ProfilePage />,
  about: () => <AboutPage />,
  styleguide: () => <StyleguidePage />,
};

/** While a screen's code loads: its real heading (top-level screens) over a skeleton. */
function RouteFallback({ route }: { route: string[] }) {
  const seg = route[0] ?? 'learn';
  return (
    <div>
      {headFor(route) && <RouteHead seg={seg} bare />}
      <SkeletonPage />
    </div>
  );
}

function Page({ route }: { route: string[] }) {
  const seg = route[0] as RouteSeg | undefined;
  return (seg && Object.hasOwn(PAGES, seg) ? PAGES[seg] : PAGES.learn)(route);
}

export default function App() {
  const route = useRoute();
  const prefs = usePrefs();
  const progressReady = useProgress((s) => s.hydrated);
  const setLastRoute = useProgress((s) => s.setLastRoute);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const tab = tabFor(route[0]);
  const routeKey = route.join('/');
  // Direction-aware transitions: tabs slide sideways in tab order; drilling in (lesson, guide) rises up.
  const prev = useRef({ tab, depth: route.length });
  const dir = ORDER[tab] === ORDER[prev.current.tab] ? (route.length >= prev.current.depth ? 'in' : 'out') : ORDER[tab] > ORDER[prev.current.tab] ? 'right' : 'left';
  useEffect(() => { prev.current = { tab, depth: route.length }; });
  useEffect(() => { document.documentElement.dataset.nav = dir; }, [dir]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    installSpotlight();
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    void usePrefs.getState().hydrate();
    void useProgress.getState().hydrate();
  }, []);

  useEffect(() => {
    applyTheme(prefs.theme);
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [prefs.theme]);

  useEffect(() => { sfx.setEnabled(prefs.sound); }, [prefs.sound]);
  useEffect(() => { document.documentElement.style.fontSize = `${prefs.textScale * 100}%`; }, [prefs.textScale]);

  useEffect(() => {
    // Remember only places worth resuming (not Profile, About or Review).
    if (progressReady && /^(lesson|sim|troubleshoot|reference)\b/.test(routeKey)) setLastRoute(routeKey.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const main = document.getElementById('main');
    main?.focus({ preventScroll: true });
  }, [routeKey, progressReady, setLastRoute]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Before saved progress is read, show the same header and page heading the static shell in index.html
  // already painted, so nothing jumps or flashes when the app takes over.
  if (!prefs.hydrated || !progressReady) {
    return (
      <div className="with-rail" aria-busy="true">
        <header className="app-header lg:hidden" data-scrolled="false">
          <div className="app-header-inner">
            <a href={href('learn')} className="flex items-center gap-2.5 no-underline min-w-0"><AppMark size={32} /><Wordmark compact /></a>
          </div>
        </header>
        <main className="page"><RouteFallback route={route} /></main>
      </div>
    );
  }

  const darkNow = document.documentElement.dataset.theme !== 'light';

  return (
    <>
      <PowerOn />
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>

      {/* Desktop rail */}
      <nav className="rail hidden lg:flex" aria-label="Main">
        <a href={href('learn')} className="flex items-center gap-3 px-2 pb-5 no-underline">
          <AppMark size={40} />
          <Wordmark />
        </a>
        <div className="rail-links" style={{ '--tab-i': ORDER[tab] } as CSSProperties}>
          <span className="rail-pill" aria-hidden="true" />
        {TABS.map((t) => (
          <a key={t.id} href={href(t.path)} className="rail-link" aria-current={tab === t.id ? 'page' : undefined}>
            <Icon name={t.icon} className="relative" />
            <span className="relative">{t.label}</span>
          </a>
        ))}
        </div>
        <button type="button" className="rail-link mt-2" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" /> <span>Search</span> <kbd className="ml-auto text-2xs">⌘K</kbd>
        </button>
        <div className="mt-auto px-2 text-xs text-muted space-y-2">
          <p className="m-0">Training only — not site procedure.</p>
          <p className="m-0 grad-text font-semibold">Advanced Engineering. Built Different.</p>
        </div>
      </nav>

      <div className="with-rail">
        <header className="app-header lg:hidden" data-scrolled={scrolled}>
          <div className="app-header-inner">
            <a href={href('learn')} className="flex items-center gap-2.5 no-underline min-w-0">
              <AppMark size={32} />
              <Wordmark compact />
            </a>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" className="btn btn-ghost icon-btn" onClick={() => setPaletteOpen(true)} aria-label="Search lessons, glossary and instructions">
                <Icon name="search" />
              </button>
              <button type="button" className="btn btn-ghost icon-btn" onClick={() => prefs.setPrefs({ theme: darkNow ? 'light' : 'dark' })} aria-label={darkNow ? 'Switch to light mode' : 'Switch to dark mode'}>
                <Icon name={darkNow ? 'sun' : 'moon'} />
              </button>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="page outline-none">
          <div key={routeKey.split('?')[0] || 'learn'} className="route-view" data-dir={dir}>
            <ErrorBoundary resetKey={routeKey}>
              <Suspense fallback={<RouteFallback route={route} />}>
                <Page route={route} />
              </Suspense>
            </ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      {/* Phone tab bar */}
      <nav className="tabbar lg:hidden" aria-label="Main">
        <div className="tabbar-inner" style={{ '--tab-i': ORDER[tab] } as CSSProperties}>
          <span className="tab-pill" aria-hidden="true" />
          <span className="tab-bus" aria-hidden="true" />
          {TABS.map((t) => (
            <a key={t.id} href={href(t.path)} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => { if (tab === t.id) window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <Icon name={t.icon} className="relative" />
              <span className="relative">{t.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {paletteOpen && <Suspense fallback={null}><CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /></Suspense>}
      <Toaster />
      {!prefs.onboarded && <Suspense fallback={null}><Onboarding onDone={(path) => { prefs.setPrefs({ onboarded: true }); if (path) navigate(path); }} /></Suspense>}
    </>
  );
}
