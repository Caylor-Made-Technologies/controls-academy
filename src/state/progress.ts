import { create } from 'zustand';
import { LESSON_META as LESSONS, TRACKS } from '../content/catalog';
import type { SkinId } from '../skins';
import { debouncedSaver, load, remove } from './persist';

export interface LessonRecord {
  /** Best quiz score (correct answers). */
  score: number;
  total: number;
  taskDone: boolean;
  at: string;
}

export interface ReviewCard {
  /** Leitner box 0–4. Due dates: 1, 2, 4, 7, 14 days. */
  box: number;
  due: string;
}

export interface HuntRecord {
  bestMs: number;
  safe: boolean;
  at: string;
}

export interface ProgressData {
  version: 1;
  xp: number;
  lessons: Record<string, LessonRecord>;
  review: Record<string, ReviewCard>;
  hunts: Record<string, HuntRecord>;
  /** Days with activity, YYYY-MM-DD. */
  days: string[];
  skinsSeen: SkinId[];
  stepped: boolean;
  perfectQuizzes: number;
  lastRoute: string;
}

export const EMPTY: ProgressData = {
  version: 1, xp: 0, lessons: {}, review: {}, hunts: {}, days: [], skinsSeen: [], stepped: false, perfectQuizzes: 0, lastRoute: '',
};

const BOX_DAYS = [1, 2, 4, 7, 14];

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}

