# Changelog

## Unreleased — Phase 4: premium UI, 3D and motion (in progress, will ship as 0.9.0)
### Added
- The page heading now appears with the HTML, before any app code has loaded (first paint about 1 s sooner on a slow phone).
- Every 3D view opens on a blueprint-style still of the same scene from the same angle, then fades into the live view.
- Screen changes crossfade, and a lesson card grows into its lesson (browsers with View Transitions; others get a short fade). Reduced motion makes every change instant.
- A design system: `docs/DESIGN-SYSTEM.md`, tokens for color, size, type, depth and motion, a component kit, and a styleguide page (About → Styleguide).
- Toast messages, empty-state and error-state components.
- `npm run verify` (the whole gate, one table), `verify:live`, `shots`, `posters`, `lighthouse`.
### Changed
- Safety notes are safety yellow (faults stay red).
- Main bundle 115 → 76 KB gzipped; fonts 86 → 52 KB; logo image 99 → 7 KB.
- The saved theme applies before first paint (no dark flash for light-theme users).
### Fixed
- B-010: LCP 2.7 s on Simulator, Troubleshoot and Wiring. Now about 1.6 s in local throttled runs.

## 0.8.0 — 2026-11-07 · Phase 3: graphics
### Added
- One shared 3D stage for every 3D view: quality tiers from a device test, render only on change, pause off-screen, clean disposal.
- One studio look for all 3D: shared lighting and reflections (`Lights.tsx`), soft shadows on high, a baked contact shadow on the panel backplate for depth, and a color grade per app theme — the 3D room is light in light mode and follows theme switches live.
- A live 3D scene for every machine (VFD fan with a working drive keypad, forward/reverse screw, bag conveyor with photo-eye beams and real bags, tank with live level and valve stem, lift station wet well with riding floats, data-center ATS + generator + CRAH, flour batch mixer). Everything moves from the simulation; tap a part for its wiring card. Phone framing backs the camera off on narrow screens.
- Tap a part in any machine scene and the camera glides to it (instant with reduced motion).
- A small arc at the motor contactor's contacts each time it opens under load — real, normal behavior that the arc chutes contain. Not used for faults, so it never gives away a Fault Hunt answer. Off with reduced motion.
- Fault Hunt 3D probes: the machine's test points on a terminal strip, a meter with a mode dial and a live display, the black lead on common; drag the red probe onto a terminal. Wrong or unsafe meter modes are caught and explained exactly as with the list.
- Wiring trainer (`#/wiring`, from the Simulator): 3-wire start/stop, PNP prox to a sinking input, NPN prox to a sourcing input, and a 4–20 mA loop with a shunt. Tap terminal to terminal (terminal buttons, or the 3D board). The checker powers your circuit and runs it through a test — Stop must beat a held Start, a tripped overload must block Start, buttons switch the hot side — so any correct layout passes and the first mistake is explained.
- What's inside (Reference): exploded 3D views of a thermal overload relay, an inductive prox, a digital input card and a VFD. Explode slider; tap a part (or pick it in the list) for what it does and how it fails.
- Performance budgets for every 3D view (draw calls and triangles per frame), checked in `tests/e2e/perf.mjs`.
- Leak test: the 3D panel, the hardware viewer and the machine scenes each opened and closed 20 times — contexts, GPU memory and textures stay flat.
### Fixed
- B-008: the "Failing fan bearing" Fault Hunt couldn't be solved (its culprit, the motor, had no card to tap). Motors now have device cards; a test checks every hunt is solvable.
- 3D review fixes before release: photo-eyes show what the sensor sees (not the PLC input), a jammed screw stops turning, the batch panel shows what the PLC reads, the weigh-mixer matches the program's process order, a generator with a dead battery doesn't turn, pump running lights come from the starter aux contacts, a stuck float stays stuck, the screw turns at gearbox speed, and safety cues were added (covers, confined-space sign, two-source and auto-start placards, open-door NFPA 70E notes, E-stops).
- B-009: small buttons, segmented controls and chips are 44 px tall everywhere (was 36–38 px).
- Fault Hunt meter: loop-current points explain that mA is read in series (or with a clamp), not from a terminal to common; motor-current points carry the CAT III / NFPA 70E cue; a volts reading on a loop point no longer shows a false "0.0"; a dead reading only counts as proof after the meter is proved again (live-dead-live); each mistake costs once per point and mode; lifting the probe stops the live reading; a cancelled drag sends the probe home; the meter is announced to screen readers when you measure, not on every scan.
- B-001 (mostly): the Simulator no longer redraws 3D every scan. Lighthouse mobile `#/sim` 45 → 85 locally.
- GPU-less devices open the Simulator in 2D on "auto" (3D is one tap away).

### Known issues
- B-010: LCP is 2.7 s on Simulator, Troubleshoot and Wiring (budget 2.5 s). Lighthouse performance is 95–96 on the live site (Simulator was 45).
- Spinning parts are shown slowed down on purpose (labels say so); real speeds are in the readouts.
- The 3D views are tested on a software GPU here; real-phone frame rates are checked against budgets (draw calls and triangles), not measured on devices.
- VERIFY items for 0.8.0 are listed in docs/VERIFY.md and await expert review.

