import { useSyncExternalStore } from 'react';
import { withViewTransition } from './motion';
import routes from '../routes.json';

/** First path segments the app answers to. The list lives in src/routes.json (shared with the tests). */
export type RouteSeg = keyof typeof routes;

/** Hash routes: #/learn, #/lesson/three-wire, #/sim ... Works on GitHub Pages with no server rules. */
function current(): string {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h.split('?')[0];
}

function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

/** Path changes (not query-only changes) animate as a view transition where the browser supports it. */
let lastPath = typeof window === 'undefined' ? '' : current();
function subscribePath(fn: () => void) {
  const on = () => {
    const next = current();
    if (next === lastPath) return;
    lastPath = next;
    withViewTransition(fn);
  };
  window.addEventListener('hashchange', on);
  return () => window.removeEventListener('hashchange', on);
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribePath, current, () => '');
  return path.split('/').filter(Boolean).map(decodeURIComponent);
}

export function navigate(path: string) {
  const target = '#/' + path.replace(/^#?\/?/, '');
  if (window.location.hash !== target) window.location.hash = target;
}

export function href(path: string) {
  return '#/' + path.replace(/^\/?/, '');
}

export function queryParam(name: string): string | null {
  const q = window.location.hash.split('?')[1];
  return q ? new URLSearchParams(q).get(name) : null;
}

/** A query parameter from the hash (#/sim?m=tank) that re-renders when it changes. */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(subscribe, () => queryParam(name), () => null);
}
