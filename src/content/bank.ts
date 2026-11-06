import { LESSONS, TRACKS } from './index';
import type { Level, Question, TrackId } from './types';

/** A check question with the tags the exams sample by. Topic = the track it teaches. */
export interface BankItem extends Question {
  lesson: string;
  track: TrackId;
  level: Level;
  /** 1 easy · 2 medium · 3 hard. From the lesson's level unless the question sets its own. */
  difficulty: 1 | 2 | 3;
}

const LEVEL_DIFFICULTY: Record<Level, 1 | 2 | 3> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 3 };
const TRACK = new Map(TRACKS.map((t) => [t.id, t]));

export const BANK: BankItem[] = LESSONS.flatMap((l) => {
  const level = TRACK.get(l.track)!.level;
  return l.quiz.map((q) => ({ ...q, lesson: l.id, track: l.track, level, difficulty: q.difficulty ?? LEVEL_DIFFICULTY[level] }));
});
export const BANK_BY_ID = new Map(BANK.map((q) => [q.id, q]));

export type ExamId = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'readiness';

export interface ExamDef {
  id: ExamId;
  title: string;
  blurb: string;
  /** Which tracks it draws from. */
  tracks: TrackId[];
  /** Questions per sitting. The bank must hold at least 3× this. */
  size: number;
  /** Seconds per question when the timer is on. */
  secsPerQ: number;
  /** Pass mark for the practice record (fraction). */
  pass: number;
}

const tracksAt = (lv: Level) => TRACKS.filter((t) => t.level === lv).map((t) => t.id);

export const EXAMS: ExamDef[] = [
  { id: 'beginner', title: 'Beginner practice exam', blurb: 'Start from Zero, electrical and safety foundations, prints and hardwired motor control.', tracks: tracksAt('Beginner'), size: 20, secsPerQ: 75, pass: 0.8 },
  { id: 'intermediate', title: 'Intermediate practice exam', blurb: 'PLC fundamentals and ladder programming.', tracks: tracksAt('Intermediate'), size: 12, secsPerQ: 90, pass: 0.8 },
  { id: 'advanced', title: 'Advanced practice exam', blurb: 'Going online, troubleshooting, networks, drives, HMIs and building automation.', tracks: tracksAt('Advanced'), size: 12, secsPerQ: 90, pass: 0.8 },
  { id: 'expert', title: 'Expert practice exam', blurb: 'Capstones, PID, Structured Text, commissioning, safety systems and change control.', tracks: tracksAt('Expert'), size: 10, secsPerQ: 105, pass: 0.8 },
  { id: 'readiness', title: 'Controls Technician Readiness', blurb: 'Every track, every level — with a per-topic breakdown and the lessons to revisit.', tracks: TRACKS.map((t) => t.id), size: 36, secsPerQ: 90, pass: 0.8 },
];
export const EXAM_BY_ID = new Map(EXAMS.map((e) => [e.id, e]));

export function bankFor(exam: ExamDef): BankItem[] {
  return BANK.filter((q) => exam.tracks.includes(q.track));
}

/** Small seeded PRNG (mulberry32) so a sitting can be reproduced from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Draw a sitting: spread across the exam's tracks (round-robin over shuffled per-track pools) so every topic
 * is covered, never repeating a question, then shuffle the order. `weights` (track → extra share) lets the
 * readiness check lean toward weak topics without dropping any.
 */
export function drawExam(exam: ExamDef, seed: number, weights: Partial<Record<TrackId, number>> = {}): BankItem[] {
  const r = rng(seed);
  const pools = new Map(exam.tracks.map((t) => [t, shuffle(BANK.filter((q) => q.track === t), r)]));
  const order = shuffle(exam.tracks.flatMap((t) => Array.from({ length: 1 + Math.max(0, Math.round(weights[t] ?? 0)) }, () => t)), r);
  const out: BankItem[] = [];
  while (out.length < exam.size) {
    let took = false;
    for (const t of order) {
      const q = pools.get(t)!.pop();
      if (q) { out.push(q); took = true; if (out.length === exam.size) break; }
    }
    if (!took) break;
  }
  return shuffle(out, r);
}

export interface TopicScore { track: TrackId; right: number; total: number }

/** Per-topic breakdown and the lessons behind missed questions (weakest topics first). */
export function scoreExam(items: BankItem[], answers: Record<string, number>) {
  const byTrack = new Map<TrackId, TopicScore>();
  const missedLessons: string[] = [];
  let right = 0;
  for (const q of items) {
    const ok = answers[q.id] === q.answer;
    if (ok) right++;
    else if (!missedLessons.includes(q.lesson)) missedLessons.push(q.lesson);
    const s = byTrack.get(q.track) ?? { track: q.track, right: 0, total: 0 };
    s.total++;
    if (ok) s.right++;
    byTrack.set(q.track, s);
  }
  const topics = [...byTrack.values()].sort((a, b) => a.right / a.total - b.right / b.total);
  return { right, total: items.length, topics, missedLessons, missedIds: items.filter((q) => answers[q.id] !== q.answer).map((q) => q.id) };
}
