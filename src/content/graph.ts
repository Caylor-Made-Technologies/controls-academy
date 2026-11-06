/** Prerequisite graph over lessons. Pure data — used by the continuity test and the skill map. */
export interface GraphLesson { id: string; prereqs: string[] }

export interface LessonGraph {
  /** Lesson ids in input (course) order. */
  ids: string[];
  /** id → prerequisite ids. */
  prereqs: Map<string, string[]>;
  /** id → lessons that list it as a prerequisite. */
  unlocks: Map<string, string[]>;
  /** id → longest prerequisite chain below it (roots are 0). Used as the skill map's column. */
  depth: Map<string, number>;
}

export function buildGraph(lessons: GraphLesson[]): LessonGraph {
  const ids = lessons.map((l) => l.id);
  const prereqs = new Map(lessons.map((l) => [l.id, l.prereqs]));
  const unlocks = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const l of lessons) for (const p of l.prereqs) unlocks.get(p)?.push(l.id);
  const depth = new Map<string, number>();
  const visit = (id: string, stack: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (stack.has(id)) throw new Error(`prerequisite cycle at ${id}`);
    stack.add(id);
    const d = Math.max(-1, ...(prereqs.get(id) ?? []).map((p) => visit(p, stack))) + 1;
    stack.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const id of ids) visit(id, new Set());
  return { ids, prereqs, unlocks, depth };
}

/** Every lesson that must come before `id` (transitively). */
export function ancestors(g: LessonGraph, id: string): Set<string> {
  const out = new Set<string>();
  const walk = (x: string) => { for (const p of g.prereqs.get(x) ?? []) if (!out.has(p)) { out.add(p); walk(p); } };
  walk(id);
  return out;
}

export type SkillState = 'locked' | 'unlocked' | 'mastered' | 'done';

/**
 * A lesson is unlocked when every prerequisite is done; done once finished; mastered when finished with a
 * perfect check. Locked lessons stay openable — the state is guidance, never a wall.
 */
export function skillState(id: string, g: LessonGraph, rec: Record<string, { score: number; total: number } | undefined>): SkillState {
  const r = rec[id];
  if (r) return r.total > 0 && r.score === r.total ? 'mastered' : 'done';
  return (g.prereqs.get(id) ?? []).every((p) => rec[p]) ? 'unlocked' : 'locked';
}
