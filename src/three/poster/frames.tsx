/**
 * Poster frames for every 3D view. Each frame has exactly the box the live view will fill (same height
 * classes), so swapping the still for the canvas moves nothing on the page. No three.js import.
 */
import type { ReactNode } from 'react';
import { Poster } from './Poster';
import type { PosterSpec } from './project';

/** Height + backdrop of each kind of 3D view. Shared by the live components and their posters. */
export const FRAME = {
  panel: 'relative h-[clamp(380px,68svh,560px)] lg:h-[540px] panel3d-bg',
  machine: 'relative h-[clamp(340px,60svh,520px)] lg:h-[500px] panel3d-bg',
  wiring: 'relative h-[clamp(320px,55svh,480px)] panel3d-bg rounded-xl overflow-hidden',
  inside: 'relative h-[clamp(300px,52svh,460px)] panel3d-bg rounded-xl overflow-hidden',
  meter: 'relative h-[clamp(360px,62svh,520px)] panel3d-bg rounded-xl overflow-hidden',
} as const;

export const CAPTION = 'text-xs text-muted px-3 py-2 m-0 border-t border-line';
export const MACHINE_CAPTION = 'Drag to orbit, pinch to zoom. Everything moves from the live simulation: outputs drive the machine, the machine drives the inputs. Tap a part for its wiring card. Spinning parts are shown slowed down so you can see them turn.';

/** The still shown while the 3D code loads. `label` is announced; the drawing itself is decorative. */
export function PosterFrame({ kind, spec, label, card, caption }: { kind: keyof typeof FRAME; spec?: PosterSpec; label: string; card?: boolean; caption?: ReactNode }) {
  const frame = (
    <div className={FRAME[kind]} role="status" aria-label={label} aria-busy="true">
      {spec && <Poster spec={spec} />}
      <span className="poster-note"><span className="spinner" aria-hidden="true" /> Loading 3D…</span>
    </div>
  );
  if (!card) return frame;
  return (
    <section className="card overflow-hidden relative">
      {frame}
      {caption && <p className={CAPTION}>{caption}</p>}
    </section>
  );
}
