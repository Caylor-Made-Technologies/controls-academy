/**
 * Pointer "spotlight": cards glow where your finger or cursor is. One passive listener for the
 * whole app; writes CSS variables on the hovered card only (CSSOM, so the strict CSP is fine).
 */
let installed = false;

export function installSpotlight() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  let raf = 0;
  let last: HTMLElement | null = null;
  const onMove = (e: PointerEvent) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('.card-link, .btn-primary, .hud-chip');
      if (last && last !== el) last.style.removeProperty('--spot');
      if (!el) { last = null; return; }
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.style.setProperty('--spot', '1');
      last = el;
    });
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
}
