/** Stable shuffle (same order every visit, never the original order) — drills and answer choices use it. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  if (idx.length > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx.map((i) => items[i]);
}

/**
 * Display order for a question's choices. Authors tend to put the right answer in the same spot; this spreads it
 * out. `order[k]` is the original index of the choice shown in position k.
 */
export function arrangeChoices(q: { id: string; choices: string[]; answer: number }): { order: number[]; answer: number } {
  const order = stableShuffle(q.choices.map((_, i) => i), `choices:${q.id}`);
  return { order, answer: order.indexOf(q.answer) };
}
