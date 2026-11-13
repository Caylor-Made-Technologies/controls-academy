import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../../lib/motion';
import { Icon, type IconName } from '../Icon';

/** Counts up to `value` once when it first appears (instant with reduced motion). Whole numbers only. */
export function useCountUp(value: number, ms = 700): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const from = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** One number with a label. Screen readers get the final value, not the animation. */
export function Stat({ label, value, unit, icon, tone, children }: { label: string; value: number | string; unit?: string; icon?: IconName; tone?: 'live' | 'warn' | 'blue'; children?: ReactNode }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <p className="stat-label">{icon && <Icon name={icon} size={14} />}{label}</p>
      <p className="stat-value">
        <span className="sr-only">{value}{unit ? ` ${unit}` : ''}</span>
        <span aria-hidden="true">{typeof value === 'number' ? n : value}</span>{unit && <span className="stat-unit" aria-hidden="true">{unit}</span>}
      </p>
      {children && <div className="stat-note">{children}</div>}
    </div>
  );
}
