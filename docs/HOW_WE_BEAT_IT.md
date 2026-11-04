# How Controls Academy beats the baseline

Family resemblance kept on purpose: same tokens (`#0b0f14`, `#1e6fff`, blue→cyan gradient),
Montserrat + Inter, CM monogram in About/footer, circuit-trace headers, the same tagline and
"Built by Caylor Made Technologies, Hereford, TX". Controls Academy adds an energized-green
"logic true" color and is the flagship. ☑ = shipped and checked in a browser; ☐ = planned.

| # | Improvement | Status |
|---|---|---|
| 1 | Five-tab native nav (Learn · Simulator · Troubleshoot · Reference · Profile) — no "More" junk drawer | ☑ |
| 2 | Side rail on desktop, bottom tab bar on phone, sliding active pill | ☑ |
| 3 | Safe-area aware header/tab bar (notch + home indicator), 44 px targets, no h-scroll ≥ 320 px | ☑ |
| 4 | Installable PWA via vite-plugin-pwa: precache manifest, versioned caches, auto-update | ☑ |
| 5 | Progress in IndexedDB with localStorage fallback, every read/write in try/catch | ☑ |
| 6 | First-launch onboarding: goal + brand you'll see most → personalizes skin and path | ☑ |
| 7 | Real PLC engine with scan cycle, single-step rung pointer, prescan, forces, faults | ☑ |
| 8 | Touch-first ladder editor with undo/redo, autosave, verify, JSON/URL share | ☑ |
| 9 | Same program shown in 10 brand dialects (addressing, mnemonics, timer units) | ☑ |
| 10 | Rung-goes-true glow; true/false also shown by shape and label (colorblind-safe) | ☑ |
| 11 | Skeleton loaders for every lazy section; no blank screens; helpful empty states | ☑ |
| 12 | Card → lesson shared-element transition (Framer Motion layoutId) | ◐ wired; polish in Phase 9 |
| 13 | Animated progress rings, XP, streak, skill map, badges | ☑ |
| 14 | Certificate-of-completion per track, saved as a PNG on device | ☑ |
| 15 | Search on every device: ⌘K on desktop, search button in the phone header | ☑ |
| 16 | Generated Web Audio sounds (contactor clunk, hum, horn), off by default | ☑ |
| 17 | Export / import progress JSON, validated on import | ☑ |
| 18 | Glossary popovers on any underlined term, first use defined | ☑ |
| 19 | Playwright gate: zero console errors + axe 0 + no overflow + screenshots at 375×812 and 1440×900, in CI | ☑ |
| 20 | Modular CSS: Tailwind utilities + token layer, no global class clashes | ☑ |
| 21 | Fault-Hunt Mode scored on time *and* safety, with teaching moments | ☑ (starter set) |
| 22 | Interactive 3D panel + plant scenes with 2D fallback, lazy-loaded | ☐ Phase 8b |
| 23 | Lighthouse ≥ 95 on mobile across categories | ☐ Phase 10 (main bundle 139 KB gz to trim) |
