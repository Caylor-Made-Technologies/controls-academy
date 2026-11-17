/**
 * Troubleshooting flowcharts: data only, one renderer (src/features/reference/FlowPage.tsx).
 * Each step asks one question you can answer by looking or measuring; each answer leads to another step or to
 * an end with what to do. Tests prove every path ends, nothing loops, and every step is reachable.
 *
 * Training material, not site procedure. Live checks need authorization, the right PPE and a meter rated for
 * the circuit (CAT rating), and live-dead-live before you touch anything. Reviewed by a controls/safety reviewer
 * (2026-11-17); items that vary by equipment end with // VERIFY and are listed in docs/VERIFY.md.
 */

export interface FlowAnswer { label: string; next: string }
export interface FlowStep {
  id: string;
  /** What to check, in one line (decision steps). */
  ask?: string;
  /** How to check it: what to measure and what readings mean. */
  how?: string;
  /** Live-work or lockout note for this step. */
  safety?: string;
  answers?: FlowAnswer[];
  /** End step: what you found and what to do about it. */
  end?: { found: string; fix: string };
}
export interface Flowchart { id: string; title: string; symptom: string; start: string; steps: FlowStep[]; lesson?: string }

const LIVE = 'Live measurement: only if you are authorized, with the PPE your site requires and a meter rated for the circuit. Test your meter on a known source first.';
const PANEL = 'Opening an energized panel: follow its arc-flash label and wear that PPE, or check from the software online instead.';
const LOTO = 'Lock out, tag out and verify zero energy (live-dead-live), and release stored energy (air, hydraulics, springs, raised loads, capacitors, a coasting motor) before you touch terminals or parts.';
const MEGGER = 'Insulation testing (megger) puts a high test voltage on the circuit: lock out, disconnect electronics (drives, PLC cards) first, and discharge the cable afterward.';

