import { badges, level, type ProgressData } from '../state/progress';

/** What the learner had last time we looked. */
export interface Seen { level: number; badges: Set<string>; lessons: number }

export function snapshot(p: ProgressData): Seen {
  return { level: level(p.xp).index, badges: new Set(badges(p).filter((b) => b.earned).map((b) => b.id)), lessons: Object.keys(p.lessons).length };
}

/**
 * The reward messages to show for the change from `prev` to `p`: a level-up and each new badge. Nothing for a
 * change that arrives as a batch (a backup import, an erase), so only something the learner just did is
 * celebrated.
 */
export function momentsFor(prev: Seen, p: ProgressData): string[] {
  const now = snapshot(p);
  const fresh = badges(p).filter((b) => b.earned && !prev.badges.has(b.id));
  if (fresh.length > 2 || now.level > prev.level + 1 || Math.abs(now.lessons - prev.lessons) > 1) return [];
  const out: string[] = [];
  if (now.level === prev.level + 1) out.push(`Level up: you're now ${level(p.xp).name}.`);
  for (const b of fresh) out.push(`Badge earned: ${b.title}. ${b.desc}`);
  return out;
}
