import { useEffect, useRef } from 'react';
import { toast } from '../components/ui/Toast';
import { buzz } from '../lib/sound';
import { useProgress } from '../state/progress';
import { momentsFor, snapshot, type Seen } from './rewards';

/**
 * Level-up and badge moments: a short reward toast and a light buzz the moment one is earned. Never fires
 * for what was already earned when the app opened (see rewards.ts for the batch rule).
 */
export function Moments() {
  const seen = useRef<Seen | null>(null);
  useEffect(() => {
    const now = useProgress.getState();
    if (now.hydrated) seen.current = snapshot(now);
    return useProgress.subscribe((p) => {
      if (!p.hydrated) return;
      const prev = seen.current;
      seen.current = snapshot(p);
      if (!prev) return;
      const msgs = momentsFor(prev, p);
      for (const m of msgs) toast(m, 'reward', 4200);
      if (msgs.length) buzz(18);
    });
  }, []);
  return null;
}
