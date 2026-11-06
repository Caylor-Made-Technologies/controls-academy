import { Plc, verifyProgram } from '../../src/engine';
import type { AnyScene } from '../../src/plant';

/** Runs a machine with its shipped program in 10 ms ticks, like the simulator. */
export function harness(scene: AnyScene) {
  const plc = new Plc(scene.program());
  plc.setMode('RUN');
  const io = { DI: plc.fieldDI, DO: plc.fieldDO, AI: plc.fieldAI, AO: plc.fieldAO };
  const tick = (ms: number, each?: () => void) => {
    for (let t = 0; t < ms; t += 10) { scene.step(10, io); plc.scan(10); each?.(); }
  };
  const press = (field: string, ms = 200) => { scene.state[field] = true; tick(ms); scene.state[field] = false; tick(50); };
  const errors = () => verifyProgram(scene.program()).filter((i) => i.level === 'error');
  return { scene, plc, io, tick, press, errors, s: scene.state };
}
