import { useEffect, useState } from 'react';
import { AppMark } from './Brand';

const KEY = 'ca:powered';

/**
 * Signature intro, once per session: a circuit trace draws in, the rung energizes,
 * the mark lights up. ~1.2 s, skipped with reduced motion or on tap.
 */
export function PowerOn() {
  const [show, setShow] = useState(() => {
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
      return sessionStorage.getItem(KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    const a = setTimeout(() => setLeaving(true), 1150);
    const b = setTimeout(() => setShow(false), 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [show]);
  if (!show) return null;
  return (
    <div className={`power-on ${leaving ? 'is-leaving' : ''}`} aria-hidden="true" onClick={() => setShow(false)}>
      <svg viewBox="0 0 320 120" className="power-on-trace">
        <path className="po-rail" d="M40 20 V100" />
        <path className="po-rail" d="M280 20 V100" />
        <path className="po-rung" d="M40 60 H120 M136 60 H184 M200 60 H280" />
        <path className="po-contact" d="M120 42 V78 M136 42 V78" />
        <path className="po-coil" d="M190 42 Q178 60 190 78 M202 42 Q214 60 202 78" />
      </svg>
      <div className="power-on-mark">
        <AppMark size={72} />
        <p className="m-0 mt-3 font-head font-extrabold text-heading text-lg tracking-tight">Controls <span className="grad-text">Academy</span></p>
        <p className="m-0 text-[0.7rem] font-semibold tracking-[0.18em] uppercase text-muted">Advanced Engineering. Built Different.</p>
      </div>
    </div>
  );
}
