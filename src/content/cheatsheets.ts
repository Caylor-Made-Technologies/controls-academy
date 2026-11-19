/**
 * Printable cheat sheets (Reference → Cheat sheets). Data only; the page prints one sheet per card.
 * Rules: name standards generally, never invent specs. Colors and numbering vary by site, edition and country:
 * every sheet says so, and uncertain lines end with "// VERIFY <what>" (listed in docs/VERIFY.md).
 * Training material, not site procedure.
 */

export interface SheetTable { caption: string; head: string[]; rows: string[][] }
export interface Sheet {
  id: string;
  title: string;
  intro: string;
  tables?: SheetTable[];
  /** Formulas or rules, one per line ("label: formula"). */
  lines?: string[];
  note?: string;
  lesson?: string;
}

export const SHEETS: Sheet[] = [
  {
    id: 'wire-colors', title: 'Wire colors', lesson: 'z-symbols',
    intro: 'Common color conventions. Your site\'s spec, the print and the electrical code in force always win: verify before you rely on a color, and never trust a color as proof a wire is dead.',
    tables: [
      {
        caption: 'Machine and control panels in the US (NFPA 79 conventions)',
        head: ['Conductor', 'Usual color'],
        rows: [
          ['Ungrounded AC or DC power', 'Black'],
          ['Ungrounded AC control', 'Red'],
          ['Ungrounded DC control', 'Blue'],
          ['Grounded AC conductor (neutral)', 'White or gray'],
          ['Grounded DC conductor', 'White with a blue stripe // VERIFY edition'],
          ['Equipment ground', 'Green, or green with yellow stripe'],
          ['Stays live with the main disconnect off (interlock or foreign circuits)', 'Orange (older panels: yellow) // VERIFY edition'],
        ],
      },
      {
        caption: 'Building wiring in the US (NEC)',
        head: ['Conductor', 'Color'],
        rows: [
          ['Grounded conductor (neutral)', 'White or gray (277/480 V neutrals are usually gray); larger sizes may be marked at the ends instead // VERIFY code edition'],
          ['Equipment ground', 'Green, green with yellow stripe, or bare; larger sizes may be marked at the ends // VERIFY code edition'],
          ['Phases, 208/120 V (common practice)', 'Black, red, blue // VERIFY site spec'],
          ['Phases, 480/277 V (common practice)', 'Brown, orange, yellow // VERIFY site spec'],
          ['High leg of a 120/240 V delta', 'Orange (required). Don\'t assume orange means a 480 V phase'],
        ],
      },
      {
        caption: 'IEC (Europe and many imported machines, IEC 60445)',
        head: ['Conductor', 'Color'],
        rows: [
          ['L1, L2, L3', 'Brown, black, gray'],
          ['Neutral', 'Blue'],
          ['Protective earth', 'Green-yellow'],
          ['Older imported machines', 'May use other colors (for example older UK machines: red, yellow, blue phases and a black neutral). Always check the machine\'s prints.'],
        ],
      },
    ],
    note: 'Colors only tell wires apart. Orange or yellow wires can stay live with the main disconnect off, and a white wire can be re-marked and used as a hot. A meter tells you whether a wire is live: test before touch, every time.',
  },
  {
    id: 'numbering', title: 'Contact and terminal numbering', lesson: 'relays-contactors',
    intro: 'The numbers printed on contactors, relays and overloads (IEC/EN 60947 style, now used on most brands sold in the US).',
    tables: [
      {
        caption: 'Terminals',
        head: ['Marking', 'Meaning'],
        rows: [
          ['A1 – A2', 'Coil'],
          ['1/L1 – 2/T1, 3/L2 – 4/T2, 5/L3 – 6/T3', 'Main power contacts: line in, load out'],
          ['x3 – x4 (13–14, 23–24…)', 'Normally open (NO) contact. First digit = the contact\'s position (1st, 2nd…); second digit = its type (1–2 NC, 3–4 NO)'],
          ['x1 – x2 (11–12, 21–22…)', 'Normally closed (NC) contact'],
          ['11 – 12 – 14', 'Changeover (form C) on plug-in relays: 11 common, 12 NC, 14 NO'],
          ['95 – 96', 'Overload relay NC contact (opens on trip; wired into the coil circuit)'],
          ['97 – 98', 'Overload relay NO contact (closes on trip; often a fault light or PLC input)'],
          ['x5 – x6 / x7 – x8', 'Special-function contacts, such as timed or overload contacts (95–96 and 97–98 are this kind; many timers use 15–16–18) // VERIFY per relay'],
        ],
      },
    ],
    note: 'Older and some US-made devices use other numbering. Follow the device\'s own label and the print.',
  },
  {
    id: 'symbols', title: 'NEMA vs IEC symbols', lesson: 'z-symbols',
    intro: 'US prints mostly use NEMA-style ladder symbols; imported machines often use IEC symbols. Same devices, different drawings.',
    tables: [
      {
        caption: 'How the common symbols differ',
        head: ['Device', 'NEMA (US ladder prints)', 'IEC'],
        rows: [
          ['NO contact', 'Two parallel vertical lines', 'A line with a gap and a slanted blade'],
          ['NC contact', 'Two parallel lines with a diagonal slash', 'A slanted blade touching a stop'],
          ['Coil', 'Circle with a letter (M, CR)', 'Rectangle (box) with a device tag (K1)'],
          ['Pushbutton', 'Contacts with a T-shaped plunger above', 'Contact with a pushbutton actuator symbol'],
          ['Overload heater', 'Zig-zag or loop in the power line', 'Box with a thermal (bent line) symbol'],
          ['Pilot light', 'Circle with rays or a color letter (R, G)', 'Circle with an X'],
        ],
      },
    ],
    note: 'IEC prints usually read top to bottom; NEMA ladders read left to right. Device tags differ too: NEMA prints use names like M1, CR3, PB2; IEC prints use letters like K1 (contactor or relay), S1 (switch), F1 (protection), Q1 (power switching). // VERIFY letter codes per print legend',
  },
  {
    id: 'analog', title: '4–20 mA math', lesson: 'analog-420',
    intro: 'A 4–20 mA loop maps the bottom of the range to 4 mA and the top to 20 mA. 0 mA is never a real value: it means no loop current (an open wire, no loop power, a blown fuse or a dead transmitter).',
    lines: [
      'Span: 20 − 4 = 16 mA',
      'Process value: low + (mA − 4) ÷ 16 × (high − low)',
      'Expected mA: 4 + 16 × (value − low) ÷ (high − low)',
      'Quick points: 4 mA = 0 %, 8 mA = 25 %, 12 mA = 50 %, 16 mA = 75 %, 20 mA = 100 %',
      'Example: 0–5 m level, 12 mA → 0 + 8 ÷ 16 × 5 = 2.5 m',
      'Example: 0–150 psi, 50 psi → 4 + 16 × 50 ÷ 150 = 9.33 mA',
      'Voltage input: a 250 Ω resistor turns 4–20 mA into 1–5 V',
      'Two-wire transmitters are powered by the loop itself; four-wire ones have their own power supply',
      'Measuring: mA is read in series (or with the meter\'s loop function). Never put the meter\'s amps input across a voltage',
    ],
    note: 'Outside about 3.8–20.5 mA the reading is out of range. At or below about 3.6 mA, or at or above about 21 mA, many transmitters are signalling a fault (a common industry convention). // VERIFY per transmitter and card',
  },
  {
    id: 'ohms', title: 'Ohm\'s law and power', lesson: 'z-ohms-power',
    intro: 'V = volts, I = amps, R = ohms, P = watts.',
    lines: [
      'Volts: V = I × R',
      'Amps: I = V ÷ R',
      'Ohms: R = V ÷ I',
      'Power (DC or resistive loads): P = V × I = I² × R = V² ÷ R',
      'Single-phase AC power: P = V × I × PF (PF = power factor)',
      'Three-phase power: P = √3 × V(line-line) × I × PF  (√3 ≈ 1.732). This is electrical input, not shaft output; 1 hp ≈ 746 W',
      'Example: 24 V across 1,200 Ω → 0.02 A (20 mA)',
      'Example: 480 V, 10 A, PF 0.85, three-phase → about 7.1 kW',
    ],
    note: 'Motor nameplate current (FLA) is what the motor draws at full load; real current depends on the load. Overloads are set from the nameplate; wire and breaker sizing uses the electrical code\'s tables, not the nameplate. // VERIFY code edition',
  },
  {
    id: 'drive-faults', title: 'Drive fault families', lesson: 'vfd-basics',
    intro: 'Fault codes differ by brand and model; look them up in the drive\'s manual. Most faults fall into these families.',
    tables: [
      {
        caption: 'Families, usual causes, first checks',
        head: ['Family', 'Usual causes', 'First checks'],
        rows: [
          ['Overcurrent', 'Jammed load, accel too short, damaged motor or cable', 'After lockout: the load turns freely, then motor and cable; check the accel time'],
          ['Motor overload (drive I²t)', 'Working too hard for too long', 'Load; motor data set in the drive'],
          ['DC bus overvoltage', 'Stopping a heavy load too fast; high line voltage', 'Decel time; braking resistor if fitted'],
          ['Undervoltage', 'Supply dip (a lost phase often has its own fault)', 'Incoming supply, fuses, connections'],
          ['Phase loss (input or output)', 'Blown fuse, loose connection, open motor lead', 'Fuses and connections on each phase (after lockout)'],
          ['Overtemperature', 'Clogged filters, failed fan, dirty heatsink, hot cabinet', 'Fans, filters, heatsink (after lockout and wait time)'],
          ['Ground fault', 'Damaged insulation in the motor or cable', 'Lock out, wait, verify the DC bus is dead; lift the motor leads off the drive output, then test the motor and cable (trained and authorized only; discharge after). Never insulation-test the drive itself'],
          ['Communication / external', 'Lost network link, or an interlock wired to the drive', 'Comms status; which interlock opened and why'],
          ['Motor feedback', 'Motor thermistor or encoder fault', 'Sensor wiring and the motor\'s temperature'],
          ['Hardware / internal', 'Power module or memory fault', 'Record it and call the vendor or a qualified person'],
        ],
      },
    ],
    note: 'The DC bus stays charged after power is removed: wait the time on the drive label and verify zero volts before touching anything. A drive\'s stop, fault or Safe Torque Off is not lockout: the motor side can still be live. Drives with auto-reset, or with a run command still on, can restart by themselves, including when power returns: keep clear.',
  },
];

export const SHEET_BY_ID = new Map(SHEETS.map((s) => [s.id, s]));
