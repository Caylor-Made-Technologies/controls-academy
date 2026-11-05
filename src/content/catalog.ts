import type { TrackId } from './types';
import { LESSON_META } from './catalog.gen';

/** What the main bundle knows about a lesson. Full content lives in `./index` (lazy). */
export interface LessonMeta {
  id: string;
  track: TrackId;
  title: string;
  minutes: number;
  summary: string;
  task: boolean;
}

export { LESSON_META };
export const LESSON_META_BY_ID = new Map(LESSON_META.map((l) => [l.id, l]));
export * from './tracks';
