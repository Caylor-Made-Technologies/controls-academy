# Decisions

Reasonable choices made where the build prompt was open. Newest first.

- **2026-11-05 Platform labels name the maker and family in text, never as a logo or trade dress.** The 3D hardware stays generic; its labels say "Logix-style CPU", "S7-1200/1500-style", "FX-style" and show addresses in that dialect, and the HUD says it's generic hardware labeled in that style. Reason: Jonathon wants it obvious which PLC you're looking at; the trademark rule allows descriptive use only.
- **2026-11-05 Pickers group by manufacturer** (Allen-Bradley has three families, Siemens two). Reason: techs think "it's an AB, which kind?" — not in a flat list of ten.
- **2026-11-05 Every-feature test runs against live too** (`SITE_URL=`). Reason: "double and triple check" — the live run caught the repo-rename breakage within minutes.

- **2026-11-04 3D is procedural, not downloaded models.** Every part is built from three.js primitives with canvas-drawn labels and a code-built light environment. Reason: offline + strict CSP, zero licensing risk, tiny download, generic (unbranded) hardware by construction.
- **2026-11-04 Fake bloom instead of post-processing.** Emissive LEDs + additive halo sprites. Reason: real bloom costs a full-screen pass every frame on phones; halos look the same at this scale.
- **2026-11-04 The 3D view reads the engine inside the render loop**, not through React state. Reason: the scan runs ~100×/s; re-rendering React that often would stutter on phones.
- **2026-11-04 3D opens by default only on the Simulator tab**, and never with reduced motion or "2D only". Lessons and Fault Hunt stay 2D with a 3D toggle. Reason: speed on phones; nothing in the course is 3D-only.
- **2026-11-04 three pinned to 0.182.0.** r183+ prints a Clock deprecation warning every load, which would break the zero-console-warnings rule.
- **2026-11-04 Unique motion language**: power-on intro (a rung energizing), sideways slides between tabs and upward slides when drilling in, a glowing bus-bar under the active tab. Reason: make it feel like a Caylor Made controls product, not a template. All of it turns off with reduced motion.

- **2026-11-04 Repo renamed to `controls-academy`** (by Jonathon), so the site moved to `/controls-academy/` and the Vite base was updated. Earlier note: **repo and URL were `controls-sim`.** The prompt suggested `controls-academy`; the repo that exists is `Caylor-Made-Technologies/controls-sim`, so the site lives at `/controls-sim/`. The product name stays **Controls Academy**.
- **Brand = the sibling app's tokens exactly** (`#0b0f14`, `#1e6fff`, blue→cyan gradient, Montserrat/Inter self-hosted, CM monogram, "Advanced Engineering. Built Different."). Added one color: energized green `#3ddc97` for "logic true", reused from the sibling's "ok" status so the apps still match.
- **App icon** = an energized ladder rung (contact → coil) inside the same blue/cyan circuit ring as the sibling's bolt icon. Original SVG in `assets-src/`, rendered with Playwright.
- **Pinned dependency versions at least two weeks old**, on majors we know well (React 19.1, Vite 6.4, Tailwind 4.3, Framer Motion 12, Vitest 3.2). Newer majors (Vite 8, TS 7) were skipped as too new to trust.
- **`npm audit` shows dev-only advisories** (Vitest 3 / tinypool, test runner only). The shipped site has 0 production vulnerabilities. Upgrade when Vitest 4 is old enough.
- **Strict CSP** (`script-src 'self'; style-src 'self'`), like the sibling. Framer Motion's `popLayout` mode is avoided because it injects a `<style>` tag.
- **Engine semantics = Logix-style generic baseline.** Timers in ms internally; skins convert for display. Prescan clears OTE/TON, keeps OTL/RTO, sets one-shot storage and counter CU/CD so true-at-start rungs don't fire. Integer math wraps with an overflow flag; REAL → integer rounds half-to-even. Uncertain vendor details are listed in `VERIFY.md`.
- **Rung text uses Logix "neutral text" style** (`XIC(A)[XIC(B),XIC(C)]OTE(D)`) for content files, sharing and tests — compact and familiar.
- **VERIFY markers render as a "check your manual" chip**, not raw text. Honest without looking unfinished.
- **Stop button wired NC, programmed XIC**, and the E-stop has a second monitor contact into the PLC so the seal-in drops. Both are teaching points.
- **Motor numbers are illustrative** (14 A FLA, 1,770 rpm, ~Class 10 overload feel), labeled as such on the About page.
- **Fault Hunt scoring**: 50 base + up to 50 for speed − 20 per force installed, −15 per wrong part blamed, −5 for measuring before proving the meter. Teaches safe-and-methodical over fast-and-lucky.
- **Badges are computed from progress, never stored** (same as the sibling) so backup/restore can't drift.
- **Progress in IndexedDB with localStorage fallback**, all wrapped in try/catch; imports validated field by field.
- **Share links carry the program in the URL hash** (base64url JSON) and are validated on open. Nothing is uploaded.
- **3D layer deferred to Phase 8b.** The settings switch (incl. "2D only") already exists so the preference is captured; no 3D code ships yet.
- **Lessons ship where we're confident; the rest of each track is listed as "Coming"** rather than padded (prompt §11: accuracy over volume).

