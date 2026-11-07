/**
 * Wiring trainer: exercises and a checker that tests BEHAVIOR, not one answer key.
 * The learner connects terminals with wires; we build electrical nets (union-find), then simulate
 * the circuit through a test sequence and explain the first thing that goes wrong.
 * Pure functions, unit-tested in tests/unit/wiring.test.ts.
 */

/** Colors only tell wires apart on screen (real color codes vary by site, voltage and country). */
export const WIRE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

export interface Terminal { id: string; label: string }
export interface WDevice { id: string; name: string; note: string; terminals: Terminal[] }
export type Wire = [string, string];

export interface Exercise {
  id: 'three-wire' | 'prox-pnp' | 'prox-npn' | 'loop';
  title: string;
  goal: string;
  safety: string;
  devices: WDevice[];
  /** One correct answer, for "Show me". The checker accepts any wiring that behaves correctly. */
  solution: Wire[];
}

export interface CheckStep { name: string; ok: boolean; why?: string }
export interface CheckResult { pass: boolean; steps: CheckStep[]; reading?: string }

// ---------- nets ----------

/** Union-find over terminal ids; `closed` adds internal device connections (closed contacts). */
export function nets(wires: Wire[], closed: Wire[] = []): (t: string) => string {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = parent.get(x) ?? x;
    if (r !== x) { r = find(r); parent.set(x, r); }
    return r;
  };
  for (const [a, b] of [...wires, ...closed]) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  return find;
}

const same = (net: (t: string) => string, a: string, b: string) => net(a) === net(b);

// ---------- exercises ----------

const SAFETY_WIRE = 'Training board. On real equipment: lock out, tag out, try out, and test live-dead-live before you touch a terminal.';

