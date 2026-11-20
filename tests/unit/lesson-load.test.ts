import { expect, test } from 'vitest';
import { LESSONS, LESSON_BY_ID } from '../../src/content';
import { LESSON_META } from '../../src/content/catalog';
import { loadLesson, loadLessons } from '../../src/content/lesson-load';

test('every lesson loads from its own file, identical to the full list (quiz ids included)', async () => {
  expect(LESSON_META.map((l) => l.id)).toEqual(LESSONS.map((l) => l.id));
  for (const l of LESSONS) expect(await loadLesson(l.id), l.id).toEqual(l);
});

test('unknown lessons resolve to undefined; the same id gives the same promise', async () => {
  expect(await loadLesson('no-such-lesson')).toBeUndefined();
  expect(loadLesson('three-wire')).toBe(loadLesson('three-wire'));
});

test('a track loads in track order', async () => {
  const ids = LESSONS.filter((l) => l.track === 't0').map((l) => l.id);
  expect((await loadLessons(ids)).map((l) => l.id)).toEqual(ids);
  expect(await loadLessons(['three-wire'])).toEqual([LESSON_BY_ID.get('three-wire')]);
});
