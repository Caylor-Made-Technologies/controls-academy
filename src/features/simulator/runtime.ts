/**
 * Glue between the engine and the UI: owns a PLC + a plant scene, runs them on
 * requestAnimationFrame, and notifies React through a tiny subscribe/version API.
 */
import { Plc } from '../../engine/plc';
import type { Program } from '../../engine/types';
import { createMachine, type AnyScene } from '../../plant';
import type { FieldIO } from '../../plant/types';
import { sfx } from '../../lib/sound';

export type RunMode = 'run' | 'slow' | 'step';

/** Plant physics tick and scan period (ms). Real PLCs scan faster; 10 ms keeps phones cool. */
const TICK = 10;
const SLOW_SCAN_MS = 700;

export class SimRuntime {
  plc: Plc;
  scene: AnyScene;
  runMode: RunMode = 'run';
  private listeners = new Set<() => void>();
  private raf = 0;
  private last = 0;
  private acc = 0;
  private slowAcc = 0;
  version = 0;
  /** Count of scans completed while single-stepping (for the "scan walker" task). */
  stepScans = 0;
  private lastContactor = false;
  private lastFault = false;
  private visible = true;

  constructor(program?: Program, machine = 'motor') {
    this.scene = createMachine(machine);
    this.plc = new Plc(program ?? this.scene.program());
    this.plc.setMode('RUN');
    this.onVis = this.onVis.bind(this);
  }

  get io(): FieldIO {
    return { DI: this.plc.fieldDI, DO: this.plc.fieldDO, AI: this.plc.fieldAI, AO: this.plc.fieldAO };
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;

  notify() {
    this.version++;
    for (const l of this.listeners) l();
  }

  start() {
    if (this.raf) return;
    document.addEventListener('visibilitychange', this.onVis);
    this.last = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      if (!this.visible) return;
      const dt = Math.min(100, t - this.last);
      this.last = t;
      this.advance(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    document.removeEventListener('visibilitychange', this.onVis);
  }

  private onVis() {
    this.visible = document.visibilityState === 'visible';
    this.last = performance.now();
  }

  /** Advance real time by dt ms (also used by tests). */
  advance(dt: number) {
    this.acc += dt;
    let changed = false;
    while (this.acc >= TICK) {
      this.acc -= TICK;
      this.scene.step(TICK, this.io);
      if (this.runMode === 'run') {
        this.plc.scan(TICK);
      } else if (this.runMode === 'slow') {
        this.slowAcc += TICK;
        if (this.slowAcc >= SLOW_SCAN_MS) {
          this.slowAcc = 0;
          this.plc.scan(SLOW_SCAN_MS);
        }
      }
      changed = true;
    }
    if (changed) {
      this.sounds();
      this.notify();
    }
  }

  private sounds() {
    const s = this.scene.state;
    const snd = this.scene.sound;
    if (snd) {
      const c = snd.contactor(s);
      if (c !== this.lastContactor) {
        sfx.clunk();
        this.lastContactor = c;
      }
      sfx.hum(snd.hum(s));
    }
    const faulted = Boolean(this.plc.fieldDO[2]) || Boolean(this.plc.fault);
    if (faulted && !this.lastFault) sfx.horn();
    this.lastFault = faulted;
  }

  step() {
    const before = this.plc.pointer;
    const p = this.plc.step();
    if (before?.phase === 'housekeeping' && p === null) this.stepScans++;
    this.notify();
    return p;
  }

  setRunMode(m: RunMode) {
    if (m !== 'step' && this.plc.pointer) {
      // finish the half-stepped scan cleanly
      while (this.plc.pointer) this.plc.step();
    }
    this.runMode = m;
    this.notify();
  }

  load(program: Program) {
    const forces = this.plc.forces;
    this.plc.download(program);
    this.plc.forces = forces;
    this.plc.setMode('RUN');
    this.notify();
  }

  /** Online-edit style update: keep tag values that still exist, swap logic. */
  edit(program: Program) {
    const snap = this.plc.tags.snapshot();
    const mode = this.plc.mode;
    const forces = this.plc.forces;
    this.plc.download(program);
    this.plc.tags.restore(snap);
    this.plc.forces = forces;
    if (mode === 'RUN') this.plc.setMode('RUN');
    this.notify();
  }

  resetPlant() {
    this.scene.reset();
    this.notify();
  }

  dispose() {
    this.stop();
    sfx.hum(0);
    this.listeners.clear();
  }
}
