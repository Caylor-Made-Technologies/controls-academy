// Prints the lesson quality-bar audit table (Markdown). Run: npm run audit:lessons
import { COURSE_ORDER, LESSONS, TRACK_BY_ID } from '../src/content';
import { QUALITY_ITEMS, explainerWords, glossaryLinks, qualityFailures } from '../src/content/quality';

const ids = new Set(LESSONS.map((l) => l.id));
const totals = Object.fromEntries(QUALITY_ITEMS.map((k) => [k, 0])) as Record<(typeof QUALITY_ITEMS)[number], number>;
let full = 0;
console.log('| Track | Lesson | 1 Why | 2 Explainer | 3 Interactive | 4 Real-world | 5 Mistakes | 6 Safety | 7 Check | 8 Prereqs |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const l of LESSONS) {
  const f = qualityFailures(l, ids, COURSE_ORDER);
  if (Object.keys(f).length === 0) full++;
  const cell = (k: (typeof QUALITY_ITEMS)[number]) => { if (!f[k]) totals[k]++; return f[k] ? '✗' : '✓'; };
  const row = QUALITY_ITEMS.map((k) => (k === 'explainer' ? `${cell(k)} (${explainerWords(l)}w, ${glossaryLinks(l).length} links)` : k === 'check' ? `${cell(k)} (${l.quiz.length})` : cell(k)));
  console.log(`| T${TRACK_BY_ID.get(l.track)!.n} | \`${l.id}\` | ${row.join(' | ')} |`);
}
console.log(`\n**Meeting all 8: ${full} of ${LESSONS.length}.** Per item: ${QUALITY_ITEMS.map((k) => `${k} ${totals[k]}`).join(' · ')}`);
