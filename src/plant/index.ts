/** Machine registry. Every machine follows the PlantScene interface (docs/SIM-ARCHITECTURE.md). */
import { createMotorScene } from './motor';
import type { FaultDef, PlantScene } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyScene = PlantScene<any>;

export interface MachineEntry {
  id: string;
  title: string;
  summary: string;
  site: 'mill' | 'datacenter' | 'water' | 'general';
  create: () => AnyScene;
}

export const MACHINES: MachineEntry[] = [
  { id: 'motor', title: 'Motor start/stop station', summary: '3-wire control, seal-in, overload, hardwired E-stop.', site: 'general', create: createMotorScene },
];

export const MACHINE_BY_ID = new Map(MACHINES.map((m) => [m.id, m]));

export function createMachine(id: string): AnyScene {
  return (MACHINE_BY_ID.get(id) ?? MACHINES[0]).create();
}

/** Every fault on every machine, tagged with its machine. Fault ids are unique across machines. */
export function allFaults(): (FaultDef & { machine: string })[] {
  return MACHINES.flatMap((m) => m.create().faults.map((f) => ({ ...f, machine: m.id })));
}
