/** Checks that don't import three, so they're safe in the main bundle. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Should the 3D view open by default? Respects "2D only" and reduced motion (unless 3D was chosen explicitly). */
export function prefer3D(quality: string): boolean {
  if (quality === '2d') return false;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce && quality === 'auto') return false;
  return hasWebGL();
}
