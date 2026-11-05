import type { Block, Lesson } from './types';

/** The 8-item lesson quality bar. One checker, shared by the content test and `npm run audit:lessons`. */
export const QUALITY_ITEMS = ['why', 'explainer', 'interactive', 'realWorld', 'mistakes', 'safety', 'check', 'prereqs'] as const;
export type QualityItem = (typeof QUALITY_ITEMS)[number];

/** About two phone screens of reading at 375 px (tables and drills excluded — they're skimmed or tapped). */
export const EXPLAINER_MAX_WORDS = 420;

/** Words that mean the topic touches energized equipment, so "not energized" is not an acceptable safety answer. */
export const ENERGIZED = /\b(120|208|240|277|480|600)\s?V(AC)?\b|energi[sz]ed|arc flash|LOTO|lockout|shock|live (work|circuit|panel)/i;

export function blockText(b: Block): string[] {
  switch (b.t) {
    case 'p': case 'h': return [b.text];
    case 'list': return b.items;
    case 'callout': return [b.title ?? '', b.text];
    case 'table': return [...b.head, ...b.rows.flat()];
    case 'brands': return b.rows.map((r) => r.text);
    case 'code': return [b.caption ?? ''];
    case 'figure': case 'rung': return [b.caption ?? ''];
    case 'order': return [b.prompt, ...b.steps, b.why ?? ''];
    case 'sort': return [b.prompt, ...b.bins, ...b.items.flatMap((i) => [i.text, i.why ?? ''])];
  }
}

/** Every piece of learner-facing text in a lesson. */
export function lessonText(l: Lesson): string {
  return [
    l.title, l.summary, l.why ?? '', l.realWorld?.text ?? '', ...(l.mistakes ?? []),
    l.safety ? ('note' in l.safety ? l.safety.note : l.safety.na) : '',
    ...l.blocks.flatMap(blockText),
    ...(l.task ? [l.task.goal, ...l.task.steps] : []),
    ...l.quiz.flatMap((q) => [q.q, ...q.choices, q.why]),
  ].join('\n');
}

export function explainerWords(l: Lesson): number {
  return l.blocks
    .filter((b) => b.t === 'p' || b.t === 'list' || b.t === 'callout' || b.t === 'h')
    .flatMap(blockText).join(' ').split(/\s+/).filter(Boolean).length;
}

export function glossaryLinks(l: Lesson): string[] {
  return [...lessonText(l).matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]);
}

/** Returns the quality items a lesson fails, with a reason for each. Empty = meets the bar. */
export function qualityFailures(l: Lesson, lessonIds: ReadonlySet<string>, order: readonly string[]): Partial<Record<QualityItem, string>> {
  const f: Partial<Record<QualityItem, string>> = {};
  if (!l.why?.trim()) f.why = 'missing';
  else if (l.why.length > 170 || l.why.includes('\n')) f.why = 'should be one line (≤ 170 chars)';

  const w = explainerWords(l);
  if (w > EXPLAINER_MAX_WORDS) f.explainer = `${w} words (max ${EXPLAINER_MAX_WORDS})`;
  else if (!l.blocks.flatMap(blockText).some((t) => t.includes('[['))) f.explainer = 'no tap-to-define glossary link in the explainer';

  if (!l.task && !l.blocks.some((b) => b.t === 'figure' || b.t === 'order' || b.t === 'sort')) f.interactive = 'needs a figure, drill or sim task';

  if (!l.realWorld?.text.trim()) f.realWorld = 'missing';

  const m = l.mistakes ?? [];
  if (m.length < 2 || m.length > 4) f.mistakes = `${m.length} mistakes (need 2–4)`;

  if (!l.safety) f.safety = 'missing (a note, or the reason it is not energized work)';
  else if ('na' in l.safety && ENERGIZED.test(lessonText(l))) f.safety = 'topic mentions energized work but safety is marked n/a';

  if (l.quiz.length < 3 || l.quiz.length > 5) f.check = `${l.quiz.length} questions (need 3–5)`;
  else if (l.quiz.some((q) => q.why.trim().length < 15)) f.check = 'every answer needs an explanation';

  if (!l.prereqs) f.prereqs = 'missing (use [] for a starting lesson)';
  else {
    const me = order.indexOf(l.id);
    const bad = l.prereqs.find((p) => !lessonIds.has(p) || order.indexOf(p) >= me);
    if (bad) f.prereqs = `"${bad}" is unknown or comes later in the course`;
  }
  return f;
}
