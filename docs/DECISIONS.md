# Decisions

Reasonable choices made where the build prompt was open. Newest first.

- **2026-11-04 Repo and URL are `controls-sim`.** The prompt suggested `controls-academy`; the repo that exists is `Caylor-Made-Technologies/controls-sim`, so the site lives at `/controls-sim/`. The product name stays **Controls Academy**.
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
