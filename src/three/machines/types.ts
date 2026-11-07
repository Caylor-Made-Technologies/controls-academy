import type { ReactElement } from 'react';
import type { SimRuntime } from '../../features/simulator/runtime';

export interface MachineSceneProps {
  rt: SimRuntime;
  /** Device id (from the machine's `devices`) that is selected, if any. */
  selected: string | null;
  /** `at` is the world point that was tapped (the host glides the camera to it). */
  onPick: (deviceId: string, at?: [number, number, number]) => void;
}

/** One machine's 3D scene. Sizes in meters; the host frames the camera from `camera`. */
export interface MachineSceneDef {
  /** Plant machine id (src/plant/index.ts). */
  id: string;
  Scene: (p: MachineSceneProps) => ReactElement;
  camera: { pos: [number, number, number]; target: [number, number, number] };
  /** Rough radius of the scene (camera limits, shadow box). */
  radius: number;
  /** True while something visibly moves (spinning, filling, travelling). The host animates only then. */
  moving: (rt: SimRuntime) => boolean;
  /** Extra things the picture shows that aren't in the I/O image (settings like a fitted brake resistor). */
  signature?: (rt: SimRuntime) => string;
  /** One-line live readout for the HUD. */
  readout: (rt: SimRuntime) => string;
  /** Plain description for screen readers. */
  describe: string;
}
