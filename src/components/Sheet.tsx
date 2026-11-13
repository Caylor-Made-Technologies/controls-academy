import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { prefersReducedMotion, usePresence } from '../lib/motion';
import { Icon } from './Icon';

/** Bottom sheet on phones (drag the handle down to close), centered dialog on larger screens. Esc / backdrop close; focus is trapped. */
export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const { mounted, shown } = usePresence(open);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('input, button, a, [tabindex]'))?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  // Drag the handle down to dismiss (phones). The sheet follows the finger; past 110 px or a quick flick closes it.
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onGrab = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || window.matchMedia?.('(min-width: 768px)').matches) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current?.setAttribute('data-dragging', 'true');
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    ref.current.style.setProperty('--drag-y', `${d.dy}px`);
  };
  const onDrop = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !ref.current) return;
    ref.current.removeAttribute('data-dragging');
    ref.current.style.removeProperty('--drag-y');
    const velocity = (d.dy / Math.max(1, performance.now() - d.t)) * 1000;
    if (d.dy > 110 || (d.dy > 24 && velocity > 600)) onClose();
  };

  if (!mounted) return null;
  return (
    <>
      <div className="sheet-backdrop" data-shown={shown} onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`sheet${wide ? ' sheet-wide' : ''}`} data-shown={shown}>
        <div className="sheet-grab-zone" onPointerDown={onGrab} onPointerMove={onMove} onPointerUp={onDrop} onPointerCancel={onDrop} aria-hidden="true"><div className="sheet-grab" /></div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id={id} className="text-lg font-bold">{title}</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
