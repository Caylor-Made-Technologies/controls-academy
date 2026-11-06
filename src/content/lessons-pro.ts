/**
 * Advanced and expert lessons: going online, troubleshooting, networks, drives/HMI/BAS,
 * capstone and the expert track (t11).
 */
import type { Lesson } from './types';

export const PRO_LESSONS: Lesson[] = [
  // ---------------- Track 6 ----------------
  {
    id: 'compare-online',
    track: 't6',
    title: 'Comparing online vs offline',
    minutes: 6,
    summary: 'Know exactly what changed before and after you touch a controller.',
    why: '"What did you change?" is the first question after any problem. A before-and-after compare answers it in seconds.',
    prereqs: ['upload-download'],
    realWorld: { site: 'datacenter', text: 'After a contractor\'s visit, a data center\'s chiller plant sequence behaves differently. Comparing today\'s upload against last month\'s backup shows no logic changes — but the chiller staging setpoint (data) was changed from 65 % to 85 % load.' },
    mistakes: [
      'Believing "the file on the share is current". Someone may have edited online and never saved — always compare against the controller before downloading.',
      'Comparing logic only and missing changed data values like timer presets and setpoints.',
      'Keeping the only backup on one laptop.',
    ],
    safety: { na: 'Comparing files is done offline on a laptop; it doesn\'t change the controller or touch equipment.' },
    blocks: [
      { t: 'p', text: 'Before a change: **go online, upload, save a dated copy** (e.g. `Mixer_2026-11-05_before.ext`). After: save `…_after`. Now you can always answer "what did you change?"' },
      { t: 'list', items: [
        'Vendor software has compare tools that diff two projects or online vs offline: changed rungs, tags, data values, hardware config. // VERIFY tool names per software version',
        'Compare **logic** and **data** separately — a changed timer preset or setpoint is data, not logic, and is easy to miss.',
        'Keep files in a controlled place (version control or a backup server), not on one laptop.',
        'Write the change in a log or [[moc|MOC]] record: what, why, who, when, how to back it out.',
      ] },
      { t: 'sort', prompt: 'Logic change or data change?', bins: ['Logic', 'Data'], items: [
        { text: 'A new branch added to rung 12', bin: 0, why: 'Rungs and instructions are logic.' },
        { text: 'A timer preset changed from 5000 to 3000', bin: 1, why: 'Presets are data values — a logic-only compare can miss them.' },
        { text: 'A pump start setpoint changed from 12.0 to 14.0 ft', bin: 1, why: 'Setpoints are data.' },
      ] },
    ],
    quiz: [
      { id: 'q1', q: 'Why save a copy before AND after a change?', choices: ['Disk space', 'So you can compare them and back the change out', 'Required by the PLC', 'Speed'], answer: 1, why: 'Two snapshots let you prove and reverse the change.' },
      { id: 'q2', q: 'A setpoint changed but no rung changed. A logic-only compare will…', choices: ['Show it', 'Possibly miss it — compare data values too', 'Fault the CPU', 'Delete it'], answer: 1, why: 'Data is separate from logic.' },
      { id: 'q3', q: 'You\'re about to download the file from the shared drive. What first?', choices: ['Nothing — it\'s the official copy', 'Upload from the controller and compare the two', 'Delete the controller program', 'Change the IP address'], answer: 1, why: 'The controller may have online edits that aren\'t in the shared file. Compare before you overwrite.' },
    ],
  },
  // ---------------- Track 7 ----------------
  {
    id: 'fault-codes',
    track: 't7',
    title: 'Controller faults and diagnostic buffers',
    minutes: 8,
    summary: 'When the CPU stops itself — read why before you reset.',
    why: 'A faulted controller stops the whole machine. Reading the fault first tells you what broke and stops it happening again.',
    prereqs: ['troubleshooting-method', 'data-types'],
    realWorld: { site: 'water', text: 'A water plant\'s high-service pump PLC faults at 2 AM. The fault log points to a lost remote I/O rack at the pump building. The tech finds a tripped 24 VDC supply breaker there, fixes it, then clears the fault with the operators ready — the pumps restart on the operator\'s command.' },
    mistakes: [
      'Clearing the fault before writing it down — the evidence is gone.',
      'Fixing the symptom (clear and run) and not the cause, so it faults again.',
      'Returning to RUN without warning operations that outputs may turn on.',
    ],
    safety: { note: 'Before clearing a fault or returning to RUN, make sure the machine is in a safe state and people are clear — outputs the logic calls for will turn on.' },
    blocks: [
      { t: 'p', text: 'A **major fault** stops the controller (outputs go to their fault state, and the [[scan]] stops). A **minor fault** is logged but the program keeps running. Both have a type/code and often the routine and rung where it happened.' },
      { t: 'table', head: ['Common cause', 'Example'], rows: [
        ['Array index out of range', 'Temps[Zone] with Zone = 12 on a 10-element array'],
        ['Math problem', 'Divide by zero, overflow (often minor)'],
        ['Missing routine / bad call', 'JSR to a routine that doesn\'t exist'],
        ['I/O / communication', 'A required module or remote rack lost'],
        ['Watchdog', 'Scan took too long (endless loop)'],
      ] },
      { t: 'brands', rows: [
        { skin: 'ab-logix', text: 'Controller Properties → Major/Minor Faults tab shows type, code, program, routine and rung. A fault routine can clear specific recoverable faults. // VERIFY' },
        { skin: 'siemens-tia', text: 'Read the CPU diagnostic buffer first: newest event on top, with time and the block involved. Error-handling OBs and the CPU behavior differ between S7-300/400 and S7-1200/1500. // VERIFY' },
      ] },
      { t: 'list', ordered: true, items: ['Write down the fault (photo the screen).', 'Find the rung/block it points to.', 'Understand the cause (bad index? lost module?).', 'Fix the cause, then clear the fault and return to RUN — with operations aware outputs may start.'] },
      { t: 'callout', tone: 'safety', title: 'Clearing a fault can restart things', text: 'When the controller goes back to RUN, outputs that the logic calls for turn on. Make sure the machine is in a safe state and people are clear.' },
      { t: 'sort', prompt: 'Major or minor fault (typical behavior)?', bins: ['Major — controller stops', 'Minor — logged, keeps running'], items: [
        { text: 'Array index out of range', bin: 0, why: 'On most controllers this is a major fault.' },
        { text: 'A required remote I/O rack is lost', bin: 0, why: 'A module configured as required faults the controller when it\'s lost.' },
        { text: 'Math overflow in a calculation', bin: 1, why: 'Often only a minor fault — the program keeps running with a wrong value.' },
      ] },
    ],
    quiz: [
      { id: 'q1', q: 'Major vs minor fault?', choices: ['Same thing', 'Major stops the controller; minor is logged and it keeps running', 'Minor stops it', 'Major is only a warning'], answer: 1, why: 'Major = controller stops.' },
      { id: 'q2', q: 'First thing to read on a faulted Siemens-style CPU?', choices: ['The HMI', 'The diagnostic buffer', 'The wiring', 'The manual index'], answer: 1, why: 'It lists what happened and when.' },
      { id: 'q3', q: 'You found an array index of 12 on a 10-element array caused the fault. Best fix?', choices: ['Clear and run', 'Fix the logic that let the index exceed 9 (limit/check it), then clear', 'Make the array 1000', 'Disable the rung'], answer: 1, why: 'Fix the cause; add a bounds check.' },
    ],
  },
  // ---------------- Track 8 ----------------
  {
    id: 'ip-basics',
    track: 't8',
    title: 'IP addressing for techs',
    minutes: 8,
    summary: 'Get your laptop talking to a PLC in two minutes.',
    blocks: [
      { t: 'p', text: 'Every Ethernet device has an IP address like `192.168.1.10`. The **subnet mask** (often `255.255.255.0`, written /24) says which part is the network: here every device `192.168.1.x` is on the same [[subnet]] and can talk directly.' },
      { t: 'list', ordered: true, items: [
        'Find the PLC\'s IP (drawing, label, HMI or switch display).',
        'Set your laptop to a **free** address on the same subnet, e.g. PLC 192.168.1.10 → laptop 192.168.1.200, mask 255.255.255.0. Leave the [[gateway]] blank unless you need another subnet.',
        '**Ping** the PLC. Reply = network OK. No reply = cable, subnet, wrong IP, or a firewall.',
        'Then go online with the vendor software.',
      ] },
      { t: 'callout', tone: 'gotcha', title: 'Duplicate IPs', text: 'Two devices with the same address cause intermittent, maddening failures. Check before you assign. Never plug your laptop into a plant network without permission — IT/OT security rules apply.' },
      { t: 'p', text: 'Static addresses are normal for PLCs and HMIs. Drives and new devices may ship using DHCP or BOOTP and need an address assigned with a tool. // VERIFY per device' },
    ],
    quiz: [
      { id: 'q1', q: 'PLC is 10.0.5.20/24. Which laptop address works?', choices: ['10.0.6.20', '10.0.5.250', '192.168.1.5', '10.0.5.20'], answer: 1, why: 'Same 10.0.5.x subnet and not a duplicate.' },
      { id: 'q2', q: 'Ping works but the software won\'t connect. Most likely?', choices: ['Bad cable', 'Wrong driver/path or software settings', 'Wrong subnet', 'Unplugged'], answer: 1, why: 'Ping proves the network; the problem is higher up.' },
      { id: 'q3', q: '/24 is the same as mask…', choices: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], answer: 2, why: '24 bits of ones = 255.255.255.0.' },
    ],
  },
  {
    id: 'profinet-names',
    track: 't8',
    title: 'PROFINET device names and EtherNet/IP',
    minutes: 7,
    summary: 'Why a replaced Siemens I/O drop "won\'t come back" — and how AB differs.',
    blocks: [
      { t: 'p', text: 'On [[profinet|PROFINET]] the controller finds devices by **device name**, not by IP. At startup it looks for "infeed-io-1" and gives it the IP from the project. A brand-new replacement module has no name (or the wrong one), so it never connects.' },
      { t: 'list', ordered: true, items: ['Replace the module like-for-like.', 'Assign the exact device name from the project (online tools can do it, or topology-based automatic naming may handle it). // VERIFY per project setup', 'The controller then assigns the IP and the device joins.'] },
      { t: 'p', text: 'On [[ethernet-ip|EtherNet/IP]] devices are usually found by **IP address**, so a replacement needs the same IP (set by switches, a tool, or BOOTP/DHCP). Both also need a matching **device description**: GSDML files for PROFINET, EDS files for EtherNet/IP.' },
      { t: 'callout', tone: 'tip', title: 'Fastest check', text: 'Compare what\'s on the wire (device name or IP the tool sees) with what the project expects. A one-character mismatch is enough to fail.' },
    ],
    quiz: [
      { id: 'q1', q: 'A replaced PROFINET drop won\'t connect. First suspect?', choices: ['CPU firmware', 'Device name not assigned or mismatched', 'Cable color', 'The HMI'], answer: 1, why: 'PROFINET identifies devices by name.' },
      { id: 'q2', q: 'EtherNet/IP devices are typically identified by…', choices: ['Device name', 'IP address', 'Serial number', 'MAC only'], answer: 1, why: 'The project points at an IP address.' },
      { id: 'q3', q: 'A GSDML or EDS file describes…', choices: ['The PLC program', 'A device\'s capabilities and data for the configuration tool', 'The wiring', 'The HMI screens'], answer: 1, why: 'They teach the software what the device is.' },
    ],
  },
  {
    id: 'legacy-networks',
    track: 't8',
    title: 'Legacy networks you\'ll still meet',
    minutes: 7,
    summary: 'DH+, Remote I/O, DeviceNet, ControlNet, Profibus — what they look like and what kills them.',
    blocks: [
      { t: 'table', head: ['Network', 'Seen with', 'Look for'], rows: [
        ['DH+ / Remote I/O', 'PLC-5, SLC 500', 'Twinax "blue hose", terminating resistors at the ends'],
        ['DH-485', 'SLC 500, MicroLogix', 'Link couplers, RS-485'],
        ['DeviceNet', 'Starters, sensors, valve banks', 'CAN trunk with 24 V power in the cable; node addresses 0–63; 121 Ω terminators at both ends'],
        ['ControlNet', 'ControlLogix / PLC-5 era', 'RG-6 coax, taps, often redundant A/B media'],
        ['Profibus DP', 'Siemens, drives, remote I/O', 'Purple RS-485 cable, addresses 1–125, termination switch ON only at the two ends'],
      ] },
      { t: 'callout', tone: 'tip', title: 'Most bus problems are physical', text: 'Missing or extra termination, a damaged cable, a loose connector, duplicate addresses or a bad power supply cause most failures. Check termination at both ends and measure the resistance with the network powered down (two 120 Ω-class terminators in parallel read ~60 Ω). // VERIFY per network' },
    ],
    quiz: [
      { id: 'q1', q: 'A Profibus segment has termination ON at three connectors. Effect?', choices: ['Better signal', 'Errors — only the two ends should be terminated', 'No effect', 'Faster'], answer: 1, why: 'Extra termination loads the bus.' },
      { id: 'q2', q: 'DeviceNet node addresses range…', choices: ['1–125', '0–63', '0–255', '1–16'], answer: 1, why: 'DeviceNet uses MAC IDs 0–63.' },
      { id: 'q3', q: 'Purple RS-485 cable in a Siemens plant is most likely…', choices: ['DH+', 'Profibus', 'ControlNet', 'Ethernet'], answer: 1, why: 'Profibus DP cable is typically purple.' },
    ],
  },
  // ---------------- Track 9 ----------------
  {
    id: 'vfd-basics',
    track: 't9',
    title: 'VFD basics',
    minutes: 9,
    summary: 'Inside a drive, the parameters that matter, and the faults you\'ll see.',
    blocks: [
      { t: 'p', text: 'A [[vfd]] rectifies AC to DC (the **DC bus**), then an inverter of IGBTs chops it back into variable-frequency AC. Lower frequency = slower motor. Voltage scales with frequency (V/Hz) so the motor stays magnetized correctly.' },
      { t: 'table', head: ['Parameter group', 'Why it matters'], rows: [
        ['Motor nameplate (V, A, Hz, RPM)', 'Overload protection and control accuracy depend on it'],
        ['Start/stop source', 'Keypad, terminals, or network'],
        ['Speed reference', 'Analog 0–10 V / 4–20 mA, presets, or network'],
        ['Accel / decel time', 'Too short = overcurrent or overvoltage trips'],
        ['Min / max frequency', 'Protects pumps, fans and processes'],
      ] },
      { t: 'table', head: ['Common fault', 'Usual cause'], rows: [
        ['Overcurrent', 'Accel too fast, jammed load, shorted motor/cable'],
        ['Overvoltage (DC bus)', 'Decel too fast with a high-inertia load (regeneration)'],
        ['Undervoltage', 'Supply dip, lost phase'],
        ['Overtemperature', 'Blocked fan/filter, hot cabinet, overload'],
        ['Ground fault', 'Damaged motor cable or wet motor'],
      ] },
      { t: 'callout', tone: 'safety', title: 'The DC bus stays charged', text: 'After removing power, wait the time on the drive\'s label/manual, then verify the DC bus is near zero with a rated meter before touching anything.' },
      { t: 'callout', tone: 'gotcha', title: 'No contactor switching on the output', text: 'Opening or closing a contactor between a running drive and its motor can damage the drive, unless the drive is designed and configured for it. // VERIFY per manual' },
    ],
    quiz: [
      { id: 'q1', q: 'A fan drive trips "overvoltage" only when stopping. Most likely fix?', choices: ['Shorter decel time', 'Longer decel time (or braking resistor)', 'Bigger fuse', 'Higher speed'], answer: 1, why: 'Fast decel regenerates energy onto the DC bus.' },
      { id: 'q2', q: 'Where does a drive get its speed when "speed reference = analog"?', choices: ['The keypad', 'An analog input like 0–10 V or 4–20 mA', 'The motor', 'The HMI only'], answer: 1, why: 'Analog reference from the PLC or a pot.' },
      { id: 'q3', q: 'Why enter the motor nameplate data?', choices: ['Decoration', 'Overload protection and motor control depend on it', 'Warranty', 'Speed display'], answer: 1, why: 'The drive models and protects the motor using it.' },
    ],
  },
  {
    id: 'hmi-basics',
    track: 't9',
    title: 'HMI basics',
    minutes: 6,
    summary: 'What the operator\'s screen can and can\'t do.',
    blocks: [
      { t: 'p', text: 'An [[hmi]] reads and writes PLC tags over the network: it shows values, sends button presses and setpoints, raises alarms and draws trends.' },
      { t: 'list', items: [
        '**Tags** on the HMI point at PLC tags. A "####" or blank field usually means a broken tag link or lost comms.',
        '**Momentary buttons** set a bit while pressed. If comms drop mid-press, the bit can stick — logic should time it out.',
        '**Security levels** limit who can change setpoints or force modes.',
        '**Alarms** are often generated in the HMI from PLC bits; the PLC still needs its own interlocks.',
      ] },
      { t: 'callout', tone: 'safety', title: 'The HMI is not a safety device', text: 'Never rely on an HMI button or screen interlock for safety. E-stops and safety functions are hardwired or safety-rated.' },
      { t: 'p', text: 'Common platforms: FactoryTalk View ME/SE (Rockwell), WinCC (Siemens), and many vendor-neutral SCADA packages. Same ideas everywhere.' },
    ],
    quiz: [
      { id: 'q1', q: 'Every field on an HMI screen shows ####. Most likely?', choices: ['Values too large', 'Lost communication to the PLC', 'Bad monitor', 'Wrong units'], answer: 1, why: 'When every tag fails, it\'s usually comms.' },
      { id: 'q2', q: 'Can an HMI stop button replace a hardwired E-stop?', choices: ['Yes', 'No', 'If colored red', 'If password protected'], answer: 1, why: 'Safety must not depend on a screen.' },
    ],
  },
  {
    id: 'bacnet-bms',
    track: 't9',
    title: 'BACnet and BMS vs PLC',
    minutes: 9,
    summary: 'How building automation thinks — essential for data center techs.',
    blocks: [
      { t: 'p', text: 'A building management system (BMS) supervises chillers, CRAHs/CRACs, AHUs, pumps and generators. It\'s slower and more supervisory than a machine PLC: schedules, setpoints, trends and alarms across a whole site.' },
      { t: 'p', text: '[[bacnet|BACnet]] organizes data as **objects** inside a **device** (each device has a unique instance number):' },
      { t: 'table', head: ['Object', 'Example'], rows: [
        ['Analog Input (AI)', 'Supply air temperature'],
        ['Analog Output (AO)', 'Chilled-water valve command %'],
        ['Analog Value (AV)', 'Setpoint'],
        ['Binary Input / Output / Value', 'Fan status / fan start / enable'],
        ['Multi-state Value', 'Mode: Off / Auto / Hand'],
        ['Schedule, Trend Log, Notification Class', 'Time-of-day, history, alarm routing'],
      ] },
      { t: 'p', text: 'Commandable points have a 16-level [[priority-array]]. The highest-priority non-empty slot wins. If a point "won\'t follow the schedule," someone may have left a manual override at a higher priority — release (relinquish) it.' },
      { t: 'list', items: ['**BACnet/IP** runs on Ethernet (UDP port 47808 by default).', '**BACnet MS/TP** runs on RS-485 daisy chains: MAC addresses, matching baud rate, termination at the ends.', 'Electrical power monitoring (EPMS) and gensets often speak **Modbus** too.'] },
      { t: 'callout', tone: 'brand', title: 'Common platforms', text: 'Johnson Controls Metasys, Siemens Desigo, Honeywell, Schneider EcoStruxure Building, Tridium Niagara-based systems — names differ, BACnet ideas are the same.' },
    ],
    quiz: [
      { id: 'q1', q: 'A CRAH fan ignores its schedule and runs 24/7. A likely BACnet cause?', choices: ['Bad sensor', 'A manual command left at a higher priority in the priority array', 'Wrong baud', 'Firmware'], answer: 1, why: 'Higher priority wins until relinquished.' },
      { id: 'q2', q: 'Which object type holds a measured supply air temperature?', choices: ['Binary Output', 'Analog Input', 'Schedule', 'Multi-state Value'], answer: 1, why: 'A measured analog value is an AI.' },
      { id: 'q3', q: 'Default BACnet/IP UDP port?', choices: ['502', '47808', '44818', '80'], answer: 1, why: '47808 (0xBAC0). 502 is Modbus TCP; 44818 is EtherNet/IP.' },
    ],
  },
  // ---------------- Track 10 ----------------
  {
    id: 'capstone-build',
    track: 't10',
    title: 'Capstone: build start/stop from scratch',
    minutes: 15,
    summary: 'Blank ladder, real machine. Write it, test it, prove it.',
    blocks: [
      { t: 'p', text: '**Spec:** The motor starts from a momentary Start button and keeps running after it\'s released. Stop, the E-stop monitor and the overload must each stop it. After stopping, it must not restart by itself.' },
      { t: 'list', ordered: true, items: [
        'Rung 0 is empty except for the output coil. Add Start_PB as a normally-open contact.',
        'Add a **branch** around Start with a Motor_Run contact (the seal-in).',
        'Add Stop_PB, EStop_OK and OL_OK in series — remember they\'re wired normally closed, so use XIC.',
        'Press **Verify**, then test: Start, release, Stop. Then Start again and hit the E-stop.',
      ] },
      { t: 'callout', tone: 'tip', title: 'Stuck?', text: 'Revisit "3-wire start/stop and the seal-in" and "Contacts and coils". The verifier warns if there\'s no seal-in.' },
    ],
    task: {
      goal: 'Build a working 3-wire start/stop: it seals in on Start and drops out on Stop.',
      steps: ['Build rung 0 from the spec using the editor.', 'Start the motor and release Start — it must keep running.', 'Press Stop — it must stop.'],
      rungs: [{ text: 'OTE(Motor_Run)', comment: 'Build the conditions in front of this coil.' }, { text: 'XIC(Motor_Run)XIC(M1_Aux)OTE(Run_Light)' }],
      check: 'build-start-stop',
      edit: true,
    },
    quiz: [
      { id: 'q1', q: 'In your finished rung, what keeps the motor on after Start is released?', choices: ['The overload', 'The Motor_Run seal-in contact in parallel with Start', 'The E-stop', 'A timer'], answer: 1, why: 'That\'s the seal-in.' },
      { id: 'q2', q: 'Why does EStop_OK appear in the logic when the E-stop is also hardwired?', choices: ['It doesn\'t need to', 'So the seal-in drops and the motor won\'t restart when the E-stop is released', 'To make it faster', 'For the HMI'], answer: 1, why: 'Hardware stops it; logic prevents the surprise restart.' },
    ],
  },
  {
    id: 'capstone-mixer',
    track: 't10',
    title: 'Capstone: design the batch mixer',
    minutes: 20,
    summary: 'A full machine spec — write the I/O list, states, interlocks and alarms.',
    blocks: [
      { t: 'p', text: '**Machine:** a flour batch mixer. Two ingredient feed screws weigh product into a hopper on load cells, a mixer runs for a set time, then a discharge gate opens to a conveyor. A dust collector must be running before any feed screw starts.' },
      { t: 'h', text: 'Your deliverables' },
      { t: 'list', ordered: true, items: [
        '**I/O list:** each input/output with tag, type (DI/DO/AI/AO) and description (feed screws, mixer motor, gate open/closed limits, dust collector running, load cell 4–20 mA, E-stop monitor, high-level probe).',
        '**State machine:** 0 Idle → 10 Feed A → 20 Feed B → 30 Mix → 40 Discharge → 50 Gate closed / done; 900 Fault.',
        '**Interlocks:** no feed without dust collector proven; no discharge unless conveyor running; gate must prove closed before feeding.',
        '**Alarms:** feed timeout, weight not reached, gate fails to open/close, dust collector stopped while feeding, high level.',
        '**Scaling:** load cell 4–20 mA → 0–2000 lb with a wire-break alarm under ~3.8 mA.',
      ] },
      { t: 'callout', tone: 'safety', title: 'Hardwired first', text: 'Guard switches and the E-stop go through a safety relay that removes power from the motors. Your logic watches them; it doesn\'t replace them.' },
      { t: 'callout', tone: 'tip', title: 'Check your design', text: 'Walk each state and ask: what turns on, what must be true to leave, what if it never happens, and what does the operator see? If you can answer all four for every state, you\'re thinking like a controls engineer.' },
    ],
    quiz: [
      { id: 'q1', q: 'The dust collector stops while Feed A is running. Correct response?', choices: ['Keep feeding', 'Stop feeding, go to fault state, alarm', 'Ignore it', 'Speed up the screw'], answer: 1, why: 'The interlock exists for dust/explosion hazard control.' },
      { id: 'q2', q: 'Load cell reads 2.1 mA. Your logic should…', choices: ['Treat it as 0 lb', 'Flag a wire break / bad signal and stop dosing', 'Scale it anyway', 'Add 4 mA'], answer: 1, why: 'Below 4 mA means bad signal, not empty.' },
      { id: 'q3', q: 'Which belongs in a safety relay rather than PLC logic only?', choices: ['Mix timer', 'E-stop and guard switches', 'Batch counter', 'Weight setpoint'], answer: 1, why: 'Safety functions must be hardwired or safety-rated.' },
    ],
  },
  // ---------------- Track 11: Expert ----------------
  {
    id: 'pid-tuning',
    track: 't11',
    title: 'PID tuning in practice',
    minutes: 12,
    summary: 'What P, I and D actually do, and a safe way to tune a loop.',
    blocks: [
      { t: 'p', text: 'A [[pid]] loop compares the process value (PV) to the setpoint (SP) and moves the control output (CV) to close the gap.' },
      { t: 'table', head: ['Term', 'Reacts to', 'Too much', 'Too little'], rows: [
        ['P (gain)', 'Error now', 'Oscillation', 'Sluggish, steady offset'],
        ['I (reset)', 'Error over time', 'Slow overshoot and cycling', 'Never quite reaches SP'],
        ['D (rate)', 'How fast error changes', 'Jumpy output, amplifies noise', 'More overshoot'],
      ] },
      { t: 'list', ordered: true, items: [
        '**Get the action right first.** Heating valve: reverse acting (PV low → open more). Cooling or draining: direct acting. Wrong action = the loop runs away.',
        '**Do an open-loop test** in manual: step the output 5–10 % and record how far and how fast the PV moves. That tells you gain and lag.',
        '**Start with P and I only** (D = 0). Most flow, level, pressure and temperature loops don\'t need D.',
        '**Change one thing at a time,** in small steps, and watch a [[trend]] of SP, PV and CV.',
        '**Return to auto bumplessly** — good PID blocks track the output in manual so the switch doesn\'t jump.',
      ] },
      { t: 'callout', tone: 'gotcha', title: 'Windup', text: 'If the output is pinned at 100 % but the PV still can\'t reach SP (valve too small, pump off), the integral keeps growing. When the PV finally gets there, it overshoots badly. Good blocks have anti-windup — the sim\'s PID does.' },
      { t: 'callout', tone: 'safety', title: 'Tune with operations', text: 'Tuning moves real equipment. Agree limits with operations, stay near the valve or a view of the process, and know how to put it back in manual.' },
    ],
    quiz: [
      { id: 'q1', q: 'A level loop never quite reaches setpoint; it sits 2 % low. Add more…', choices: ['D', 'I (integral)', 'Nothing', 'Noise filter'], answer: 1, why: 'Integral removes steady-state offset.' },
      { id: 'q2', q: 'The output swings back and forth quickly around SP. Likely cause?', choices: ['Gain too low', 'Gain too high', 'No integral', 'Wrong units'], answer: 1, why: 'Too much proportional gain oscillates.' },
      { id: 'q3', q: 'A cooling valve loop runs away (PV climbs, valve closes). First check?', choices: ['Gain', 'Controller action (direct vs reverse)', 'D term', 'Scan time'], answer: 1, why: 'Wrong action drives the output the wrong way.' },
    ],
  },
  {
    id: 'structured-text',
    track: 't11',
    title: 'Structured Text: the same logic as text',
    minutes: 10,
    summary: 'Read and write ST — the language for math, loops and state machines.',
    blocks: [
      { t: 'p', text: '[[structured-text|Structured Text]] is IEC 61131-3\'s text language. Ladder is easier to troubleshoot visually; ST is clearer for math, loops and CASE-based state machines. Many plants use both.' },
      { t: 'code', lang: 'st', caption: 'The 3-wire start/stop in ST.', text: `(* Seal-in: run if (start OR already running) AND stop not pressed *)
Motor_Run := (Start_PB OR Motor_Run) AND Stop_PB AND EStop_OK AND OL_OK;` },
      { t: 'code', lang: 'st', caption: 'A state machine with CASE.', text: `CASE Step OF
  10: Fill_Valve := TRUE;
      IF High_Level THEN Fill_Valve := FALSE; Step := 20; END_IF;
  20: Mixer_Run := TRUE;
      Mix_Tmr(IN := TRUE, PT := T#60S);
      IF Mix_Tmr.Q THEN Mixer_Run := FALSE; Mix_Tmr(IN := FALSE); Step := 30; END_IF;
  30: Drain_Valve := NOT Low_Level;
      IF Low_Level THEN Step := 0; END_IF;
END_CASE;` },
      { t: 'list', items: [
        '`:=` assigns, `=` compares. Statements end with `;`.',
        'Timers and counters are function block instances you call: `Mix_Tmr(IN := …, PT := …)` then read `.Q` and `.ET`.',
        'An ST assignment writes every scan, just like an OTE — the same duplicate-write rules apply.',
        'Loops (`FOR`, `WHILE`) run inside one scan. A loop that never ends trips the watchdog.',
      ] },
      { t: 'brands', rows: [
        { skin: 'ab-logix', text: 'ST routines are available in Logix-style controllers; timers there are TONR/TOFR-style function blocks in ST. // VERIFY' },
        { skin: 'siemens-tia', text: 'Called SCL in TIA Portal. Very common for S7-1200/1500 FBs.' },
        { skin: 'iec', text: 'CODESYS-based platforms are often ST-first.' },
      ] },
    ],
    quiz: [
      { id: 'q1', q: 'In ST, which line assigns a value?', choices: ['Motor = TRUE;', 'Motor := TRUE;', 'Motor == TRUE;', 'SET Motor;'], answer: 1, why: '`:=` assigns; `=` compares.' },
      { id: 'q2', q: 'A WHILE loop never exits. What happens?', choices: ['It runs in the background', 'The scan never finishes and the watchdog faults the controller', 'Nothing', 'Outputs freeze safely'], answer: 1, why: 'Loops run inside one scan.' },
      { id: 'q3', q: 'How do you read an IEC timer\'s done output in ST?', choices: ['Tmr.DN', 'Tmr.Q', 'Tmr.DONE()', 'DONE(Tmr)'], answer: 1, why: 'IEC timers use .Q (done) and .ET (elapsed).' },
    ],
  },
  {
    id: 'reusable-logic',
    track: 't11',
    title: 'Reusable logic and code standards',
    minutes: 8,
    summary: 'AOIs, function blocks and standards — how pros write code others can maintain.',
    blocks: [
      { t: 'p', text: 'Fifty motors shouldn\'t mean fifty hand-written copies of start/stop/fail-to-start logic. Write it once as an [[aoi|Add-On Instruction or function block]] with a [[udt|UDT]], then use an instance per motor.' },
      { t: 'list', items: [
        '**Inputs:** permissives, interlocks, aux contact, overload, HMI commands.',
        '**Outputs:** run command, running status, faults, alarms.',
        '**Inside:** fail-to-start timer, fail-to-stop, runtime hours, mode (auto/hand/off).',
        '**Version it** and document changes — every instance uses the new version after download.',
      ] },
      { t: 'h', text: 'Standards worth adopting' },
      { t: 'list', items: [
        'Consistent naming tied to the P&ID/print tags.',
        'Every rung commented with intent. Every alarm text written for the operator.',
        'Separate I/O mapping routines: raw inputs → logical tags, so a rewired point is fixed in one place.',
        'No unexplained AFI, NOP or bypass bits left behind. No forces in steady state.',
        'Same structure in every program: Inputs → Logic → Alarms → Outputs.',
      ] },
      { t: 'callout', tone: 'gotcha', title: 'Editing a block edits every instance', text: 'A "small fix" in a shared block changes every motor that uses it. Test on one, review, and plan the download.' },
    ],
    quiz: [
      { id: 'q1', q: 'Why map raw I/O to logical tags in one routine?', choices: ['Speed', 'A rewired point is fixed in one place instead of everywhere', 'Required', 'Saves memory'], answer: 1, why: 'Isolation makes changes safe and quick.' },
      { id: 'q2', q: 'You change logic inside a motor AOI used 40 times. Effect?', choices: ['Only one motor changes', 'All 40 instances get the change', 'None until reboot', 'It faults'], answer: 1, why: 'Shared definition, shared behavior.' },
    ],
  },
  {
    id: 'analog-alarming',
    track: 't11',
    title: 'Analog alarming done right',
    minutes: 8,
    summary: 'Deadband, delays, bad-quality signals and alarm levels.',
    blocks: [
      { t: 'p', text: 'A high-level alarm at exactly 90.0 % will chatter on and off as the level ripples. Pros add:' },
      { t: 'list', items: [
        '**[[deadband|Deadband]]:** trip at 90 %, reset below 88 %.',
        '**On-delay:** must stay above 90 % for 5 s before alarming (filters splashes and noise).',
        '**Levels:** H / L for operator attention, HH / LL for automatic action (trip a pump, close a valve).',
        '**Bad quality:** under ~3.8 mA or over ~20.5 mA is a signal fault, not a real value — alarm it separately and fail safe. // VERIFY card thresholds',
        '**Rate of change:** sometimes "rising too fast" matters more than the value.',
      ] },
      { t: 'rung', text: '[GEQ(Level,90.0),XIC(Hi_Latched)GEQ(Level,88.0)]OTE(Hi_Latched)', tags: [{ name: 'Level', type: 'REAL' }, { name: 'Hi_Latched', type: 'BOOL' }], caption: 'Deadband in ladder: once on, it stays on until Level drops below 88.' },
      { t: 'callout', tone: 'tip', title: 'Alarm philosophy', text: 'Each alarm needs a defined operator response. If nobody would do anything, it\'s an event or a log entry, not an alarm.' },
    ],
    quiz: [
      { id: 'q1', q: 'A pressure alarm turns on and off 10 times a minute near setpoint. Best fix?', choices: ['Delete it', 'Add deadband and/or an on-delay', 'Raise the setpoint a lot', 'Add a horn'], answer: 1, why: 'Hysteresis and delay stop chatter without hiding real problems.' },
      { id: 'q2', q: 'The transmitter reads 21.8 mA. You should…', choices: ['Report 110 %', 'Treat it as a bad-quality signal', 'Ignore it', 'Rescale'], answer: 1, why: 'Out-of-range current indicates a fault.' },
    ],
  },
  {
    id: 'commissioning',
    track: 't11',
    title: 'Commissioning: I/O checkout to handover',
    minutes: 10,
    summary: 'How a new system is proven, point by point.',
    blocks: [
      { t: 'list', ordered: true, items: [
        '**Pre-power checks:** wiring vs drawings, torque, insulation resistance on motor circuits, correct fuses, grounding.',
        '**Power up in stages:** control power, then PLC, then field devices. Verify supply voltages.',
        '**I/O checkout:** operate every input from the field and see the right tag change; command every output (with permission and people clear) and see the right device respond.',
        '**[[loop-check|Loop checks]]:** inject or simulate 4/12/20 mA and confirm 0/50/100 % in the PLC and HMI.',
        '**Motor bumps:** check rotation with a short bump before coupling the load.',
        '**Functional tests:** sequences, interlocks, alarms, E-stops and safety functions per the test plan.',
        '**[[fat-sat|FAT/SAT]] sign-off, punch list, as-built drawings, backups and training.**',
      ] },
      { t: 'callout', tone: 'safety', title: 'Commanding outputs moves things', text: 'Forcing or commanding outputs during checkout requires a plan: who\'s near the equipment, mechanical lockouts where needed, and communication. Safety functions are validated by qualified people against the safety requirements.' },
      { t: 'callout', tone: 'tip', title: 'Mark up as you go', text: 'Every wiring correction goes on the red-line drawings immediately. The as-built set is what the next tech will trust.' },
    ],
    quiz: [
      { id: 'q1', q: 'Why bump a motor before coupling it?', choices: ['To warm it', 'To verify rotation without damaging the load', 'Required by code', 'To test the PLC'], answer: 1, why: 'Wrong rotation can wreck pumps and gearboxes.' },
      { id: 'q2', q: 'A loop check at 12 mA should read…', choices: ['12 %', '50 % of range', '75 %', '0 %'], answer: 1, why: '12 mA is mid-scale of 4–20 mA.' },
      { id: 'q3', q: 'As-built drawings are…', choices: ['The original design', 'Drawings updated to match what was actually installed', 'Optional', 'The bill of materials'], answer: 1, why: 'They reflect reality after field changes.' },
    ],
  },
  {
    id: 'safety-systems',
    track: 't11',
    title: 'Safety systems for controls techs',
    minutes: 10,
    summary: 'Safety relays, dual channels, monitored resets and what PL/SIL mean.',
    blocks: [
      { t: 'callout', tone: 'safety', title: 'Awareness only', text: 'Designing or modifying safety functions requires qualified engineering, a risk assessment and validation. This lesson helps you recognize and respect what\'s there.' },
      { t: 'list', items: [
        '**[[safety-relay|Safety relays]]** monitor E-stops, gate switches and light curtains on **two channels**. A single wire fault is detected instead of silently defeating the stop.',
        '**Force-guided (mechanically linked) contacts** let the relay detect a welded contact.',
        '**Monitored manual reset:** the machine restarts only after a deliberate reset with the guard closed — never automatically.',
        '**Safety PLCs** (safety-rated controllers) run separate, signature-protected safety logic with dual processors.',
        '**[[performance-level|PL / SIL]]** express how reliable a safety function must be, based on a risk assessment.',
        '**Safe torque off (STO)** on drives removes torque-producing power without opening the motor circuit — when configured and validated as part of a safety function.',
      ] },
      { t: 'callout', tone: 'gotcha', title: 'Signs someone defeated a safety device', text: 'Jumpers on safety relay inputs, taped interlock switches, a magnet stuck on a guard sensor, or "bypass" bits in logic. Report it — don\'t work around it.' },
    ],
    quiz: [
      { id: 'q1', q: 'Why are E-stops wired dual-channel to a safety relay?', choices: ['Brighter', 'So a single fault (short or open) is detected', 'Cheaper', 'Faster PLC scan'], answer: 1, why: 'Redundancy plus monitoring catches faults.' },
      { id: 'q2', q: 'After a guard is closed, the machine should restart…', choices: ['Automatically', 'Only after a deliberate monitored reset/start', 'After 5 seconds', 'When the HMI says so'], answer: 1, why: 'No unexpected restart.' },
      { id: 'q3', q: 'You find a jumper across a light curtain input. You…', choices: ['Leave it', 'Remove it yourself and run', 'Stop, report it per site rules, and don\'t run until it\'s resolved', 'Add another'], answer: 2, why: 'Defeated safety devices are serious; follow your site\'s process.' },
    ],
  },
  {
    id: 'network-troubleshooting',
    track: 't11',
    title: 'Industrial network troubleshooting',
    minutes: 9,
    summary: 'From link lights to duplicate IPs to broadcast storms.',
    blocks: [
      { t: 'list', ordered: true, items: [
        '**Physical:** link/activity lights on both ends, cable seated, no crushed or kinked cable, correct port. Test the cable.',
        '**Addressing:** right IP/subnet, no duplicates (ping it with the device unplugged — still replies? duplicate).',
        '**Identity:** PROFINET name or EtherNet/IP address matches the project.',
        '**Switch data:** a managed switch shows per-port errors, speed/duplex and which MAC is on which port.',
        '**Load:** a loop (two cables between switches without spanning tree) causes a broadcast storm: every light blinks solid, everything times out.',
        '**Trends and counters:** connection-loss counters and comm-fault bits tell you when and how often.',
      ] },
      { t: 'callout', tone: 'tip', title: 'Intermittent? Trend it.', text: 'Log the comm-fault bit with a timestamp. Faults every day at 2 PM point to something on a schedule — a VFD starting near the cable, a backup job, a forklift route.' },
      { t: 'callout', tone: 'gotcha', title: 'Noise', text: 'Unshielded Ethernet run alongside VFD output cables picks up noise. Separate power and data, cross at right angles, and use the cable and grounding the manufacturer specifies.' },
    ],
    quiz: [
      { id: 'q1', q: 'Every device on a switch suddenly times out and all port lights are solid. Suspect…', choices: ['One bad sensor', 'A network loop / broadcast storm', 'PLC program', 'Low battery'], answer: 1, why: 'A loop floods the network.' },
      { id: 'q2', q: 'Unplug a device; its IP still answers ping. Meaning?', choices: ['Cached', 'Another device has the same IP', 'Ping is broken', 'Good'], answer: 1, why: 'Duplicate address.' },
    ],
  },
  {
    id: 'change-management',
    track: 't11',
    title: 'Change management and backups',
    minutes: 7,
    summary: 'The habits that separate a trusted tech from a risky one.',
    blocks: [
      { t: 'list', items: [
        '**[[moc|MOC]]:** non-trivial changes are reviewed and approved before they\'re made — what, why, risk, test plan, back-out plan.',
        '**Backups on a schedule** and after every change: controllers, HMIs, drives (parameter files), network switches.',
        '**Version control:** one source of truth, dated, with comments.',
        '**Communicate:** operations knows before, during and after.',
        '**Document forces, bypasses and temporary changes** with an expiry and an owner.',
        '**Close the loop:** update drawings, the change log and training.',
      ] },
      { t: 'callout', tone: 'tip', title: 'The 3 AM test', text: 'Could someone who has never seen this system find the latest program, know what changed last week, and restore it in 15 minutes? If not, fix that before the next outage.' },
    ],
    quiz: [
      { id: 'q1', q: 'A drive was replaced. What must be restored?', choices: ['Nothing', 'Its parameter set (from backup) and verified', 'Only the IP', 'The PLC program'], answer: 1, why: 'A new drive has default parameters.' },
      { id: 'q2', q: 'A temporary bypass should have…', choices: ['Nothing — it\'s temporary', 'Documentation, approval, an owner and an expiry', 'A sticky note', 'A password'], answer: 1, why: '"Temporary" changes become permanent without controls.' },
    ],
  },
];
