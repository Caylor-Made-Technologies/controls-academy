/**
 * Colors of real hardware surfaces, shared by the 3D models and the flat front-view drawings so a module
 * looks the same in both. These are material colors (what the thing is made of), not UI colors: UI colors
 * are tokens in src/styles/tokens.css. No three.js import.
 */
export const PAL = {
  white: '#ffffff',
  black: '#000000',
  outline: '#00000055',
  outlineSoft: '#00000033',
  select: '#3d8bff',
  dinRail: '#8b949e',
  backplate: '#c9cfd5',
  panelPlate: '#b9c0c7',
  chassis: '#3b414b',
  keypadBezel: '#15181d',
  lcdGreen: '#9fc4a6',
  keyRun: '#16a34a',
  keyStop: '#c0392b',
  warningLabel: '#f5c400',
  terminalCover: '#2a2f37',
  relayWindow: '#9aa3ad',
  hmiGlass: '#0f2236',
  safetyText: '#ff8a8a',
  terminalDoor: '#5b6573',
  terminalBlock: '#1f242b',
  springClamp: '#eef1f4',
  ledInput: '#ffb547',
  ledOutput: '#3ddc97',
  screenOff: '#071018',
  lcdPale: '#9fb5a0',
} as const;

/** Insulation colors for wires the learner runs in the wiring trainer (chosen to be told apart, not a code). */
export const WIRE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
