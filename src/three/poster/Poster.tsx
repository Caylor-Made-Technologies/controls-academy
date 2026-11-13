import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { posterFaces, type PosterSpec } from './project';

/**
 * A still of a 3D scene drawn as flat SVG from the same camera angle. It shows from the first chunk and the
 * live canvas crossfades in over it. Decorative: the host labels the view.
 */
export const Poster = memo(function Poster({ spec, fade }: { spec: PosterSpec; fade?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [aspect, setAspect] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 1.9 : 0.72));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) setAspect(r.width / r.height);
  }, []);
  const faces = useMemo(() => posterFaces(spec, aspect), [spec, aspect]);
  // Once the live view has faded in over it, the drawing is removed: an invisible layer under a canvas still
  // has to be composited with every frame.
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!fade) { setGone(false); return; }
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [fade]);
  if (gone) return null;
  return (
    <svg ref={ref} className="poster" data-fade={fade ? 'out' : undefined} viewBox="-3 -1 6 2" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {faces.map((f, i) => <polygon key={i} points={f.points} className={`pf pf-${f.shade}${f.round ? ' pf-r' : ''}${f.glass ? ' pf-g' : ''}`} />)}
    </svg>
  );
});
