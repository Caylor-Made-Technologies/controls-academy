import { ZERO_LESSONS } from './lessons-zero';
import { FOUNDATION_LESSONS } from './lessons-foundations';
import { PLC_LESSONS } from './lessons-plc';
import { FIELD_LESSONS } from './lessons-field';
import { CORE2_LESSONS } from './lessons-core2';
import { PRO_LESSONS } from './lessons-pro';
import { COURSE_ORDER } from './tracks';
import type { Lesson } from './types';

/**
 * Full lesson content. Heavy: import it only from lazy-loaded screens (lesson, review, search) and tests.
 * The main bundle uses `./catalog` (titles and order only).
 */
const raw = [...ZERO_LESSONS, ...FOUNDATION_LESSONS, ...PLC_LESSONS, ...FIELD_LESSONS, ...CORE2_LESSONS, ...PRO_LESSONS];

/** Lessons in course order, with globally unique question ids (`lessonId.q1`). */
export const LESSONS: Lesson[] = raw
  .map((l) => ({ ...l, quiz: l.quiz.map((q) => ({ ...q, id: `${l.id}.${q.id}` })) }))
  .sort((a, b) => COURSE_ORDER.indexOf(a.id) - COURSE_ORDER.indexOf(b.id));
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export * from './tracks';
export * from './types';
