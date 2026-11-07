/** No three.js import: unit-testable. */
import type { SimRuntime } from '../features/simulator/runtime';

/** Everything the 3D panel shows, as one string. Same string = nothing visible changed. */
export function panelSignature(rt: SimRuntime): string {
  const st = rt.scene.state;
  const bits = (a: boolean[]) => a.reduce((n, b, i) => (b ? n | (1 << i) : n), 0);
  return [
    bits(rt.io.DI), bits(rt.io.DO), st.contactor, st.olTripped, st.estopIn, st.startPressed, st.stopPressed, st.resetPressed,
    rt.scene.activeFault ?? '', rt.plc.fault ? 1 : 0, rt.plc.mode, rt.plc.hasForces ? 1 : 0,
  ].join('|');
}