## v0.5.1 → 0.6.0 (Phase 0–1)
- **The lesson quality bar is enforced by a test with a shrinking allowlist** (`tests/unit/quality.test.ts`). Upgraded lessons must meet all 8 items; listed lessons must still fail, so the list can only shrink. When it's empty the fields become required in TypeScript. Why: the audit can never silently drift, and the work can ship track by track.
- **One checker** (`src/content/quality.ts`) serves the test and `npm run audit:lessons`, so the audit table and the build agree.
- **Quality-bar items are fields, not free blocks** (`why`, `prereqs`, `realWorld`, `mistakes`, `safety`), rendered in the same place on every lesson. `safety` is either a note or an explicit "n/a" reason, and n/a is refused when the lesson text mentions energized work.
- **Track 0 "Start from Zero" (11 lessons) instead of 12.** Relays/contactors already has a full lesson in Track 1, so it isn't duplicated (audit overlap). Track 1's lessons go deeper and will link back to Track 0 as prerequisites. Every goal starts with Track 0 in "Up next".
- **Generic drills (`order`, `sort`) before bespoke figures.** They make any lesson interactive from data alone; bespoke figures are kept for things that need a picture (series/parallel).
- **Lesson text is lazy.** The main bundle carries a generated catalog (ids, titles, minutes, summary); bodies load with the lesson/review/search screens. `npm run catalog` (also run by `build`) regenerates it and a test fails if it's stale. Why: Track 0 pushed the main bundle 16 KB over budget; the split took it to 124 KB.
- **Circuit math lives in `src/lib/circuits.ts`** and every number in a lesson question or worked example is recomputed in `tests/unit/lesson-math.test.ts`.

## v0.8.0 → 0.9.0 (Phase 4)
- **The heading of each top-level screen is written into `index.html`** (static shell + a small inline script whose hash is in the CSP). Why: with hash routes the server can't know the screen, and waiting for React made LCP 2.7 s. One table (`src/content/heads.ts`) feeds the page, the loading placeholder and the shell; an e2e test fails if they drift.
- **Route chunks are preloaded by that same script** (`scripts/route-preload.ts`), from `src/routes.json`. Why: the route's code used to start downloading only after the main bundle had run.
- **`src/routes.json` is the one list of screens.** `App.tsx` is typed against it, the e2e gate and `npm run shots` read it. Why: a new screen can't ship untested or unphotographed.
- **Framer Motion removed; motion is CSS + View Transitions.** Why: it was ~40 KB gz on every route's critical path, and Phase 4 wants transform/opacity only with one easing set in tokens anyway. Sheets keep drag-to-dismiss with a few lines of pointer code.
- **Poster stills are generated from the real 3D scenes** (`npm run posters` reads each scene's meshes and camera and writes box/cylinder lists; a 3 KB projector draws them as SVG). Why: hand-drawn posters would drift from the scenes; this keeps the same angle by construction and needs no image files.
- **Poster style is a blueprint line drawing**, not a blurred render. Why: it is honest about being a placeholder, costs nothing to draw and fits the "industrial precision" direction.
- **Workbench, machine code and hunt screens are their own chunks.** Why: a page heading shouldn't wait for the PLC engine and every machine's physics.
- **Tokens are enforced by tests, not review** (`tests/unit/tokens.test.ts`): no raw colors or pixel sizes in stylesheets and components; AA contrast in both themes. 3D material colors and the certificate canvas are the listed exceptions.
- **Safety notes are safety yellow; faults stay red.** Why: red was doing two jobs. Yellow is used nowhere else.
- **Lighthouse is run with real throttling against localhost** (`THROTTLE=devtools`). Why: the default simulation can't tell what loaded before first paint when everything arrives in 100 ms; against the live site the default is fine.