## 0.7.0 — 2026-11-06 (Phase 2: machines and a VFD)
- **7 new machines** in the simulator (pick one at the top of the Simulator, or open `#/sim?m=<id>`), each with a working ladder program, wiring notes for every device, meter points, SI-unit physics tested against hand-worked values, and 4–5 injectable faults:
  - **Fan on a VFD:** accel/decel ramps, 4–20 mA / 0–10 V / keypad speed reference, terminal or keypad control, current limit, DC-bus regeneration, braking resistor, STO, and OC / OV / loss-of-reference / motor-overload trips.
  - **Forward/reverse screw conveyor:** mechanical, electrical and logic interlocks (the hardwired ones hold even if reverse is forced on), zero-speed anti-plugging.
  - **Bag conveyor:** two photo-eyes, bag counting, jam detection, pallet counter.
  - **Tank level PID:** 4–20 mA transmitter, PID fill valve tunable from the panel (watch overshoot on the trend), bad-signal and high-high protection.
  - **Lift station:** pump lead/lag with alternation, fail-to-start fail-over and an independent high-level float.
  - **Data center:** ATS with generator start, transfer, retransfer delay and cooldown, plus a CRAH chilled-water temperature PID — a utility outage visibly warms the room until the generator picks up.
  - **Flour batch mixer:** recipe weights, state machine with fault codes 901–906, dust-collector and gate interlocks, in-flight overshoot.
- **37 faults** across 8 machines, each with the symptom, what the meter shows, root cause, the fix and a safety note.
- **Fault Hunt** covers every machine, with a difficulty filter, a real meter-mode selector (ohms or amps-jacks on a live point is flagged as unsafe) and method scoring that rewards proving the culprit with the meter before naming it.
- **One machine interface** (`docs/SIM-ARCHITECTURE.md`): a declarative operator panel (buttons, switches, sliders, lights, gauges, trends, PLC-tag setpoints), shared tested physics kit, machine registry.
- **Bug caught before release:** B-007 — the new lift-station program let both pumps short-cycle on the backup float until their overloads tripped; fixed with float deadband and a 60 s hold.
- **Known issues:** B-001 (3D renders continuously; `#/sim` Lighthouse). The new machines are 2D; their 3D scenes come in Phase 3.3, including the live VFD keypad.


## 0.6.0 — 2026-11-06 (Phase 1: teach from scratch)
- **Track 0 — Start from Zero:** 11 new beginner lessons (electricity, Ohm's law and power, AC/DC and US plant voltages, series/parallel, open/short/ground faults, grounding and bonding, safety foundations, tools/PPE/meter, symbols and drawings, control panels, jobs in controls). 60 lessons in 12 tracks.
- **Every lesson meets the 8-item quality bar**, enforced by the type system and a test: why it matters on the job, a plain explainer with tap-to-define terms, an interactive figure/drill/sim task, a flour-mill / data-center / water-plant example, common mistakes, a safety note, a 3–5 question check with explanations, and linked prerequisites.
- **New interactive pieces:** "put the steps in order" and "sort it" drills in 50+ lessons; a series/parallel lamp figure.
- **Accuracy:** an independent technical review after every track found and fixed ~30 must-fix items (e.g. PPE on live measurements, stored-energy step in lockout, high-resistance-grounded systems, 32-bit REAL rounding, Logix RPI I/O timing, force install vs enable, reset never starts motion, megger safety) plus many smaller ones; a final pass confirmed all resolved. Every number in a lesson is re-computed by a unit test. 30+ new VERIFY items listed in `docs/VERIFY.md`.
- **Continuity:** a prerequisite graph (one root, no cycles, no orphans) and a test that no glossary term is used before a lesson teaches it (~150 first-use links added).
- **Skill map** (`#/skills`): zoomable prerequisite map and a screen-reader list view, with locked / ready / done / mastered states.
- **Practice exams** (`#/exam`): one per level plus the **Controls Technician Readiness** assessment — randomized from a tagged question bank (≥ 3× each sitting), optional timer, explanations at the end, per-topic breakdown, lessons to revisit. Labeled "Practice record — not a qualification or license."
- **Spaced review** is now SM-2 per question: weak topics come back sooner, missed items are re-asked at the end of the session; old review data migrates automatically.
- **Study summaries** (`#/summary`): printable (print → PDF) and Markdown export per track: why, formulas, key terms, safety points, common mistakes.
- **Certificates:** the practice-record label is now prominent on screen, on the PNG and in exports; new Readiness practice record (unlocks at 80 %).
- **Faster start:** lesson text and onboarding are lazy-loaded; main bundle 157.5 → 117.5 KB gzip (ceiling now 118 KB).
- **Bugs fixed:** B-005 a quick tap on Start/Stop could be missed on a slow device (the Phase 0 "flaky" test); B-006 161 of 192 correct answers were choice B — choices now shown in a stable shuffled order.
- **Known issues:** B-001 (simulator 3D renders continuously; Lighthouse Performance on `#/sim`) — Phase 3.1/6.1.

## 0.5.1 — 2026-11-05 (Phase 0: baseline and audit)
- **Audit, bug list and roadmap:** `docs/AUDIT.md` (every route, the 49 lessons against the 8-item quality bar, machines/faults/tasks, reference, tests, baseline numbers), `docs/BUGS.md`, `docs/ROADMAP.md`.
- **Budgets enforced:** `npm run budget` fails the build if the main bundle grows past 158 KB gzip (the v0.5.0 baseline); CI now also runs the every-feature test (`features.mjs`).
- **Fixes:**
  - B-003: "Next lesson" followed source-file order, so 9 of 49 links skipped a lesson or jumped tracks (e.g. Relays → Reading prints, skipping Protection devices). Lessons now follow course order.
  - B-004: "Up next" on Learn never recommended Track 11, so it went blank after Track 10 with 8 lessons left.
  - B-002: intro app mark rendered at 2× so it's sharp on phones.
- **Known issues:** B-001 the simulator re-renders 3D continuously (slow on low-end phones; Lighthouse mobile Performance 44 on `#/sim`) — scheduled for Phase 3.1/6.1.

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
