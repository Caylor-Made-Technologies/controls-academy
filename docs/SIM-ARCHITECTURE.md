# Simulator architecture

How the PLC engine, the machines and the screens fit together. Read this before adding a machine.

## The loop
- `SimRuntime` (`src/features/simulator/runtime.ts`) owns one `Plc` (the engine) and one machine (a
  `PlantScene`). It runs on `requestAnimationFrame` and advances in fixed **10 ms ticks**
  (`TICK`): each tick, the machine's physics `step(10, io)` runs, then one PLC scan (`plc.scan(10)`).
  Slow-mo scans every 700 ms; Step mode single-steps the scan pointer.
- A frame longer than 100 ms is clamped (a backgrounded tab doesn't "catch up" for minutes). Hidden tabs pause.
- React sees changes through `subscribe/getVersion` (`useSyncExternalStore`). The 3D view reads the engine
  inside its render loop instead, so 100 scans a second don't re-render React.

## The I/O image
`FieldIO = { DI: boolean[16], DO: boolean[16], AI: number[8], AO: number[8] }` — the field side of the cards.
- **Machines write DI and AI, and read DO and AO.** The PLC copies DI/AI into tags at the start of a scan and
  writes DO/AO at the end (forces are applied by the engine on both sides).
- Units: **AI in mA** (4–20 mA transmitters; 0 = broken wire), **AO in %** (0–100, e.g. valve position or a
  speed reference). Programs scale with `SCP` / `CPT`.

## Physics
- SI units inside every `step`: seconds, rad/s, N·m, kg·m², m, m³, m³/s, V, A, W, J.
- Shared, tested building blocks in `src/plant/kit.ts`: induction motor (torque–speed curve, current,
  plugging, coast, jam), Class-10-style thermal overload, first-order lags, 4–20 mA helpers, and
  `momentary()` pushbuttons that hold for at least 60 ms of simulated time (a tap between two ticks is never lost).
- Each machine's physics has unit tests against hand-worked values and sanity checks (no energy from nowhere,
  levels stay inside the tank, speed never exceeds what the drive commands without a fault).

## A machine (`PlantScene`, `src/plant/types.ts`)
| Part | What it is |
|---|---|
| `id`, `title`, `summary`, `site` | Identity; `site` is mill / datacenter / water / general |
| `program()` | The working ladder program that ships with it (Logix-style neutral text) |
| `devices` | The I/O map: each field device, its I/O point and a plain-English wiring note |
| `step(dtMs, io)` | Physics: read outputs, update inputs |
| `faults` + `setFault(id)` | Injectable faults. Each has symptom (`complaint`), `readings`, root `cause`, `howToFind`, `fix`, `safety` |
| `armFault?(id, plc)` | Faults that also need the controller (a force left installed) |
| `meterPoints(io)` | Where the Fault Hunt meter can measure, and what it reads. Every machine has `psu` (a known live source for live-dead-live) |
| `ui` | Declarative operator panel for the generic `MachinePanel`: momentary buttons, toggles, selectors, sliders, pilot lights, gauges, text, a live trend, machine-side actions. A control's `field` can be `tag:Name.Member` to read/write a PLC tag (setpoints, PID tuning); `settings: true` moves it into a collapsible settings box |
| `view3d?` | 3D hook. Today only the motor station (`'motor-panel'`); others render 2D until Phase 3.3 |
| `evidence` (per fault) | Meter points that prove the fault; Fault Hunt rewards measuring one before naming the culprit |
| `huntChoices?` | Extra "this is the problem" buttons (control fuse, a force, the program) |
| `sound?` | Hum level and contactor state for sound cues |
| `reset()` | Back to a clean, de-energized machine |

## Adding a machine
1. Create `src/plant/<id>.ts` exporting `create<Name>()` that returns a `PlantScene`. Use the kit.
2. Register it in `src/plant/index.ts` (`MACHINES`). It appears in the Simulator picker (`#/sim?m=<id>`) and
   in Fault Hunt automatically. Fault ids must be unique across all machines (test-enforced).
3. Add `tests/unit/<id>.test.ts`: the shipped program verifies clean and runs the machine; physics against
   hand-worked numbers; every fault produces its described symptom.
4. List any uncertain vendor detail with `// VERIFY` and in `docs/VERIFY.md`.

## Screens
- `Workbench` runs any machine (`machine` prop): the machine's `ui` panel (or the motor's own `MotorPanel`), the
  ladder editor, I/O cards and device sheets.
- `SimulatorPage` picks the machine from `?m=`; each machine keeps its own saved program (`sim-program:<id>`;
  the motor keeps the original `sim-program` key).
- `TroubleshootPage` lists every fault of every machine; a hunt loads that fault's machine.

## Machines today
| id | Machine | Site | Faults |
|---|---|---|---|
| motor | Motor start/stop station | general | 8 |
| fwdrev | Forward/reverse screw conveyor | mill | 4 |
| conveyor | Bag conveyor with photo-eyes | mill | 4 |
| tank | Tank level with PID | water | 4 |
| pumps | Lift station: pump lead/lag | water | 4 |
| datacenter | Data center: ATS + CRAH | data center | 4 |
| mixer | Flour batch mixer | mill | 4 |
| vfd | Fan on a VFD | data center | 5 |

## Fault Hunt scoring (`src/features/troubleshoot/scoring.ts`)
50 base + up to 50 for speed; +10 for measuring an evidence point before naming the culprit (−10 for naming it with no proof when proof was possible); −15 per wrong part blamed; −20 per force installed; −20 for ohms/continuity or amps-jacks on a live point; −5 for a wrong-but-harmless meter mode or not proving the meter first. Minimum 10.
