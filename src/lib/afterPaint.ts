import { useEffect, useState } from 'react';

/**
 * False on the first render, true once the browser has painted and gone idle (or after `maxWait` ms).
 * Heavy, optional work (the 3D layer) waits on this so the page shows and responds first.
 */
export function useAfterPaint(maxWait = 1200): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const done = () => setReady(true);
    const raf = requestAnimationFrame(() => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(done, { timeout: maxWait });
      else timer = window.setTimeout(done, 50);
    });
    return () => {
      cancelAnimationFrame(raf);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idle) w.cancelIdleCallback?.(idle);
      if (timer) clearTimeout(timer);
    };
  }, [maxWait]);
  return ready;
}
