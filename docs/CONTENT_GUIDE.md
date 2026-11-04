# Content guide

Lessons live in `src/content/lessons-*.ts` as typed data. No UI code changes needed to add one.

1. Add a `Lesson` object (id, track, title, minutes, summary, blocks, quiz, optional task).
2. Keep the explainer to about two phone screens. One concept per lesson.
3. Define terms with `[[glossary-id]]` or `[[glossary-id|shown text]]`; add new terms to `glossary.ts`.
4. `**bold**` for emphasis. Callout tones: `safety`, `tip`, `gotcha`, `brand`.
5. Show brand differences with a `brands` block. Unsure? End the sentence with `// VERIFY: why` and add a line to `docs/VERIFY.md`.
6. Ladder examples: `{ t: 'rung', text: 'XIC(A)OTE(B)', tags: [...] }` — every tag must be declared (a unit test checks).
7. Quizzes: 2–5 questions, each with a `why`. Missed questions feed spaced repetition automatically.
8. Hands-on tasks use the motor station; add a new `TaskCheck` in `features/learn/tasks.ts` if needed.
9. Run `npm test` — content tests check ids, answers, glossary links, rung tags and safety callouts.
