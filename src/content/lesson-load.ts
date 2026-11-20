import { LESSON_META_BY_ID } from './catalog';
import { withQuizIds } from './normalize';
import type { Lesson } from './types';

/**
 * One lesson without downloading the whole course: each lesson's catalog entry names the file that holds it,
 * and only that file is fetched (the full list in `./index` is about 80 KB compressed).
 * scripts/route-preload.ts preloads the same file for a direct link to a lesson.
 */
export const LESSON_FILES = {
  'lessons-zero': () => import('./lessons-zero').then((m) => m.ZERO_LESSONS),
  'lessons-foundations': () => import('./lessons-foundations').then((m) => m.FOUNDATION_LESSONS),
  'lessons-plc': () => import('./lessons-plc').then((m) => m.PLC_LESSONS),
  'lessons-field': () => import('./lessons-field').then((m) => m.FIELD_LESSONS),
  'lessons-core2': () => import('./lessons-core2').then((m) => m.CORE2_LESSONS),
  'lessons-pro': () => import('./lessons-pro').then((m) => m.PRO_LESSONS),
} as const;
export type LessonFile = keyof typeof LESSON_FILES;

const cache = new Map<string, Promise<Lesson | undefined>>();

/** The same promise for the same id (React's `use` needs a stable promise). Unknown ids resolve to undefined. */
export function loadLesson(id: string): Promise<Lesson | undefined> {
  let p = cache.get(id);
  if (!p) {
    const meta = LESSON_META_BY_ID.get(id);
    p = meta ? LESSON_FILES[meta.file]().then((list) => { const l = list.find((x) => x.id === id); return l && withQuizIds(l); }) : Promise.resolve(undefined);
    p.catch(() => cache.delete(id)); // offline: let a later visit try again
    cache.set(id, p);
  }
  return p;
}

const trackCache = new Map<string, Promise<Lesson[]>>();

/** Every lesson in a track, in track order, loading only the files that hold them. */
export function loadLessons(ids: string[]): Promise<Lesson[]> {
  const key = ids.join(',');
  let p = trackCache.get(key);
  if (!p) {
    p = Promise.all(ids.map(loadLesson)).then((ls) => ls.filter((l): l is Lesson => Boolean(l)));
    p.catch(() => trackCache.delete(key));
    trackCache.set(key, p);
  }
  return p;
}
