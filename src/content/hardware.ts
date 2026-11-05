/**
 * Hardware library: the PLC, remote I/O and logic-module families you commonly meet in US plants,
 * described in words and as parametric shapes that the 3D viewer (src/three/HardwareModel.tsx)
 * and the 2D front view build procedurally.
 *
 * These are simplified, generic look-alikes for recognition only: approximate proportions,
 * neutral colors, no logos, no copied markings. Brand and product names are used descriptively.
 * Anything we are not certain of carries "// VERIFY" and is listed in docs/VERIFY.md.
 */
import type { SkinId } from '../skins';

export type UnitKind =
  | 'psu' | 'cpu' | 'safety' | 'di' | 'do' | 'ai' | 'ao' | 'comm' | 'coupler' | 'blank' | 'end' | 'brick' | 'logic' | 'hmi' | 'pc'
  | 'drive' | 'relay' | 'bas';

export interface HwUnit {
  kind: UnitKind;
  /** Width in mm (approximate). */
  w: number;
  /** Short generic label printed on the part. */
  label: string;
  /** Height override in mm. */
  h?: number;
  /** I/O point LEDs (inputs first, then outputs on bricks). */
  inputs?: number;
  outputs?: number;
  /** Terminal style. */
  term?: 'front' | 'top-bottom' | 'spring' | 'none';
  /** Hinged front cover / door. */
  door?: boolean;
  /** Small status display or LCD. */
  screen?: 'status' | 'lcd' | 'touch';
  /** RJ45 ports. */
  ports?: number;
  /** Memory-card slot. */
  sd?: boolean;
  /** Mode switch or key. */
  key?: boolean;
  /** Buttons beside a display (logic modules). */
  keys?: boolean;
}

export interface HwShape {
  /** din = DIN rail, chassis = slotted rack, panel = door cut-out (HMIs), plate = screwed to the back plate (drives). */
  mount: 'din' | 'chassis' | 'panel' | 'plate';
  /** Typical module height and depth in mm. */
  h: number;
  d: number;
  /** Body color (neutral palette, not a copy of any vendor color). */
  body: Body;
  units: HwUnit[];
}

export type Body = 'charcoal' | 'graphite' | 'light' | 'offwhite' | 'black';

export const BODY_COLORS: Record<Body, { body: string; face: string; text: string }> = {
  charcoal: { body: '#2b3038', face: '#353b45', text: '#d5dce6' },
  graphite: { body: '#40464f', face: '#4a515b', text: '#e2e8f0' },
  light: { body: '#b9bfc6', face: '#c9ced4', text: '#1f2630' },
  offwhite: { body: '#d9dcdf', face: '#e6e8ea', text: '#1f2630' },
  black: { body: '#1b1e23', face: '#24282f', text: '#cfd6df' },
};

export type HwStatus = 'current' | 'mature' | 'legacy';

export type HwCategory = 'plc' | 'io' | 'drive' | 'hmi' | 'safety' | 'bas' | 'logic';
export const CATEGORY_TEXT: Record<HwCategory, string> = {
  plc: 'PLCs', io: 'Remote I/O', drive: 'Drives (VFDs)', hmi: 'HMIs', safety: 'Safety relays', bas: 'Building automation', logic: 'Logic modules',
};

export const CATEGORY_ONE: Record<HwCategory, string> = {
  plc: 'PLC', io: 'Remote I/O', drive: 'Drive', hmi: 'HMI', safety: 'Safety relay', bas: 'Building automation', logic: 'Logic module',
};

/** What kind of device a model is, from its shape (so the data doesn't repeat itself). */
export function categoryOf(m: { shape: HwShape; plcInside?: boolean }): HwCategory {
  const k = m.shape.units.map((u) => u.kind);
  if (k.includes('drive')) return 'drive';
  if (k.includes('relay')) return 'safety';
  if (k.includes('bas')) return 'bas';
  if (k.includes('logic')) return 'logic';
  if (k[0] === 'hmi' && k.length === 1 && !m.plcInside) return 'hmi';
  if (k.includes('coupler') && !k.includes('cpu') && !k.includes('pc')) return 'io';
  return 'plc';
}

export interface HwModel {
  id: string;
  /** Brand guide id in brands.ts. */
  brand: string;
  name: string;
  /** What kind of controller it is. */
  role: string;
  status: HwStatus;
  /** Where you are likely to meet it in the US. */
  where: string;
  software: string;
  /** What to look at when you walk up to one. */
  spot: string[];
  shape: HwShape;
  /** Closest simulator dialect. */
  skin: SkinId;
  /** All-in-one HMI that also runs the control program. */
  plcInside?: boolean;
}

export const STATUS_TEXT: Record<HwStatus, string> = {
  current: 'Current family',
  mature: 'Mature (still installed and supported)',
  legacy: 'Legacy (still running in plants)',
};

// Short helpers keep the shape data readable.
const io = (kind: 'di' | 'do' | 'ai' | 'ao', w: number, n: number, extra: Partial<HwUnit> = {}): HwUnit => ({
  kind, w, label: { di: 'DI', do: 'DO', ai: 'AI', ao: 'AO' }[kind] + ` ${n}`, ...(kind === 'di' || kind === 'ai' ? { inputs: kind === 'di' ? Math.min(n, 16) : 0 } : { outputs: kind === 'do' ? Math.min(n, 16) : 0 }), ...extra,
});
const rep = (n: number, u: HwUnit) => Array.from({ length: n }, () => ({ ...u }));

