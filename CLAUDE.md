# CLAUDE.md — Controls Academy

## Project memory
This repo's notes (decisions, status, next steps, log) live in the private vault:
`Caylor-Made-Technologies/obsidian-vault` → `Projects/Controls Academy.md`.
Read that note before working here, and attach the vault repo to the session.

**Before the session ends** (as the last step of any task that changed something):
1. Update the vault note: a dated line under **Log**, new **Decisions** with reasons, current **Status**, **Next steps**.
2. Commit and push the vault to `main`, then say in one line what was saved.

## Mission
Controls Academy takes someone who has never touched controls and makes them competent:
read prints, understand I/O, write and troubleshoot ladder logic, go online without fear,
and recognize an Allen-Bradley or Siemens panel on day one. It is the flagship app of
Caylor Made Technologies and a sibling of the Critical Facilities Simulator.

## Non-negotiables
- Teach from zero. Define every term the first time (glossary `<Term>` popovers).
- Technically correct. Unsure vendor details get `// VERIFY:` in the content file and a line in `docs/VERIFY.md`. Never invent menu paths, specs or part numbers.
- Safety woven through: LOTOTO, NFPA 70E, live-dead-live, never bypass safety circuits in logic.
- No vendor logos or copied UIs. Brand names only descriptively. Trademark footer stays.
- Phone first (375 px), 44 px touch targets, no horizontal scroll ≥ 320 px.
- Static GitHub Pages site: no backend, accounts, analytics, cookies or external calls. Works offline.
- No AI-tool branding in commits, PRs, code comments or published files. Commit as
  `Caylor Made Technologies <andycaylor@icloud.com>`. Plain branch names (no `claude/`).
- Apply the 20 legal/quality points (`docs/CHECKLIST.md`) to every change; say which ones it touched.

## Stack
Vite 6 + React 19 + TypeScript (strict) · Tailwind 4 + CSS tokens (`src/styles/tokens.css`) ·
Framer Motion · Zustand · idb-keyval (IndexedDB, localStorage fallback, all in try/catch) ·
vite-plugin-pwa · Vitest · Playwright (pre-installed in cloud sessions) · GitHub Actions → Pages.
3D (three / React Three Fiber) is planned as a lazy-loaded layer; nothing in the course is 3D-only.

## Folder map
```
src/engine/     PLC engine: scan cycle, instructions, tags. NO React imports.
src/skins/      Brand addressing/naming data (AB Logix, SLC, Micro800, Siemens, Modicon, Mitsubishi, AD, Omron, IEC)
src/plant/      Virtual machines driven by the engine I/O image + fault injection
src/content/    Tracks, lessons, quizzes, glossary, brand guides (data only)
src/features/   learn/, simulator/, troubleshoot/, reference/, profile/, onboarding/
src/components/ Shared UI kit (Brand, TabBar, Sheet, ProgressRing, Term, Icon...)
src/state/      Zustand stores + persistence
src/styles/     tokens.css + app.css (Tailwind entry)
tests/unit      Vitest (engine coverage target ≥ 90%)
tests/e2e       Playwright: console errors, axe, screenshots 375×812 + 1440×900
docs/           BASELINE, HOW_WE_BEAT_IT, DECISIONS, VERIFY, CHECKLIST, CONTENT_GUIDE, CHANGELOG
```

## Run / test / deploy
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`
- `npm run e2e` builds nothing; run `npm run build` first. It serves `dist/` and drives Chromium.
- Push to `main` → `.github/workflows/deploy.yml` → https://caylor-made-technologies.github.io/controls-academy/
- Pages source must be **GitHub Actions** (Settings → Pages), not "Deploy from a branch".

## Content accuracy rules
- Every lesson: ≤ 2 phone screens of explainer, a diagram or sim task, a 3–5 question check.
- Behavior of instructions is defined once in `src/engine/` and proven in `tests/unit/`.
- When brands differ, show the difference. Generic IEC behavior is the baseline.
- Policy/safety text is training material, not site procedure. Say so.
- This file is not published: the site ships only Vite's `dist/` output.