export const EXERCISES: Exercise[] = [
  {
    id: 'three-wire',
    title: '3-wire start/stop',
    goal: 'Wire a motor starter so Start runs the motor, it keeps running when you let go (seal-in), Stop drops it, and the overload trips it.',
    safety: `${SAFETY_WIRE} Never wire anything that lets a motor restart by itself after Stop or an overload trip.`,
    devices: [
      { id: 'X', name: 'Control power 120 VAC', note: 'X1 is hot (after the control fuse), X2 is the grounded side.', terminals: [{ id: 'X1', label: 'X1 (hot)' }, { id: 'X2', label: 'X2 (common)' }] },
      { id: 'STOP', name: 'Stop pushbutton (NC)', note: 'Normally closed: 1–2 open while pressed.', terminals: [{ id: 'STOP.1', label: 'Stop 1' }, { id: 'STOP.2', label: 'Stop 2' }] },
      { id: 'START', name: 'Start pushbutton (NO)', note: 'Normally open: 3–4 closed while pressed.', terminals: [{ id: 'START.3', label: 'Start 3' }, { id: 'START.4', label: 'Start 4' }] },
      { id: 'M', name: 'Contactor M', note: 'Coil A1–A2. Auxiliary contact 13–14 (NO) closes when the coil pulls in.', terminals: [{ id: 'M.A1', label: 'M coil A1' }, { id: 'M.A2', label: 'M coil A2' }, { id: 'M.13', label: 'M aux 13' }, { id: 'M.14', label: 'M aux 14' }] },
      { id: 'OL', name: 'Overload relay', note: '95–96 is normally closed and opens when the overload trips.', terminals: [{ id: 'OL.95', label: 'OL 95' }, { id: 'OL.96', label: 'OL 96' }] },
    ],
    solution: [['X1', 'STOP.1'], ['STOP.2', 'START.3'], ['START.3', 'M.13'], ['START.4', 'M.14'], ['M.14', 'M.A1'], ['M.A2', 'OL.95'], ['OL.96', 'X2']],
  },
  {
    id: 'prox-pnp',
    title: 'PNP prox to a sinking input',
    goal: 'Wire a 3-wire PNP (sourcing) proximity sensor to a sinking PLC input so I0 turns on when the target is present.',
    safety: `${SAFETY_WIRE} Check the sensor's datasheet: wire colors here follow the common IEC convention (brown +, blue −, black output).`,
    devices: [
      { id: 'PSU', name: '24 VDC supply', note: '+24 V and 0 V.', terminals: [{ id: 'P+', label: '+24 V' }, { id: 'P-', label: '0 V' }] },
      { id: 'SEN', name: 'PNP prox sensor', note: 'Normally open (N.O.) sensor: brown +, blue −, black output. PNP sources: with a target present, black switches to +24 V.', terminals: [{ id: 'S.BN', label: 'Brown (+)' }, { id: 'S.BU', label: 'Blue (−)' }, { id: 'S.BK', label: 'Black (out)' }] },
      { id: 'IN', name: 'Sinking input card', note: 'A sinking input takes current IN at I0 and returns it through COM, so COM goes to 0 V.', terminals: [{ id: 'I.0', label: 'I0' }, { id: 'I.COM', label: 'COM' }] },
    ],
    solution: [['P+', 'S.BN'], ['P-', 'S.BU'], ['S.BK', 'I.0'], ['I.COM', 'P-']],
  },
  {
    id: 'prox-npn',
    title: 'NPN prox to a sourcing input',
    goal: 'Wire a 3-wire NPN (sinking) proximity sensor to a sourcing PLC input so I0 turns on when the target is present.',
    safety: `${SAFETY_WIRE} Check the sensor's datasheet: wire colors here follow the common IEC convention (brown +, blue −, black output).`,
    devices: [
      { id: 'PSU', name: '24 VDC supply', note: '+24 V and 0 V.', terminals: [{ id: 'P+', label: '+24 V' }, { id: 'P-', label: '0 V' }] },
      { id: 'SEN', name: 'NPN prox sensor', note: 'Normally open (N.O.) sensor: brown +, blue −, black output. NPN sinks: with a target present, black switches to 0 V.', terminals: [{ id: 'S.BN', label: 'Brown (+)' }, { id: 'S.BU', label: 'Blue (−)' }, { id: 'S.BK', label: 'Black (out)' }] },
      { id: 'IN', name: 'Sourcing input card', note: 'A sourcing input pushes current OUT of I0 into the device, so COM goes to +24 V.', terminals: [{ id: 'I.0', label: 'I0' }, { id: 'I.COM', label: 'COM' }] },
    ],
    solution: [['P+', 'S.BN'], ['P-', 'S.BU'], ['S.BK', 'I.0'], ['I.COM', 'P+']],
  },
  {
    id: 'loop',
    title: '4–20 mA loop with a shunt',
    goal: 'Power a 2-wire (loop-powered) transmitter from 24 VDC, put a 250 Ω shunt in the loop, and connect a 1–5 V analog input across the shunt.',
    safety: `${SAFETY_WIRE} A 4–20 mA loop is low energy, but the panel around it may not be. Opening a live loop sends the reading under range and can trip interlocks or move valves: tell operations and put the loop in manual first.`,
    devices: [
      { id: 'PSU', name: '24 VDC loop supply', note: '+24 V and 0 V.', terminals: [{ id: 'P+', label: '+24 V' }, { id: 'P-', label: '0 V' }] },
      { id: 'TX', name: '2-wire transmitter', note: 'Loop-powered: current flows in at + and out at −. It sets 4–20 mA (12 mA right now).', terminals: [{ id: 'TX+', label: 'TX +' }, { id: 'TX-', label: 'TX −' }] },
      { id: 'R', name: '250 Ω shunt resistor', note: 'Turns the loop current into a voltage: 4 mA → 1 V, 20 mA → 5 V.', terminals: [{ id: 'R.a', label: 'Shunt a' }, { id: 'R.b', label: 'Shunt b' }] },
      { id: 'AI', name: '1–5 V analog input', note: 'A voltage input: very high resistance. It measures the voltage between V+ and V−.', terminals: [{ id: 'AI+', label: 'AI V+' }, { id: 'AI-', label: 'AI V−' }] },
    ],
    solution: [['P+', 'TX+'], ['TX-', 'R.a'], ['R.a', 'AI+'], ['R.b', 'P-'], ['AI-', 'R.b']],
  },
];

