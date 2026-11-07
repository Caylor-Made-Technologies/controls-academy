/** Event counters for one-shot effects. No three.js import (unit-tested). */

/**
 * Counts "contacts opened while current was flowing". Uses the current from the previous reading,
 * because once the contacts are open the current is already zero.
 */
export function openingsUnderLoad(closed: () => boolean, amps: () => number, minAmps = 0.5): () => number {
  let prevClosed = closed();
  let prevAmps = amps();
  let count = 0;
  return () => {
    const c = closed();
    if (prevClosed && !c && prevAmps > minAmps) count++;
    prevClosed = c;
    prevAmps = amps();
    return count;
  };
}

/** Counts rising edges of a condition (e.g. a fuse fault appearing). */
export function risingEdges(cond: () => boolean): () => number {
  let prev = cond();
  let count = 0;
  return () => {
    const c = cond();
    if (c && !prev) count++;
    prev = c;
    return count;
  };
}
