# Changelog

## 0.2.0 — 2026-11-04
- 3D control panel (Phase 8b start): procedural enclosure, disconnect, fuses, transformer, 24 VDC supply, PLC rack with live LEDs (RUN/FORCE/FAULT, every I/O point), Ethernet switch, contactor whose armature pulls in, overload whose trip flag pops, terminal strip with wire numbers, slotted wire duct, operator station you can press, motor with a turning shaft.
- Tap any part for what it is, how to test it with a meter, safety notes and its lesson. Guided camera tours. X-ray mode shows current flowing in the coil, motor-power and input circuits. Exploded contactor view.
- Quality tiers (auto/low/medium/high/2D only) with PerformanceMonitor, DPR capped at the device's real ratio, on-demand rendering when nothing moves, context-loss fallback. 3D code is lazy-loaded (289 KB gz) and never part of first load.
- Signature UI: power-on intro (once per session), direction-aware page transitions, bus-bar tab indicator, pointer spotlight on cards, drag-to-close sheets, blueprint grid background, scroll-aware header, rung energize flash.
- New 3D gate test (renders, HUD actions, 5× 2D↔3D switches leak no WebGL contexts, zero console warnings). three pinned to 0.182 (r183+ logs a deprecation warning from the renderer loop).

## 0.1.0 — 2026-11-04
- Phase 1: recon of the sibling app → BASELINE, HOW_WE_BEAT_IT, CLAUDE.md.
- Phase 2: Vite/React/TS app shell, Tailwind tokens in the Caylor Made brand, PWA (offline, installable), bottom tabs + desktop rail, dark/light/system, onboarding, ⌘K search, Pages workflow.
- Phase 3: PLC engine — honest scan cycle with single-step pointer, prescan, forces, major/minor faults, 37 instructions incl. timers, counters, compare, math, CPT expressions, SCP / NORM_X / SCALE_X, COP, JSR, MCR, PID. 86 engine tests, 96% coverage.
- Phase 4: touch-first ladder editor (undo/redo, branches, verify, cross-reference, operand sheet with autocomplete, share link, JSON import/export) and the motor start/stop station with hardwired E-stop, overload model and 8 injectable faults.
- Phase 5: 10 brand skins (AB Logix, SLC/MicroLogix, Micro800, Siemens TIA, S7 classic, Modicon, Mitsubishi octal, AutomationDirect, Omron, IEC).
- Phase 6 (partial): 20 lessons across tracks 1–8 with 7 interactive figures, 7 hands-on sim tasks, quizzes, spaced repetition, XP, streaks, 14 badges, track certificates.
- Phase 7 (started): Fault Hunt on the motor station — meter with live-dead-live, stopwatch, safety-scored.
- Reference: 8 brand field guides, instruction reference, 67-term glossary, safety rules, practice tools.
- Quality gate: 122 unit tests; Playwright pass on 12 routes × phone/desktop × dark/light: 0 console errors, axe 0, no horizontal overflow; interaction flows pass.
