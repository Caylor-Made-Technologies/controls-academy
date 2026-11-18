/**
 * Field-device library (Reference → Field devices): what each device is, how it is wired, how it shows on a
 * print, how it fails and how to test it safely. Data only; the 3D model is built from `kind` in
 * src/three/FieldDevice3D.tsx. Generic devices only: no brands, part numbers or invented specs. Anything that
 * varies by model ends with "// VERIFY <what>". Training material, not site procedure.
 */

export type DeviceKind =
  | 'prox-inductive' | 'prox-capacitive' | 'eye-through' | 'eye-retro' | 'eye-diffuse'
  | 'pushbutton' | 'selector' | 'pilot' | 'estop'
  | 'contactor' | 'overload' | 'starter' | 'mcc-bucket'
  | 'safety-relay' | 'light-curtain'
  | 'xmtr-pressure' | 'xmtr-level' | 'xmtr-temp' | 'solenoid-valve';

export type DeviceGroup = 'sensors' | 'operator' | 'power' | 'safety' | 'process';
export const GROUP_TEXT: Record<DeviceGroup, string> = { sensors: 'Sensors', operator: 'Operator devices', power: 'Motor control', safety: 'Safety devices', process: 'Process instruments' };

export interface FieldDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  group: DeviceGroup;
  /** One or two sentences: what it does, in plain words. */
  what: string;
  wiring: string[];
  /** How it appears on a print. */
  symbol: string;
  fails: string[];
  test: string[];
  safety?: string;
  lessons: string[];
}

const LOTO = 'Lock out and verify zero energy before you touch its terminals or take it apart.';

