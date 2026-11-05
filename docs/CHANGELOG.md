# Changelog

## 0.3.0 — 2026-11-05
- **Site moved** with the repo rename: https://caylor-made-technologies.github.io/controls-academy/ (Vite base updated; the old base left a blank page at the new URL for a short time).
- **Bugs found by the new every-feature test and fixed:**
  - Tapping a rung number didn't select the rung (the tap bubbled to the ladder background and cleared it), so rung Delete/Dup/Comment/Move never enabled.
  - Ctrl/⌘+Z stopped working after deleting with the keyboard (focus was lost); undo/redo now work anywhere in the editor.
  - Search opened with focus on the close button instead of the search box.
  - Search box now announced as a combobox; loading skeletons, the hunt timer, meter readout, onboarding steps and 3D legend got proper roles (axe flagged prohibited aria-label use).
  - Each Fault Hunt now has its own URL, so Back and the Troubleshoot tab return to the list.
  - All Framer Motion animations now follow the device's reduced-motion setting.
- **3D upgrade:** rounded hardware, PLC cards with vents, hinged terminal covers and label strips, terminal screws and field wires into the duct, chrome-bezel domed pushbuttons and a mushroom E-stop, rebuilt motor (cooling fins, fan cover grille, terminal box, nameplate, feet, keyed shaft and coupling), door gasket and hinges, conduit, concrete floor with a painted working-clearance box, hover outlines and floating name tags, camera fly-in, warmer key + blue rim lighting.
- **Clear PLC platform labels:** a platform bar on every workbench names the maker, family and software style (e.g. "Allen-Bradley — ControlLogix / CompactLogix — Studio 5000 style") with live examples of this program's addresses and a 5 s timer preset; tap it for a picker grouped by manufacturer (Allen-Bradley, Siemens, Schneider, Mitsubishi, AutomationDirect, Omron, vendor-neutral). The quick select, onboarding and Profile use the same grouping. The 3D rack is labeled in the chosen dialect (CPU shows maker + family; cards show `Local:1:I` / `%I0.0–0.7` / `X0–X7`…; operator station shows the Start button's address) with a HUD platform tag. Labels auto-shrink to fit.
- Resume ("Jump back in") only remembers lessons, the simulator, hunts and reference pages, so visiting Profile no longer loses your place.
- 3D draw calls cut ~20% (instanced PLC trim, one texture for all terminal numbers); ~50k triangles per frame on the default tier.
- **New test:** `tests/e2e/features.mjs` checks every feature (all lessons, tasks, editor tools, skins, forces, import/export/share, all 8 hunts, reference, search, review, profile, certificates, erase/restore, 3D tap, offline PWA). Runs against local or live (`SITE_URL=`).

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
