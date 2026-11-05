# Audit — Controls Academy v0.5.0 (Phase 0, 2026-11-05)

What exists today, measured, so every later phase has a baseline to beat. The lesson table is
generated from the content data by `npm run audit:lessons` — re-run it instead of editing by hand.

## 1. Routes and screens (hash routes)
| Route | Screen | Notes |
|---|---|---|
| `#/learn` | Learn home: levels, 11 tracks, lesson cards, "Jump back in", Review count | |
| `#/lesson/<id>` | Lesson: blocks, figures, rungs, optional hands-on task (Workbench), quiz | 49 lessons |
| `#/review` | Spaced review of missed questions (Leitner 1/2/4/7/14 days) | Only missed questions enter review |
| `#/sim` | Simulator: ladder editor + motor station + 3D panel (lazy) + torque–speed chart | 10 brand skins |
| `#/troubleshoot` | Fault Hunt list | 8 hunts |
| `#/troubleshoot/<fault>` | One hunt: meter, live-dead-live, blame a part, scoring | |
| `#/reference` | Reference home (featured hardware card + 5 sections) | |
| `#/reference/brands`, `#/reference/brand/<id>` | 25 brand field guides | |
| `#/reference/hardware`, `#/reference/hw/<id>` | Hardware library (87 models, 3D + front view) | |
| `#/reference/instructions` | Instruction reference with names per platform | 38 ops |
| `#/reference/glossary` | Glossary | 92 terms |
| `#/reference/safety` | Safety rules | |
| `#/reference/practice` | Practice-at-home tools | 5 |
| `#/profile` | XP, level, streak, badges (15), certificates, settings, backup/restore/erase | |
| `#/about` | Mission, privacy, terms (template), trademarks, licenses, contact | |
| (overlay) | Onboarding (goal + brand), ⌘K / phone search, power-on intro | |