export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// ---------- checkers ----------

/** 3-wire control: simulate the coil through press/release/stop/overload, iterating the seal-in. */
function checkThreeWire(wires: Wire[]): CheckResult {
  const steps: CheckStep[] = [];
  let coil = false;
  const evalCoil = (start: boolean, stop: boolean, olTripped: boolean): { coil: boolean; short: boolean } => {
    // Iterate because the aux contact depends on the coil (seal-in).
    for (let i = 0; i < 4; i++) {
      const closed: Wire[] = [];
      if (!stop) closed.push(['STOP.1', 'STOP.2']);
      if (start) closed.push(['START.3', 'START.4']);
      if (coil) closed.push(['M.13', 'M.14']);
      if (!olTripped) closed.push(['OL.95', 'OL.96']);
      const n = nets(wires, closed);
      if (same(n, 'X1', 'X2')) return { coil: false, short: true };
      const next = (same(n, 'M.A1', 'X1') && same(n, 'M.A2', 'X2')) || (same(n, 'M.A1', 'X2') && same(n, 'M.A2', 'X1'));
      if (next === coil) return { coil, short: false };
      coil = next;
    }
    return { coil, short: false };
  };
  const n0 = nets(wires);
  const stopUsed = wires.some(([a, b]) => a.startsWith('STOP.') || b.startsWith('STOP.'));
  const STOP_WHY = stopUsed
    ? 'Stop doesn\'t drop the coil. The seal-in is probably around Stop as well as Start. The aux belongs across Start only; Stop must be in series ahead of both.'
    : 'Stop isn\'t in the circuit. Wire it in series from X1, ahead of Start and the seal-in.';
  const OL_WHY = 'The overload doesn\'t stop the motor. Its 95–96 contact must be in series with the coil (usually between A2 and X2).';
  const seq: { name: string; start: boolean; stop: boolean; ol: boolean; want: boolean; why: string }[] = [
    { name: 'Nothing pressed: motor off', start: false, stop: false, ol: false, want: false, why: 'The coil is on with nothing pressed. Something bypasses Start — check that Start\'s 3–4 and the aux 13–14 are the only way to A1.' },
    { name: 'Press Start: coil pulls in', start: true, stop: false, ol: false, want: true, why: 'Pressing Start doesn\'t energize the coil. Trace the path: X1 → Stop → Start → A1, and A2 → overload 95–96 → X2. Every link must be there.' },
    { name: 'Release Start: it stays on (seal-in)', start: false, stop: false, ol: false, want: true, why: 'No seal-in: the motor only runs while Start is held. Put the aux contact 13–14 in parallel with Start (same two points as Start\'s 3 and 4).' },
    { name: 'Press Stop: coil drops out', start: false, stop: true, ol: false, want: false, why: STOP_WHY },
    { name: 'Release Stop: it stays off', start: false, stop: false, ol: false, want: false, why: 'The motor restarts by itself when Stop is released. That\'s dangerous — the seal-in must not be able to re-energize the coil without Start.' },
    { name: 'Press Start again: runs', start: true, stop: false, ol: false, want: true, why: 'Pressing Start doesn\'t energize the coil.' },
    { name: 'Run, then the overload trips: coil drops out', start: false, stop: false, ol: true, want: false, why: OL_WHY },
    { name: 'Overload tripped, press Start: stays off', start: true, stop: false, ol: true, want: false, why: 'Pressing Start runs the motor with the overload tripped. 95–96 must be in series with the coil itself, not only in the seal-in branch.' },
    { name: 'Hold Start and press Stop: coil drops out (Stop wins)', start: true, stop: true, ol: false, want: false, why: 'With Start held (or stuck), Stop does nothing. Stop must be in series ahead of both Start and the seal-in, so it always wins.' },
  ];
  for (const s of seq) {
    const r = evalCoil(s.start, s.stop, s.ol);
    if (r.short) {
      steps.push({ name: s.name, ok: false, why: 'Dead short: X1 connects straight to X2 through wires and closed contacts with no coil in the way. The control fuse blows. Every path from X1 to X2 must go through the coil.' });
      return { pass: false, steps };
    }
    const ok = r.coil === s.want;
    steps.push({ name: s.name, ok, why: ok ? undefined : s.why });
    if (!ok) return { pass: false, steps };
  }
  // Switch the hot side: one side of the coil goes straight to the grounded conductor (X2); only the
  // overload contact may sit between them.
  // VERIFY: wording vs NFPA 79 / NEC 430.74 practice (docs/VERIFY.md).
  const olNets = [n0('OL.95'), n0('OL.96')];
  const coilToX2 = ['M.A1', 'M.A2'].some((t) => same(n0, t, 'X2') || (olNets.includes(n0(t)) && olNets.includes(n0('X2'))));
  steps.push({ name: 'Buttons switch the hot side (X1); the coil goes to X2', ok: coilToX2, why: coilToX2 ? undefined : 'It works, but Stop and Start are on the grounded (X2) side of the coil. Then a ground fault on the wire between the coil and the buttons can pull the coil in, or stop Stop from working. Put Stop, Start and the seal-in between X1 and the coil, and run the other side of the coil to X2 (only the overload contact may be in between).' });
  return { pass: coilToX2, steps };
}

