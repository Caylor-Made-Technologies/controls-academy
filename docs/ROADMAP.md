# Roadmap — v0.5 → v1.0

Each phase ends with the phase gate: full local run (unit, lint, typecheck, build, budget, 4 e2e scripts),
merge to `main`, deploy, the full e2e suite again **on live**, version bump, changelog, phone screenshots,
phase report and vault update. Items found in the Phase 0 audit are marked **(audit)**; bug ids point to
`docs/BUGS.md`.

## Phase 0 — Baseline and audit → v0.5.1
- [x] 0.1 Full suite against live v0.5.0 (all green)
- [x] 0.2 `docs/AUDIT.md` (routes, 49-lesson quality table, machines/faults/tasks, reference, tests)
- [x] 0.3 Baseline numbers + budgets; bundle ceiling enforced in CI (`npm run budget`); `features.mjs` added to CI
- [x] 0.4 375 px click-through → `docs/BUGS.md`
- [x] 0.5 This roadmap

## Phase 1 — Teach from scratch → v0.6.0
- 1.1 Lesson schema: `why`, `prereqs`, `realWorld`, `mistakes`, `safety` (or explicit "not energized" reason), `interactive`, quiz 3–5; build-failing content test
- 1.2 "Start from Zero" track (t0) — electricity, Ohm's law + power, AC/DC + US voltages + 3-phase, series/parallel, circuits/faults, grounding/bonding, tools + PPE + meter, symbols + drawings, what a panel is, relays/contactors, jobs in controls, safety foundations. Overlap with Track 1 resolved (Track 1 keeps the deeper versions; t0 links forward) **(audit)**
- 1.3 Upgrade all 49 lessons, one track per commit, review pass after each **(audit: 0/49 meet the bar)**
- 1.4 Prerequisite graph + continuity test (no glossary term used before the lesson that teaches it); bridge lessons
- 1.5 Skill map (zoomable SVG + list view for screen readers), locked/unlocked/mastered
- 1.6 Question bank tagged by topic/difficulty; practice exam per level; Controls Technician Readiness assessment (practice record)
- 1.7 SM-2 scheduling per question, weighted to weak topics; unit-tested **(audit: today only missed questions enter review)**
- 1.8 Printable study summary per track
- 1.9 Certificates keep the practice-record label (screen, print, export)

## Phase 2 — Machines and a VFD → v0.7.0
- 2.1 `docs/SIM-ARCHITECTURE.md`; one `Machine` interface (program, I/O map, wiring, meter points, faults, physics, 2D view, 3D hook)
- [x] 2.1 Machine interface, registry, generic panel, kit, Fault Hunt across machines, SIM-ARCHITECTURE.md
- [x] 2.2 VFD station (separate machine "Fan on a VFD" reusing the motor model): ramps, 4–20 mA / 0–10 V / keypad reference, terminal or keypad control, OC/OV/STO/lost-reference/motor-OL, generic parameters, J·α + DC bus physics. The live 3D drive keypad moves to 3.3 (machine 3D scenes).
- [x] 2.3 Machines: FWD/REV, conveyor + photo-eyes + counting, tank + 4–20 mA + PID, pump lead/lag, data-center ATS + CRAH, flour batch mixer
- [x] 2.4 37 faults, each with symptom, meter readings, root cause, fix, safety note (test-enforced)
- [x] 2.5 Fault Hunt on every machine; difficulty filter; meter modes; evidence-based method scoring

## Phase 3 — Graphics → v0.8.0
- [x] 3.1 Shared renderer, scene manager, disposal; tiers by device test; leak test (20 open/close) **(audit: B-001 render only on change, pause off-screen)**
- [x] 3.2 Materials/lighting · [x] 3.3 3D scene per machine (engine-driven) · [x] 3.4 camera/press/pull-in/spark motion
- [x] 3.5 3D meter probes · [x] 3.6 3D wiring trainer · [x] 3.7 exploded overload, prox, I/O card, VFD · [x] 3.8 performance pass

## Phase 4 — Premium UI, 3D and motion → v0.9.0
- [x] 4.1 First paint (B-010): static shell with the real heading, route chunks preloaded, poster stills for every 3D view, fonts subset. LCP 2.7 s → 1.6 s on the key routes.
- [x] 4.2 Art direction + tokens: `docs/DESIGN-SYSTEM.md`, color/size/type/depth/motion tokens, token + AA contrast tests
- [ ] 4.3 3D visual upgrade. Done: material library (`src/three/materials.ts`), room reflections, baked contact shadows (`GroundShadow`), detailed shared parts, Reset/Front/Side/Above views, on-demand hardware viewer, exploded views drawn as real parts with labels, perf test on high + low tiers. **Second 3D review:** motor panel, VFD scene and PLC hardware viewer score 4 on every criterion; the other ten scenes score 3. **Still open (under 4):** fwdrev (starter cabinet reads as inside the trough), conveyor (no drive motor, rollers or product), pumps (flat wet well, pumps invisible under water), datacenter (blank rack fronts, plain generator and transformer), mixer (augers with no supports, loose load cells), wiring and meter (every device is the same slab; meter has no black lead or jacks), drive hardware view (blank keypad), exploded-view label overlap; PanelScene and the per-machine files still have inline materials; per-scene named views
- [ ] 4.4 Components: kit in `src/components/ui` and `#/styleguide` are done; lesson and safety callouts use `Callout`, Profile uses `Stat`, Review uses `EmptyState`. Still open: about 140 older call sites use the `.btn` / `.seg` / `.chip` classes directly (same CSS)
- [ ] 4.5 Motion. Done: CSS + View Transitions replace the animation library, lesson card → lesson and hardware card → viewer shared elements, sliding tab indicator, count-up stats on Profile. Still open: machine picker → workbench (the picker is a select today), haptics, level-up and badge moments
- [ ] 4.6 2D craft: schematics, meter face, wiring trainer redraw
- [ ] 4.7 States. Done: error boundary with friendly recovery and an offline "didn't download" notice (e2e blocks a chunk). Still open: designed empty states on every route (Review, Profile badges, search with no results)
- [ ] 4.8 Polish: grid screenshots, UI and 3D rubric reviews, PWA icons and splash **(audit: B-002 responsive icon sizes)**

## Phase 5 — Reference → v0.10.0
- 5.1 Brand comparisons (addressing, timers, online, forcing, backups) · 5.2 field devices in the hardware library **(audit: none today)** · 5.3 troubleshooting flowcharts · 5.4 cheat sheets · 5.5 "Day one at a new plant" · 5.6 VERIFY sweep

## Phase 6 — Finish → v1.0.0
- 6.1 Lighthouse 95+ on every main route **(audit: `#/sim` 44)** · 6.2 QA sweep · 6.3 tests + coverage in README · 6.4 docs/About · 6.5 business-site portfolio page · 6.6 release
