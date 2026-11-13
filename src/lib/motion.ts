/**
 * Motion helpers. All animation in the app is CSS (transform / opacity, timings from tokens.css) or the
 * browser's View Transitions; nothing here ships an animation engine. Reduced motion turns it all off.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches);
}

function subscribe(fn: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener('change', fn);
  return () => mq?.removeEventListener('change', fn);
}

/** True when the person asked their device for less motion. Follows live changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Run a state change inside a View Transition so shared elements (matching `view-transition-name`s) glide
 * between the old and new screen. Falls back to a plain update when the browser has no View Transitions or
 * the person prefers reduced motion; CSS enter animations cover the fallback.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as VTDocument;
  if (!doc.startViewTransition || prefersReducedMotion()) { update(); return; }
  try {
    doc.startViewTransition(() => flushSync(update));
  } catch {
    update();
  }
}

/** A valid, unique view-transition-name for an id (names must be CSS identifiers). */
export function vtName(kind: string, id: string): string {
  return `${kind}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}


/**
 * Keeps something mounted long enough to play its CSS exit animation.
 * `mounted` says whether to render; `shown` flips one frame after mount (enter) and off at once on close (exit).
 */
export function usePresence(open: boolean, exitMs = 220): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames: the browser must paint the hidden state once before it can transition from it.
      let b = 0;
      const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted: mounted || open, shown: shown && open };
}
