/** Machine registry. Every machine follows the PlantScene interface (docs/SIM-ARCHITECTURE.md). */
import { createMotorScene } from './motor';
import { createVfdScene } from './vfd';
import { createFwdRevScene } from './fwdrev';
import { createConveyorScene } from './conveyor';
import { createTankScene } from './tank';
import { createPumpsScene } from './pumps';
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
  { id: 'fwdrev', title: 'Forward/reverse screw conveyor', summary: 'Reversing starter, three interlock layers, zero-speed switch.', site: 'mill', create: createFwdRevScene },
  { id: 'conveyor', title: 'Bag conveyor with photo-eyes', summary: 'Photo-eyes, bag counting, jam detection, pallet counter.', site: 'mill', create: createConveyorScene },
  { id: 'tank', title: 'Tank level with PID', summary: '4–20 mA transmitter, PID fill valve, overshoot, fail-safe protection.', site: 'water', create: createTankScene },
  { id: 'pumps', title: 'Lift station: pump lead/lag', summary: 'Lead/lag, alternation, fail-over, backup high-level float.', site: 'water', create: createPumpsScene },
  { id: 'vfd', title: 'Fan on a VFD', summary: 'Speed control, ramps, analog reference, STO and drive faults.', site: 'datacenter', create: createVfdScene },
];

export const MACHINE_BY_ID = new Map(MACHINES.map((m) => [m.id, m]));

export function createMachine(id: string): AnyScene {
  return (MACHINE_BY_ID.get(id) ?? MACHINES[0]).create();
}

/** Every fault on every machine, tagged with its machine. Fault ids are unique across machines. */
export function allFaults(): (FaultDef & { machine: string })[] {
  return MACHINES.flatMap((m) => m.create().faults.map((f) => ({ ...f, machine: m.id })));
}
