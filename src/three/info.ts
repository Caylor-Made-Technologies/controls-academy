/** What each 3D component is, what it does, and how to test it. Generic hardware only. */
export interface PartInfo {
  title: string;
  what: string;
  test: string;
  safety?: string;
  lesson?: string;
}

export type PartId =
  | 'disconnect' | 'fuses' | 'transformer' | 'psu24' | 'plc-psu' | 'cpu' | 'di-card' | 'do-card'
  | 'contactor' | 'overload' | 'terminals' | 'duct' | 'switch' | 'motor' | 'station' | 'estop' | 'ground';

export const PARTS: Record<PartId, PartInfo> = {
  disconnect: { title: 'Main disconnect', what: 'The handle that removes incoming 480 VAC power from the whole panel. It\'s also where you hang your lock for LOTOTO.', test: 'With the handle OFF and locked, prove your meter, check every phase-to-phase and phase-to-ground on the LOAD side reads zero, then prove the meter again.', safety: 'The LINE side (top) is still live with the handle off. Only the upstream breaker kills it.', lesson: 'lototo' },
  fuses: { title: 'Fuses / branch protection', what: 'Protect the wires from short circuits. One per phase for the motor, plus small control fuses.', test: 'Live: measure voltage ACROSS each fuse — reading full voltage across a fuse means it\'s open. Dead and removed: continuity.', lesson: 'meter' },
  transformer: { title: 'Control power transformer', what: 'Steps 480 VAC down to 120 VAC for contactor coils, pilot lights and relays.', test: 'Measure the secondary (X1–X2) for ~120 VAC under load. Check its primary and secondary fuses.', lesson: 'relays-contactors' },
  psu24: { title: '24 VDC power supply', what: 'Makes 24 VDC for PLC inputs, sensors and DC relays. Most control power problems start here.', test: 'Measure + to − at the output terminals: about 24 VDC. Check the DC OK light. Dead inputs everywhere? Start here.', lesson: 'what-is-a-plc' },
  'plc-psu': { title: 'PLC power supply module', what: 'Powers the PLC backplane — the CPU and the I/O cards in this rack.', test: 'Its status LED should be on. Measure its incoming supply at the terminals.', lesson: 'what-is-a-plc' },
  cpu: { title: 'PLC CPU (processor)', what: 'Runs the program: reads inputs, solves the logic, writes outputs, over and over. LEDs show RUN, FORCE and FAULT.', test: 'Look before you touch: RUN steady = scanning. FORCE amber = forces installed. FAULT red = controller stopped — go online and read the fault.', safety: 'Don\'t change the mode switch or download without authorization — outputs can change state.', lesson: 'what-is-a-plc' },
  'di-card': { title: 'Digital input card', what: 'Turns 24 VDC field signals into bits. Each point has an LED: lit = the card sees voltage at that terminal.', test: 'Watch the LED while the device operates. LED off but device closed? Measure voltage at the input terminal to 0 V and half-split back to the device.', lesson: 'sinking-sourcing' },
  'do-card': { title: 'Digital output card', what: 'Turns bits into voltage for coils, lights and solenoids. LED lit = the logic is commanding it on.', test: 'LED on but nothing happens? Measure at the output terminal, then at the device. Voltage at the terminal but not at the coil = wiring, fuse or an interlock in between.', lesson: 'troubleshooting-method' },
  contactor: { title: 'Motor contactor (M1)', what: 'A heavy-duty relay. When its coil (A1–A2) energizes, the armature pulls in and the three main contacts connect the motor.', test: 'Voltage at A1–A2 but no pull-in = bad coil (LOTOTO, then check coil resistance). Pulled in but motor dead = check voltage across each main contact.', lesson: 'relays-contactors' },
  overload: { title: 'Overload relay (OL)', what: 'Senses motor current. If it stays too high too long it trips: the 95-96 contact opens and drops the contactor. The trip flag pops out.', test: 'Tripped? Find out why (jam, bearing, lost phase) before pressing reset. Measure running amps per phase and compare to the nameplate.', lesson: 'relays-contactors' },
  terminals: { title: 'Terminal blocks', what: 'Where field wiring lands. Each terminal carries a wire number that matches the print.', test: 'The best place to measure: find the wire number on the print, then put your probes on that terminal.', lesson: 'reading-ladder-prints' },
  duct: { title: 'Wire duct', what: 'Slotted channel that keeps wiring neat. Lift the cover to follow a wire.', test: 'Follow wire numbers, not colors — color codes vary by site and code. // VERIFY your site standard' },
  switch: { title: 'Ethernet switch', what: 'Connects the PLC to the HMI, drives and the plant network.', test: 'Link/activity lights on each port. No link = cable, port or device.', lesson: 'modbus' },
  motor: { title: 'Motor', what: 'A 3-phase induction motor driven by the contactor. Speed and current are live from the simulator.', test: 'Clamp each phase while running and compare to the nameplate full-load amps. Unequal phases = supply or winding problem.', lesson: 'three-wire' },
  station: { title: 'Operator station', what: 'Start (green, NO), Stop (red, NC), Reset, and the Running and Fault lights. Tap the buttons to operate the machine.', test: 'Press each button and watch its input LED on the PLC card. Stop should turn its input OFF when pressed.', lesson: 'contacts-coils' },
  estop: { title: 'E-stop', what: 'Red mushroom on yellow. Its contacts cut the contactor coil in hardware and tell the PLC to drop the seal-in.', test: 'Press it: the contactor must drop instantly regardless of the PLC. Twist to release; the motor must NOT restart on its own.', safety: 'Never jumper or bypass an E-stop circuit.', lesson: 'hardwired-safety' },
  ground: { title: 'Ground bar', what: 'Bonds the enclosure, back plate and equipment grounds together.', test: 'Check that it\'s tight and that every green/green-yellow conductor lands here.' },
};

/** Guided camera tour stops. */
export const TOURS: { id: string; label: string; part: PartId; pos: [number, number, number]; target: [number, number, number] }[] = [
  { id: 'overview', label: 'Whole panel', part: 'cpu', pos: [0.95, 0.2, 2.35], target: [0.3, -0.15, 0.1] },
  { id: 'plc', label: 'PLC rack', part: 'cpu', pos: [-0.02, 0.19, 0.42], target: [-0.07, 0.145, 0.05] },
  { id: 'contactor', label: 'Contactor', part: 'contactor', pos: [-0.12, -0.08, 0.6], target: [-0.2, -0.13, 0.05] },
  { id: 'overload', label: 'Overload for M1', part: 'overload', pos: [-0.1, -0.22, 0.55], target: [-0.2, -0.28, 0.05] },
  { id: 'terminals', label: 'Terminal strip', part: 'terminals', pos: [0.1, -0.3, 0.65], target: [0.08, -0.42, 0.04] },
  { id: 'station', label: 'Operator station', part: 'station', pos: [1.05, 0.0, 1.0], target: [0.82, -0.05, 0.12] },
];