export const DEVICES: FieldDevice[] = [
  {
    id: 'prox-inductive', name: 'Inductive proximity sensor', kind: 'prox-inductive', group: 'sensors',
    what: 'Senses metal without touching it, using a magnetic field at its face. Common on shafts, cylinders and machine positions.',
    wiring: ['Three-wire DC is most common: brown = +24 V, blue = 0 V, black = output (US/IEC cable color convention). // VERIFY per sensor', 'PNP (sourcing) output goes to a sinking input card; NPN (sinking) goes to a sourcing card.', 'Two-wire types exist; they leak a small current when off, which some inputs see as ON.'],
    symbol: 'A diamond or square with the sensing face, or a NO/NC contact labeled PRS or PX, with its supply wires.',
    fails: ['Target too far away (sensing range is only a few millimeters, shorter for non-steel metals).', 'Face damaged or covered in metal chips.', 'Cable cut or connector loose.', 'Wrong output type (PNP vs NPN) after a replacement.'],
    test: ['Watch its LED as metal passes in front: no LED change means the sensor or its power.', 'Measure 24 V between brown and blue at the sensor.', 'Watch the PLC input LED; if the sensor LED changes but the input doesn\'t, check the cable and the card.'],
    lessons: ['sinking-sourcing'],
  },
  {
    id: 'prox-capacitive', name: 'Capacitive proximity sensor', kind: 'prox-capacitive', group: 'sensors',
    what: 'Senses almost any material (plastic, grain, liquid, flour) by the change it makes in an electric field. Often used for bin levels.',
    wiring: ['Wired like an inductive prox: usually three-wire DC with a PNP or NPN output. // VERIFY per sensor'],
    symbol: 'Like a proximity sensor; the print or device list says capacitive.',
    fails: ['Sensitivity set wrong: it sees the bin wall, or misses the product.', 'Product buildup on the face (flour, dust) holds it ON.', 'Moisture changes how it sees the product.'],
    test: ['Watch its LED as product reaches it.', 'Clean the face and re-check; adjust sensitivity only per its manual and with permission.'],
    safety: 'Reaching into a bin or hopper can be a confined-space or engulfment hazard: follow the permit and lockout rules.',
    lessons: ['sinking-sourcing'],
  },
  {
    id: 'eye-through', name: 'Photo-eye: through-beam', kind: 'eye-through', group: 'sensors',
    what: 'A separate emitter and receiver face each other; an object breaking the beam is detected. Longest range and most reliable.',
    wiring: ['The emitter needs only power; the receiver has power and the output. // VERIFY per model', 'Light-operate or dark-operate is a setting: it decides whether the output is on with the beam made or broken.'],
    symbol: 'An emitter and receiver pair, often drawn as two boxes with an arrow between them.',
    fails: ['Misaligned after a bump.', 'Dirty lenses.', 'Light-operate / dark-operate set wrong after a replacement.'],
    test: ['Check both LEDs: power on the emitter, signal strength on the receiver.', 'Block and unblock the beam and watch the output LED and the PLC input.'],
    lessons: ['sinking-sourcing'],
  },
  {
    id: 'eye-retro', name: 'Photo-eye: retroreflective', kind: 'eye-retro', group: 'sensors',
    what: 'The sensor and a reflector face each other; the sensor sees its own light come back until something blocks it. One wired device.',
    wiring: ['Wired like a prox: power plus a PNP or NPN output. // VERIFY per model'],
    symbol: 'A sensor box with an arrow to a reflector.',
    fails: ['Reflector missing, dirty or knocked out of line.', 'Shiny objects reflect the light back and aren\'t seen (a polarized model helps).'],
    test: ['Watch the LED with the reflector in place, then with a hand in the beam.', 'Clean the lens and the reflector.'],
    lessons: ['sinking-sourcing'],
  },
  {
    id: 'eye-diffuse', name: 'Photo-eye: diffuse', kind: 'eye-diffuse', group: 'sensors',
    what: 'Sees light bounced back off the object itself. Short range; dark or shiny objects are harder to see.',
    wiring: ['Wired like a prox: power plus a PNP or NPN output. // VERIFY per model'],
    symbol: 'A sensor box with an arrow to the object.',
    fails: ['Background (a shiny wall) reflects light and holds it ON.', 'Dark objects not seen; sensitivity set wrong.'],
    test: ['Watch the LED with and without the object, at the real distance.'],
    lessons: ['sinking-sourcing'],
  },
  {
    id: 'pushbutton', name: 'Pushbutton', kind: 'pushbutton', group: 'operator',
    what: 'A momentary button with contact blocks behind it. Start buttons are usually green with a normally open (NO) contact; Stop buttons are red (or black) with a normally closed (NC) contact.',
    wiring: ['Contact blocks clip behind the operator; each block is NO or NC (numbered x3–x4 for NO, x1–x2 for NC).', 'A Stop button uses its NC contact so a broken wire stops the machine (fail-safe).'],
    symbol: 'NO: contacts with a plunger above, not touching. NC: contacts with the bar touching underneath.',
    fails: ['Contact block fallen off the back of the operator.', 'Contacts worn or dirty.', 'Wrong block type (NO where NC was needed).'],
    test: [`${LOTO} Then check continuity across the block with the button pressed and released.`, 'Live: watch the PLC input LED as you press it.'],
    lessons: ['three-wire'],
  },
  {
    id: 'selector', name: 'Selector switch', kind: 'selector', group: 'operator',
    what: 'A maintained switch with two or three positions, like Hand-Off-Auto or Local-Remote. Each position closes certain contacts.',
    wiring: ['The contact arrangement is shown in a truth table on the print: which contacts are closed in each position.'],
    symbol: 'Contacts with a dashed line to the operator and a table of positions marked with X.',
    fails: ['Left in the wrong position (the most common "fault").', 'Contact block worn or loose.'],
    test: ['Check its position first.', `${LOTO} Then check each contact against the print's truth table.`],
    lessons: ['three-wire'],
  },
  {
    id: 'pilot', name: 'Pilot light', kind: 'pilot', group: 'operator',
    what: 'An indicator lamp on a panel door: running, fault, power on. Most are LED now.',
    wiring: ['Two terminals: power from a PLC output or a contact, and the return.', 'Many have a push-to-test feature that lights them without the circuit. // VERIFY per model'],
    symbol: 'A circle with rays, or a circle with a color letter (G, R, A).',
    fails: ['LED or bulb failed.', 'Wrong voltage module after a replacement.'],
    test: ['Use push-to-test if it has it.', 'Measure voltage at its terminals when it should be on.'],
    lessons: ['three-wire'],
  },
  {
    id: 'estop', name: 'Emergency stop (E-stop)', kind: 'estop', group: 'safety',
    what: 'A red mushroom button on a yellow background that latches in when pressed and stops the machine. It must be released (twist or pull) before the machine can be restarted.',
    wiring: ['Uses NC contacts, usually two channels, wired into a safety relay or safety controller, not just a PLC input.', 'Releasing it should never restart the machine by itself.'],
    symbol: 'An NC contact with a mushroom-head operator.',
    fails: ['Contact block separated from the operator: pressing it does nothing (some blocks detect this). // VERIFY per model', 'One channel failed: the safety relay won\'t reset.'],
    test: ['Test it as your site\'s procedure says: press it with the machine running and confirm it stops.', 'A safety relay that won\'t reset often points to one channel of an E-stop or gate switch.'],
    safety: 'Never bypass, jumper or tape an E-stop or its contacts. Testing and repair of safety circuits needs authorization.',
    lessons: ['hardwired-safety'],
  },
  {
    id: 'contactor', name: 'Contactor', kind: 'contactor', group: 'power',
    what: 'A heavy-duty relay that switches motor power. A small control voltage on the coil pulls in three main contacts.',
    wiring: ['Coil: A1–A2. Main contacts: 1/L1–2/T1, 3/L2–4/T2, 5/L3–6/T3.', 'Auxiliary contacts (13–14 NO) are often used to seal in the start circuit or tell the PLC it closed.'],
    symbol: 'A coil (circle with M) on the control ladder, and three contacts in the power diagram with the same name.',
    fails: ['Coil open (burnt): no pull-in.', 'Contacts pitted or welded: a phase missing, or it won\'t drop out.', 'Chattering from low coil voltage.'],
    test: ['Measure coil voltage at A1–A2 when it should pull in.', `${LOTO} Then measure coil resistance and inspect the contacts.`],
    safety: 'A welded contact can keep a motor running after Stop: lock out at the disconnect, never at the contactor.',
    lessons: ['relays-contactors'],
  },
  {
    id: 'overload', name: 'Overload relay', kind: 'overload', group: 'power',
    what: 'Protects the motor from overheating by measuring current over time. When it trips, its 95–96 contact opens the starter\'s coil circuit.',
    wiring: ['Mounts under the contactor; the motor leads come off its T1–T3.', '95–96 (NC) in series with the coil circuit; 97–98 (NO) for a fault light or PLC input.', 'Dial set per the motor nameplate and the maker\'s instructions. // VERIFY setting rule per maker'],
    symbol: 'Heater elements in the power lines and an NC contact marked OL in the control circuit.',
    fails: ['Tripped (doing its job): find out why.', 'Set too low.', 'Left on automatic reset, so the motor restarts by itself.'],
    test: ['Look at the trip indicator.', 'Measure running current on each phase and compare with the setting.'],
    safety: 'Never raise the setting or jumper 95–96 to keep a motor running. A motor that keeps tripping is telling you something.',
    lessons: ['protection-devices'],
  },
  {
    id: 'starter', name: 'Motor starter', kind: 'starter', group: 'power',
    what: 'A contactor and an overload relay together: the standard way to start an across-the-line motor.',
    wiring: ['Line power in at the top, motor out at the bottom of the overload.', 'Control circuit: Stop (NC), Start (NO) with a seal-in contact, then the coil and the overload\'s 95–96.'],
    symbol: 'On the ladder: the M coil with the OL contact in series; in the power diagram: M contacts and OL heaters.',
    fails: ['See contactor and overload relay.'],
    test: ['Follow the three-wire control circuit with the print: Stop, Start, seal-in, coil, overload.'],
    lessons: ['three-wire'],
  },
  {
    id: 'mcc-bucket', name: 'MCC bucket', kind: 'mcc-bucket', group: 'power',
    what: 'A plug-in section of a motor control center: a disconnect, fuses or a breaker, a starter and its control transformer in one removable unit.',
    wiring: ['The bucket plugs onto the MCC\'s vertical bus bars at the back; the handle on the door is the disconnect.', 'Control wiring comes out through terminal blocks in the bucket.'],
    symbol: 'A dashed box on the one-line or the motor schematic, with the bucket number.',
    fails: ['Blown fuse or tripped breaker inside.', 'Loose stab or connection: heat damage.', 'Control transformer fuse blown.'],
    test: ['Check the disconnect handle position and the bucket\'s indicators.', 'Measurements inside a live MCC need an energized-work permit and arc-flash PPE.'],
    safety: 'Racking or removing a bucket and opening a live bucket are high arc-flash risk: follow the arc-flash label and your site\'s rules. Lock out at the bucket handle.',
    lessons: ['protection-devices'],
  },
  {
    id: 'safety-relay', name: 'Safety relay', kind: 'safety-relay', group: 'safety',
    what: 'A monitored relay that watches E-stops, gate switches or light curtains on two channels and removes power when any opens. It checks its own wiring and contacts.',
    wiring: ['Two input channels from each safety device, a reset input, and safety outputs (often 13–14, 23–24) that feed the contactors\' coils.', 'Feedback contacts from the contactors confirm they really opened. // VERIFY per model'],
    symbol: 'A box with its terminal numbers, drawn in the safety circuit section of the print.',
    fails: ['Won\'t reset: one channel open, a feedback contact stuck, or a short between channels.', 'Reset pressed while a device is still open.'],
    test: ['Read its status LEDs against the manual: they usually show which channel is open.', 'Check each safety device on its own.'],
    safety: 'Never jumper a safety relay input or output. Changes to safety circuits need authorization and a validation test.',
    lessons: ['safety-systems'],
  },
  {
    id: 'light-curtain', name: 'Light curtain', kind: 'light-curtain', group: 'safety',
    what: 'A row of infrared beams between an emitter and a receiver post. Breaking any beam stops the hazardous motion before a hand can reach it.',
    wiring: ['Two safety outputs (OSSDs) go to a safety relay or safety controller.', 'Mounting distance from the hazard is calculated from the machine\'s stopping time. // VERIFY per standard and machine'],
    symbol: 'An emitter and receiver pair with a row of beams, in the safety section of the print.',
    fails: ['Misaligned or dirty: a "blocked" fault with nothing in it.', 'Muting or blanking set wrong.', 'Mounting moved so the safety distance is no longer right.'],
    test: ['Test it per the maker\'s procedure (often with a test rod) and your site\'s schedule.'],
    safety: 'Never move, mute or bypass a light curtain to keep production running. Its distance from the hazard is part of the safety design.',
    lessons: ['safety-systems'],
  },
  {
    id: 'xmtr-pressure', name: 'Pressure transmitter', kind: 'xmtr-pressure', group: 'process',
    what: 'Measures pressure and sends it as a 4–20 mA signal: 4 mA at the bottom of its range, 20 mA at the top.',
    wiring: ['Two-wire (loop-powered) is most common: +24 V to its + terminal, the signal returns through the analog input.', 'The range is set on the transmitter; the PLC scaling must match it.'],
    symbol: 'A circle with PT and a tag number (ISA-5.1 style) on the P&ID.',
    fails: ['Open loop: 0 mA or under 4 mA.', 'Plugged impulse line: reading stuck.', 'Range or scaling mismatch.'],
    test: ['Measure loop current with the loop in manual and operations\' OK.', 'Compare with a local gauge.'],
    safety: 'Never loosen a pressure fitting under pressure: isolate and bleed it first.',
    lessons: ['analog-420'],
  },
  {
    id: 'xmtr-level', name: 'Level transmitter', kind: 'xmtr-level', group: 'process',
    what: 'Measures the level in a tank or bin (by pressure, radar, ultrasonic and more) and sends it as 4–20 mA.',
    wiring: ['Usually two-wire loop-powered, like a pressure transmitter. // VERIFY per technology'],
    symbol: 'A circle with LT and a tag number on the P&ID.',
    fails: ['Buildup on the sensor or false echoes from the tank\'s inside.', 'Range set to the wrong tank height.'],
    test: ['Compare with a sight glass, a dip reading or a known level.'],
    lessons: ['analog-420'],
  },
  {
    id: 'xmtr-temp', name: 'Temperature transmitter', kind: 'xmtr-temp', group: 'process',
    what: 'Converts a thermocouple or RTD sensor into a 4–20 mA signal (some cards read the sensor directly).',
    wiring: ['Sensor wires to the transmitter; the transmitter on a two-wire 4–20 mA loop.'],
    symbol: 'A circle with TT (transmitter) or TE (element) and a tag number on the P&ID.',
    fails: ['Sensor open: the transmitter drives its failure current (high or low, as set).', 'Wrong sensor type set.'],
    test: ['Compare with a calibrated thermometer at the same point.'],
    lessons: ['analog-420'],
  },
  {
    id: 'solenoid-valve', name: 'Solenoid valve', kind: 'solenoid-valve', group: 'process',
    what: 'An electrically operated valve: a coil pulls a plunger that shifts air, water or oil. Used to move cylinders and open lines.',
    wiring: ['Coil from a PLC output (often 24 VDC or 120 VAC) and its return.', 'Many valves have a manual override button to shift them without power.'],
    symbol: 'A solenoid symbol (a box with a diagonal line) on the pneumatic or hydraulic diagram; a coil on the ladder.',
    fails: ['Coil open or wrong voltage.', 'Spool stuck from dirt or no lubrication.', 'No air pressure, or a blocked exhaust.'],
    test: ['Check the coil voltage when it should shift; many coil connectors have an LED.', 'Check the air pressure gauge.'],
    safety: 'Lock out and bleed air or hydraulic pressure before working on a valve or cylinder. Don\'t use a manual override with anyone in the machine.',
    lessons: ['relays-contactors'],
  },
];

export const DEVICE_BY_ID = new Map(DEVICES.map((d) => [d.id, d]));
