/**
 * "Day one at a new plant": a checklist a new controls tech can tick and export. Data only.
 * Training material, not site procedure: the site's own orientation and rules always come first.
 */
export interface DayOneItem { id: string; text: string; why?: string }
export interface DayOneGroup { id: string; title: string; items: DayOneItem[] }

export const DAY_ONE: DayOneGroup[] = [
  {
    id: 'safety', title: 'Safety first',
    items: [
      { id: 'orientation', text: 'Finish the site safety orientation before you touch any equipment.', why: 'Every site has its own hazards and rules.' },
      { id: 'loto-program', text: 'Read the site\'s lockout/tagout program and get your own lock and tag.', why: 'Your lock, your key: nobody else removes it, except under the site\'s formal lock-removal procedure.' },
      { id: 'machine-loto', text: 'Find the machine-specific lockout procedures: every energy source, including air, hydraulics, gravity, springs and stored charge.' },
      { id: 'energized-work', text: 'Learn the site\'s energized-work rules (permit, arc-flash labels, PPE) and where the PPE is kept.', why: 'NFPA 70E is the usual US baseline; your site\'s procedure is what you follow.' },
      { id: 'meter', text: 'Check your meter: the right voltage and CAT rating for the work, good leads, and test it on a known source.', why: 'Live-dead-live only works with a meter you trust. A non-contact tester is not proof of dead.' },
      { id: 'qualified', text: 'Get in writing what energized work you are trained and cleared for (qualified person status).' },
      { id: 'ppe', text: 'Get your everyday PPE: safety glasses, hearing protection, boots, hard hat as required.' },
      { id: 'estops', text: 'Find the E-stops, main disconnects and emergency exits in your area.', why: 'An E-stop is not lockout.' },
      { id: 'report', text: 'Learn how to report an injury or a near-miss, and where the first aid kit, AED and eyewash are.' },
      { id: 'confined', text: 'Ask which areas are permit-required confined spaces or need special permits (hot work, heights).' },
      { id: 'hazloc', text: 'Ask which areas are hazardous (classified) locations, such as combustible dust in grain and flour mills or flammable gas.', why: 'They limit which tools, meters and laptops you may bring in.' },
      { id: 'no-bypass', text: 'Never jumper or bypass a guard, interlock or E-stop circuit, even to troubleshoot.' },
    ],
  },
  {
    id: 'people', title: 'People',
    items: [
      { id: 'who', text: 'Learn who to ask: your lead, the controls engineer, the electrician on shift, the operators who know each machine.' },
      { id: 'authorized', text: 'Find out who is authorized to change PLC programs, drive parameters and safety systems, and get your own limits in writing.', why: 'Safety PLCs and safety relays usually need special authorization.' },
      { id: 'mgmt-change', text: 'Learn how changes are approved and recorded (management of change).' },
    ],
  },
  {
    id: 'documents', title: 'Documents',
    items: [
      { id: 'prints', text: 'Find the electrical prints for your machines: where they live, and which copy is current.' },
      { id: 'network', text: 'Find the network drawings and the list of device addresses.' },
      { id: 'manuals', text: 'Find the manuals for the PLCs, drives and HMIs you will support.' },
      { id: 'spares', text: 'Find the spare parts: fuses, relays, sensors, a spare drive or card.' },
    ],
  },
  {
    id: 'programs', title: 'Programs and backups',
    items: [
      { id: 'backups', text: 'Find where program backups are kept and how current they are.', why: 'Before you change anything, you need a way back.' },
      { id: 'software', text: 'Check you have the right programming software, versions and licenses for each controller.' },
      { id: 'laptop', text: 'Learn the laptop, USB and network rules: get approval before connecting to any plant network or controller.' },
      { id: 'own-backup', text: 'Before your first change on any machine, take your own backup: upload into a new, dated file, never over the master copy, and store it where site policy says.', why: 'Back up drive parameters, HMI files and safety settings too.' },
      { id: 'online-rules', text: 'Learn the site rules for going online, online edits and forcing, and how forces are recorded and removed.', why: 'Forcing an output can move machinery: check people are clear. Never force or bypass safety inputs, safety relays or safety PLC logic.' },
    ],
  },
  {
    id: 'notes', title: 'Write it down',
    items: [
      { id: 'log', text: 'Start a notebook or log: each machine, its controller, firmware, IP address and quirks.' },
      { id: 'changes', text: 'Record every change you make: what, why, when, old and new values, who approved it.' },
      { id: 'questions', text: 'Keep a list of questions for your lead; ask them before you guess.' },
    ],
  },
];

export const DAY_ONE_COUNT = DAY_ONE.reduce((n, g) => n + g.items.length, 0);

/** Plain-text export: what is done and what is left, with the date. */
export function dayOneText(done: Record<string, boolean>, date: string): string {
  const out = [`Day one at a new plant — checklist (${date})`, 'Training material from Controls Academy. Your site\'s own orientation and rules come first.', ''];
  for (const g of DAY_ONE) {
    out.push(g.title.toUpperCase());
    for (const i of g.items) out.push(`[${done[i.id] ? 'x' : ' '}] ${i.text}`);
    out.push('');
  }
  return out.join('\n');
}