export const FLOWCHARTS: Flowchart[] = [
  {
    id: 'motor-wont-start', title: 'Motor won\'t start', symptom: 'You press Start and nothing turns.', lesson: 'troubleshooting-method',
    start: 'ask-operator',
    steps: [
      { id: 'ask-operator', ask: 'Did it ever run? Ask the operator what changed and what they saw.', how: 'Note any alarm text, fault lights, noises or recent work. Five minutes of asking saves an hour of measuring.', answers: [{ label: 'Got the story, move on', next: 'vfd' }] },
      { id: 'vfd', ask: 'Is this motor on a variable frequency drive (VFD)?', how: 'A drive has its own keypad and fault display. This chart is for a motor on a contactor (across-the-line starter).', answers: [{ label: 'Yes, it has a drive', next: 'end-vfd' }, { label: 'No, it has a starter', next: 'simple' }] },
      { id: 'simple', ask: 'Are the simple things right: main disconnect on, local disconnect at the motor on, HOA (Hand-Off-Auto) or local/remote switch where it should be?', how: 'A local disconnect at the motor is often left off after work. Check before you open anything.', answers: [{ label: 'One of them was off or in the wrong position', next: 'end-simple' }, { label: 'All correct', next: 'estop' }] },
      { id: 'estop', ask: 'Are all E-stops released and safety gates closed?', how: 'Look at every E-stop on the machine, including remote ones. A pulled E-stop or open gate stops the start by design.', answers: [{ label: 'One was pressed or open', next: 'end-estop' }, { label: 'All released and closed', next: 'ol' }] },
      { id: 'ol', ask: 'Is the overload relay tripped?', how: 'Look at the trip flag or indicator on the overload. If it tripped, the motor got too hot or drew too much current.', safety: PANEL, answers: [{ label: 'Tripped', next: 'end-ol' }, { label: 'Not tripped', next: 'plc' }] },
      { id: 'plc', ask: 'Is the PLC in Run with no fault, and is control power on?', how: 'Look at the controller\'s status lights (RUN, OK/fault) or go online. No control power means nothing downstream can work.', answers: [{ label: 'Faulted, not in Run, or no control power', next: 'end-plc' }, { label: 'In Run, no fault, control power on', next: 'input' }] },
      { id: 'input', ask: 'When you press Start, does the PLC input LED for Start come on?', how: 'Watch the input card LED, or the input bit online, while someone presses Start.', safety: PANEL, answers: [{ label: 'No, the input stays off', next: 'end-input' }, { label: 'Yes, the input comes on', next: 'output' }] },
      { id: 'output', ask: 'Does the PLC output for the motor starter turn on?', how: 'Watch the output bit online or the output card LED. If the input is on but the output is not, the logic is holding it off.', answers: [{ label: 'No, the output stays off', next: 'end-logic' }, { label: 'Yes, the output comes on', next: 'coil' }] },
      { id: 'coil', ask: 'Does the contactor pull in (you hear and see it close)?', how: 'With the output on, the contactor should close with a clunk. If it doesn\'t, measure the coil voltage at A1–A2.', safety: LIVE, answers: [{ label: 'It does not pull in', next: 'end-coil' }, { label: 'It pulls in', next: 'line' }] },
      { id: 'line', ask: 'With the contactor open, is there voltage on all three phases at its line side (L1, L2, L3)?', how: 'Measure phase to phase: all three should read about the supply voltage. Check this before you close the contactor on a motor that isn\'t turning.', safety: LIVE, answers: [{ label: 'Missing on one or more phases', next: 'end-power' }, { label: 'All three present', next: 'load' }] },
      { id: 'load', ask: 'Closed only briefly, is there voltage on all three load-side terminals (T1, T2, T3)?', how: 'Close it just long enough to read. If the motor hums and doesn\'t turn, stop it at once: a stalled motor draws locked-rotor current and overheats fast.', safety: LIVE, answers: [{ label: 'Missing on the load side', next: 'end-contacts' }, { label: 'All three present', next: 'end-motor' }] },
      { id: 'end-vfd', end: { found: 'The motor runs from a drive.', fix: 'Use the VFD faults flowchart, and check the drive\'s keypad for a fault or a missing run or enable signal.' } },
      { id: 'end-simple', end: { found: 'A disconnect or selector switch was off or in the wrong position.', fix: 'Find out why before you change it: someone may have left it off on purpose (a lockout, a repair). Follow your site\'s procedure.' } },
      { id: 'end-estop', end: { found: 'A pressed E-stop or open safety gate.', fix: 'Find out why it was pressed or opened before you reset it. Make sure everyone is clear, then reset per your site procedure. Releasing an E-stop should never restart the machine by itself; if it does, report it as a safety defect. Never jumper a safety circuit.' } },
      { id: 'end-ol', end: { found: 'The overload relay tripped.', fix: 'Find the cause first: a jammed load, a bad bearing or a lost phase. Some overloads reset themselves and the motor can restart on its own: keep clear. Let it cool, reset, and measure motor current on restart. Do not raise the overload setting to get it running.' } },
      { id: 'end-plc', end: { found: 'The controller or its control power isn\'t ready.', fix: 'Note any fault before clearing it (it tells you what happened). Check the control power transformer, fuse and supply. Don\'t clear faults repeatedly; find the cause.' } },
      { id: 'end-input', end: { found: 'The Start signal never reaches the PLC.', fix: `Check the pushbutton, its wiring and the input card supply. Half-split the circuit with your meter from the control source (often 24 VDC or 120 VAC, see the print) to the input terminal. ${LIVE}` } },
      { id: 'end-logic', end: { found: 'The logic is holding the output off.', fix: 'Go online and follow the output\'s rung backward to the false condition (an interlock, a permissive, a fault bit). Also check the output isn\'t written somewhere else (a duplicate output instruction) or forced. Find out why it is false; don\'t force it true.' } },
      { id: 'end-coil', end: { found: 'The output is on but the contactor does not close.', fix: 'Check for coil voltage at A1–A2. The coil circuit usually runs through other devices in series: the overload\'s NC contact (95–96), the master control relay or safety relay output, and the HOA switch. Find the open one; never jumper them. Voltage at the coil but no pull-in: a failed coil, replaced after lockout.' } },
      { id: 'end-power', end: { found: 'Power is missing on one or more phases upstream of the contactor.', fix: `One open fuse leaves the motor on two phases (single-phasing): it hums and overheats. Fuses usually blow from a short or ground fault, so test the motor and cable before replacing. ${MEGGER} Replace only after lockout, with the same class and rating.` } },
      { id: 'end-contacts', end: { found: 'Line side is fine but the load side is missing a phase: burnt or open contactor contacts.', fix: `${LOTO} Then inspect and replace the contactor or its contacts.` } },
      { id: 'end-motor', end: { found: 'Power leaves the starter, but the motor doesn\'t turn.', fix: `${LOTO} Then check the local disconnect at the motor, the overload heaters, the cable and the motor connections, the motor windings, and whether the load is jammed. ${MEGGER}` } },
    ],
  },
  {
    id: 'input-not-seen', title: 'Input not seen by the PLC', symptom: 'A sensor or switch works but the PLC input never turns on.', lesson: 'sinking-sourcing',
    start: 'device-led',
    steps: [
      { id: 'device-led', ask: 'Do the sensor\'s LEDs show power, and does its output LED change when it should detect?', how: 'Many sensors have two LEDs: power and output. No LED at all means the sensor has no power. The output LED shows what the sensor sees, not what the PLC receives.', answers: [{ label: 'No power LED at all', next: 'end-nopower' }, { label: 'Powered, but the output LED doesn\'t change', next: 'end-sensor' }, { label: 'The output LED changes', next: 'voltage' }] },
      { id: 'voltage', ask: 'With the sensor active, is there voltage across the input point (input terminal to that group\'s common)?', how: 'Across the input point it should read about the card\'s rated voltage (often 24 VDC) when active and near 0 V when not, whether the sensor is PNP or NPN. Check at the sensor\'s output wire first, then at the card, to half-split.', safety: `${PANEL} ${LIVE}`, answers: [{ label: 'About the rated voltage when active', next: 'card' }, { label: 'Stays near 0 V', next: 'wiring' }] },
      { id: 'wiring', ask: 'Is the sensor type right for the card, and was the sensor replaced recently?', how: 'PNP (sourcing) needs a sinking card; NPN (sinking) needs a sourcing card. A look-alike replacement can be the wrong type, or NC instead of NO.', answers: [{ label: 'Mismatched or the wrong replacement', next: 'end-mismatch' }, { label: 'Matched', next: 'end-wire' }] },
      { id: 'card', ask: 'Does the input LED on the card come on?', how: 'If the voltage is there but the LED isn\'t, the voltage may be below the card\'s ON threshold, AC may be wired into a DC card, or a two-wire sensor\'s leakage is confusing it. Also check that the module isn\'t faulted or inhibited in the controller.', answers: [{ label: 'No', next: 'end-card' }, { label: 'Yes, but the bit is off in the logic', next: 'end-address' }] },
      { id: 'end-nopower', end: { found: 'The sensor has no power.', fix: 'Check the sensor supply: its fuse, the 24 V power supply, and the supply wires at the sensor connector.' } },
      { id: 'end-sensor', end: { found: 'The sensor isn\'t detecting.', fix: 'Check target distance, alignment (photo-eyes), a dirty lens or reflector, and the sensing range for that material. Adjusting a sensor near moving parts needs lockout or proper guarding: never reach past a guard.' } },
      { id: 'end-mismatch', end: { found: 'Sensor and card types don\'t match (sinking vs sourcing), or the wrong replacement was fitted.', fix: 'Fit a sensor that matches the card and the original (type, NO or NC). Don\'t improvise with jumpers.' } },
      { id: 'end-wire', end: { found: 'Signal lost between the sensor and the card.', fix: `Check the card's common connection and any field fuse first. ${LOTO} Then check the cable, terminals and any junction box for a broken or loose conductor.` } },
      { id: 'end-card', end: { found: 'Voltage at the terminal but the card doesn\'t see it.', fix: 'Check the voltage against the card\'s ON threshold and type (AC or DC), the card\'s common, and its status in the controller. Compare with a known-good input on the same card.' } },
      { id: 'end-address', end: { found: 'The card sees it, the logic doesn\'t.', fix: 'Check the address or tag in the program matches the slot and point you wired, and that nothing (a force or a copy instruction) overwrites it.' } },
    ],
  },
  {
    id: 'analog-wrong', title: 'Analog reads wrong', symptom: 'A 4–20 mA level, pressure or flow reading is wrong, stuck or jumpy. (Thermocouple and RTD inputs are not covered here.)', lesson: 'analog-420',
    start: 'kind',
    steps: [
      { id: 'kind', ask: 'Is the reading steady but wrong, or jumping around?', answers: [{ label: 'Steady but wrong or stuck', next: 'current' }, { label: 'Jumping or noisy', next: 'end-noise' }] },
      { id: 'current', ask: 'What loop current do you measure?', how: 'Get operations\' OK and put the loop in manual first: breaking the loop sends the PLC 0 mA, which can trip the process or move a valve. Prefer the transmitter\'s test terminals or a clamp made for mA loops. With the meter on its mA jack, never put the leads across the supply: you\'ll blow the meter fuse.', safety: `${LIVE} In hazardous (classified) areas or on intrinsically safe loops, use only meters approved for that area.`, answers: [{ label: 'Below about 3.8 mA (or 0 mA)', next: 'end-open' }, { label: 'Between about 3.8 and 20.5 mA', next: 'scale' }, { label: 'Above about 20.5 mA', next: 'end-high' }] },
      { id: 'scale', ask: 'Does the measured mA match the real process value, using the transmitter\'s range?', how: 'Example: 0–5 m range, 12 mA → 2.5 m. Compare with a sight glass or a local gauge.', answers: [{ label: 'mA is wrong for the process', next: 'end-xmtr' }, { label: 'mA is right, the PLC value is wrong', next: 'end-scaling' }] },
      { id: 'end-noise', end: { found: 'Electrical noise or a loose connection.', fix: 'Check the cable shield is grounded at one end only, the signal cable isn\'t run alongside VFD or motor cables, and the terminals are tight.' } },
      { id: 'end-open', end: { found: 'An open loop, no loop power, or a transmitter reporting its own failure.', fix: 'Check the loop power supply, fuse, wiring and terminals. Many transmitters drive about 3.6 mA (or 21 mA) on purpose to report a fault, and many cards treat under 3.6–3.8 mA as a fault; don\'t hide it. // VERIFY fault limits (NAMUR NE43) per transmitter and card' } },
      { id: 'end-high', end: { found: 'Over-range: the process is beyond the top of the range, the transmitter is reporting a fault, or the loop is shorted.', fix: 'Check whether the process is really over range, check the transmitter\'s diagnostics, then check the loop wiring for a short.' } },
      { id: 'end-xmtr', end: { found: 'The transmitter is out of calibration, mounted wrong, or left in test mode.', fix: 'Check whether it was left in loop-test or fixed-output mode, then its range setting, mounting, impulse lines or probe. Calibration is often a specialist job; follow your site procedure.' } },
      { id: 'end-scaling', end: { found: 'The PLC side doesn\'t match the transmitter.', fix: 'Check the card channel configuration (current or voltage, 4–20 or 0–20 mA, 2-wire or 4-wire) and the scaling in the program (raw counts to engineering units) against the transmitter\'s range.' } },
    ],
  },
  {
    id: 'motor-trips', title: 'Motor trips', symptom: 'The motor starts, then stops on overload or a breaker trip.', lesson: 'protection-devices',
    start: 'what-tripped',
    steps: [
      { id: 'what-tripped', ask: 'What tripped, and when?', how: 'An overload trips on heat over time. A breaker or fuse that opens instantly points to a short or ground fault, but breakers also trip after a delay on overload, and an instant trip only at start can be inrush with a breaker set too low. // VERIFY breaker type and setting', answers: [{ label: 'Overload relay', next: 'before' }, { label: 'Electronic overload shows a reason (phase loss, imbalance, ground fault)', next: 'end-electronic' }, { label: 'Breaker or fuses, instantly', next: 'end-short' }, { label: 'Breaker, after running a while', next: 'before' }] },
      { id: 'before', ask: 'Before restarting: is it locked out, does the load turn freely by hand, has the overload cooled, and is the operator OK with a restart?', safety: LOTO, answers: [{ label: 'The load is stiff or jammed', next: 'end-load' }, { label: 'Turns freely, ready to restart', next: 'current' }] },
      { id: 'current', ask: 'On restart, is the running current near the nameplate full-load amps (FLA)?', how: 'Clamp each phase while it runs and compare with the motor nameplate. Starting current is much higher for a moment; that is normal.', safety: LIVE, answers: [{ label: 'Above FLA on all phases', next: 'end-load' }, { label: 'One phase much higher or one missing', next: 'end-phase' }, { label: 'Trips only during long starts', next: 'end-class' }, { label: 'Near or below FLA', next: 'setting' }] },
      { id: 'setting', ask: 'Is the overload set the way its maker and the motor nameplate call for?', how: 'Makers differ (FLA, or FLA times service factor), and the electrical code caps the setting. // VERIFY setting rule per overload maker and NEC 430.32', answers: [{ label: 'Set too low', next: 'end-setting' }, { label: 'Set right', next: 'end-heat' }] },
      { id: 'end-short', end: { found: 'Likely a short circuit or ground fault.', fix: `Do not reset and retry: after a protective device opens on a fault, a qualified person must find it safe before it is re-energized. ${MEGGER}` } },
      { id: 'end-electronic', end: { found: 'The electronic overload has told you the cause.', fix: 'Phase loss or imbalance: check fuses, contacts and connections on each phase (after lockout). Ground fault: treat it as a fault, test insulation, and get qualified help.' } },
      { id: 'end-load', end: { found: 'The motor is working too hard.', fix: 'Look for a jammed or overloaded machine, a dragging bearing or brake, or a process change. Fix the load; don\'t turn up the overload.' } },
      { id: 'end-phase', end: { found: 'Unbalanced or missing phase (single-phasing).', fix: `${LOTO} Then check fuses, contactor contacts and connections on each phase. A motor on two phases overheats fast.` } },
      { id: 'end-class', end: { found: 'A high-inertia load that takes long to start.', fix: 'The overload\'s trip class may be too fast for this start. Changing it is an engineering decision: get approval and record it.' } },
      { id: 'end-setting', end: { found: 'Overload setting below what the motor needs.', fix: 'Set it per the motor nameplate and the overload\'s instructions, with approval. Write the change down.' } },
      { id: 'end-heat', end: { found: 'Heat or wear around the overload, not the motor current.', fix: 'Check for a hot cabinet around a relay that isn\'t ambient-compensated, frequent starts or jogging, and a loose or heated terminal at the overload. If the motor has a thermal switch or thermistor, a motor-heat trip points to its ventilation (dirty fins, blocked fan).' } },
    ],
  },
  {
    id: 'output-on-device-off', title: 'Output on, device off', symptom: 'The PLC output is on but the valve, light or contactor does nothing.', lesson: 'relays-contactors',
    start: 'led',
    steps: [
      { id: 'led', ask: 'Is the output card LED on?', how: 'The logic bit can be on while the card is faulted or unpowered. On many cards the LED shows the logic command, not that voltage actually left the terminal.', safety: PANEL, answers: [{ label: 'LED off', next: 'end-card' }, { label: 'LED on', next: 'term' }] },
      { id: 'term', ask: 'Is there voltage between the output terminal and the load supply\'s return (neutral or 0 V)?', how: 'On a sourcing output you should see the supply voltage when it is on. For relay or sinking outputs, follow the card\'s wiring diagram. Use a low-impedance (LoZ) setting if your meter has one: a triac output\'s leakage can show a "ghost" voltage. // VERIFY per card', safety: LIVE, answers: [{ label: 'No voltage', next: 'end-fuse' }, { label: 'Voltage present', next: 'device' }] },
      { id: 'device', ask: 'Is there voltage at the device itself?', how: 'Measure across the coil or lamp terminals at the device.', safety: LIVE, answers: [{ label: 'No voltage at the device', next: 'end-wire' }, { label: 'Voltage at the device', next: 'end-device' }] },
      { id: 'end-card', end: { found: 'The card isn\'t driving the output.', fix: 'Check the card\'s status, its output supply and the address in the logic. Compare with a working output.' } },
      { id: 'end-fuse', end: { found: 'No voltage leaves the card.', fix: 'Check the output group\'s supply and fuse, a failed output point (a burnt transistor or relay), and whether a master control relay or safety relay has removed output power on purpose. Never bypass those. Replace fuses only after finding why they blew.' } },
      { id: 'end-wire', end: { found: 'Voltage lost between the card and the device.', fix: `${LOTO} Then check terminals, junction boxes, and the return (common) wire as well as the hot one.` } },
      { id: 'end-device', end: { found: 'The device has power but doesn\'t act.', fix: `Check for low voltage at the device (voltage drop on a long run), a coil of the wrong voltage, a failed coil, a burnt-out lamp, a mechanical jam, or (for valves) no air pressure or a blocked exhaust. ${LOTO} Bleed air or hydraulic pressure before working on a valve, and don't use a valve's manual override with anyone in the machine.` } },
    ],
  },
  {
    id: 'comms-lost', title: 'Communication lost', symptom: 'An HMI, drive or remote rack shows a comms fault.', lesson: 'network-troubleshooting',
    start: 'safe',
    steps: [
      { id: 'safe', ask: 'Is the machine in a safe state, and does everyone know comms are down?', how: 'A drive or remote rack may stop or keep running when it loses comms, depending on its settings. With the HMI down, use local stops. When comms come back, equipment can start immediately: keep clear before restoring a link. // VERIFY comm-loss action per device', answers: [{ label: 'Safe, move on', next: 'changed' }] },
      { id: 'changed', ask: 'What changed: a replaced device, new cable, network or software work?', how: 'Most comms faults follow a change. Ask before you start unplugging things.', answers: [{ label: 'Got the story, move on', next: 'scope' }] },
      { id: 'scope', ask: 'Is it one device or many?', how: 'Many devices dropping together points to a shared switch, power or cable; one device points to that device or its link. These steps assume Ethernet; serial or fieldbus networks (RS-485, DeviceNet, PROFIBUS) also need termination and baud-rate checks. // VERIFY per network', answers: [{ label: 'Many', next: 'end-shared' }, { label: 'Just one', next: 'power' }] },
      { id: 'power', ask: 'Is that device powered and healthy (status lights normal)?', answers: [{ label: 'No power or a fault light', next: 'end-device-power' }, { label: 'Powered and healthy', next: 'link' }] },
      { id: 'link', ask: 'Is the link light on at both ends of its cable?', how: 'Check the port LEDs at the device and at the switch.', answers: [{ label: 'No link', next: 'end-cable' }, { label: 'Link is on', next: 'ip' }] },
      { id: 'ip', ask: 'Does the device have the right address or name (and was it recently replaced)?', how: 'A replacement often comes with a default address; PROFINET devices need their device name assigned. Also check for two devices on the same IP address.', answers: [{ label: 'Wrong, blank or duplicated', next: 'end-address' }, { label: 'Correct', next: 'end-device' }] },
      { id: 'end-shared', end: { found: 'A shared problem: switch, power supply, a trunk cable, or a network loop.', fix: 'Check switch power and status, then the cables between switches. A newly plugged cable can create a loop (broadcast storm) that takes everything down: look for recent changes.' } },
      { id: 'end-device-power', end: { found: 'The device itself is down.', fix: 'Check its supply and fuse, and read its fault indication in the manual before resetting.' } },
      { id: 'end-cable', end: { found: 'Physical link down.', fix: 'Reseat or swap the patch cable and check the connector. Managed switches can have disabled ports, VLANs or port security: moving to another port needs controls or IT approval.' } },
      { id: 'end-address', end: { found: 'Addressing or device name wrong, or a duplicate address.', fix: 'Set it to the documented value with the vendor\'s tool, following your site\'s procedure. Keep clear: the device may start as soon as it connects.' } },
      { id: 'end-device', end: { found: 'The link and address are fine; the device or its configuration.', fix: 'Check the device\'s diagnostics and the controller\'s connection status for that device; get the vendor documentation.' } },
    ],
  },
  {
    id: 'vfd-fault', title: 'VFD faults', symptom: 'A drive trips and shows a fault on its keypad.', lesson: 'vfd-basics',
    start: 'safe',
    steps: [
      { id: 'safe', ask: 'Before anything else: can this drive restart by itself?', how: 'Many drives auto-reset and restart after a fault, so the motor can start without warning. Keep clear and don\'t keep resetting into the same fault. // VERIFY auto-restart setting', answers: [{ label: 'Understood, move on', next: 'read' }] },
      { id: 'read', ask: 'Write down the fault exactly as shown, when it tripped (accelerating, decelerating, running, at power-up) and the fault history. Then look it up in that drive\'s manual.', how: 'Fault codes differ by brand and model. Most fall into a few families. When it tripped is what tells them apart. A regular meter reads wrong on a drive\'s output: use a true-RMS meter with a VFD (low-pass) filter. // VERIFY', answers: [{ label: 'Overcurrent', next: 'end-oc' }, { label: 'Motor overload (drive I²t)', next: 'end-mol' }, { label: 'Overvoltage (DC bus)', next: 'end-ov' }, { label: 'Undervoltage', next: 'end-uv' }, { label: 'Overtemperature', next: 'end-ot' }, { label: 'Ground fault', next: 'end-gf' }, { label: 'Communication or external fault', next: 'end-ext' }, { label: 'Other or not listed', next: 'end-other' }] },
      { id: 'end-oc', end: { found: 'Overcurrent family.', fix: 'Look for a jammed load, an acceleration time too short, wrong motor nameplate data in the drive, an output contactor or disconnect opening while the drive runs, or a damaged motor or cable. Changing accel time is a parameter change: get approval and record old and new values. Inspecting the cable or motor needs lockout, the label wait time, and a check that the DC bus is at zero. // VERIFY details vary by model' } },
      { id: 'end-mol', end: { found: 'Motor overload family (the drive\'s motor-heat model).', fix: 'The motor has been working too hard for too long: check the load and the motor data set in the drive. Not the same as overcurrent.' } },
      { id: 'end-ov', end: { found: 'DC bus overvoltage family.', fix: 'Usually stopping a heavy load too fast (it pushes energy back into the drive), or high incoming line voltage. Lengthening decel is a parameter change: get approval and record it. A braking resistor, if fitted, can be hot and sits at DC bus voltage.' } },
      { id: 'end-uv', end: { found: 'Undervoltage family.', fix: 'Check the incoming supply, fuses and connections: a dip or a lost phase on the line side.' } },
      { id: 'end-ot', end: { found: 'Overtemperature family.', fix: 'Check clogged cabinet filters, the cooling fan, a dirty heatsink, the load, and derating (altitude, carrier frequency). Cleaning needs lockout, the drive label\'s wait time, and a check that the DC bus is at zero. // VERIFY details vary by model' } },
      { id: 'end-gf', end: { found: 'Ground fault family.', fix: 'Lock out. The DC bus stays charged after power is removed: wait the time on the drive label and verify zero voltage. Disconnect the motor leads from the drive before insulation testing: a megger on the drive output destroys the drive. Discharge the cable after the test.' } },
      { id: 'end-ext', end: { found: 'Communication or external fault.', fix: 'Comms: use the Communication lost flowchart. External: the drive was told to stop by an interlock wired to it; find which one and why. Never jumper it.' } },
      { id: 'end-other', end: { found: 'A fault not covered here.', fix: 'Use the drive\'s manual for that exact model, and get help from a qualified person or the vendor.' } },
    ],
  },
];

export const FLOW_BY_ID = new Map(FLOWCHARTS.map((f) => [f.id, f]));
