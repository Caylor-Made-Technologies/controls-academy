/**
 * Troubleshooting flowcharts: data only, one renderer (src/features/reference/FlowPage.tsx).
 * Each step asks one question you can answer by looking or measuring; each answer leads to another step or to
 * an end with what to do. Tests prove every path ends, nothing loops, and every step is reachable.
 *
 * Training material, not site procedure. Live checks need authorization, the right PPE and a meter rated for
 * the circuit (CAT rating), and live-dead-live before you touch anything.
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
const LOTO = 'Lock out, tag out and verify zero energy (live-dead-live) before you touch terminals or open the starter.';

export const FLOWCHARTS: Flowchart[] = [
  {
    id: 'motor-wont-start', title: 'Motor won\'t start', symptom: 'You press Start and nothing turns.', lesson: 'troubleshooting-method',
    start: 'ask-operator',
    steps: [
      { id: 'ask-operator', ask: 'Did it ever run? Ask the operator what changed and what they saw.', how: 'Note any alarm text, fault lights, noises or recent work. Five minutes of asking saves an hour of measuring.', answers: [{ label: 'Got the story, move on', next: 'estop' }] },
      { id: 'estop', ask: 'Are all E-stops released and safety gates closed?', how: 'Look at every E-stop on the machine, including remote ones. A pulled E-stop or open gate stops the start by design.', answers: [{ label: 'One was pressed or open', next: 'end-estop' }, { label: 'All released and closed', next: 'ol' }] },
      { id: 'ol', ask: 'Is the overload relay tripped?', how: 'Look at the trip flag or indicator on the overload. If it tripped, the motor got too hot or drew too much current.', answers: [{ label: 'Tripped', next: 'end-ol' }, { label: 'Not tripped', next: 'input' }] },
      { id: 'input', ask: 'When you press Start, does the PLC input LED for Start come on?', how: 'Watch the input card LED (or the input bit online) while someone presses Start.', answers: [{ label: 'No, the input stays off', next: 'end-input' }, { label: 'Yes, the input comes on', next: 'output' }] },
      { id: 'output', ask: 'Does the PLC output for the motor starter turn on?', how: 'Watch the output card LED or the output bit online. If the input is on but the output is not, the logic is holding it off.', answers: [{ label: 'No, the output stays off', next: 'end-logic' }, { label: 'Yes, the output comes on', next: 'coil' }] },
      { id: 'coil', ask: 'Does the contactor pull in (you hear and see it close)?', how: 'With the output on, the contactor should close with a clunk. Measure the coil voltage at A1–A2 if it does not.', safety: LIVE, answers: [{ label: 'It does not pull in', next: 'end-coil' }, { label: 'It pulls in', next: 'power' }] },
      { id: 'power', ask: 'Is there voltage on all three phases at the contactor output (T1, T2, T3)?', how: 'Measure phase to phase on the line side, then the load side, with the contactor closed. All three should read about the same as the supply.', safety: LIVE, answers: [{ label: 'Missing on one or more phases', next: 'end-power' }, { label: 'All three phases present', next: 'end-motor' }] },
      { id: 'end-estop', end: { found: 'A pressed E-stop or open safety gate.', fix: 'Find out why it was pressed or opened before you reset it. Make sure everyone is clear, then reset per your site procedure. Never jumper a safety circuit.' } },
      { id: 'end-ol', end: { found: 'The overload relay tripped.', fix: 'Find the cause first: a jammed load, a bad bearing or a lost phase. Let it cool, reset it, and measure motor current on restart. Do not raise the overload setting to get it running.' } },
      { id: 'end-input', end: { found: 'The Start signal never reaches the PLC.', fix: 'Check the pushbutton, its wiring and the input card supply. Half-split the circuit with your meter from the 24 V source to the input terminal.' } },
      { id: 'end-logic', end: { found: 'The logic is holding the output off.', fix: 'Go online and follow the output\'s rung backward to the false condition (an interlock, a permissive, a fault bit). Find out why it is false; don\'t force it true.' } },
      { id: 'end-coil', end: { found: 'The output is on but the contactor does not close.', fix: 'Check for coil voltage at A1–A2. No voltage: wiring, fuse or interposing relay. Voltage but no pull-in: a failed coil. Replace parts only after lockout.' } },
      { id: 'end-power', end: { found: 'Power is missing on one or more phases.', fix: 'Check upstream: fuses, breaker and the disconnect. A blown fuse on one phase means the motor tried to start on two phases. Find out why it blew.' } },
      { id: 'end-motor', end: { found: 'Power reaches the motor leads but it does not turn.', fix: `${LOTO} Then check the motor leads and connections, the motor windings (resistance, insulation) and whether the load is mechanically jammed.` } },
    ],
  },
  {
    id: 'input-not-seen', title: 'Input not seen by the PLC', symptom: 'A sensor or switch works but the PLC input never turns on.', lesson: 'sinking-sourcing',
    start: 'device-led',
    steps: [
      { id: 'device-led', ask: 'Does the sensor\'s own LED change when it should detect?', how: 'Most prox switches and photo-eyes have an indicator LED. It shows what the sensor sees, not what the PLC receives.', answers: [{ label: 'No change', next: 'end-sensor' }, { label: 'It changes', next: 'voltage' }] },
      { id: 'voltage', ask: 'With the sensor active, is there 24 V between the input terminal and the input common?', how: 'Measure at the input card terminal against the card\'s common. Active should read near the supply voltage; inactive near 0 V (for a sourcing sensor into a sinking card).', safety: LIVE, answers: [{ label: 'About 24 V when active', next: 'card' }, { label: 'Stays near 0 V', next: 'wiring' }] },
      { id: 'wiring', ask: 'Is the sensor type right for the card (PNP into a sinking card, NPN into a sourcing card)?', how: 'Check the sensor label and the card\'s spec. A wrong match can never complete the circuit.', answers: [{ label: 'Mismatched', next: 'end-mismatch' }, { label: 'Matched', next: 'end-wire' }] },
      { id: 'card', ask: 'Does the input LED on the card come on?', answers: [{ label: 'No', next: 'end-card' }, { label: 'Yes, but the bit is off in the logic', next: 'end-address' }] },
      { id: 'end-sensor', end: { found: 'The sensor isn\'t detecting.', fix: 'Check its power, target distance, alignment (photo-eyes), a dirty lens or reflector, and the sensing range for that material.' } },
      { id: 'end-mismatch', end: { found: 'Sensor and card types don\'t match (sinking vs sourcing).', fix: 'Use a sensor that matches the card, or a card that matches the sensor. Don\'t improvise with jumpers.' } },
      { id: 'end-wire', end: { found: 'Signal lost between the sensor and the card.', fix: `${LOTO} Then check the cable, terminals and any junction box for a broken or loose conductor.` } },
      { id: 'end-card', end: { found: 'Voltage at the terminal but the card doesn\'t see it.', fix: 'Check the card\'s common connection and the card itself; compare with a known-good input on the same card.' } },
      { id: 'end-address', end: { found: 'The card sees it, the logic doesn\'t.', fix: 'Check the address or tag in the program matches the slot and point you wired, and that nothing (a force or a copy instruction) overwrites it.' } },
    ],
  },
  {
    id: 'analog-wrong', title: 'Analog reads wrong', symptom: 'A 4–20 mA level, pressure or temperature reading is wrong or stuck.', lesson: 'analog-420',
    start: 'current',
    steps: [
      { id: 'current', ask: 'What loop current do you measure?', how: 'Measure the loop current in series (or with a clamp made for mA loops). 4 mA is the bottom of the range, 20 mA the top.', safety: LIVE, answers: [{ label: 'Below about 3.8 mA or 0 mA', next: 'end-open' }, { label: 'Above about 20.5 mA', next: 'end-high' }, { label: 'Between 4 and 20 mA', next: 'scale' }] },
      { id: 'scale', ask: 'Does the measured mA match the real process value (by the transmitter\'s range)?', how: 'Example: 0–5 m range, 12 mA → 2.5 m. Compare with a sight glass or a local gauge.', answers: [{ label: 'mA is wrong for the process', next: 'end-xmtr' }, { label: 'mA is right, PLC value is wrong', next: 'end-scaling' }] },
      { id: 'end-open', end: { found: 'An open loop or a failed transmitter (no current).', fix: 'Check the loop power supply, fuse, wiring and terminals. Many systems treat under 3.6–3.8 mA as a fault on purpose; don\'t hide it. // VERIFY fault thresholds per card' } },
      { id: 'end-high', end: { found: 'Over-range: the transmitter says "beyond the top", or the loop is shorted.', fix: 'Check whether the process is really over range, then check for a short in the loop wiring.' } },
      { id: 'end-xmtr', end: { found: 'The transmitter is out of calibration or mounted wrong.', fix: 'Check its range setting, mounting, impulse lines or probe. Calibration is often a specialist job; follow your site procedure.' } },
      { id: 'end-scaling', end: { found: 'The PLC scaling doesn\'t match the transmitter.', fix: 'Check the raw counts and the scaling (raw range to engineering range) in the program against the transmitter\'s range.' } },
    ],
  },
  {
    id: 'motor-trips', title: 'Motor trips', symptom: 'The motor starts, then stops on overload or a breaker trip.', lesson: 'protection-devices',
    start: 'what-tripped',
    steps: [
      { id: 'what-tripped', ask: 'What tripped: the overload relay, or the breaker / fuses?', how: 'An overload trips on heat over time (seconds to minutes). A breaker or fuse that opens instantly points to a short or a ground fault.', answers: [{ label: 'Overload relay', next: 'current' }, { label: 'Breaker or fuses, instantly', next: 'end-short' }] },
      { id: 'current', ask: 'On restart, is the running current near the nameplate full-load amps (FLA)?', how: 'Clamp each phase while it runs. Compare with the motor nameplate FLA. Starting current is higher for a moment; that is normal.', safety: LIVE, answers: [{ label: 'Above FLA on all phases', next: 'end-load' }, { label: 'One phase much higher or one missing', next: 'end-phase' }, { label: 'Near or below FLA', next: 'setting' }] },
      { id: 'setting', ask: 'Is the overload set to the motor\'s FLA (per its instructions)?', answers: [{ label: 'Set too low', next: 'end-setting' }, { label: 'Set right', next: 'end-heat' }] },
      { id: 'end-short', end: { found: 'A short circuit or ground fault.', fix: `${LOTO} Do not reset and retry. Test motor and cable insulation (megger) and look for damage. Get qualified help.` } },
      { id: 'end-load', end: { found: 'The motor is working too hard.', fix: 'Look for a jammed or overloaded machine, a dragging bearing or brake, or a process change. Fix the load; don\'t turn up the overload.' } },
      { id: 'end-phase', end: { found: 'Unbalanced or missing phase (single-phasing).', fix: 'Check fuses, contactor contacts and connections on each phase. A motor on two phases overheats fast.' } },
      { id: 'end-setting', end: { found: 'Overload setting below the motor FLA.', fix: 'Set it per the motor nameplate and the overload\'s instructions, with approval. Write the change down.' } },
      { id: 'end-heat', end: { found: 'Heat from somewhere else.', fix: 'Check ventilation (dirty fins, blocked fan), a hot cabinet or ambient, and frequent starts. Overloads trip on heat, not just current.' } },
    ],
  },
  {
    id: 'output-on-device-off', title: 'Output on, device off', symptom: 'The PLC output is on but the valve, light or contactor does nothing.', lesson: 'relays-contactors',
    start: 'led',
    steps: [
      { id: 'led', ask: 'Is the output card LED on?', how: 'The logic bit can be on while the card is faulted or not powered. The card LED is closer to the field.', answers: [{ label: 'LED off', next: 'end-card' }, { label: 'LED on', next: 'term' }] },
      { id: 'term', ask: 'Is there voltage at the output terminal (against its common)?', how: 'Measure at the card terminal. You should see the output supply voltage when it is on.', safety: LIVE, answers: [{ label: 'No voltage', next: 'end-fuse' }, { label: 'Voltage present', next: 'device' }] },
      { id: 'device', ask: 'Is there voltage at the device itself?', how: 'Measure across the coil or lamp terminals at the device.', safety: LIVE, answers: [{ label: 'No voltage at the device', next: 'end-wire' }, { label: 'Voltage at the device', next: 'end-device' }] },
      { id: 'end-card', end: { found: 'The card isn\'t driving the output.', fix: 'Check the card\'s status, its output supply and the address in the logic. Compare with a working output.' } },
      { id: 'end-fuse', end: { found: 'No voltage leaves the card.', fix: 'Check the output group\'s supply and fuse (many cards fuse each group). Replace fuses only after finding why they blew.' } },
      { id: 'end-wire', end: { found: 'Voltage lost between the card and the device.', fix: `${LOTO} Then check terminals, junction boxes, and the return (common) wire as well as the hot one.` } },
      { id: 'end-device', end: { found: 'The device has power but doesn\'t act.', fix: 'A failed coil, a stuck valve or a burnt-out lamp. Lock out before replacing it.' } },
    ],
  },
  {
    id: 'comms-lost', title: 'Communication lost', symptom: 'An HMI, drive or remote rack shows a comms fault.', lesson: 'network-troubleshooting',
    start: 'scope',
    steps: [
      { id: 'scope', ask: 'Is it one device or many?', how: 'Many devices dropping together points to a shared switch, power or cable; one device points to that device or its link.', answers: [{ label: 'Many', next: 'end-shared' }, { label: 'Just one', next: 'link' }] },
      { id: 'link', ask: 'Is the link light on at both ends of its cable?', how: 'Check the port LEDs at the device and at the switch.', answers: [{ label: 'No link', next: 'end-cable' }, { label: 'Link is on', next: 'ip' }] },
      { id: 'ip', ask: 'Does the device have the right address or name (and was it recently replaced)?', how: 'A replacement device often comes with a default address; PROFINET devices need their device name assigned. Compare with the documentation.', answers: [{ label: 'Wrong or blank', next: 'end-address' }, { label: 'Correct', next: 'end-device' }] },
      { id: 'end-shared', end: { found: 'A shared problem: switch, power supply or a trunk cable.', fix: 'Check the switch power and status, then the cable between switches. Look for recent changes.' } },
      { id: 'end-cable', end: { found: 'Physical link down.', fix: 'Reseat or swap the patch cable, check the connector, and try another switch port.' } },
      { id: 'end-address', end: { found: 'Addressing or device name wrong.', fix: 'Set it to the documented value with the vendor\'s tool, following your site\'s procedure.' } },
      { id: 'end-device', end: { found: 'The link and address are fine; the device itself or its configuration.', fix: 'Check the device\'s diagnostics and the controller\'s connection status for that device; get the vendor documentation.' } },
    ],
  },
  {
    id: 'vfd-fault', title: 'VFD faults', symptom: 'A drive trips and shows a fault on its keypad.', lesson: 'vfd-basics',
    start: 'read',
    steps: [
      { id: 'read', ask: 'Write down the fault exactly as shown, then look it up in that drive\'s manual.', how: 'Fault codes differ by brand and model. Most fall into a few families: overcurrent, overvoltage, undervoltage, overtemperature, ground fault, and communication or external faults.', answers: [{ label: 'Overcurrent', next: 'end-oc' }, { label: 'Overvoltage (DC bus)', next: 'end-ov' }, { label: 'Undervoltage', next: 'end-uv' }, { label: 'Overtemperature', next: 'end-ot' }, { label: 'Ground fault', next: 'end-gf' }] },
      { id: 'end-oc', end: { found: 'Overcurrent family.', fix: 'Look for a jammed load, an acceleration time set too short, or a damaged motor or cable. Don\'t keep resetting into the same fault.' } },
      { id: 'end-ov', end: { found: 'DC bus overvoltage family.', fix: 'Usually stopping a heavy load too fast (it pushes energy back into the drive). Lengthen decel or check the braking resistor if one is fitted.' } },
      { id: 'end-uv', end: { found: 'Undervoltage family.', fix: 'Check the incoming supply, fuses and connections; a dip or lost phase on the line side.' } },
      { id: 'end-ot', end: { found: 'Overtemperature family.', fix: 'Clean the heatsink, check the cooling fan and cabinet ventilation, and check the load.' } },
      { id: 'end-gf', end: { found: 'Ground fault family.', fix: 'Lock out. The DC bus stays charged after power is removed: wait the time on the drive label and verify zero voltage. Then test motor and cable insulation.' } },
    ],
  },

];

export const FLOW_BY_ID = new Map(FLOWCHARTS.map((f) => [f.id, f]));
