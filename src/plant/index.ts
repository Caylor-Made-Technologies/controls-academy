/** Machine registry. Every machine follows the PlantScene interface (docs/SIM-ARCHITECTURE.md). */
import { createMotorScene } from './motor';
import { createVfdScene } from './vfd';
import { createFwdRevScene } from './fwdrev';
import { createConveyorScene } from './conveyor';
import { createTankScene } from './tank';
import { createPumpsScene } from './pumps';
import { createDatacenterScene } from './datacenter';
import { createMixerScene } from './mixer';
import type { FaultDef, PlantScene } from './types';
import { MACHINE_INFO, type MachineInfo } from './catalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyScene = PlantScene<any>;

export interface MachineEntry extends MachineInfo {
  create: () => AnyScene;
}

const CREATE: Record<string, () => AnyScene> = {
  motor: createMotorScene,
  fwdrev: createFwdRevScene,
  conveyor: createConveyorScene,
  tank: createTankScene,
  pumps: createPumpsScene,
  datacenter: createDatacenterScene,
  mixer: createMixerScene,
  vfd: createVfdScene,
};

export const MACHINES: MachineEntry[] = MACHINE_INFO.map((m) => ({ ...m, create: CREATE[m.id] }));

export const MACHINE_BY_ID = new Map(MACHINES.map((m) => [m.id, m]));

export function createMachine(id: string): AnyScene {
  return (MACHINE_BY_ID.get(id) ?? MACHINES[0]).create();
}

/** Every fault on every machine, tagged with its machine. Fault ids are unique across machines. */
export function allFaults(): (FaultDef & { machine: string })[] {
  return MACHINES.flatMap((m) => m.create().faults.map((f) => ({ ...f, machine: m.id })));
}
