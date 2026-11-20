import { MACHINE_INFO } from '../plant/catalog';

/** Where each machine's edited program is saved. */
export const programKey = (machine: string) => (machine === 'motor' ? 'sim-program' : `sim-program:${machine}`);
/** Day one at a new plant: ticked items. */
export const DAY_ONE_KEY = 'day-one';

/**
 * What "Erase all progress" removes besides progress itself: every machine's program and the day-one ticks.
 * Settings (name, theme, text size) stay. B-020: only the motor program was removed.
 */
export const erasableKeys = (): string[] => [...MACHINE_INFO.map((m) => programKey(m.id)), DAY_ONE_KEY];