## 2. Lessons vs. the 8-item quality bar
Legend: 1 Why-on-the-job · 2 Plain explainer ≤ 2 phone screens with ≥ 1 glossary link · 3 Interactive
figure/sim task · 4 Real-world example (flour mill / data center / water) · 5 Common-mistakes box ·
6 Safety note where energized work is touched (– = topic doesn't touch it) · 7 3–5 question check with
explanations · 8 Prerequisites. Computed by `src/content/quality.ts`, the same checker the build-failing content test uses.
Items 1, 4, 5, 6 and 8 are schema fields added in Phase 1.1, so every lesson starts at ✗ for them.
(Before the fields existed, a text search found a mill/data-center/water example in 4 lessons and a
"gotcha" box in 20; those get moved into the new fields during 1.3.)

| Track | Lesson | 1 Why | 2 Explainer | 3 Interactive | 4 Real-world | 5 Mistakes | 6 Safety | 7 Check | 8 Prereqs |
|---|---|---|---|---|---|---|---|---|---|
| T1 | `volts-amps-ohms` | ✗ | ✓ (128w, 1 links) | ✓ | ✗ | ✗ | ✗ | ✓ (4) | ✗ |
| T1 | `meter` | ✗ | ✓ (161w, 2 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T1 | `relays-contactors` | ✗ | ✓ (144w, 5 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T1 | `protection-devices` | ✗ | ✓ (172w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T1 | `lototo` | ✗ | ✓ (239w, 4 links) | ✗ | ✗ | ✗ | ✗ | ✓ (4) | ✗ |
| T1 | `boundaries-ppe` | ✗ | ✓ (140w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T2 | `reading-ladder-prints` | ✗ | ✓ (211w, 3 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T2 | `panel-layouts` | ✗ | ✗ (176w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T2 | `print-drills` | ✗ | ✗ (134w, 0 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T3 | `three-wire` | ✗ | ✓ (159w, 2 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T3 | `hardwired-safety` | ✗ | ✓ (169w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T3 | `jog-fwd-rev` | ✗ | ✓ (171w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T3 | `reduced-voltage` | ✗ | ✓ (68w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T4 | `what-is-a-plc` | ✗ | ✓ (181w, 2 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T4 | `sinking-sourcing` | ✗ | ✓ (122w, 4 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T4 | `analog-420` | ✗ | ✓ (164w, 5 links) | ✓ | ✗ | ✗ | ✗ | ✓ (4) | ✗ |
| T4 | `numbers` | ✗ | ✓ (118w, 6 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T4 | `data-types` | ✗ | ✓ (133w, 5 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `contacts-coils` | ✗ | ✓ (123w, 3 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `timers` | ✗ | ✓ (99w, 5 links) | ✓ | ✗ | ✗ | ✗ | ✓ (4) | ✗ |
| T5 | `counters` | ✗ | ✓ (90w, 1 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `latch-unlatch` | ✗ | ✓ (94w, 2 links) | ✓ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T5 | `duplicate-coils` | ✗ | ✓ (89w, 1 links) | ✓ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T5 | `compare-math` | ✗ | ✗ (75w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `alarm-ack` | ✗ | ✓ (49w, 1 links) | ✓ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `sequencers` | ✗ | ✓ (139w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T5 | `program-organization` | ✗ | ✓ (89w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T6 | `upload-download` | ✗ | ✓ (170w, 3 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T6 | `forcing` | ✗ | ✓ (146w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T6 | `compare-online` | ✗ | ✗ (136w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T7 | `troubleshooting-method` | ✗ | ✓ (165w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T7 | `fault-codes` | ✗ | ✗ (107w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T8 | `ip-basics` | ✗ | ✓ (158w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T8 | `profinet-names` | ✗ | ✓ (144w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T8 | `modbus` | ✗ | ✓ (106w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T8 | `legacy-networks` | ✗ | ✗ (52w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T9 | `vfd-basics` | ✗ | ✓ (101w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T9 | `hmi-basics` | ✗ | ✓ (135w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T9 | `bacnet-bms` | ✗ | ✓ (135w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T10 | `capstone-build` | ✗ | ✗ (108w, 0 links) | ✓ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T10 | `capstone-mixer` | ✗ | ✗ (218w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T11 | `pid-tuning` | ✗ | ✓ (203w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T11 | `analog-alarming` | ✗ | ✓ (125w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T11 | `structured-text` | ✗ | ✓ (86w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T11 | `reusable-logic` | ✗ | ✓ (159w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T11 | `network-troubleshooting` | ✗ | ✗ (156w, 0 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |
| T11 | `commissioning` | ✗ | ✓ (164w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T11 | `safety-systems` | ✗ | ✓ (163w, 2 links) | ✗ | ✗ | ✗ | ✗ | ✓ (3) | ✗ |
| T11 | `change-management` | ✗ | ✓ (106w, 1 links) | ✗ | ✗ | ✗ | ✗ | ✗ (2) | ✗ |

**Meeting all 8: 0 of 49.** Per item: why 0 · explainer 40 · interactive 16 · realWorld 0 · mistakes 0 · safety 0 · check 39 · prereqs 0

**Headline:** no lesson meets all 8 today. Only 16 have an interactive element, 10 have fewer than 3
check questions, 9 have no glossary link in the explainer. Phase 1 fixes this.

## 3. Simulator machines, faults and tasks
- **Machines:** 1 — Motor start/stop station (`src/plant/motor.ts`): NO start, NC stop, overload 95-96,
  aux 13-14, reset, two-contact E-stop; torque balance physics, I² thermal overload, 10 meter points.
- **Faults (8):** fuse (1), stopwire (2), startworn (2), coilopen (3), jam (1), forced (3), auxfail (3), estopin (1).
- **Lesson sim tasks (9):** three-wire (motor-sealed), what-is-a-plc (scan-stepped), contacts-coils (stop-fixed),
  timers (timer-done), counters (counter-five), duplicate-coils (dup-fixed), latch-unlatch + alarm-ack
  (latch-reset), capstone-build (build-start-stop).
- **Interactive figures (7 types, 9 uses):** ohms, meter, hardwired-3wire ×3, scan, sinksource, scaling, numbers.
- **No VFD, no second machine, no PID plant.** (Phase 2.)

## 4. Reference and hardware
- 25 brand guides: Rockwell, Siemens, Schneider, Mitsubishi, AutomationDirect, Omron, Emerson, Beckhoff,
  IDEC, Unitronics, WAGO, Phoenix Contact, Eaton, Keyence, Opto 22, Delta, B&R, Yaskawa, ABB, Danfoss,
  Red Lion, Pilz, Tridium, Johnson Controls, Honeywell.
- Hardware library: 87 models — PLC 47, remote I/O 5, logic modules 2, drives 19, HMIs 7, safety relays 2,
  building automation 5. No field devices yet (prox, photo-eye, transmitters, MCC…) — Phase 5.2.
- Instruction reference 38 ops · glossary 92 terms · safety rules page · 5 practice tools.
- No troubleshooting flowcharts, cheat sheets or "day one" guide — Phase 5.3–5.5.

## 5. Tests and coverage
- Unit: 138 tests in 7 files (engine, motor, skins, content, edit, hardware, progress).
- Engine coverage: statements 97.4 %, branches 90.5 %, functions 100 % (`npm run coverage`).
- E2E: `run.mjs` (14 routes × phone/desktop × dark/light: axe, console, overflow) · `flows.mjs` (8 flows) ·
  `three.mjs` (6 3D checks) · `features.mjs` (104 every-feature checks). All green locally and on live.
- CI ran 3 of the 4 e2e scripts; Phase 0 added `features.mjs` and the bundle budget to CI.

## 6. Baseline numbers (become the budgets)
| Measure | Baseline (v0.5.0, live) | Budget |
|---|---|---|
| Main JS bundle | 157.5 KB gzip (level 9; Vite prints 161.6 KB at its default level) | Ceiling **158 KB**, may only go down — enforced by `npm run budget` in CI |
| CSS | 11.8 KB gzip | track |
| Lighthouse mobile `#/learn` | Perf 97 · A11y 100 · BP 96 · SEO 100 · LCP 2.2 s · CLS 0 | never below; 95+ all four by Phase 6 |
| Lighthouse mobile `#/reference` | Perf 96 · A11y 100 · BP 96 · SEO 100 · LCP 2.6 s · CLS 0 | same |
| Lighthouse mobile `#/sim` | Perf **44** · A11y 100 · BP 96 · SEO 100 · LCP 4.5 s · TBT 72 s · CLS 0 | see BUGS B-001 |
| Best-practices miss | `image-size-responsive` (icon/logo served smaller than display × DPR) | B-002 |
| 3D fps (sim panel, low tier, 375 px) | 14 fps at 1× / 12 fps at 4× CPU — **software GL (SwiftShader) in a headless container, not a phone**; use as a relative number only | ≥ 45 fps on a real mid-range phone (Phase 3.8) |
| axe | 0 violations, every route, both themes | 0 |
| Console errors/warnings | 0 on every route and flow | 0 |
| WebGL | 1 canvas after 5 switches; no context-leak warning | counts return to baseline (Phase 3.1) |

Lighthouse 12.6.1, mobile preset (simulated slow 4G, 4× CPU), headless Chromium in the cloud container.
