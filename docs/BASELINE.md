# Baseline — Critical Facilities Simulator (sibling app)

Read on 2026-11-04 from `Caylor-Made-Technologies/critical-facilities-sim` and the vault note
`Projects/Critical Facilities Simulator.md`. Live: https://caylor-made-technologies.github.io/critical-facilities-sim/

## Tech stack
- Vite 6 + React 18 + TypeScript, Vitest (187 tests), axe-core checks.
- Plain CSS in one 5,700-line `styles.css`; no CSS framework.
- Hand-written service worker (`public/sw.js`) for offline; hand-written manifest.
- State in `localStorage` (progress, prefs); backup/restore as JSON.
- SVG diagrams; no 3D. Hash routes (`#/sim`) with a hand-rolled router.
- Strict CSP meta tag (`script-src 'self'; style-src 'self'`), self-hosted fonts.

## Visual style
- Brand tokens: background `#0b0f14`, surfaces `#121821` / `#1a2230`, borders `#253043`,
  brand blue `#1e6fff` (button `#1b63eb` for AA), glow `#3d8bff`, cyan `#22d3ee`,
  gradient `#3d8bff → #22d3ee`. Status: ok `#3ddc97`, warn `#ffb547`, alarm `#ff6b6b`.
- Fonts: Montserrat (headings), Inter (body), both OFL and self-hosted.
- Motifs: CM circuit-trace monogram, self-drawing circuit traces in page headers, power-on intro,
  footer "Advanced Engineering. Built Different." + "Built by Caylor Made Technologies, Hereford, TX".
- App icon: bolt inside a blue/cyan circuit ring with trace nodes on dark navy.
- Layout: grouped sidebar on laptop; phone bottom bar (Home, Sim, Learn, Tips, More sheet).

## What works well
- Deep, accurate content with "explain simpler", consequences shown on a cloned plant.
- Engine separated from UI and well tested; solver caching kept it ~58 fps on throttled phones.
- Strong safety framing (LOTOTO, live-dead-live), clear "training, not procedure" labeling.
- Accessibility discipline: axe 0 on every tab, light and dark.
- Brand consistency with the business site.

## What feels unfinished or "web-page-like"
1. 20 tabs: the phone nav hides most of the app behind a "More" sheet; it reads like a website menu.
2. Pages are long scrolling documents; few screens feel like single-purpose app views.
3. One giant stylesheet; class-name clashes have already caused layout bugs (vault 2026-11-03).
4. Hand-rolled service worker — no precache manifest, update prompts or versioned caches.
5. `localStorage` only; no IndexedDB, so progress is fragile on iOS storage pressure.
6. No onboarding or personalization at first launch (My Path is optional, buried).
7. No skeleton loaders; content pops in.
8. Transitions are page-level cross-fades; no shared-element card → detail motion.
9. No sound design, no haptic-style press states on most controls.
10. No undo/redo in any editor (the sim has no editor).
11. No 3D; equipment is only seen as symbols, never as it physically sits in a panel.
12. No certificate output; badges exist but there's no "finished a track" moment.
13. Search exists (⌘K) but there's no search entry point on phones.
14. No end-to-end test that fails on console errors in CI (checked by hand).
15. No safe-area handling beyond basics; icon set lacks a splash/launch look on iOS.