export function streak(days: string[], now = today()): number {
  const set = new Set(days);
  let cursor = set.has(now) ? now : addDays(now, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export const LEVELS = [
  { xp: 0, name: 'Apprentice' },
  { xp: 200, name: 'Panel Rookie' },
  { xp: 600, name: 'I/O Checker' },
  { xp: 1200, name: 'Rung Reader' },
  { xp: 2000, name: 'Logic Tech' },
  { xp: 3200, name: 'Controls Tech' },
  { xp: 5000, name: 'Controls Pro' },
];

export function level(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return { index: i, name: cur.name, floor: cur.xp, next: next?.xp ?? null, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

export function trackProgress(p: ProgressData, trackId: string) {
  const t = TRACKS.find((x) => x.id === trackId);
  if (!t || t.lessons.length === 0) return { done: 0, total: t?.lessons.length ?? 0, pct: 0, complete: false };
  const done = t.lessons.filter((id) => p.lessons[id]).length;
  return { done, total: t.lessons.length, pct: done / t.lessons.length, complete: done === t.lessons.length };
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  earned: boolean;
}

/** Badges are computed from progress, never stored — they can't drift out of sync. */
export function badges(p: ProgressData): Badge[] {
  const huntList = Object.values(p.hunts);
  const tracksDone = TRACKS.filter((t) => t.lessons.length && trackProgress(p, t.id).complete).length;
  return [
    { id: 'first-lesson', title: 'Powered Up', desc: 'Finish your first lesson.', earned: Object.keys(p.lessons).length > 0 },
    { id: 'seal-in', title: 'First Seal-In', desc: 'Start a motor on its seal-in contact.', earned: Boolean(p.lessons['three-wire']?.taskDone) },
    { id: 'scan', title: 'Scan Walker', desc: 'Single-step through a whole scan.', earned: p.stepped },
    { id: 'nc-trap', title: 'Not Fooled by NC', desc: 'Fix the XIO-on-a-stop-button bug.', earned: Boolean(p.lessons['contacts-coils']?.taskDone) },
    { id: 'dup', title: 'Last Rung Wins', desc: 'Find and fix a duplicate coil.', earned: Boolean(p.lessons['duplicate-coils']?.taskDone) },
    { id: 'dialects', title: 'Five Dialects', desc: 'View the same logic in five brand skins.', earned: p.skinsSeen.length >= 5 },
    { id: 'perfect', title: 'Clean Sheet', desc: 'Get 5 quizzes 100% right.', earned: p.perfectQuizzes >= 5 },
    { id: 'hunter', title: 'Fault Finder', desc: 'Solve your first Fault Hunt.', earned: huntList.length > 0 },
    { id: 'fast', title: 'Found It In Under 60s', desc: 'Solve a Fault Hunt in under a minute.', earned: huntList.some((h) => h.bestMs < 60000) },
    { id: 'safe', title: 'Forced Nothing By Accident', desc: 'Solve a hunt with zero unsafe moves.', earned: huntList.some((h) => h.safe) },
    { id: 'all-faults', title: 'Seen It All', desc: 'Solve every motor-station fault.', earned: huntList.length >= 8 },
    { id: 'streak3', title: 'On a Roll', desc: 'Learn 3 days in a row.', earned: streak(p.days) >= 3 },
    { id: 'streak7', title: 'Shift Regular', desc: 'Learn 7 days in a row.', earned: streak(p.days) >= 7 },
    { id: 'track', title: 'Track Complete', desc: 'Finish every lesson in a track.', earned: tracksDone > 0 },
    { id: 'expert', title: 'Controls Pro', desc: `Finish every lesson in all ${TRACKS.length} tracks — from zero to expert.`, earned: tracksDone === TRACKS.filter((t) => t.lessons.length).length },
  ];
}

interface ProgressStore extends ProgressData {
  hydrated: boolean;
  hydrate(): Promise<void>;
  completeLesson(id: string, score: number, total: number, missed: string[]): number;
  completeTask(id: string): number;
  reviewAnswer(qid: string, correct: boolean): void;
  recordHunt(faultId: string, ms: number, safe: boolean, points: number): void;
  sawSkin(s: SkinId): void;
  markStepped(): void;
  setLastRoute(r: string): void;
  importData(d: unknown): boolean;
  reset(): Promise<void>;
  data(): ProgressData;
}

const saver = debouncedSaver<ProgressData>('progress', 150);

function pick(s: ProgressStore): ProgressData {
  const { version, xp, lessons, review, hunts, days, skinsSeen, stepped, perfectQuizzes, lastRoute } = s;
  return { version, xp, lessons, review, hunts, days, skinsSeen, stepped, perfectQuizzes, lastRoute };
}

/** Validate untrusted imported data (a file someone picked). */
export function validateProgress(d: unknown): ProgressData | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (o.version !== 1 || typeof o.xp !== 'number' || !Number.isFinite(o.xp) || o.xp < 0) return null;
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  const lessons = obj(o.lessons);
  const review = obj(o.review);
  const hunts = obj(o.hunts);
  if (!lessons || !review || !hunts || !Array.isArray(o.days)) return null;
  const known = new Set(LESSONS.map((l) => l.id));
  const cleanLessons: Record<string, LessonRecord> = {};
  for (const [k, v] of Object.entries(lessons)) {
    const r = obj(v);
    if (!known.has(k) || !r) continue;
    cleanLessons[k] = { score: Number(r.score) || 0, total: Number(r.total) || 0, taskDone: r.taskDone === true, at: String(r.at ?? '').slice(0, 30) };
  }
  const cleanReview: Record<string, ReviewCard> = {};
  for (const [k, v] of Object.entries(review)) {
    const r = obj(v);
    if (!r || !/^[\w.-]{1,80}$/.test(k)) continue;
    cleanReview[k] = { box: Math.max(0, Math.min(4, Number(r.box) || 0)), due: String(r.due ?? '').slice(0, 10) };
  }
  const cleanHunts: Record<string, HuntRecord> = {};
  for (const [k, v] of Object.entries(hunts)) {
    const r = obj(v);
    if (!r || !/^[\w-]{1,40}$/.test(k)) continue;
    cleanHunts[k] = { bestMs: Math.max(0, Number(r.bestMs) || 0), safe: r.safe === true, at: String(r.at ?? '').slice(0, 30) };
  }
  return {
    version: 1,
    xp: Math.floor(o.xp),
    lessons: cleanLessons,
    review: cleanReview,
    hunts: cleanHunts,
    days: (o.days as unknown[]).filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-400),
    skinsSeen: Array.isArray(o.skinsSeen) ? (o.skinsSeen as unknown[]).filter((x): x is SkinId => typeof x === 'string').slice(0, 20) : [],
    stepped: o.stepped === true,
    perfectQuizzes: Math.max(0, Number(o.perfectQuizzes) || 0),
    lastRoute: '',
  };
}

export const useProgress = create<ProgressStore>((set, get) => {
  const commit = (patch: Partial<ProgressData>, active = true) => {
    const t = today();
    const days = active && !get().days.includes(t) ? [...get().days, t] : get().days;
    set({ ...patch, days });
    saver(pick(get()));
  };
  return {
    ...EMPTY,
    hydrated: false,
    async hydrate() {
      const saved = validateProgress(await load('progress'));
      const lastRoute = (await load<ProgressData>('progress'))?.lastRoute ?? '';
      set({ ...(saved ?? EMPTY), lastRoute: typeof lastRoute === 'string' ? lastRoute : '', hydrated: true });
    },
    completeLesson(id, score, total, missed) {
      const prev = get().lessons[id];
      let gain = 0;
      if (!prev) gain += 50;
      const perfect = score === total;
      if (perfect && (!prev || prev.score < prev.total)) gain += 25;
      const review = { ...get().review };
      for (const q of missed) review[q] = { box: 0, due: addDays(today(), 1) };
      commit({
        xp: get().xp + gain,
        lessons: { ...get().lessons, [id]: { score: Math.max(score, prev?.score ?? 0), total, taskDone: prev?.taskDone ?? false, at: new Date().toISOString() } },
        review,
        perfectQuizzes: get().perfectQuizzes + (perfect && (!prev || prev.score < prev.total) ? 1 : 0),
      });
      return gain;
    },
    completeTask(id) {
      const prev = get().lessons[id];
      if (prev?.taskDone) return 0;
      commit({
        xp: get().xp + 25,
        lessons: { ...get().lessons, [id]: { score: prev?.score ?? 0, total: prev?.total ?? 0, at: prev?.at ?? new Date().toISOString(), taskDone: true } },
      });
      return 25;
    },
    reviewAnswer(qid, correct) {
      const card = get().review[qid];
      if (!card) return;
      const review = { ...get().review };
      if (correct && card.box >= 4) delete review[qid];
      else {
        const box = correct ? card.box + 1 : 0;
        review[qid] = { box, due: addDays(today(), BOX_DAYS[box]) };
      }
      commit({ review, xp: get().xp + (correct ? 10 : 0) });
    },
    recordHunt(faultId, ms, safe, points) {
      const prev = get().hunts[faultId];
      commit({
        xp: get().xp + points,
        hunts: { ...get().hunts, [faultId]: { bestMs: prev ? Math.min(prev.bestMs, ms) : ms, safe: safe || Boolean(prev?.safe), at: new Date().toISOString() } },
      });
    },
    sawSkin(s) {
      if (get().skinsSeen.includes(s)) return;
      commit({ skinsSeen: [...get().skinsSeen, s] }, false);
    },
    markStepped() {
      if (get().stepped) return;
      commit({ stepped: true, xp: get().xp + 15 });
    },
    setLastRoute(r) {
      if (get().lastRoute === r) return;
      set({ lastRoute: r });
      saver(pick(get()));
    },
    importData(d) {
      const v = validateProgress(d);
      if (!v) return false;
      set(v);
      saver(pick(get()));
      return true;
    },
    async reset() {
      set({ ...EMPTY });
      await remove('progress');
    },
    data() {
      return pick(get());
    },
  };
});

export function dueReviews(p: ProgressData, now = today()): string[] {
  return Object.entries(p.review).filter(([, c]) => c.due <= now).map(([id]) => id);
}
