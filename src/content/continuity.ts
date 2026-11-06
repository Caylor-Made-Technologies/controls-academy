import { GLOSSARY } from './glossary';
import { lessonText } from './quality';
import type { Lesson } from './types';

/**
 * Glossary aliases that are ordinary words in other contexts, so a plain mention isn't "using the term".
 * 'coil' is an alias of OTE and 'NO/NC contact' of XIC/XIO (ladder instructions), but lessons often mean the
 * physical part; 'heater' is an alias of an overload's heater element but usually means an electric heater.
 */
export const AMBIGUOUS_ALIASES = new Set(['coil', 'heater', 'no contact', 'nc contact']);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Names a glossary term can appear under in plain text (term + aliases), longest first. */
export function termNames(id: string): string[] {
  const g = GLOSSARY.find((x) => x.id === id)!;
  return [g.term, ...(g.aka ?? [])]
    .map((x) => x.replace(/\(.*?\)/g, '').trim())
    .filter((x) => x.length > 2 && !AMBIGUOUS_ALIASES.has(x.toLowerCase()))
    .sort((a, b) => b.length - a.length);
}

export function termPattern(name: string): RegExp {
  // All-caps names (PLC, VFD) match case-sensitively; words match any case.
  return new RegExp(`(^|[^\\w-])(${esc(name)})(?![\\w-])`, name === name.toUpperCase() ? '' : 'i');
}

export interface ContinuityGap { lesson: string; term: string; name: string }

/**
 * Walk the course in order. A lesson may use a glossary term in plain text only if it links the term
 * itself or an earlier lesson already taught (linked) it.
 */
export function continuityGaps(lessons: Lesson[]): ContinuityGap[] {
  const taught = new Set<string>();
  const gaps: ContinuityGap[] = [];
  for (const l of lessons) {
    const raw = lessonText(l);
    const linked = new Set([...raw.matchAll(/\[\[([^\]|]+)/g)].map((m) => m[1]));
    const plain = raw.replace(/\[\[[^\]]+\]\]/g, ' ').replace(/`[^`]*`/g, ' ');
    for (const g of GLOSSARY) {
      if (taught.has(g.id) || linked.has(g.id)) continue;
      const name = termNames(g.id).find((n) => termPattern(n).test(plain));
      if (name) gaps.push({ lesson: l.id, term: g.id, name });
    }
    linked.forEach((x) => taught.add(x));
  }
  return gaps;
}
