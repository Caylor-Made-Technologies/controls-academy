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

/** Generic version for any machine: I/O image (analog rounded), controller state and the active fault. */
export function machineSignature(rt: SimRuntime): string {
  const bits = (a: boolean[]) => a.reduce((n, b, i) => (b ? n | (1 << i) : n), 0);
  return [
    bits(rt.io.DI), bits(rt.io.DO),
    rt.io.AI.map((v) => Math.round(v * 10)).join(','), rt.io.AO.map((v) => Math.round(v)).join(','),
    rt.scene.activeFault ?? '', rt.plc.fault ? 1 : 0, rt.plc.mode, rt.plc.hasForces ? 1 : 0,
  ].join('|');
}
