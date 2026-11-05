import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Bottom sheet on phones, centered dialog on larger screens. Esc / backdrop close; focus is trapped. */
export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduce = useReducedMotion();
  const controls = useDragControls();
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
  const isDesktop = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="sheet-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            className="sheet"
            style={wide && isDesktop ? { width: 'min(760px, 94vw)' } : undefined}
            initial={reduce ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.96, x: '-50%', y: '-48%' } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.97, x: '-50%', y: '-48%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            drag={!isDesktop && !reduce ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            dragListener={false}
            dragControls={controls}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
          >
            <div className="sheet-grab-zone" onPointerDown={(e) => controls.start(e)} aria-hidden="true"><div className="sheet-grab" /></div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 id={id} className="text-lg font-bold">{title}</h2>
              <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
