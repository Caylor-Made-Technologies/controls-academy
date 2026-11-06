import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { AppMark, Footer, Wordmark } from './components/Brand';
import { Icon, type IconName } from './components/Icon';
import { SkeletonPage } from './components/Skeleton';
import { href, navigate, useRoute } from './lib/router';
import { sfx } from './lib/sound';
import { installSpotlight } from './lib/spotlight';
import { PowerOn } from './components/PowerOn';
import { applyTheme, usePrefs } from './state/prefs';
import { useProgress } from './state/progress';
import { Onboarding } from './features/onboarding/Onboarding';
import LearnPage from './features/learn/LearnPage';

const CommandPalette = lazy(() => import('./features/CommandPalette').then((m) => ({ default: m.CommandPalette })));
const LessonPage = lazy(() => import('./features/learn/LessonPage'));
const ReviewPage = lazy(() => import('./features/learn/ReviewPage'));
const SkillMapPage = lazy(() => import('./features/learn/SkillMapPage'));
const SimulatorPage = lazy(() => import('./features/simulator/SimulatorPage'));
const TroubleshootPage = lazy(() => import('./features/troubleshoot/TroubleshootPage'));
const ReferencePage = lazy(() => import('./features/reference/ReferencePage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const AboutPage = lazy(() => import('./features/profile/AboutPage'));

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
    case 'sim': return 'sim';
    case 'troubleshoot': return 'troubleshoot';
    case 'reference': return 'reference';
    case 'profile': case 'about': return 'profile';
    default: return 'learn';
  }
}

function Page({ route }: { route: string[] }) {
  const [a, b] = route;
  switch (a) {
    case 'lesson': return <LessonPage id={b ?? ''} />;
    case 'review': return <ReviewPage />;
    case 'skills': return <SkillMapPage />;
    case 'sim': return <SimulatorPage />;
    case 'troubleshoot': return <TroubleshootPage huntId={b} />;
    case 'reference': return <ReferencePage section={b} item={route[2]} />;
    case 'profile': return <ProfilePage />;
    case 'about': return <AboutPage />;
    default: return <LearnPage />;
  }
}

export default function App() {
  const route = useRoute();
  const prefs = usePrefs();
  const progressReady = useProgress((s) => s.hydrated);
  const setLastRoute = useProgress((s) => s.setLastRoute);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const reduce = useReducedMotion();
  const tab = tabFor(route[0]);
  const routeKey = route.join('/');
  // Direction-aware transitions: tabs slide sideways in tab order; drilling in (lesson, guide) rises up.
  const prev = useRef({ tab, depth: route.length });
  const dir = ORDER[tab] === ORDER[prev.current.tab] ? (route.length >= prev.current.depth ? 'in' : 'out') : ORDER[tab] > ORDER[prev.current.tab] ? 'right' : 'left';
  useEffect(() => { prev.current = { tab, depth: route.length }; });
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

  if (!prefs.hydrated || !progressReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <AppMark size={72} />
          <Wordmark />
        </div>
      </div>
    );
  }

  const darkNow = document.documentElement.dataset.theme !== 'light';

  return (
    <MotionConfig reducedMotion="user">
    <LayoutGroup>
      <PowerOn />
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>

      {/* Desktop rail */}
      <nav className="rail hidden lg:flex" aria-label="Main">
        <a href={href('learn')} className="flex items-center gap-3 px-2 pb-5 no-underline">
          <AppMark size={40} />
          <Wordmark />
        </a>
        {TABS.map((t) => (
          <a key={t.id} href={href(t.path)} className="rail-link" aria-current={tab === t.id ? 'page' : undefined}>
            {tab === t.id && <motion.span layoutId="rail-pill" className="rail-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icon name={t.icon} className="relative" />
            <span className="relative">{t.label}</span>
          </a>
        ))}
        <button type="button" className="rail-link mt-2" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" /> <span>Search</span> <kbd className="ml-auto text-[0.7rem]">⌘K</kbd>
        </button>
        <div className="mt-auto px-2 text-[0.72rem] text-muted space-y-2">
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
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={routeKey.split('?')[0] || 'learn'}
              custom={dir}
              variants={{
                enter: (d: string) => (reduce ? { opacity: 0 } : { opacity: 0, x: d === 'right' ? 28 : d === 'left' ? -28 : 0, y: d === 'in' ? 14 : d === 'out' ? -10 : 0}),
                center: { opacity: 1, x: 0, y: 0 },
                exit: (d: string) => (reduce ? { opacity: 0 } : { opacity: 0, x: d === 'right' ? -18 : d === 'left' ? 18 : 0, y: d === 'in' ? -6 : 0}),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.01 } : { opacity: { duration: 0.16 }, default: { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 } }}
            >
              <Suspense fallback={<SkeletonPage />}>
                <Page route={route} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
      </div>

      {/* Phone tab bar */}
      <nav className="tabbar lg:hidden" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <a key={t.id} href={href(t.path)} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => { if (tab === t.id) window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {tab === t.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
              {tab === t.id && <motion.span layoutId="tab-bus" className="tab-bus" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <Icon name={t.icon} className="relative" />
              <span className="relative">{t.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {paletteOpen && <Suspense fallback={null}><CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /></Suspense>}
      {!prefs.onboarded && <Onboarding onDone={(path) => { prefs.setPrefs({ onboarded: true }); if (path) navigate(path); }} />}
    </LayoutGroup>
    </MotionConfig>
  );
}