export const HARDWARE: HwModel[] = [
  // ---------------- Rockwell Automation / Allen-Bradley ----------------
  {
    id: 'controllogix', brand: 'rockwell', name: 'ControlLogix (1756 chassis)', role: 'Large modular controller in a slotted chassis', status: 'current', skin: 'ab-logix',
    where: 'Big process lines, food and beverage, automotive, water plants, data-center utility controls. One of the most common large PLCs in the US.',
    software: 'Studio 5000 Logix Designer',
    spot: ['The key switch on the controller (RUN / REM / PROG).', 'The scrolling status display and the OK / RUN / FORCE / I/O LEDs on the controller.', 'Slot numbers start at 0 on the left. The controller is often, but not always, in slot 0.', 'Each I/O card has a removable terminal block behind a hinged door. Wire numbers are on the door label.', 'The power supply is the wide module on the far left.'],
    shape: { mount: 'chassis', h: 145, d: 140, body: 'charcoal', units: [
      { kind: 'psu', w: 55, label: 'PSU' },
      { kind: 'cpu', w: 35, label: 'CPU', screen: 'status', key: true, sd: true, ports: 1 },
      { kind: 'comm', w: 35, label: 'ENET', screen: 'status', ports: 2 },
      io('di', 35, 16, { door: true }), io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 8, { door: true }), io('ao', 35, 8, { door: true }),
      { kind: 'blank', w: 35, label: '' },
    ] },
  },
  {
    id: 'guardlogix', brand: 'rockwell', name: 'GuardLogix safety controller (1756)', role: 'Safety-rated controller that runs standard and safety tasks', status: 'current', skin: 'ab-logix',
    where: 'Machines with safety PLCs: robot cells, palletizers, presses. Safety I/O often sits out on the machine on a safety network.',
    software: 'Studio 5000 Logix Designer (safety task)',
    spot: ['Safety tags and routines are signature-locked. Changes need authorization and re-validation.', 'Look for the safety status LED (often labeled SAFE or SAFETY). // VERIFY per controller', 'Safety I/O is often distributed on the machine rather than in the chassis.'],
    shape: { mount: 'chassis', h: 145, d: 140, body: 'charcoal', units: [
      { kind: 'psu', w: 55, label: 'PSU' },
      { kind: 'safety', w: 35, label: 'SAFETY CPU', screen: 'status', key: true, sd: true, ports: 1 },
      { kind: 'comm', w: 35, label: 'ENET', screen: 'status', ports: 2 },
      io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }),
      { kind: 'blank', w: 35, label: '' }, { kind: 'blank', w: 35, label: '' },
    ] },
  },
  {
    id: 'compactlogix-5380', brand: 'rockwell', name: 'CompactLogix 5380 (5069 I/O)', role: 'Mid-size DIN-rail controller with slim I/O', status: 'current', skin: 'ab-logix',
    where: 'New machines and skids, packaging, OEM equipment, building utility skids. Very common on newer US installs.',
    software: 'Studio 5000 Logix Designer',
    spot: ['Mode switch and status display on the controller face.', 'Two Ethernet ports on the controller. Check how they are configured before plugging in.', 'I/O modules plug in to the right with removable front terminal blocks.', 'Separate field-side power terminals feed the I/O. // VERIFY per module'],
    shape: { mount: 'din', h: 140, d: 105, body: 'charcoal', units: [
      { kind: 'cpu', w: 90, label: 'CPU', screen: 'status', key: true, sd: true, ports: 2, term: 'front' },
      io('di', 22, 16, { term: 'front' }), io('di', 22, 16, { term: 'front' }), io('do', 22, 16, { term: 'front' }), io('do', 22, 16, { term: 'front' }), io('ai', 22, 8, { term: 'front' }), io('ao', 22, 4, { term: 'front' }),
      { kind: 'end', w: 10, label: '' },
    ] },
  },
  {
    id: 'compactlogix-5370', brand: 'rockwell', name: 'CompactLogix 5370 (1769 Compact I/O)', role: 'Mid-size DIN-rail controller with Compact I/O', status: 'mature', skin: 'ab-logix',
    where: 'Huge installed base on machines built roughly 2010 onward. You will troubleshoot a lot of these.',
    software: 'Studio 5000 Logix Designer (older projects may use RSLogix 5000)',
    spot: ['Modules have hinged doors over the terminals.', 'A right end cap closes the bus. A missing end cap faults the system.', 'Some smaller versions have built-in I/O on the controller. // VERIFY per catalog number'],
    shape: { mount: 'din', h: 118, d: 90, body: 'charcoal', units: [
      { kind: 'cpu', w: 70, label: 'CPU', screen: 'status', key: true, sd: true, ports: 2 },
      io('di', 35, 16, { door: true }), io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 4, { door: true }),
      { kind: 'end', w: 18, label: '' },
    ] },
  },
  {
    id: 'micro800', brand: 'rockwell', name: 'Micro800 (Micro820 / 850 / 870)', role: 'Small brick PLC with plug-in slots', status: 'current', skin: 'ab-micro800',
    where: 'Small machines, pump panels, conveyors, simple OEM equipment where a big controller is overkill.',
    software: 'Connected Components Workbench',
    spot: ['Input terminals on one edge, outputs on the other.', 'Plug-in slots on the front take small option modules.', 'Uses IEC-style variables, not Logix tags or SLC addresses.'],
    shape: { mount: 'din', h: 90, d: 80, body: 'charcoal', units: [
      { kind: 'brick', w: 160, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom', ports: 1 },
      io('di', 45, 16, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'micrologix', brand: 'rockwell', name: 'MicroLogix 1100 / 1400', role: 'Small brick PLC with a built-in LCD', status: 'legacy', skin: 'ab-slc',
    where: 'Very common in older small machines, well pumps, lift stations, HVAC skids. Check the maker\'s lifecycle status before buying spares. // VERIFY lifecycle',
    software: 'RSLogix 500 / RSLogix Micro',
    spot: ['The small LCD and arrow keys let you view I/O and some data without a laptop.', 'Addresses are SLC-style: I:0/0, O:0/0, B3, N7, T4.', 'An Ethernet port and a serial port are typical. // VERIFY per model'],
    shape: { mount: 'din', h: 90, d: 87, body: 'light', units: [
      { kind: 'brick', w: 180, label: 'CPU', inputs: 16, outputs: 12, term: 'top-bottom', ports: 1, screen: 'lcd' },
    ] },
  },
  {
    id: 'slc500', brand: 'rockwell', name: 'SLC 500 (1746 chassis)', role: 'Older modular PLC in a slotted chassis', status: 'legacy', skin: 'ab-slc',
    where: 'Older plants everywhere: grain, flour, water, manufacturing. Many still run decades later.',
    software: 'RSLogix 500',
    spot: ['Power supply is on the LEFT end of the chassis.', 'Processor in slot 0. Its key switch is RUN / PROG / REM.', 'Battery-backed memory: a low-battery LED is a warning, not a suggestion.', 'Addresses follow the slot: I:1/0 is slot 1, terminal 0.'],
    shape: { mount: 'chassis', h: 140, d: 145, body: 'light', units: [
      { kind: 'psu', w: 60, label: 'PSU' },
      { kind: 'cpu', w: 36, label: 'CPU', key: true, ports: 1 },
      io('di', 36, 16, { door: true }), io('di', 36, 16, { door: true }), io('do', 36, 16, { door: true }), io('do', 36, 16, { door: true }), io('ai', 36, 4, { door: true }),
    ] },
  },
  {
    id: 'plc5', brand: 'rockwell', name: 'PLC-5 (1771 chassis)', role: 'Large legacy chassis PLC', status: 'legacy', skin: 'ab-slc',
    where: 'Long-running process plants and mills. You may still find them, often mid-migration to ControlLogix.',
    software: 'RSLogix 5',
    spot: ['Tall, deep chassis with big swing-arm terminal blocks.', 'Addresses are octal and rack/group based. // VERIFY', 'Spare parts are scarce — protect every backup.'],
    shape: { mount: 'chassis', h: 250, d: 160, body: 'graphite', units: [
      { kind: 'cpu', w: 60, label: 'CPU', key: true, ports: 1 },
      io('di', 35, 16, { door: true }), io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 8, { door: true }), io('ao', 35, 4, { door: true }),
      { kind: 'psu', w: 60, label: 'PSU' },
    ] },
  },
  {
    id: 'point-io', brand: 'rockwell', name: 'POINT I/O (1734)', role: 'Slim remote I/O on DIN rail', status: 'current', skin: 'ab-logix',
    where: 'Out in the field near the machine, connected back to a Logix controller over EtherNet/IP.',
    software: 'Configured from the controller project in Studio 5000',
    spot: ['The adapter on the left has the network address switches and ports.', 'Each thin module shows module and network status LEDs plus point LEDs.', 'A field power distributor or potential distributor can start a new power group. // VERIFY'],
    shape: { mount: 'din', h: 75, d: 75, body: 'charcoal', units: [
      { kind: 'coupler', w: 54, label: 'ADAPTER', ports: 2, term: 'spring' },
      ...rep(3, io('di', 12, 4, { term: 'spring' })), ...rep(3, io('do', 12, 4, { term: 'spring' })), io('ai', 12, 2, { term: 'spring' }),
      { kind: 'end', w: 6, label: '' },
    ] },
  },
  {
    id: 'flex-io', brand: 'rockwell', name: 'FLEX I/O (1794)', role: 'Remote I/O on terminal bases', status: 'mature', skin: 'ab-logix',
    where: 'Remote I/O drops in older and mid-age systems, often on ControlNet or EtherNet/IP.',
    software: 'Configured from the controller project',
    spot: ['Each module sits on its own terminal base; the base holds the wiring.', 'The module can be swapped without rewiring the base. // VERIFY under power rules'],
    shape: { mount: 'din', h: 94, d: 70, body: 'charcoal', units: [
      { kind: 'coupler', w: 94, label: 'ADAPTER', ports: 1, term: 'front' },
      io('di', 94, 16, { term: 'front' }), io('do', 94, 16, { term: 'front' }), io('ai', 94, 4, { term: 'front' }),
    ] },
  },

  // ---------------- Siemens ----------------
  {
    id: 's7-1200', brand: 'siemens', name: 'SIMATIC S7-1200', role: 'Compact PLC with snap-on signal modules', status: 'current', skin: 'siemens-tia',
    where: 'Small and mid machines, imported equipment, HVAC and water skids, packaging. Common in the US, especially on European-built machines.',
    software: 'TIA Portal (STEP 7 Basic / Professional)',
    spot: ['RUN/STOP, ERROR and MAINT LEDs on the CPU face.', 'Hinged covers over the top and bottom terminal rows.', 'The memory-card slot is under the top cover.', 'Signal modules clip on the right; a signal board can plug into the CPU front.'],
    shape: { mount: 'din', h: 100, d: 75, body: 'graphite', units: [
      { kind: 'brick', w: 110, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom', door: true, ports: 2, sd: true },
      io('di', 45, 16, { term: 'top-bottom', door: true }), io('do', 45, 16, { term: 'top-bottom', door: true }), io('ai', 45, 4, { term: 'top-bottom', door: true }),
    ] },
  },
  {
    id: 's7-1500', brand: 'siemens', name: 'SIMATIC S7-1500', role: 'Mid-to-large modular PLC on a mounting rail', status: 'current', skin: 'siemens-tia',
    where: 'Larger machines and process lines, automotive suppliers, newer plant upgrades from S7-300.',
    software: 'TIA Portal (STEP 7 Professional)',
    spot: ['The CPU has a small display that shows diagnostics, addresses and module status.', 'Modules have front doors over a front connector; wiring lands on that connector.', 'A system power supply or load power supply may sit left of the CPU.', 'Read the diagnostic buffer first when something is wrong.'],
    shape: { mount: 'din', h: 147, d: 129, body: 'black', units: [
      { kind: 'psu', w: 35, label: 'PS', door: true },
      { kind: 'cpu', w: 35, label: 'CPU', screen: 'status', ports: 2, sd: true, key: true },
      io('di', 35, 16, { door: true }), io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 8, { door: true }), io('ao', 35, 4, { door: true }),
    ] },
  },
  {
    id: 'et200sp', brand: 'siemens', name: 'SIMATIC ET 200SP', role: 'Slim distributed I/O (PROFINET)', status: 'current', skin: 'siemens-tia',
    where: 'Remote I/O stations on machines and skids talking PROFINET back to an S7-1200/1500.',
    software: 'Configured in TIA Portal',
    spot: ['Interface module (IM) on the left with the PROFINET ports.', 'Thin I/O modules sit on base units; the base holds the wiring.', 'Light and dark base units start or continue a potential group. // VERIFY', 'A server module closes the station on the right.'],
    shape: { mount: 'din', h: 117, d: 75, body: 'graphite', units: [
      { kind: 'coupler', w: 50, label: 'IM', ports: 2 },
      ...rep(3, io('di', 15, 8, { term: 'spring' })), ...rep(2, io('do', 15, 8, { term: 'spring' })), io('ai', 15, 4, { term: 'spring' }), io('ao', 15, 2, { term: 'spring' }),
      { kind: 'end', w: 15, label: 'SRV' },
    ] },
  },
  {
    id: 's7-300', brand: 'siemens', name: 'SIMATIC S7-300', role: 'Classic modular PLC on a mounting rail', status: 'legacy', skin: 'siemens-classic',
    where: 'Huge installed base in older plants and machines. Many are being migrated to S7-1500.',
    software: 'STEP 7 Classic (SIMATIC Manager); some can be opened in TIA Portal. // VERIFY',
    spot: ['PS 307 power supply on the left, then the CPU.', 'The CPU has a mode selector and a slot for a memory card (MMC on many). // VERIFY per CPU', 'SF (system fault) red LED: read the diagnostic buffer.', 'Signal modules have front doors over a front connector.'],
    shape: { mount: 'din', h: 125, d: 120, body: 'graphite', units: [
      { kind: 'psu', w: 50, label: 'PS' },
      { kind: 'cpu', w: 40, label: 'CPU', key: true, sd: true, ports: 1 },
      io('di', 40, 16, { door: true }), io('di', 40, 16, { door: true }), io('do', 40, 16, { door: true }), io('ai', 40, 8, { door: true }),
    ] },
  },
  {
    id: 's7-400', brand: 'siemens', name: 'SIMATIC S7-400', role: 'Large legacy PLC in a rack', status: 'legacy', skin: 'siemens-classic',
    where: 'Large process plants, power and water. Often redundant (two CPUs).',
    software: 'STEP 7 Classic / PCS 7 in process plants',
    spot: ['Tall rack with the power supply on the left.', 'Redundant systems have two racks; never pull a CPU without the procedure.'],
    shape: { mount: 'chassis', h: 290, d: 220, body: 'graphite', units: [
      { kind: 'psu', w: 50, label: 'PS' },
      { kind: 'cpu', w: 50, label: 'CPU', key: true, sd: true, ports: 1 },
      { kind: 'comm', w: 25, label: 'CP' },
      io('di', 25, 32, { door: true }), io('di', 25, 32, { door: true }), io('do', 25, 32, { door: true }), io('ai', 25, 8, { door: true }),
    ] },
  },
  {
    id: 'logo', brand: 'siemens', name: 'LOGO! logic module', role: 'Small logic module with display and keys', status: 'current', skin: 'siemens-tia',
    where: 'Lighting, gates, small pumps, simple building and farm control. Replaces a handful of relays and timers.',
    software: 'LOGO! Soft Comfort',
    spot: ['Small display and four arrow keys plus ESC/OK on the base module.', 'Programs are function blocks, not ladder, on most versions. // VERIFY', 'Expansion modules clip to the right.'],
    shape: { mount: 'din', h: 90, d: 60, body: 'offwhite', units: [
      { kind: 'logic', w: 72, label: 'BASE', inputs: 8, outputs: 4, screen: 'lcd', keys: true, term: 'top-bottom', ports: 1 },
      io('di', 36, 4, { term: 'top-bottom' }),
    ] },
  },

  // ---------------- Schneider Electric / Modicon ----------------
  {
    id: 'm221', brand: 'schneider', name: 'Modicon M221', role: 'Small brick PLC', status: 'current', skin: 'modicon',
    where: 'Small machines, pump stations, HVAC panels, OEM equipment.',
    software: 'EcoStruxure Machine Expert – Basic',
    spot: ['Removable terminal blocks on top and bottom.', 'Expansion I/O clips to the right.', 'Built-in Ethernet on many versions. // VERIFY per model'],
    shape: { mount: 'din', h: 90, d: 70, body: 'offwhite', units: [
      { kind: 'brick', w: 110, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom', ports: 1, sd: true },
      io('di', 27, 16, { term: 'top-bottom' }), io('do', 27, 16, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'm241', brand: 'schneider', name: 'Modicon M241 / M251', role: 'Logic controller for machines', status: 'current', skin: 'iec',
    where: 'Packaging and material-handling machines, OEM skids.',
    software: 'EcoStruxure Machine Expert (CODESYS-based)',
    spot: ['IEC 61131-3 variables and POUs, not fixed addresses.', 'Expansion modules on the right; the M251 is a controller with no built-in I/O. // VERIFY'],
    shape: { mount: 'din', h: 90, d: 95, body: 'offwhite', units: [
      { kind: 'brick', w: 150, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom', ports: 2, sd: true },
      io('di', 27, 16, { term: 'top-bottom' }), io('ai', 27, 4, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'm340', brand: 'schneider', name: 'Modicon M340', role: 'Mid-size modular PLC on a backplane', status: 'current', skin: 'modicon',
    where: 'Water and wastewater, process skids, infrastructure. Common in US municipal plants.',
    software: 'EcoStruxure Control Expert (formerly Unity Pro)',
    spot: ['Power supply at the left end of the backplane.', 'Topological addresses follow rack.slot.channel, e.g. %I0.2.0.', 'Many systems expose %MW words to SCADA over Modbus TCP.'],
    shape: { mount: 'chassis', h: 100, d: 95, body: 'graphite', units: [
      { kind: 'psu', w: 64, label: 'PSU' },
      { kind: 'cpu', w: 32, label: 'CPU', ports: 1, sd: true },
      io('di', 32, 16, { term: 'front' }), io('di', 32, 16, { term: 'front' }), io('do', 32, 16, { term: 'front' }), io('ai', 32, 4, { term: 'front' }), io('ao', 32, 2, { term: 'front' }),
      { kind: 'comm', w: 32, label: 'NOE', ports: 1 },
    ] },
  },
  {
    id: 'm580', brand: 'schneider', name: 'Modicon M580', role: 'Large Ethernet-backplane PAC', status: 'current', skin: 'modicon',
    where: 'Larger process and infrastructure plants, often replacing Quantum.',
    software: 'EcoStruxure Control Expert',
    spot: ['Looks like a bigger M340; the backplane carries Ethernet.', 'Can be redundant (hot-standby) in critical systems.'],
    shape: { mount: 'chassis', h: 100, d: 100, body: 'graphite', units: [
      { kind: 'psu', w: 64, label: 'PSU' },
      { kind: 'cpu', w: 64, label: 'CPU', ports: 3, sd: true, screen: 'status' },
      io('di', 32, 16, { term: 'front' }), io('di', 32, 16, { term: 'front' }), io('do', 32, 16, { term: 'front' }), io('ai', 32, 8, { term: 'front' }),
    ] },
  },
  {
    id: 'quantum', brand: 'schneider', name: 'Modicon Quantum', role: 'Large legacy rack PLC', status: 'legacy', skin: 'modicon',
    where: 'Older water, wastewater and process plants. Often being migrated to M580.',
    software: 'Unity Pro / Control Expert, or older Concept and ProWORX. // VERIFY per system',
    spot: ['Tall modules with hinged terminal doors.', 'Many installs still use Modbus Plus networks. // VERIFY'],
    shape: { mount: 'chassis', h: 250, d: 105, body: 'graphite', units: [
      { kind: 'psu', w: 40, label: 'PSU' },
      { kind: 'cpu', w: 40, label: 'CPU', screen: 'lcd', key: true, ports: 1 },
      io('di', 40, 32, { door: true }), io('di', 40, 32, { door: true }), io('do', 40, 32, { door: true }), io('ai', 40, 8, { door: true }),
    ] },
  },

  // ---------------- Mitsubishi Electric ----------------
  {
    id: 'fx5u', brand: 'mitsubishi', name: 'MELSEC iQ-F (FX5U / FX5UC)', role: 'Compact brick PLC', status: 'current', skin: 'mitsubishi',
    where: 'Packaging and assembly machines, imported equipment, OEM machines.',
    software: 'GX Works3',
    spot: ['Terminal covers on the top and bottom.', 'RUN/STOP switch and SD card slot behind the front cover.', 'X/Y numbers are octal (X0–X7, X10…).'],
    shape: { mount: 'din', h: 90, d: 83, body: 'offwhite', units: [
      { kind: 'brick', w: 150, label: 'CPU', inputs: 16, outputs: 16, term: 'top-bottom', door: true, ports: 1, sd: true, key: true },
      io('di', 40, 16, { term: 'top-bottom', door: true }),
    ] },
  },
  {
    id: 'fx3u', brand: 'mitsubishi', name: 'MELSEC FX3U / FX3G', role: 'Compact brick PLC (previous generation)', status: 'mature', skin: 'mitsubishi',
    where: 'Very common on machines built in the 2000s and 2010s.',
    software: 'GX Works2 (older: GX Developer)',
    spot: ['Programming port on the front; Ethernet may be an add-on module. // VERIFY', 'Octal X/Y numbering.'],
    shape: { mount: 'din', h: 90, d: 86, body: 'offwhite', units: [
      { kind: 'brick', w: 150, label: 'CPU', inputs: 16, outputs: 16, term: 'top-bottom', door: true, key: true },
    ] },
  },
  {
    id: 'q-series', brand: 'mitsubishi', name: 'MELSEC Q series', role: 'Modular PLC on a base unit', status: 'mature', skin: 'mitsubishi',
    where: 'Larger Japanese-built lines, automotive suppliers.',
    software: 'GX Works2',
    spot: ['Power supply on the left of the base, then the CPU.', 'I/O numbering is hexadecimal on Q (X0–XF, X10…). // VERIFY'],
    shape: { mount: 'chassis', h: 98, d: 90, body: 'offwhite', units: [
      { kind: 'psu', w: 55, label: 'POWER' },
      { kind: 'cpu', w: 27, label: 'CPU', ports: 1, key: true, sd: true },
      io('di', 27, 16, { term: 'front' }), io('di', 27, 16, { term: 'front' }), io('do', 27, 16, { term: 'front' }), io('ai', 27, 4, { term: 'front' }),
    ] },
  },
  {
    id: 'iq-r', brand: 'mitsubishi', name: 'MELSEC iQ-R', role: 'High-end modular PLC on a base unit', status: 'current', skin: 'mitsubishi',
    where: 'Newer large machines and lines from Japanese OEMs.',
    software: 'GX Works3',
    spot: ['Looks like a newer Q series; the CPU has a small display on some models. // VERIFY'],
    shape: { mount: 'chassis', h: 106, d: 110, body: 'offwhite', units: [
      { kind: 'psu', w: 55, label: 'POWER' },
      { kind: 'cpu', w: 28, label: 'CPU', ports: 1, sd: true, key: true },
      io('di', 28, 16, { term: 'front' }), io('do', 28, 16, { term: 'front' }), io('do', 28, 16, { term: 'front' }), io('ai', 28, 8, { term: 'front' }),
    ] },
  },

  // ---------------- AutomationDirect ----------------
  {
    id: 'click', brand: 'automationdirect', name: 'CLICK / CLICK PLUS', role: 'Low-cost stackable PLC', status: 'current', skin: 'automationdirect',
    where: 'Small shops, farm and grain equipment, pump panels, home-built machines. Very popular in the US because of price and free software.',
    software: 'CLICK Programming Software',
    spot: ['CPU on the left, I/O modules snap on to the right.', 'Removable terminal blocks on the front.', 'Addresses are fixed: X001 inputs, Y001 outputs, C bits, DS integers.'],
    shape: { mount: 'din', h: 90, d: 70, body: 'light', units: [
      { kind: 'cpu', w: 50, label: 'CPU', inputs: 8, outputs: 6, term: 'front', ports: 1, key: true },
      io('di', 25, 8, { term: 'front' }), io('do', 25, 8, { term: 'front' }), io('ai', 25, 4, { term: 'front' }),
    ] },
  },
  {
    id: 'productivity2000', brand: 'automationdirect', name: 'Productivity2000', role: 'Tag-based modular PLC on a base', status: 'current', skin: 'automationdirect',
    where: 'Small-to-mid machines and process skids, upgrades from DirectLOGIC.',
    software: 'Productivity Suite',
    spot: ['Tag-based like Logix; no fixed addresses.', 'Removable front terminal blocks on each module.'],
    shape: { mount: 'chassis', h: 105, d: 80, body: 'light', units: [
      { kind: 'cpu', w: 50, label: 'CPU', ports: 2, sd: true, key: true, screen: 'status' },
      io('di', 30, 16, { term: 'front' }), io('di', 30, 16, { term: 'front' }), io('do', 30, 16, { term: 'front' }), io('ai', 30, 8, { term: 'front' }),
    ] },
  },
  {
    id: 'productivity1000', brand: 'automationdirect', name: 'Productivity1000', role: 'Stackable tag-based micro PLC', status: 'current', skin: 'automationdirect',
    where: 'Small machines that want tag-based programming at low cost.',
    software: 'Productivity Suite',
    spot: ['Modules stack to the right of the CPU on the DIN rail.'],
    shape: { mount: 'din', h: 90, d: 70, body: 'light', units: [
      { kind: 'cpu', w: 45, label: 'CPU', ports: 2, sd: true, key: true },
      io('di', 22, 8, { term: 'front' }), io('do', 22, 8, { term: 'front' }), io('ai', 22, 4, { term: 'front' }),
    ] },
  },
  {
    id: 'brx', brand: 'automationdirect', name: 'BRX (Do-more)', role: 'Brick PLC with expansion', status: 'current', skin: 'automationdirect',
    where: 'Motion and process machines, upgrades from DirectLOGIC.',
    software: 'Do-more Designer (has a built-in simulator)',
    spot: ['Built-in I/O with removable terminals; plug-in port module on some models. // VERIFY'],
    shape: { mount: 'din', h: 90, d: 75, body: 'light', units: [
      { kind: 'brick', w: 125, label: 'CPU', inputs: 12, outputs: 8, term: 'top-bottom', ports: 1, sd: true },
      io('di', 30, 8, { term: 'front' }),
    ] },
  },
  {
    id: 'dl06', brand: 'automationdirect', name: 'DirectLOGIC DL05 / DL06', role: 'Brick PLC (older)', status: 'mature', skin: 'automationdirect',
    where: 'Thousands of small US machines and panels from the 1990s onward.',
    software: 'DirectSOFT',
    spot: ['Octal I/O (X0–X7, X10…) and V-memory.', 'Option-card slots on the front. // VERIFY per model'],
    shape: { mount: 'din', h: 110, d: 70, body: 'light', units: [
      { kind: 'brick', w: 175, label: 'CPU', inputs: 16, outputs: 12, term: 'top-bottom', ports: 1 },
    ] },
  },
  {
    id: 'dl205', brand: 'automationdirect', name: 'DirectLOGIC DL205', role: 'Modular PLC on a base (older)', status: 'mature', skin: 'automationdirect',
    where: 'Older small-to-mid control panels.',
    software: 'DirectSOFT',
    spot: ['Power supply is built into the base. // VERIFY', 'CPU in the left slot.'],
    shape: { mount: 'chassis', h: 100, d: 75, body: 'light', units: [
      { kind: 'psu', w: 40, label: 'PSU' },
      { kind: 'cpu', w: 36, label: 'CPU', ports: 1, key: true },
      io('di', 23, 16, { term: 'front' }), io('di', 23, 16, { term: 'front' }), io('do', 23, 16, { term: 'front' }), io('ai', 23, 4, { term: 'front' }),
    ] },
  },

  // ---------------- Omron ----------------
  {
    id: 'omron-cp', brand: 'omron', name: 'Omron CP1 / CP2E', role: 'Compact brick PLC', status: 'current', skin: 'omron',
    where: 'Small machines, packaging, imported equipment.',
    software: 'CX-Programmer (CX-One)',
    spot: ['CIO bit addresses like 0.00 and 100.00.', 'Battery or retentive areas (H, D) keep values through power loss. // VERIFY per model'],
    shape: { mount: 'din', h: 90, d: 85, body: 'offwhite', units: [
      { kind: 'brick', w: 150, label: 'CPU', inputs: 18, outputs: 12, term: 'top-bottom', door: true, ports: 1 },
    ] },
  },
  {
    id: 'omron-cj2', brand: 'omron', name: 'Omron CJ2', role: 'Building-block modular PLC (no backplane)', status: 'mature', skin: 'omron',
    where: 'Mid-size machines from Japanese and US OEMs.',
    software: 'CX-Programmer',
    spot: ['Units connect side by side without a backplane.', 'An end cover on the right is required.'],
    shape: { mount: 'din', h: 90, d: 75, body: 'offwhite', units: [
      { kind: 'psu', w: 45, label: 'PSU' },
      { kind: 'cpu', w: 62, label: 'CPU', ports: 1, sd: true },
      io('di', 31, 16, { term: 'front' }), io('do', 31, 16, { term: 'front' }), io('ai', 31, 4, { term: 'front' }),
      { kind: 'end', w: 15, label: '' },
    ] },
  },
  {
    id: 'omron-nx', brand: 'omron', name: 'Omron NX1P / NX102 / NJ', role: 'Machine controller with slim NX I/O', status: 'current', skin: 'iec',
    where: 'Newer packaging and motion machines.',
    software: 'Sysmac Studio',
    spot: ['IEC variables; very different from CX-Programmer addressing.', 'Thin NX I/O units click on to the right of the CPU.'],
    shape: { mount: 'din', h: 100, d: 80, body: 'black', units: [
      { kind: 'cpu', w: 66, label: 'CPU', ports: 2, sd: true, screen: 'status' },
      ...rep(3, io('di', 12, 8, { term: 'spring' })), ...rep(2, io('do', 12, 8, { term: 'spring' })), io('ai', 12, 4, { term: 'spring' }),
      { kind: 'end', w: 12, label: '' },
    ] },
  },

  // ---------------- Emerson (formerly GE) ----------------
  {
    id: 'rx3i', brand: 'emerson', name: 'PACSystems RX3i', role: 'Modular PAC on a universal backplane', status: 'current', skin: 'iec',
    where: 'Water and wastewater, power, oil and gas, packaging. Strong in US municipal plants.',
    software: 'PAC Machine Edition',
    spot: ['Power supply on the left of the backplane, then the CPU.', 'Hinged terminal doors on I/O modules.', 'HMIs and SCADA usually read %R registers.'],
    shape: { mount: 'chassis', h: 135, d: 140, body: 'charcoal', units: [
      { kind: 'psu', w: 70, label: 'PSU' },
      { kind: 'cpu', w: 35, label: 'CPU', ports: 2, key: true, sd: true },
      io('di', 35, 16, { door: true }), io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 8, { door: true }), io('ao', 35, 4, { door: true }),
    ] },
  },
  {
    id: 'series-90-30', brand: 'emerson', name: 'Series 90-30', role: 'Legacy modular PLC on a base', status: 'legacy', skin: 'iec',
    where: 'Older water plants, lift stations, machines. Still running in many US towns.',
    software: 'Proficy Machine Edition, or older Logicmaster / VersaPro. // VERIFY',
    spot: ['Power supply in the leftmost slot.', 'Many have been replaced by RX3i, which has a migration path. // VERIFY'],
    shape: { mount: 'chassis', h: 135, d: 140, body: 'charcoal', units: [
      { kind: 'psu', w: 45, label: 'PSU' },
      { kind: 'cpu', w: 35, label: 'CPU', ports: 1 },
      io('di', 35, 16, { door: true }), io('do', 35, 16, { door: true }), io('ai', 35, 4, { door: true }),
    ] },
  },
  {
    id: 'versamax', brand: 'emerson', name: 'VersaMax / RSTi-EP I/O', role: 'DIN-rail controller and slice I/O', status: 'mature', skin: 'iec',
    where: 'Remote I/O and small control panels on Emerson/GE systems.',
    software: 'PAC Machine Edition',
    spot: ['Network adapter on the left, slim I/O slices to the right.'],
    shape: { mount: 'din', h: 100, d: 75, body: 'charcoal', units: [
      { kind: 'coupler', w: 50, label: 'NIU', ports: 2 },
      ...rep(3, io('di', 12, 8, { term: 'spring' })), ...rep(2, io('do', 12, 8, { term: 'spring' })), io('ai', 12, 4, { term: 'spring' }),
      { kind: 'end', w: 8, label: '' },
    ] },
  },

  // ---------------- Beckhoff ----------------
  {
    id: 'beckhoff-cx', brand: 'beckhoff', name: 'Embedded PC (CX) + EtherCAT terminals', role: 'PC-based controller with slice I/O', status: 'current', skin: 'iec',
    where: 'High-speed machines, motion, building automation in some newer facilities.',
    software: 'TwinCAT 3',
    spot: ['The embedded PC has Ethernet ports and a memory card; terminals clip on the right.', 'Each thin terminal shows RUN and point LEDs.', 'An end terminal closes the EtherCAT bus.'],
    shape: { mount: 'din', h: 100, d: 92, body: 'light', units: [
      { kind: 'pc', w: 60, label: 'PC', ports: 2, sd: true },
      ...rep(4, io('di', 12, 8, { term: 'spring' })), ...rep(3, io('do', 12, 8, { term: 'spring' })), io('ai', 12, 4, { term: 'spring' }),
      { kind: 'end', w: 12, label: '' },
    ] },
  },
  {
    id: 'beckhoff-ek', brand: 'beckhoff', name: 'EtherCAT coupler + terminals', role: 'Remote slice I/O', status: 'current', skin: 'iec',
    where: 'Remote I/O drops on Beckhoff and other EtherCAT systems.',
    software: 'TwinCAT 3 (scanned by the master)',
    spot: ['Coupler with IN and OUT Ethernet ports; the order of couplers matters on EtherCAT.'],
    shape: { mount: 'din', h: 100, d: 70, body: 'light', units: [
      { kind: 'coupler', w: 44, label: 'COUPLER', ports: 2, term: 'spring' },
      ...rep(4, io('di', 12, 8, { term: 'spring' })), ...rep(2, io('do', 12, 8, { term: 'spring' })),
      { kind: 'end', w: 12, label: '' },
    ] },
  },

  // ---------------- Other brands common in the US ----------------
  {
    id: 'idec-fc6a', brand: 'idec', name: 'IDEC MicroSmart FC6A', role: 'Compact brick PLC', status: 'current', skin: 'iec',
    where: 'Small machines, pump and HVAC panels, OEM equipment.',
    software: 'WindLDR (Automation Organizer)',
    spot: ['Built-in I/O with expansion on the right.', 'Some models have a built-in display or plug-in HMI. // VERIFY'],
    shape: { mount: 'din', h: 90, d: 80, body: 'light', units: [
      { kind: 'brick', w: 120, label: 'CPU', inputs: 16, outputs: 12, term: 'top-bottom', ports: 1, sd: true },
      io('di', 24, 8, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'unitronics', brand: 'unitronics', name: 'Unitronics UniStream / Vision', role: 'All-in-one HMI + PLC', status: 'current', skin: 'iec', plcInside: true,
    where: 'Small machines and water skids where the operator screen IS the PLC.',
    software: 'UniLogic (UniStream), VisiLogic (Vision)',
    spot: ['The PLC is built into the back of the touchscreen.', 'I/O modules snap onto the back of the panel or sit on the DIN rail. // VERIFY per model'],
    shape: { mount: 'panel', h: 130, d: 60, body: 'charcoal', units: [
      { kind: 'hmi', w: 180, label: 'HMI + PLC', screen: 'touch', ports: 1 },
    ] },
  },
  {
    id: 'wago-pfc', brand: 'wago', name: 'WAGO PFC200 + 750 I/O', role: 'Controller with slice I/O', status: 'current', skin: 'iec',
    where: 'Building automation, water, energy monitoring, OEM machines.',
    software: 'CODESYS-based (e!COCKPIT or CODESYS V3)',
    spot: ['Push-in spring terminals on every slice.', 'An end module closes the bus on the right.'],
    shape: { mount: 'din', h: 100, d: 70, body: 'light', units: [
      { kind: 'cpu', w: 62, label: 'PFC', ports: 2, sd: true, key: true, term: 'spring' },
      ...rep(3, io('di', 12, 8, { term: 'spring' })), ...rep(3, io('do', 12, 8, { term: 'spring' })), io('ai', 12, 4, { term: 'spring' }),
      { kind: 'end', w: 12, label: '' },
    ] },
  },
  {
    id: 'plcnext', brand: 'phoenix', name: 'Phoenix Contact PLCnext (AXC F)', role: 'Open controller with Axioline I/O', status: 'current', skin: 'iec',
    where: 'Infrastructure, energy, water, and newer OEM machines.',
    software: 'PLCnext Engineer',
    spot: ['IEC 61131-3 plus optional high-level languages.', 'I/O modules attach to the right.'],
    shape: { mount: 'din', h: 126, d: 75, body: 'light', units: [
      { kind: 'cpu', w: 45, label: 'CPU', ports: 2, sd: true },
      io('di', 35, 16, { term: 'spring' }), io('do', 35, 16, { term: 'spring' }), io('ai', 35, 8, { term: 'spring' }),
    ] },
  },
  {
    id: 'easy-e4', brand: 'eaton', name: 'Eaton easyE4', role: 'Programmable relay / logic module', status: 'current', skin: 'iec',
    where: 'Lighting, simple machines, building and farm controls.',
    software: 'easySoft',
    spot: ['Display and arrow keys on the base module (display versions).', 'Ladder or function-block programming. // VERIFY'],
    shape: { mount: 'din', h: 90, d: 60, body: 'offwhite', units: [
      { kind: 'logic', w: 72, label: 'BASE', inputs: 8, outputs: 4, screen: 'lcd', keys: true, term: 'top-bottom', ports: 1 },
      io('di', 36, 8, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'keyence-kv', brand: 'keyence', name: 'Keyence KV series', role: 'Building-block PLC', status: 'current', skin: 'iec',
    where: 'Automotive and electronics assembly, inspection cells. Growing in the US.',
    software: 'KV STUDIO',
    spot: ['CPU on the left with units added to the right; an end unit closes the bus. // VERIFY per model', 'Address-based devices (R relays, DM data memory). // VERIFY'],
    shape: { mount: 'din', h: 90, d: 95, body: 'black', units: [
      { kind: 'cpu', w: 60, label: 'CPU', ports: 1, sd: true, screen: 'status' },
      io('di', 30, 16, { term: 'front' }), io('do', 30, 16, { term: 'front' }), io('ai', 30, 4, { term: 'front' }),
      { kind: 'end', w: 12, label: '' },
    ] },
  },
  {
    id: 'groov-epic', brand: 'opto22', name: 'Opto 22 groov EPIC', role: 'Edge controller with built-in display', status: 'current', skin: 'iec',
    where: 'Water, energy monitoring, data and IIoT projects, test stands.',
    software: 'PAC Control, CODESYS, or groov tools. // VERIFY',
    spot: ['The processor has a small built-in touchscreen.', 'I/O modules sit in a chassis with the power supply.'],
    shape: { mount: 'chassis', h: 150, d: 95, body: 'charcoal', units: [
      { kind: 'psu', w: 35, label: 'PSU' },
      { kind: 'cpu', w: 75, label: 'CPU', screen: 'touch', ports: 2 },
      io('di', 30, 12, { term: 'top-bottom' }), io('do', 30, 12, { term: 'top-bottom' }), io('ai', 30, 8, { term: 'top-bottom' }), io('ao', 30, 4, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'delta-dvp', brand: 'delta', name: 'Delta DVP / AS series', role: 'Low-cost compact PLC', status: 'current', skin: 'mitsubishi',
    where: 'Low-cost OEM machines and imported equipment.',
    software: 'ISPSoft / WPLSoft (DVP), DIADesigner (newer AS). // VERIFY',
    spot: ['DVP uses X/Y addressing similar to Mitsubishi FX (octal). // VERIFY'],
    shape: { mount: 'din', h: 90, d: 80, body: 'charcoal', units: [
      { kind: 'brick', w: 130, label: 'CPU', inputs: 16, outputs: 16, term: 'top-bottom', ports: 1 },
    ] },
  },
  {
    id: 'bnr-x20', brand: 'bnr', name: 'B&R X20 system', role: 'Controller with slice I/O', status: 'current', skin: 'iec',
    where: 'Packaging, plastics and printing machines (often European OEMs).',
    software: 'B&R Automation Studio',
    spot: ['Thin slices with spring terminals; the bus module and terminal block form each slice.'],
    shape: { mount: 'din', h: 99, d: 85, body: 'charcoal', units: [
      { kind: 'cpu', w: 75, label: 'CPU', ports: 2, sd: true },
      ...rep(4, io('di', 12.5, 8, { term: 'spring' })), ...rep(2, io('do', 12.5, 8, { term: 'spring' })), io('ai', 12.5, 4, { term: 'spring' }),
    ] },
  },

  // ---------------- More PLC families still common in US plants ----------------
  {
    id: 'micrologix-1500', brand: 'rockwell', name: 'MicroLogix 1000 / 1200 / 1500', role: 'Older small brick PLCs', status: 'legacy', skin: 'ab-slc',
    where: 'Thousands of older US machines, pump panels and conveyors. You will meet them for years.',
    software: 'RSLogix 500 / RSLogix Micro',
    spot: ['SLC-style addresses (I:0/0, O:0/0, N7, T4).', 'The 1500 has a separate processor that clips onto the base unit. // VERIFY', 'Serial programming port on many; Ethernet only on some. // VERIFY per model'],
    shape: { mount: 'din', h: 118, d: 87, body: 'light', units: [
      { kind: 'brick', w: 160, label: 'CPU', inputs: 16, outputs: 12, term: 'top-bottom', door: true, key: true },
      io('di', 35, 8, { door: true }),
    ] },
  },
  {
    id: 'compactlogix-5480', brand: 'rockwell', name: 'CompactLogix 5480', role: 'Controller with a built-in Windows computer', status: 'current', skin: 'ab-logix',
    where: 'Newer machines that need data collection or analytics beside the control program.',
    software: 'Studio 5000 Logix Designer',
    spot: ['Looks like a wider 5380 with extra ports and a separate PC side. // VERIFY', 'Uses the same 5069 I/O.'],
    shape: { mount: 'din', h: 140, d: 105, body: 'charcoal', units: [
      { kind: 'cpu', w: 135, label: 'CPU', screen: 'status', key: true, sd: true, ports: 3, term: 'front' },
      io('di', 22, 16, { term: 'front' }), io('do', 22, 16, { term: 'front' }), io('ai', 22, 8, { term: 'front' }),
      { kind: 'end', w: 10, label: '' },
    ] },
  },
  {
    id: 's7-200', brand: 'siemens', name: 'SIMATIC S7-200', role: 'Older compact PLC', status: 'legacy', skin: 'siemens-classic',
    where: 'Very common on older imported machines and small panels. Many still run; spares are getting scarce.',
    software: 'STEP 7-Micro/WIN',
    spot: ['Hinged covers over the top and bottom terminal rows.', 'Addresses like I0.0, Q0.0, V memory (VB/VW/VD).', 'RUN/TERM/STOP switch under a front flap. // VERIFY', 'PPI serial programming port, not Ethernet (on most).'],
    shape: { mount: 'din', h: 80, d: 62, body: 'graphite', units: [
      { kind: 'brick', w: 140, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom', door: true, key: true },
      io('di', 46, 8, { term: 'top-bottom', door: true }),
    ] },
  },
  {
    id: 'fx2n', brand: 'mitsubishi', name: 'MELSEC FX2N / FX1N', role: 'Older brick PLC', status: 'legacy', skin: 'mitsubishi',
    where: 'Older packaging, plastics and imported machines across the US.',
    software: 'GX Developer / GX Works2',
    spot: ['Octal X/Y numbering.', 'Small RUN/STOP switch and a round programming port under the front cover. // VERIFY'],
    shape: { mount: 'din', h: 90, d: 87, body: 'offwhite', units: [
      { kind: 'brick', w: 150, label: 'CPU', inputs: 16, outputs: 16, term: 'top-bottom', door: true, key: true },
    ] },
  },
  {
    id: 'twido', brand: 'schneider', name: 'Modicon Twido', role: 'Older small PLC', status: 'legacy', skin: 'modicon',
    where: 'Older small machines and pump panels; replaced by the M221.',
    software: 'TwidoSuite / TwidoSoft',
    spot: ['Compact base with snap-on expansion modules.', 'Addresses like %I0.0, %Q0.0, %MW0.'],
    shape: { mount: 'din', h: 90, d: 70, body: 'offwhite', units: [
      { kind: 'brick', w: 95, label: 'CPU', inputs: 14, outputs: 10, term: 'top-bottom' },
      io('di', 23, 8, { term: 'front' }), io('do', 23, 8, { term: 'front' }),
    ] },
  },
  {
    id: 'productivity3000', brand: 'automationdirect', name: 'Productivity3000', role: 'Larger tag-based rack PLC', status: 'mature', skin: 'automationdirect',
    where: 'Mid-size process and machine control on AutomationDirect systems.',
    software: 'Productivity Suite',
    spot: ['Power supply and CPU on the left of the base.', 'Removable front terminal blocks.'],
    shape: { mount: 'chassis', h: 120, d: 100, body: 'light', units: [
      { kind: 'psu', w: 40, label: 'PSU' },
      { kind: 'cpu', w: 40, label: 'CPU', ports: 2, sd: true, key: true, screen: 'status' },
      io('di', 30, 16, { term: 'front' }), io('di', 30, 16, { term: 'front' }), io('do', 30, 16, { term: 'front' }), io('ai', 30, 8, { term: 'front' }),
    ] },
  },

  // ---------------- Drives (VFDs) ----------------
  ...[
    ['powerflex-525', 'rockwell', 'PowerFlex 525', 'Compact AC drive', 'current', 'Conveyors, fans, pumps and mixers on Rockwell plants. Probably the most common small drive in US plants.', 'Connected Components Workbench, Studio 5000 (Add-on Profile), or the keypad', 72, 152, 'charcoal'],
    ['powerflex-755', 'rockwell', 'PowerFlex 753 / 755', 'Large architecture-class AC drive', 'current', 'Big fans, pumps, process lines, and high-horsepower motors.', 'Connected Components Workbench / DriveExecutive / Studio 5000', 165, 400, 'charcoal'],
    ['powerflex-40', 'rockwell', 'PowerFlex 4 / 40', 'Older compact AC drive', 'legacy', 'Older conveyors and small machines; many are being replaced by PowerFlex 525. // VERIFY lifecycle', 'Keypad, Connected Components Workbench', 72, 152, 'charcoal'],
    ['sinamics-g120', 'siemens', 'SINAMICS G120 / G120C', 'Modular / compact AC drive', 'current', 'Machines and HVAC from European OEMs, process lines.', 'TIA Portal (Startdrive), or the operator panel', 73, 196, 'graphite'],
    ['sinamics-v20', 'siemens', 'SINAMICS V20', 'Basic compact AC drive', 'current', 'Simple pumps, fans and conveyors.', 'Built-in keypad (BOP)', 90, 166, 'graphite'],
    ['micromaster', 'siemens', 'MICROMASTER 420 / 440', 'Older AC drive', 'legacy', 'Older machines; replaced by SINAMICS. // VERIFY lifecycle', 'Operator panel, STARTER', 73, 173, 'graphite'],
    ['atv320', 'schneider', 'Altivar Machine ATV320', 'Compact machine drive', 'current', 'OEM machines, conveyors, packaging.', 'SoMove, or the keypad', 60, 150, 'offwhite'],
    ['atv630', 'schneider', 'Altivar Process ATV600 / ATV900', 'Process / HVAC drive', 'current', 'Pumps and fans in water plants and buildings.', 'SoMove, the graphic keypad, or the built-in web server // VERIFY', 145, 350, 'offwhite'],
    ['yaskawa-ga500', 'yaskawa', 'Yaskawa GA500', 'Compact AC drive', 'current', 'Conveyors, pumps, fans and OEM machines all over the US.', 'DriveWizard, DriveWizard Mobile, or the keypad', 68, 128, 'black'],
    ['yaskawa-ga800', 'yaskawa', 'Yaskawa GA800 / A1000', 'General-purpose AC drive', 'current', 'Larger fans, pumps, cranes and process lines. The A1000 is the older family it replaces.', 'DriveWizard, or the keypad', 140, 260, 'black'],
    ['yaskawa-v1000', 'yaskawa', 'Yaskawa V1000 / J1000', 'Older compact AC drive', 'mature', 'Older small machines; replaced by the GA500.', 'DriveWizard, or the keypad', 68, 128, 'black'],
    ['acs580', 'abb', 'ABB ACS580 / ACH580', 'General-purpose / HVAC drive', 'current', 'Pumps and fans everywhere. The ACH580 is the HVAC version you see in buildings and data centers.', 'Drive Composer, or the assistant control panel', 125, 330, 'offwhite'],
    ['acs355', 'abb', 'ABB ACS355 / ACS380', 'Machinery drive', 'current', 'Compact drives on OEM machines.', 'Drive Composer, or the panel', 70, 170, 'offwhite'],
    ['danfoss-fc102', 'danfoss', 'Danfoss VLT HVAC Drive FC 102', 'HVAC drive', 'current', 'Air handlers, cooling towers, chilled-water pumps — very common in US commercial buildings and data centers.', 'MCT 10, or the local control panel (LCP)', 90, 270, 'black'],
    ['danfoss-fc302', 'danfoss', 'Danfoss VLT AutomationDrive FC 302', 'Industrial drive', 'current', 'Process lines, conveyors, cranes.', 'MCT 10, or the LCP', 90, 270, 'black'],
    ['gs20', 'automationdirect', 'GS20 / DURApulse GS4', 'Low-cost AC drives', 'current', 'Small machines and shops buying from AutomationDirect.', 'GSoft2, or the keypad', 68, 128, 'light'],
    ['fr-e800', 'mitsubishi', 'FR-E800 / FR-A800', 'Compact / advanced inverters', 'current', 'Japanese-built machines and packaging lines.', 'FR Configurator2, or the operation panel', 68, 128, 'offwhite'],
    ['eaton-dg1', 'eaton', 'Eaton PowerXL DG1', 'General-purpose drive', 'current', 'HVAC, pumps and fans, often in Eaton MCCs.', 'Power Xpert inX, or the keypad // VERIFY', 100, 270, 'graphite'],
    ['delta-ms300', 'delta', 'Delta MS300 / C2000', 'Compact / general drives', 'current', 'Low-cost OEM machines and imported equipment.', 'VFDSoft, or the keypad // VERIFY', 68, 142, 'charcoal'],
  ].map(([id, brand, name, role, status, where, software, w, h, body]) => ({
    id: id as string, brand: brand as string, name: name as string, role: role as string, status: status as HwStatus, skin: 'iec' as SkinId,
    where: where as string, software: software as string,
    spot: [
      'Read the fault on the keypad before you reset anything, and write it down with the time.',
      'Check the DC bus and motor leads only with the drive locked out AND the bus discharged — wait the time on the warning label, then measure.',
      'Line (L1/L2/L3) lands at one end, motor (T1/T2/T3) at the other. Never swap them.',
      'Control terminals: run/stop, speed reference (0–10 V or 4–20 mA), relay outputs, and often Safe Torque Off (STO).',
    ],
    shape: { mount: 'plate' as const, h: h as number, d: Math.round((h as number) * 0.7), body: body as Body, units: [
      { kind: 'drive' as const, w: w as number, label: 'VFD', screen: 'lcd' as const, keys: true, ports: 1 },
    ] },
  })),

  // ---------------- HMIs ----------------
  ...[
    ['panelview-plus-7', 'rockwell', 'PanelView Plus 7', 'Touchscreen HMI', 'current', 'The operator screen on most Rockwell lines.', 'FactoryTalk View ME (or FactoryTalk Optix on newer models) // VERIFY', 260, 190],
    ['panelview-800', 'rockwell', 'PanelView 800', 'Small touchscreen HMI', 'current', 'Small machines with Micro800 PLCs.', 'Connected Components Workbench', 140, 110],
    ['siemens-comfort', 'siemens', 'SIMATIC Comfort / Unified Comfort panel', 'Touchscreen HMI', 'current', 'Operator screens on Siemens machines.', 'WinCC in TIA Portal', 270, 190],
    ['cmore-ea9', 'automationdirect', 'C-more EA9', 'Touchscreen HMI', 'current', 'Small and mid machines on AutomationDirect PLCs (and others).', 'C-more Programming Software', 210, 160],
    ['redlion-graphite', 'redlion', 'Red Lion Graphite / FlexEdge', 'HMI and protocol converter', 'current', 'Water, oil and gas, and plants that need to talk to many brands at once.', 'Crimson', 260, 190],
    ['harmony-hmi', 'schneider', 'Harmony HMI (formerly Magelis)', 'Touchscreen HMI', 'current', 'Schneider machines and water plants.', 'EcoStruxure Operator Terminal Expert / Vijeo Designer // VERIFY', 230, 170],
    ['got2000', 'mitsubishi', 'GOT2000', 'Touchscreen HMI', 'current', 'Mitsubishi-based machines.', 'GT Designer3', 230, 170],
  ].map(([id, brand, name, role, status, where, software, w, h]) => ({
    id: id as string, brand: brand as string, name: name as string, role: role as string, status: status as HwStatus, skin: 'iec' as SkinId,
    where: where as string, software: software as string,
    spot: [
      'Alarm banner and alarm history first: they tell you what tripped and when.',
      'Back up the HMI project file and note the runtime version before changing anything.',
      'The HMI talks to the PLC over Ethernet: if every value shows ### or stale, check the cable and the PLC connection.',
      'An HMI button is NOT a safety device. E-stops are hardwired.',
    ],
    shape: { mount: 'panel' as const, h: h as number, d: 60, body: 'charcoal' as Body, units: [
      { kind: 'hmi' as const, w: w as number, label: 'HMI', screen: 'touch' as const, ports: 1 },
    ] },
  })),

  // ---------------- Safety relays ----------------
  {
    id: 'pnoz', brand: 'pilz', name: 'Pilz PNOZ safety relays', role: 'Safety relays for E-stops, gates and light curtains', status: 'current', skin: 'iec',
    where: 'Machine guarding everywhere: E-stop circuits, guard doors, light curtains. Pilz invented the safety relay category.',
    software: 'None for basic relays; PNOZmulti Configurator for the configurable versions',
    spot: ['Power, input channel and output LEDs tell you which channel opened.', 'Reset type (manual or auto) is set by wiring or a dial. // VERIFY per model', 'Two channels: a fault on one channel blocks restart on purpose.'],
    shape: { mount: 'din', h: 98, d: 115, body: 'offwhite', units: [
      { kind: 'relay', w: 22.5, label: 'SAFE', term: 'top-bottom' }, { kind: 'relay', w: 22.5, label: 'SAFE', term: 'top-bottom' }, { kind: 'relay', w: 45, label: 'MULTI', term: 'top-bottom', screen: 'status' },
    ] },
  },
  {
    id: 'guardmaster', brand: 'rockwell', name: 'Guardmaster 440R safety relays', role: 'Single-function and configurable safety relays', status: 'current', skin: 'ab-logix',
    where: 'E-stop and guard-door circuits on Rockwell-based machines.',
    software: 'Connected Components Workbench for the configurable ones // VERIFY',
    spot: ['Status LEDs per channel and a rotary switch for the function on some models. // VERIFY', 'Safety relays are hardwired. Never jumper an input to "get running".'],
    shape: { mount: 'din', h: 113, d: 115, body: 'charcoal', units: [
      { kind: 'relay', w: 22.5, label: 'GSR', term: 'top-bottom' }, { kind: 'relay', w: 22.5, label: 'GSR', term: 'top-bottom' }, { kind: 'relay', w: 22.5, label: 'GSR', term: 'top-bottom' },
    ] },
  },

  // ---------------- Building automation (common in US data centers) ----------------
  {
    id: 'jace-8000', brand: 'tridium', name: 'Niagara JACE 8000 supervisor', role: 'Building automation supervisory controller', status: 'current', skin: 'iec',
    where: 'Data centers, hospitals, campuses: ties BACnet, Modbus and LonWorks devices from many vendors together.',
    software: 'Niagara Workbench (Niagara 4)',
    spot: ['Ethernet ports for the IP network, RS-485 for BACnet MS/TP or Modbus RTU.', 'Expansion modules can add more RS-485 or LON ports. // VERIFY', 'Many vendors sell Niagara under their own names.'],
    shape: { mount: 'din', h: 110, d: 60, body: 'black', units: [
      { kind: 'bas', w: 125, label: 'SUPERVISOR', ports: 2, term: 'top-bottom', screen: 'status' },
      { kind: 'comm', w: 32, label: 'RS-485', term: 'top-bottom' },
    ] },
  },
  {
    id: 'metasys', brand: 'jci', name: 'Metasys network engine + field controllers', role: 'Building automation system', status: 'current', skin: 'iec',
    where: 'Very common in US data centers and commercial buildings for chillers, CRAH/CRAC units, AHUs and pumps.',
    software: 'Metasys (SMP / web UI), Controller Configuration Tool (CCT) for field controllers // VERIFY',
    spot: ['Network engine (SNE/NAE) on the IP network; field controllers on BACnet MS/TP or IP below it. // VERIFY', 'Point names and alarms come from the site database — get the point list.', 'Field controllers have universal inputs/outputs: one terminal can be a temperature, a 0–10 V or a 4–20 mA.'],
    shape: { mount: 'din', h: 120, d: 60, body: 'offwhite', units: [
      { kind: 'bas', w: 120, label: 'ENGINE', ports: 2, term: 'top-bottom', screen: 'status' },
      { kind: 'bas', w: 150, label: 'FIELD CTRL', ports: 0, term: 'top-bottom', inputs: 10, outputs: 8 },
    ] },
  },
  {
    id: 'honeywell-webs', brand: 'honeywell', name: 'Honeywell WEBs / Spyder controllers', role: 'Building automation controllers', status: 'current', skin: 'iec',
    where: 'Commercial buildings and some data centers; Niagara-based supervisors with Spyder field controllers.',
    software: 'Niagara Workbench (WEBs) // VERIFY',
    spot: ['Field controllers on BACnet or LON trunks; supervisor on Ethernet.', 'Universal inputs for sensors, analog outputs for valves and dampers.'],
    shape: { mount: 'din', h: 110, d: 55, body: 'light', units: [
      { kind: 'bas', w: 150, label: 'CONTROLLER', ports: 1, term: 'top-bottom', inputs: 8, outputs: 8 },
    ] },
  },
  {
    id: 'desigo-pxc', brand: 'siemens', name: 'Desigo PXC automation stations', role: 'Building automation controllers', status: 'current', skin: 'iec',
    where: 'Siemens building automation in data centers, hospitals and campuses.',
    software: 'Desigo CC / ABT tools // VERIFY',
    spot: ['BACnet/IP controller with I/O modules or TX-I/O on the side. // VERIFY', 'Point names come from the project; get the points list.'],
    shape: { mount: 'din', h: 110, d: 60, body: 'offwhite', units: [
      { kind: 'bas', w: 90, label: 'PXC', ports: 2, term: 'top-bottom', screen: 'status' },
      io('ai', 32, 8, { term: 'top-bottom' }), io('do', 32, 8, { term: 'top-bottom' }),
    ] },
  },
  {
    id: 'smartx', brand: 'schneider', name: 'EcoStruxure Building SmartX controllers', role: 'Building automation controllers', status: 'current', skin: 'iec',
    where: 'Schneider building automation (formerly Andover / TAC) in commercial buildings and data centers.',
    software: 'EcoStruxure Building Operation (WorkStation) // VERIFY',
    spot: ['Server/controller on Ethernet with I/O modules on a terminal base. // VERIFY'],
    shape: { mount: 'din', h: 110, d: 60, body: 'offwhite', units: [
      { kind: 'bas', w: 90, label: 'AS-P', ports: 2, term: 'top-bottom', screen: 'status' },
      io('ai', 45, 8, { term: 'top-bottom' }), io('do', 45, 8, { term: 'top-bottom' }),
    ] },
  },
];

export const HARDWARE_BY_ID: Record<string, HwModel> = Object.fromEntries(HARDWARE.map((m) => [m.id, m]));

/** The model the simulator's 3D panel shows by default for each platform dialect. */
export const DEFAULT_HW: Record<SkinId, string> = {
  'ab-logix': 'compactlogix-5380',
  'ab-slc': 'slc500',
  'ab-micro800': 'micro800',
  'siemens-tia': 's7-1200',
  'siemens-classic': 's7-300',
  modicon: 'm340',
  mitsubishi: 'fx5u',
  automationdirect: 'click',
  omron: 'omron-cp',
  iec: 'generic',
};

/** What each kind of unit does, for the tap-to-learn sheet. */
export const UNIT_INFO: Record<UnitKind, { title: string; what: string }> = {
  psu: { title: 'Power supply', what: 'Feeds the backplane or bus that powers the CPU and modules. If its LED is out, nothing in the rack runs. Measure its incoming supply first.' },
  cpu: { title: 'Controller (CPU)', what: 'Runs the program scan. Look for RUN, FAULT and FORCE indicators, the mode switch, and the programming port.' },
  safety: { title: 'Safety controller', what: 'Runs safety-rated logic. It is locked and signature-protected. Only authorized, trained people change it, and changes need re-validation.' },
  di: { title: 'Digital input module', what: 'Turns field voltage (often 24 VDC or 120 VAC) into bits. Each point LED shows the module sees voltage on that terminal.' },
  do: { title: 'Digital output module', what: 'Turns bits into voltage for coils, lamps and solenoids. A lit LED means the logic is commanding that point on — not that the device worked.' },
  ai: { title: 'Analog input module', what: 'Reads 4–20 mA or 0–10 V signals from transmitters and turns them into numbers. Check the channel\'s wiring type and range settings.' },
  ao: { title: 'Analog output module', what: 'Sends 4–20 mA or 0–10 V to valves and drives. Measure the loop current in series with a meter set to mA.' },
  comm: { title: 'Communication module', what: 'Adds network ports (Ethernet, serial, fieldbus). Link and status LEDs tell you whether it sees the network.' },
  coupler: { title: 'Network adapter / coupler', what: 'The head of a remote I/O station. It talks to the controller over the network and passes data to the slices beside it. Check its address and network LEDs.' },
  blank: { title: 'Empty slot cover', what: 'Covers an unused slot to keep dust and fingers out of the backplane.' },
  end: { title: 'End cap / end module', what: 'Closes the bus on the right. On many systems a missing end cap stops the I/O from working.' },
  brick: { title: 'Brick PLC (all-in-one)', what: 'CPU, power and a fixed amount of I/O in one housing. Inputs usually on one edge, outputs on the other.' },
  logic: { title: 'Logic module', what: 'A small programmable relay with a display and keys. Handy for simple jobs: lights, gates, small pumps.' },
  hmi: { title: 'HMI with built-in PLC', what: 'The touchscreen and the controller are one unit. A dead screen can mean a dead controller too.' },
  pc: { title: 'Embedded PC controller', what: 'A small industrial PC that runs a real-time control runtime. It also has an operating system to look after.' },
  drive: { title: 'Variable frequency drive (VFD)', what: 'Turns fixed 60 Hz power into variable frequency to run a motor at any speed. Keypad shows speed, current and fault codes. Hazard: its DC bus stays charged after power is removed — wait the labeled time and measure before touching.' },
  relay: { title: 'Safety relay', what: 'Monitors E-stops, guard switches or light curtains on two channels and opens its safety outputs if either channel opens or disagrees. Hardwired; never bypass it.' },
  bas: { title: 'Building automation controller', what: 'Runs HVAC sequences (chillers, CRAH/CRAC, AHUs, pumps) and talks BACnet or Modbus to the building system. Universal inputs read temperatures and transmitters; outputs drive valves, dampers and starters.' },
};
