import { conveyorScene } from './conveyor';
import { datacenterScene } from './datacenter';
import { fwdrevScene } from './fwdrev';
import { mixerScene } from './mixer';
import { pumpsScene } from './pumps';
import { tankScene } from './tank';
import type { MachineSceneDef } from './types';
import { vfdScene } from './vfd';

/** 3D scene per machine id. The motor station uses its own detailed panel (Panel3D). */
export const MACHINE_SCENES: Record<string, MachineSceneDef> = Object.fromEntries(
  [vfdScene, fwdrevScene, conveyorScene, tankScene, pumpsScene, datacenterScene, mixerScene].map((d) => [d.id, d]),
);
