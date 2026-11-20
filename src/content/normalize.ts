import type { Lesson } from './types';

/** Question ids become globally unique (`lessonId.q1`): progress, review and exams key on them. */
export const withQuizIds = (l: Lesson): Lesson => ({ ...l, quiz: l.quiz.map((q) => ({ ...q, id: `${l.id}.${q.id}` })) });
