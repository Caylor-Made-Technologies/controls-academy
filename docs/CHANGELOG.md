# Changelog

## 0.5.0 — 2026-11-05
- **Motor physics rebuilt.** Real torque balance (J·dω/dt = motor torque − load torque) integrated in 1 ms steps; an illustrative NEMA design B–like torque–speed curve (≈1.5× locked-rotor, ≈2.5× breakdown, 1.0× at rated slip); current from slip via a simplified equivalent circuit (≈6× inrush, ≈1× at rated, ≈0.4× no-load) with a small supply dip during inrush; a conveyor-like load with breakaway friction; a jam now *stalls* the motor because the load exceeds breakdown torque.
- **Overload relay is a proper thermal model** (illustrative Class 10: 600 % trips in about 5 s from cold; service-factor pickup at 115 %; thermal memory) and **won't reset until it cools**: the button shows "Cooling — reset in N s".
- **Live torque–speed chart** in the motor station: motor curve, load curve, current curve and the operating point moving as you start, run, jam and coast; live speed, slip, torque and current readouts. On phones it's there too, collapsed.
- **Hardware library: 87 models, 25 brands.** New types: drives (PowerFlex 525/755/40, SINAMICS G120/V20, MICROMASTER, Altivar 320/600, Yaskawa GA500/GA800/V1000, ABB ACS580/ACH580/ACS355, Danfoss FC 102/FC 302, GS20, FR-E800, Eaton DG1, Delta MS300), HMIs (PanelView Plus 7, PanelView 800, SIMATIC Comfort/Unified, C-more EA9, Red Lion Graphite/FlexEdge, Harmony, GOT2000), safety relays (Pilz PNOZ, Guardmaster 440R) and building automation common in US data centers (Niagara JACE 8000, Metasys, Honeywell WEBs/Spyder, Desigo PXC, EcoStruxure Building SmartX). More PLC families: MicroLogix 1000/1200/1500, CompactLogix 5480, S7-200, FX2N/FX1N, Twido, Productivity3000.
- **8 new brand guides** (Yaskawa, ABB, Danfoss, Red Lion, Pilz, Tridium/Niagara, Johnson Controls, Honeywell), each with where you'll see it in the US, software, first-day steps, tips, gotchas and networks.
- **New 3D parts:** drives with keypad (LCD alternates Hz and amps), run/stop keys, DC-bus warning label, terminal cover, conduit knockouts and side heatsink fins, on a back plate; HMIs with an original overview screen (status tiles, level bar, alarm banner, buttons) in a door cut-out with a glass glint; safety relays with channel LEDs and rotary dials.
- Library **type filter** (PLCs, remote I/O, drives, HMIs, safety relays, building automation, logic modules) with counts; cards and model pages show the type. The simulator's hardware menu lists only PLCs. 3D panel HUD shows live rpm and amps; its tool row scrolls on phones instead of wrapping off the canvas.
- **Bugs fixed:** going from the simulator to a hardware page could blank 3D labels (a closing view freed the shared label textures the new view had just made; textures are now reference-counted); SVG gradient IDs from React 19.1 `useId` contained characters that can break `url(#…)`; the capstone build task could reject a correct rung if Stop was pressed before 500 rpm (now 100 rpm); one failing e2e check could leave its browser open and starve the rest of the run.

## 0.4.1 — 2026-11-05
- **3D hardware graphics:** molded front face plates, vent slots on every module, Ethernet jacks with blinking link/activity lights, a real top-hat DIN rail profile, printed wire-label cards on module doors, floating name tags on hover/selection.
- **3D viewer:** 3/4, Front, Side and Top camera views with a smooth glide, Reset, "Spread modules" (slices slide apart; chassis modules slide half out of their slots), a turn-in animation when a model opens (off with reduced motion), auto-framing on every screen shape.
- **Library UI:** search (e.g. "1756", "S7-1200", "slice I/O"), Current / Mature / Legacy filter, result count, lifted cards with lit thumbnails, front view shown instantly while 3D loads, "At a glance" tiles, previous/next model.
- Reference home leads with a featured hardware-library card. Page titles stay crisp over the circuit-trace decoration on phones.
- Fix: the old generic rack trim (covers, vents) was drawn over library models in the simulator's 3D panel.

## 0.4.0 — 2026-11-05
- **Course expansion:** 29 new lessons (49 total) in 4 levels (Beginner → Intermediate → Advanced → Expert), new Track 11 "Expert Practice", 2 capstones (build start/stop from a blank rung; design the flour batch mixer), Structured Text code blocks, the "Controls Pro" badge and the `build-start-stop` task check.
- **PLC hardware library (3D):** 48 PLC, remote I/O and logic-module families you commonly see in US plants, from 17 brands (Allen-Bradley/Rockwell, Siemens, Schneider/Modicon, Mitsubishi, AutomationDirect, Omron, Emerson/GE, Beckhoff, IDEC, Unitronics, WAGO, Phoenix Contact, Eaton, Keyence, Opto 22, Delta, B&R). Each one has a procedural 3D model (orbit, pinch, tap a module), a flat front view (thumbnails, no-WebGL and "2D only"), where you'll see it in the US, software, what to look at, and its status (current / mature / legacy). Simplified look-alikes: approximate proportions, neutral colors, no logos.
- **Simulator 3D panel uses real-world form factors:** the PLC in the panel now matches your platform (e.g. CompactLogix 5380 for Logix, S7-1200 for TIA, CLICK for AutomationDirect), live from the engine (RUN/FORCE/FAULT and every I/O point). A HUD menu swaps in any library model or the generic rack; "Use in the simulator" on a model page does the same.
- **Brand field guides:** 9 new brands and, for every brand, where you meet it in the US plus the HMIs, drives and networks that usually come with it. Each guide lists its 3D models. Search finds every model.
- Every-feature test fixed for tracks 10 and 11 (exact certificate button names) and extended with brand and hardware-library checks; route gate covers the library and a model page.

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