/** Prox → input: power, polarity, sinking/sourcing match. */
function checkProx(wires: Wire[], kind: 'pnp' | 'npn'): CheckResult {
  const steps: CheckStep[] = [];
  const n0 = nets(wires);
  if (same(n0, 'P+', 'P-')) return { pass: false, steps: [{ name: 'No shorts', ok: false, why: '+24 V is wired straight to 0 V. That\'s a dead short across the supply.' }] };
  const powered = same(n0, 'S.BN', 'P+') && same(n0, 'S.BU', 'P-');
  const reversed = same(n0, 'S.BN', 'P-') && same(n0, 'S.BU', 'P+');
  steps.push({ name: 'Sensor powered: brown to +24 V, blue to 0 V', ok: powered, why: powered ? undefined : reversed ? 'Brown and blue are swapped: the sensor is reverse-powered (many survive it, none work). Brown is +, blue is −.' : 'The sensor isn\'t powered. Brown goes to +24 V and blue to 0 V.' });
  if (!powered) return { pass: false, steps };
  const inputOn = (target: boolean): boolean => {
    const closed: Wire[] = [];
    if (target) closed.push(kind === 'pnp' ? ['S.BK', 'S.BN'] : ['S.BK', 'S.BU']);
    const n = nets(wires, closed);
    if (same(n, 'P+', 'P-')) return false;
    // Current flows through the input from I0 to COM (sinking card) or COM to I0 (sourcing card).
    const atPlus = (t: string) => same(n, t, 'P+');
    const atZero = (t: string) => same(n, t, 'P-');
    return kind === 'pnp' ? atPlus('I.0') && atZero('I.COM') : atPlus('I.COM') && atZero('I.0');
  };
  const comOk = kind === 'pnp' ? same(n0, 'I.COM', 'P-') : same(n0, 'I.COM', 'P+');
  const off = !inputOn(false);
  steps.push({ name: 'No target: I0 off', ok: off, why: off ? undefined : 'I0 is on with no target. The input is wired straight across the supply instead of through the sensor\'s black wire.' });
  if (!off) return { pass: false, steps };
  const on = inputOn(true);
  let why: string | undefined;
  if (!on) {
    if (kind === 'pnp' ? same(n0, 'S.BK', 'P-') : same(n0, 'S.BK', 'P+')) why = `The black output is tied straight to ${kind === 'pnp' ? '0 V' : '+24 V'}. When it switches on, that's a dead short through the sensor's output (its short-circuit protection trips, or it fails).`;
    else if (!same(n0, 'S.BK', 'I.0')) why = 'The black (output) wire has to go to the input terminal I0.';
    else if (!comOk) why = kind === 'pnp'
      ? 'COM is wrong for a sinking input with a PNP sensor. The PNP output pushes +24 V into I0; the current returns through COM, so COM goes to 0 V.'
      : 'COM is wrong for a sourcing input with an NPN sensor. The card pushes current out of I0 into the NPN output, which sinks it to 0 V; the card\'s COM goes to +24 V.';
    else why = 'With the target present, no current flows through the input.';
  }
  steps.push({ name: 'Target present: I0 on', ok: on, why });
  return { pass: on, steps };
}

