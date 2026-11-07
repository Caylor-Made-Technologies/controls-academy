/**
 * "What's inside": exploded views of four devices every tech meets. Generic and vendor-neutral —
 * real products differ in layout; the parts and what they do are what matters.
 * Geometry is simple procedural shapes (meters); `dir` is where each part moves when exploded.
 */

export type Shape =
  | { kind: 'box'; size: [number, number, number] }
  | { kind: 'cyl'; r: number; h: number; axis?: 'x' | 'y' | 'z' };

export interface InsidePart {
  id: string;
  name: string;
  /** What it is and what it does, in plain English (first use of terms is explained). */
  what: string;
  /** Troubleshooting or safety tip tied to this part. */
  tip?: string;
  pos: [number, number, number];
  dir: [number, number, number];
  shape: Shape;
  color: string;
  metal?: number;
  opacity?: number;
}

export interface InsideDevice {
  id: 'overload' | 'prox' | 'input-card' | 'vfd';
  title: string;
  summary: string;
  safety: string;
  /** Camera distance hint (meters). */
  size: number;
  parts: InsidePart[];
}

export const INSIDE: InsideDevice[] = [
  {
    id: 'overload',
    title: 'Thermal overload relay',
    summary: 'Protects a motor from overheating by watching its current over time. It doesn\'t interrupt the motor current itself: it opens a contact in the contactor coil circuit, and the contactor drops out.',
    safety: 'The power terminals carry full motor voltage. Lock out the starter before touching it. Never raise the dial above the motor\'s rating to stop nuisance trips — find out why it trips.',
    size: 0.32,
    parts: [
      { id: 'housing', name: 'Housing', what: 'Molded case that mounts directly under the contactor (or on its own base), with the power poles passing through it.', pos: [0, 0, 0], dir: [0, 0, -1], shape: { kind: 'box', size: [0.1, 0.08, 0.06] }, color: '#475569', opacity: 0.55 },
      { id: 'bimetal', name: 'Heaters and bimetal strips (one per phase)', what: 'Motor current heats each strip; the two metals expand differently, so the strip bends. Heat builds the way it builds in the motor winding, so a short inrush doesn\'t trip it but a sustained overload does.', tip: 'A trip right after a reset usually means it hasn\'t cooled yet. Wait, then find the cause: a jam, low voltage, a lost phase or a dial set too low.', pos: [0, -0.005, 0.005], dir: [0, -1, 0.4], shape: { kind: 'box', size: [0.07, 0.035, 0.012] }, color: '#c7804a', metal: 0.8 },
      { id: 'slide', name: 'Trip mechanism', what: 'Slides that the bimetals push. When they move far enough the mechanism snaps over and opens the contacts. Many designs also trip faster when one phase is lost, because the strips bend unequally.', pos: [0, 0.018, 0.01], dir: [0, 0.6, 0.6], shape: { kind: 'box', size: [0.075, 0.008, 0.01] }, color: '#e5e7eb' },
      { id: 'dial', name: 'Current-setting dial', what: 'Sets the trip current. It is set from the motor nameplate full-load amps following the code and the manufacturer\'s instructions (service factor and ambient can matter).', tip: 'Never turn it up to "fix" trips. That only lets the motor cook.', pos: [-0.025, 0.03, 0.032], dir: [-0.6, 0.6, 1], shape: { kind: 'cyl', r: 0.011, h: 0.008, axis: 'z' }, color: '#2563eb' },
      { id: 'contacts', name: 'Auxiliary contacts 95–96 (NC) and 97–98 (NO)', what: '95–96 is closed in normal service and wired in series with the contactor coil; it opens on a trip and drops the contactor. 97–98 closes on a trip for an alarm light or a PLC input.', tip: 'A tripped overload looks like "the PLC output is on but the contactor won\'t pull in". Check 95–96 with the circuit de-energized, or check voltage across it live with proper PPE.', pos: [0.035, 0.03, 0.02], dir: [1, 0.6, 0.5], shape: { kind: 'box', size: [0.026, 0.018, 0.02] }, color: '#1f2937' },
      { id: 'reset', name: 'Reset and test buttons', what: 'Reset re-closes the contacts after the strips cool (many relays can be set to manual or automatic reset). Test trips the relay by hand to prove the contacts work.', tip: 'Automatic reset can restart a motor by itself. On anything that can hurt someone, use manual reset.', pos: [0.012, 0.03, 0.034], dir: [0.3, 1, 1], shape: { kind: 'cyl', r: 0.007, h: 0.01, axis: 'z' }, color: '#9ca3af' },
      { id: 'terminals', name: 'Power terminals 2/T1, 4/T2, 6/T3', what: 'The motor leads land here. On the line side, the relay\'s poles connect to the contactor\'s output.', pos: [0, -0.042, 0.015], dir: [0, -1, 0], shape: { kind: 'box', size: [0.09, 0.012, 0.02] }, color: '#d1d5db', metal: 0.9 },
    ],
  },
  {
    id: 'prox',
    title: 'Inductive proximity sensor',
    summary: 'Detects metal without touching it. A coil makes a small magnetic field at the face; metal in the field absorbs energy, and the sensor switches its output.',
    safety: 'Wire it de-energized. Never use a prox as the only way to stop a dangerous motion — that\'s what safety-rated devices and circuits are for.',
    size: 0.2,
    parts: [
      { id: 'face', name: 'Sensing face', what: 'Where the field comes out. Steel is detected at the nominal sensing distance; stainless, aluminum and brass are detected closer (check the datasheet\'s correction factors).', tip: 'A sensor that "sees" nothing may just be too far away, or a non-steel target may need to be closer.', pos: [0, 0, 0.055], dir: [0, 0, 1], shape: { kind: 'cyl', r: 0.0125, h: 0.004, axis: 'z' }, color: '#f59e0b' },
      { id: 'coil', name: 'Coil and ferrite core', what: 'Makes the alternating magnetic field. A shielded (flush) sensor focuses the field straight ahead; an unshielded one reaches farther but also sees metal around it.', pos: [0, 0, 0.042], dir: [0, 0.8, 0.8], shape: { kind: 'cyl', r: 0.01, h: 0.016, axis: 'z' }, color: '#c7804a', metal: 0.7 },
      { id: 'oscillator', name: 'Oscillator and evaluation circuit', what: 'Drives the coil and watches how strongly it oscillates. Metal in the field (eddy currents) damps the oscillation; when it drops past a threshold, the output switches. Hysteresis keeps it from chattering at the edge.', pos: [0, 0, 0.018], dir: [0, 1, 0], shape: { kind: 'box', size: [0.016, 0.004, 0.03] }, color: '#15803d' },
      { id: 'output', name: 'Output stage (PNP or NPN)', what: 'A transistor that switches the black wire. PNP (sourcing) switches it to +24 V; NPN (sinking) switches it to 0 V. Match it to the input card: PNP to a sinking input, NPN to a sourcing input.', pos: [0, 0, -0.008], dir: [0, -1, 0], shape: { kind: 'box', size: [0.014, 0.004, 0.012] }, color: '#1f2937' },
      { id: 'led', name: 'Indicator LED', what: 'Lights when the sensor\'s output is on. If it lights but the PLC input doesn\'t, the problem is between the sensor and the card: the wire, the card, or sinking/sourcing.', pos: [0, 0.013, -0.03], dir: [0, 1, -0.4], shape: { kind: 'box', size: [0.006, 0.003, 0.006] }, color: '#f59e0b' },
      { id: 'barrel', name: 'Threaded barrel and lock nuts', what: 'Sets the gap to the target. Tighten the nuts so the gap can\'t drift with vibration.', pos: [0, 0, 0.012], dir: [1, 0, 0], shape: { kind: 'cyl', r: 0.0135, h: 0.08, axis: 'z' }, color: '#9ca3af', metal: 0.85, opacity: 0.4 },
      { id: 'cable', name: 'Cable: brown +, blue −, black output', what: 'The common color convention for 3-wire DC sensors. Always check the datasheet and the label on the cable.', pos: [0, 0, -0.06], dir: [0, 0, -1], shape: { kind: 'cyl', r: 0.004, h: 0.05, axis: 'z' }, color: '#374151' },
    ],
  },
  {
    id: 'input-card',
    title: 'Digital input card',
    summary: 'Turns field voltages (switches, sensors) into bits the processor reads. Each channel is electrically isolated from the logic side.',
    safety: 'Field terminals can carry 24 VDC, 120 VAC or more depending on the card. Know which before you probe. Check the documentation before pulling a module under power.',
    size: 0.3,
    parts: [
      { id: 'rtb', name: 'Removable terminal block', what: 'The field wires land here. The block unplugs, so a failed module can be swapped without rewiring.', tip: 'Many blocks are keyed so they only fit the right module type. Don\'t force one.', pos: [0, 0, 0.035], dir: [0, 0, 1], shape: { kind: 'box', size: [0.035, 0.12, 0.025] }, color: '#1f2937' },
      { id: 'leds', name: 'Status LEDs (one per channel)', what: 'Show which inputs the card sees as ON. If a switch is closed and the LED is off, the problem is in the field wiring or supply. If the LED is on but the bit is off in the program, look at addressing, configuration or the module status.', pos: [0, 0.045, 0.02], dir: [0, 0.4, 1], shape: { kind: 'box', size: [0.02, 0.03, 0.004] }, color: '#3ddc97' },
      { id: 'circuit', name: 'Input circuits (resistor network and filter)', what: 'Limit the current and filter out electrical noise and contact bounce. The filter adds a small delay; very fast signals need a high-speed input.', pos: [0, 0, 0.005], dir: [0, 0, 0.5], shape: { kind: 'box', size: [0.004, 0.1, 0.05] }, color: '#15803d' },
      { id: 'opto', name: 'Optocouplers (isolation)', what: 'An LED and a light sensor in one package: the field side lights the LED, the logic side sees the light. No wire connects the two, so field faults and noise stay out of the processor.', pos: [0, -0.02, -0.01], dir: [0, -0.8, 0.3], shape: { kind: 'box', size: [0.008, 0.06, 0.012] }, color: '#e5e7eb' },
      { id: 'logic', name: 'Logic board', what: 'Collects the channel states and sends them over the backplane to the processor every update.', pos: [0, 0, -0.025], dir: [0, 0, -0.6], shape: { kind: 'box', size: [0.004, 0.1, 0.05] }, color: '#166534' },
      { id: 'backplane', name: 'Backplane connector', what: 'Plugs into the chassis or rail bus for power and communication with the processor.', pos: [0, -0.06, -0.035], dir: [0, -1, -1], shape: { kind: 'box', size: [0.02, 0.012, 0.03] }, color: '#c7804a', metal: 0.7 },
      { id: 'housing', name: 'Housing and door label', what: 'The door label is where the wiring diagram and terminal numbers usually live.', pos: [0, 0, 0], dir: [-1, 0, 0], shape: { kind: 'box', size: [0.04, 0.14, 0.08] }, color: '#334155', opacity: 0.35 },
    ],
  },
  {
    id: 'vfd',
    title: 'Variable frequency drive (VFD)',
    summary: 'Turns fixed 60 Hz power into variable frequency and voltage, so a standard induction motor runs at the speed you ask for. AC in → DC bus → switched back to AC out.',
    safety: 'The DC bus capacitors stay charged after power is removed. Wait the time on the drive\'s label, then measure the bus with a properly rated meter (live-dead-live) before touching anything inside.',
    size: 0.5,
    parts: [
      { id: 'input', name: 'Input terminals L1, L2, L3', what: 'Three-phase line power comes in here, through the disconnect and the fuses or breaker the manufacturer specifies.', pos: [-0.07, -0.11, 0.05], dir: [-0.5, -1, 0.4], shape: { kind: 'box', size: [0.06, 0.02, 0.02] }, color: '#d1d5db', metal: 0.9 },
      { id: 'rectifier', name: 'Rectifier (diodes)', what: 'Turns incoming AC into DC. This is the first stage of power conversion.', pos: [-0.06, -0.05, 0.0], dir: [-1, -0.3, 0.5], shape: { kind: 'box', size: [0.05, 0.03, 0.02] }, color: '#1f2937' },
      { id: 'caps', name: 'DC bus capacitors', what: 'Smooth and store the DC (on a 480 V drive the bus sits around 650–680 VDC). They stay charged for minutes after power is off.', tip: 'Never trust a dark keypad. Wait, then verify the bus is dead with a meter.', pos: [0, 0.0, 0.0], dir: [0, 0.3, 1], shape: { kind: 'cyl', r: 0.018, h: 0.06, axis: 'y' }, color: '#1e3a8a' },
      { id: 'igbt', name: 'Inverter (IGBTs)', what: 'Fast transistors that switch the DC bus on and off thousands of times a second (PWM) to build the output voltage and frequency the motor needs.', tip: 'The output is pulses, not a clean sine wave. Use a meter rated for drive outputs, and expect odd readings from a basic meter.', pos: [0.06, -0.05, 0.0], dir: [1, -0.3, 0.5], shape: { kind: 'box', size: [0.05, 0.03, 0.02] }, color: '#334155' },
      { id: 'heatsink', name: 'Heatsink and cooling fan', what: 'The rectifier and IGBTs make heat. A clogged heatsink or a dead fan leads to over-temperature trips.', tip: 'In a dusty mill, cleaning the heatsink is preventive maintenance.', pos: [0, -0.03, -0.045], dir: [0, 0, -1], shape: { kind: 'box', size: [0.16, 0.12, 0.03] }, color: '#9ca3af', metal: 0.85 },
      { id: 'control', name: 'Control board and keypad', what: 'Runs the drive: reads the run command and speed reference, applies parameters (accel, decel, limits), shows faults.', pos: [0, 0.06, 0.04], dir: [0, 1, 1], shape: { kind: 'box', size: [0.1, 0.06, 0.006] }, color: '#15803d' },
      { id: 'terminals', name: 'Control terminals and STO inputs', what: 'Run/stop, speed reference (4–20 mA or 0–10 V), relay outputs, and Safe Torque Off inputs from the safety circuit.', pos: [0, 0.0, 0.06], dir: [0, -0.2, 1], shape: { kind: 'box', size: [0.08, 0.015, 0.012] }, color: '#f97316' },
      { id: 'output', name: 'Output terminals T1, T2, T3', what: 'To the motor. Never put a contactor or a capacitor between the drive and the motor unless the drive maker says how.', pos: [0.07, -0.11, 0.05], dir: [0.5, -1, 0.4], shape: { kind: 'box', size: [0.06, 0.02, 0.02] }, color: '#d1d5db', metal: 0.9 },
      { id: 'housing', name: 'Enclosure', what: 'Holds it all, directs the cooling air and protects you from live parts. Keep the cover on.', pos: [0, 0, 0.0], dir: [0, 0, 1.6], shape: { kind: 'box', size: [0.2, 0.28, 0.13] }, color: '#e5e7eb', opacity: 0.25 },
    ],
  },
];

export const INSIDE_BY_ID = new Map(INSIDE.map((d) => [d.id, d]));