const LOOP_MA = 12;
const R_OHM = 250;

/** 4–20 mA loop: series path supply → transmitter (+ to −) → shunt → supply, card across the shunt. */
function checkLoop(wires: Wire[]): CheckResult {
  const steps: CheckStep[] = [];
  const n = nets(wires);
  if (same(n, 'P+', 'P-')) return { pass: false, steps: [{ name: 'No shorts', ok: false, why: '+24 V is wired straight to 0 V: a dead short across the loop supply.' }] };
  if (same(n, 'R.a', 'R.b')) {
    steps.push({ name: 'Shunt not shorted', ok: false, why: 'Both ends of the shunt are on the same wire, so it\'s shorted out: current can flow but there is no voltage across it to measure (the input reads 0 V).' });
    return { pass: false, steps };
  }
  if (same(n, 'TX+', 'TX-')) {
    steps.push({ name: 'Transmitter in the loop', ok: false, why: 'The transmitter is jumpered out (TX + and TX − on the same wire). The shunt and the input are then straight across the 24 V supply: about 96 mA through 250 Ω (over 2 W — it cooks), and a 1–5 V input sees 24 V.' });
    return { pass: false, steps };
  }
  if (same(n, 'TX+', 'P+') && same(n, 'TX-', 'P-')) {
    steps.push({ name: 'Shunt in the loop', ok: false, why: 'The transmitter is straight across the supply with no shunt. It draws its loop current, but nothing in the loop turns that current into a voltage to measure. Put the 250 Ω shunt in series on the 0 V side.' });
    return { pass: false, steps };
  }
  // Series orders that make a loop: low-side or high-side shunt.
  const low = same(n, 'P+', 'TX+') && ((same(n, 'TX-', 'R.a') && same(n, 'R.b', 'P-')) || (same(n, 'TX-', 'R.b') && same(n, 'R.a', 'P-')));
  const high = same(n, 'TX-', 'P-') && ((same(n, 'P+', 'R.a') && same(n, 'R.b', 'TX+')) || (same(n, 'P+', 'R.b') && same(n, 'R.a', 'TX+')));
  const txReversed = (same(n, 'P+', 'TX-') || same(n, 'TX+', 'P-'));
  // The input really in the series path: TX − → input → (shunt →) 0 V, or the high-side mirror.
  const viaCard = (from: string, to: string) => (same(n, 'AI+', from) && (same(n, 'AI-', to) || (same(n, 'AI-', 'R.a') && same(n, 'R.b', to)) || (same(n, 'AI-', 'R.b') && same(n, 'R.a', to))))
    || (same(n, 'AI-', from) && (same(n, 'AI+', to) || (same(n, 'AI+', 'R.a') && same(n, 'R.b', to)) || (same(n, 'AI+', 'R.b') && same(n, 'R.a', to))));
  const cardInSeries = !low && !high && ((same(n, 'P+', 'TX+') && viaCard('TX-', 'P-')) || (same(n, 'TX-', 'P-') && viaCard('P+', 'TX+')));
  const loop = low || high;
  let why: string | undefined;
  if (!loop) {
    if (txReversed) why = 'The transmitter is reversed: loop current must flow in at TX + and out at TX −. With reverse-polarity protection it passes no current (the input reads under range); without it, it can be damaged.';
    else if (cardInSeries) why = 'The analog input is in series in the loop. A voltage input is very high resistance, so almost no current flows and the input sees most of the 24 V (over range — it can damage the card). The input goes across the shunt, not in the loop.';
    else why = 'The loop isn\'t complete. Current needs one series path: +24 V → TX + → TX − → shunt → 0 V (or the shunt on the + side).';
  }
  steps.push({ name: 'Loop complete: supply → transmitter → shunt → supply', ok: loop, why });
  if (!loop) return { pass: false, steps };
  if (high) {
    steps.push({ name: 'Shunt on the 0 V side', ok: false, why: 'The loop works, but the shunt is on the +24 V side. On a typical single-ended 1–5 V input, V− is tied to the card\'s common, so measuring up near 24 V won\'t work and can damage it. High-side measuring needs an isolated or differential input. Put the shunt between TX − and 0 V.' });
    return { pass: false, steps };
  }
  // Node voltages with 12 mA flowing.
  const vShunt = (LOOP_MA / 1000) * R_OHM; // 3 V
  const v = (t: string): number | null => {
    if (same(n, t, 'P+')) return 24;
    if (same(n, t, 'P-')) return 0;
    if (low) { if (same(n, t, 'TX-')) return vShunt; }
    if (high) { if (same(n, t, 'TX+')) return 24 - vShunt; }
    return null; // floating
  };
  const a = v('AI+'), b = v('AI-');
  const reading = a === null || b === null ? null : a - b;
  const fmt = (x: number) => `${x.toFixed(2)} V`;
  const shown = reading === null ? 'open input' : `${fmt(reading)}${Math.abs(reading - vShunt) < 1e-9 ? ` = ${LOOP_MA.toFixed(1)} mA` : ''}`;
  const ok = reading !== null && Math.abs(reading - vShunt) < 1e-9;
  let why2: string | undefined;
  if (!ok) {
    if (reading === null) why2 = 'One analog input lead isn\'t connected to the loop, so the input floats. Put V+ and V− on the two ends of the shunt.';
    else if (Math.abs(reading + vShunt) < 1e-9) why2 = 'The input leads are reversed across the shunt: it reads −3 V. V+ goes on the end where current enters the shunt.';
    else if (Math.abs(reading) < 1e-9) why2 = 'Both input leads are on the same point, so it reads 0 V. Put them on the two ends of the shunt.';
    else if (Math.abs(Math.abs(reading) - 24) < 1e-9) why2 = 'The input is across the 24 V supply. That\'s far above a 1–5 V range and can damage the card. It belongs across the shunt only.';
    else why2 = `The input is measuring across the wrong part (${fmt(reading)}), probably the transmitter. It belongs across the shunt only.`;
  }
  steps.push({ name: 'Input across the shunt reads 1–5 V (12 mA → 3 V)', ok, why: why2 });
  return { pass: ok, steps, reading: shown };
}

export function checkWiring(id: Exercise['id'], wires: Wire[]): CheckResult {
  if (wires.length === 0) return { pass: false, steps: [{ name: 'Wires', ok: false, why: 'No wires yet. Tap one terminal, then another, to run a wire between them.' }] };
  switch (id) {
    case 'three-wire': return checkThreeWire(wires);
    case 'prox-pnp': return checkProx(wires, 'pnp');
    case 'prox-npn': return checkProx(wires, 'npn');
    case 'loop': return checkLoop(wires);
  }
}
