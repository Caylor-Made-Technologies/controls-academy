import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { OPS } from '../../engine/ops';
import { walk } from '../../engine/text';
import type { Elem, Instr, OpCode, Program, TagDecl, TimerValue, CounterValue } from '../../engine/types';
import { verifyProgram, crossReference, type Issue } from '../../engine/verify';
import { MOTOR_DEVICES } from '../../plant/motor';
import { SKINS, addressMap, skinsByMaker, type SkinId } from '../../skins';
import { PlatformBar, makerShort } from './PlatformBar';
import { usePrefs } from '../../state/prefs';
import { useProgress } from '../../state/progress';
import { buzz } from '../../lib/sound';
import {
  History, addParallel, addRung, duplicateRung, findElem, insert, move, newInstr, remove, setComment, updateInstr, type Sel,
} from './edit';
import { Ladder } from './Ladder';
import { MotorPanel } from './MotorPanel';
import { OperandSheet } from './OperandSheet';
import { SimRuntime, type RunMode } from './runtime';
import { hasWebGL, prefer3D } from '../../three/support';

const Panel3D = lazy(() => import('../../three/Panel3D'));

const QUICK: OpCode[] = ['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'EQU', 'GRT', 'LES', 'MOV', 'ADD', 'CPT'];

export function useRuntime(initial: Program): SimRuntime {
  const [rt] = useState(() => new SimRuntime(initial));
  useEffect(() => {
    rt.start();
    return () => rt.dispose();
  }, [rt]);
  useSyncExternalStore(rt.subscribe, rt.getVersion);
  return rt;
}

export interface WorkbenchProps {
  initial: Program;
  editable?: boolean;
  /** Called after every edit (autosave). */
  onProgramChange?: (p: Program) => void;
  /** Gets the runtime once created (tasks, fault hunt). */
  onRuntime?: (rt: SimRuntime) => void;
  /** Hide the machine (lessons that only need the ladder). */
  hidePanel?: boolean;
  /** Fault hunt: forces count as unsafe moves. */
  onUnsafe?: (what: string) => void;
  extraTools?: ReactNode;
  /** Device taps reported upward (fault hunt picks the culprit). */
  onDevicePick?: (id: string) => void;
  devicePickLabel?: string;
  /** Open in the 3D view when the device supports it. */
  start3D?: boolean;
}

export function Workbench({ initial, editable = true, onProgramChange, onRuntime, hidePanel, onUnsafe, extraTools, onDevicePick, devicePickLabel, start3D }: WorkbenchProps) {
  const rt = useRuntime(initial);
  const skinId = usePrefs((s) => s.skin);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const sawSkin = useProgress((s) => s.sawSkin);
  const skin = SKINS[skinId];
  const hist = useRef(new History<Program>(initial));
  const [program, setProgram] = useState<Program>(initial);
  const [sel, setSel] = useState<Sel | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [xref, setXref] = useState<string | null>(null);
  const [, bump] = useState(0);
  const quality = usePrefs((s) => s.quality);
  const [view3d, setView3d] = useState(() => Boolean(start3D) && prefer3D(quality));
  const can3d = useMemo(() => hasWebGL() && quality !== '2d', [quality]);
  useEffect(() => { if (!can3d) setView3d(false); }, [can3d]);

  useEffect(() => { onRuntime?.(rt); }, [rt, onRuntime]);
  useEffect(() => { sawSkin(skinId); }, [skinId, sawSkin]);

  const apply = useCallback((next: Program, record = true) => {
    if (record) hist.current.push(next);
    setProgram(next);
    rt.edit(next);
    onProgramChange?.(next);
  }, [rt, onProgramChange]);

  const undo = () => { const p = hist.current.undo(); setProgram(p); rt.edit(p); onProgramChange?.(p); bump((x) => x + 1); };
  const redo = () => { const p = hist.current.redo(); setProgram(p); rt.edit(p); onProgramChange?.(p); bump((x) => x + 1); };

  const routine = program.routines.find((r) => r.name === program.main)!;
  const selRung = sel ? routine.rungs.find((r) => r.id === sel.rungId) : undefined;
  const selElem: Elem | null = sel?.elemId && selRung ? findElem(selRung.elems, sel.elemId) : null;
  const selInstr: Instr | null = selElem?.kind === 'instr' ? selElem : null;

  const addOp = (op: OpCode) => {
    buzz(6);
    const ins = newInstr(op);
    let s = sel;
    let p = program;
    if (!s) {
      const r = addRung(program, undefined, []);
      p = r.program;
      s = { rungId: r.rungId };
    }
    apply(insert(p, s, ins));
    setSel({ rungId: s.rungId, elemId: ins.id });
    setEditOpen(true);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    if (e.ctrlKey || e.metaKey) return; // undo/redo handled by the window listener below
    if (!sel) return;
    const flat = selRung ? [...walk(selRung.elems)].filter((x) => x.kind === 'instr') : [];
    const i = flat.findIndex((x) => x.id === sel.elemId);
    const ri = routine.rungs.findIndex((r) => r.id === sel.rungId);
    const focusSel = (s: Sel) => {
      setSel(s);
      requestAnimationFrame(() => {
        const q = s.elemId ? `[data-elem="${s.elemId}"]` : null;
        (q ? document.querySelector<HTMLElement>(q) : null)?.focus();
      });
    };
    if (e.key === 'ArrowRight' && i < flat.length - 1) { e.preventDefault(); focusSel({ rungId: sel.rungId, elemId: flat[i + 1].id }); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); focusSel({ rungId: sel.rungId, elemId: flat[i - 1].id }); }
    else if (e.key === 'ArrowDown' && ri < routine.rungs.length - 1) { e.preventDefault(); const r = routine.rungs[ri + 1]; const f = [...walk(r.elems)][0]; focusSel({ rungId: r.id, elemId: f?.id }); }
    else if (e.key === 'ArrowUp' && ri > 0) { e.preventDefault(); const r = routine.rungs[ri - 1]; const f = [...walk(r.elems)][0]; focusSel({ rungId: r.id, elemId: f?.id }); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); apply(remove(program, sel)); setSel(sel.elemId ? { rungId: sel.rungId } : null); ladderRef.current?.focus(); }
    else if (e.key === 'Enter' && selInstr) { e.preventDefault(); setEditOpen(true); }
  };

  // Undo/redo work anywhere in the editor (not only while an instruction has focus).
  const keys = useRef({ undo, redo });
  keys.current = { undo, redo };
  useEffect(() => {
    if (!editable) return;
    const onWin = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) keys.current.redo(); else keys.current.undo(); }
      else if (k === 'y') { e.preventDefault(); keys.current.redo(); }
    };
    window.addEventListener('keydown', onWin);
    return () => window.removeEventListener('keydown', onWin);
  }, [editable]);
  const ladderRef = useRef<HTMLDivElement>(null);

  const verify = () => {
    const list = verifyProgram(program);
    setIssues(list);
  };

  const p = rt.plc;
  const pointerRung = p.pointer?.phase === 'logic' ? p.pointer.rung : null;
  const map = useMemo(() => addressMap(program, skin), [program, skin]);

  return (
    <div className="space-y-3">
      {!hidePanel && can3d && (
        <div className="flex items-center gap-2">
          <div className="seg" role="group" aria-label="Machine view">
            <button type="button" aria-pressed={!view3d} onClick={() => setView3d(false)}>2D</button>
            <button type="button" aria-pressed={view3d} onClick={() => setView3d(true)}>3D panel</button>
          </div>
          {view3d && <span className="text-xs text-muted">Live — synced to the logic below.</span>}
        </div>
      )}
      {!hidePanel && view3d && (
        <Suspense fallback={<div className="card skeleton h-[clamp(380px,68svh,560px)] lg:h-[540px]" role="status" aria-label="Loading 3D panel" aria-busy="true" />}>
          <Panel3D rt={rt} onDevice={(id) => setDevice(id)} />
        </Suspense>
      )}
      <div className={hidePanel ? '' : 'grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start'}>
        {!hidePanel && (
          <div className="lg:sticky lg:top-[72px]">
            <MotorPanel rt={rt} onDevice={(id) => setDevice(id)} compact={view3d} />
          </div>
        )}

        <section className="card overflow-hidden" aria-label="Controller and ladder logic">
          <div className="p-2 border-b border-line">
            <PlatformBar program={program} />
          </div>
          {/* Controller bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-line bg-raised">
            <div className="seg" role="group" aria-label="Scan speed">
              {(['run', 'slow', 'step'] as RunMode[]).map((m) => (
                <button key={m} type="button" aria-pressed={rt.runMode === m} onClick={() => { rt.setRunMode(m); buzz(5); }}>
                  {m === 'run' ? 'Run' : m === 'slow' ? 'Slow-mo' : 'Step'}
                </button>
              ))}
            </div>
            {rt.runMode === 'step' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { const before = rt.stepScans; rt.step(); if (rt.stepScans > before) useProgress.getState().markStepped(); buzz(5); }} disabled={p.mode !== 'RUN' || Boolean(p.fault)}>
                <Icon name="step" size={16} /> Step
              </button>
            )}
            <button
              type="button"
              className={`btn btn-sm ${p.mode === 'RUN' ? '' : 'btn-danger'}`}
              onClick={() => { p.setMode(p.mode === 'RUN' ? 'PROG' : 'RUN'); rt.notify(); }}
              aria-label={`Controller mode ${p.mode}. Switch to ${p.mode === 'RUN' ? 'PROG' : 'RUN'}`}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${p.mode === 'RUN' ? 'bg-live' : 'bg-alarm'}`} />
              {p.mode}
            </button>
            <label className="sr-only" htmlFor="skin-select">Brand skin</label>
            <select id="skin-select" className="input !min-h-[36px] !w-auto !py-0 text-sm max-w-[15rem]" value={skinId} onChange={(e) => setPrefs({ skin: e.target.value as SkinId, hwModel: '' })}>
              {skinsByMaker().map((g) => (
                <optgroup key={g.maker} label={g.maker}>
                  {g.skins.map((s) => <option key={s.id} value={s.id}>{makerShort(s.maker)} — {s.family}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="ml-auto text-[0.72rem] text-muted tabular-nums font-mono" aria-live="off">
              scan #{p.scanCount} · {(p.scanTimeUs / 1000).toFixed(2)} ms
            </span>
          </div>

          {rt.runMode === 'step' && (
            <div className="px-3 py-2 text-[0.8rem] border-b border-line bg-warn-soft" style={{ background: 'var(--warn-soft)' }} role="status">
              <strong className="text-heading">Scan pointer: </strong>
              {!p.pointer && 'ready — tap Step to read inputs.'}
              {p.pointer?.phase === 'input' && 'about to READ INPUTS into memory.'}
              {p.pointer?.phase === 'logic' && `about to SOLVE rung ${p.pointer.rung}.`}
              {p.pointer?.phase === 'output' && 'about to WRITE OUTPUTS to the field.'}
              {p.pointer?.phase === 'housekeeping' && 'HOUSEKEEPING, then the next scan.'}
              <span className="text-muted"> Each stepped scan counts as 10 ms for timers.</span>
            </div>
          )}

          {p.fault && (
            <div className="px-3 py-2.5 border-b border-line flex flex-wrap items-center gap-2" style={{ background: 'var(--alarm-soft)' }} role="alert">
              <Icon name="warn" className="text-alarm" />
              <span className="text-sm"><strong className="text-alarm">Major fault — controller stopped.</strong> {p.fault.message}</span>
              <button type="button" className="btn btn-sm ml-auto" onClick={() => { p.clearFault(); p.setMode('PROG'); rt.notify(); }}>Clear fault</button>
            </div>
          )}
          {p.minorFaults.length > 0 && !p.fault && (
            <div className="px-3 py-2 border-b border-line text-sm" style={{ background: 'var(--warn-soft)' }}>
              <strong className="text-warn">Minor fault:</strong> {p.minorFaults[0]} <button type="button" className="underline text-link" onClick={() => { p.minorFaults = []; rt.notify(); }}>Clear</button>
            </div>
          )}

          {/* Editor toolbar */}
          {editable && (
            <div className="p-2 border-b border-line space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Add instruction">
                {QUICK.map((op) => (
                  <button key={op} type="button" className="btn btn-sm !px-2.5 font-mono whitespace-nowrap" onClick={() => addOp(op)} title={OPS[op].title} aria-label={`Add ${OPS[op].title}`}>
                    {skin.mnemonic[op] && skin.mnemonic[op]!.length <= 7 ? skin.mnemonic[op] : op}
                  </button>
                ))}
                <button type="button" className="btn btn-sm whitespace-nowrap" onClick={() => setMoreOpen(true)}>More…</button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible [&>*]:flex-none" role="toolbar" aria-label="Edit">
                <button type="button" className="btn btn-sm" onClick={() => { const r = addRung(program, sel?.rungId); apply(r.program); setSel({ rungId: r.rungId }); }}><Icon name="plus" size={16} /> Rung</button>
                <button type="button" className="btn btn-sm" disabled={!selElem} onClick={() => { const ins = newInstr('XIC'); apply(addParallel(program, sel!, ins)); setSel({ rungId: sel!.rungId, elemId: ins.id }); setEditOpen(true); }} title="Add a parallel branch (OR)"><Icon name="branch" size={16} /> Branch</button>
                <button type="button" className="btn btn-sm" disabled={!selInstr} onClick={() => setEditOpen(true)}><Icon name="edit" size={16} /> Edit</button>
                <button type="button" className="btn btn-sm icon-btn !w-9 !h-9" disabled={!sel} onClick={() => apply(move(program, sel!, -1))} aria-label="Move left / up"><Icon name="left" size={16} /></button>
                <button type="button" className="btn btn-sm icon-btn !w-9 !h-9" disabled={!sel} onClick={() => apply(move(program, sel!, 1))} aria-label="Move right / down"><Icon name="right" size={16} /></button>
                <button type="button" className="btn btn-sm" disabled={!sel} onClick={() => { apply(remove(program, sel!)); setSel(sel?.elemId ? { rungId: sel.rungId } : null); }}><Icon name="trash" size={16} /> Delete</button>
                <button type="button" className="btn btn-sm" disabled={!sel} onClick={() => setCommentOpen(true)}>Comment</button>
                <button type="button" className="btn btn-sm" disabled={!sel} onClick={() => { const r = duplicateRung(program, sel!.rungId); apply(r.program); setSel({ rungId: r.rungId }); }}><Icon name="copy" size={16} /> Dup</button>
                <button type="button" className="btn btn-sm icon-btn !w-9 !h-9" disabled={!hist.current.canUndo} onClick={undo} aria-label="Undo"><Icon name="undo" size={16} /></button>
                <button type="button" className="btn btn-sm icon-btn !w-9 !h-9" disabled={!hist.current.canRedo} onClick={redo} aria-label="Redo"><Icon name="redo" size={16} /></button>
                <button type="button" className="btn btn-sm" onClick={verify}><Icon name="verify" size={16} /> Verify</button>
                {extraTools}
              </div>
            </div>
          )}

          <AnimatePresence>
            {issues && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-line overflow-hidden">
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-heading text-sm">{issues.length === 0 ? 'Verify: no problems found.' : `Verify: ${issues.filter((i) => i.level === 'error').length} errors, ${issues.filter((i) => i.level === 'warning').length} warnings`}</strong>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIssues(null)}>Close</button>
                  </div>
                  {issues.map((iss, k) => (
                    <button key={k} type="button" className="flex gap-2 items-start text-left text-sm w-full rounded-lg p-1.5 hover:bg-raised cursor-pointer" onClick={() => iss.rungId && setSel({ rungId: iss.rungId })}>
                      <Icon name={iss.level === 'error' ? 'x' : 'warn'} size={16} className={iss.level === 'error' ? 'text-alarm flex-none mt-0.5' : 'text-warn flex-none mt-0.5'} />
                      <span><span className="sr-only">{iss.level}: </span>{iss.message}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-2 sm:p-3 outline-none" ref={ladderRef} tabIndex={-1} onClick={() => setSel(null)}>
            <Ladder program={program} skin={skin} plc={p} version={rt.version} selected={sel} onSelect={(s) => { setSel(s); buzz(4); }} onKey={onKey} pointerRung={pointerRung} />
          </div>

          {selInstr && (
            <div className="px-3 pb-3 text-[0.8rem] text-muted">
              <strong className="text-heading">{selInstr.op}</strong> — {OPS[selInstr.op].summary}{' '}
              {selInstr.args[0] && /^[A-Za-z]/.test(selInstr.args[0]) && (
                <button type="button" className="underline text-link" onClick={() => setXref(selInstr.args[0].split(/[.[]/)[0])}>Cross-reference {selInstr.args[0].split(/[.[]/)[0]}</button>
              )}
            </div>
          )}
        </section>
      </div>

      <TagMonitor rt={rt} program={program} map={map} />

      <OperandSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        program={program}
        skin={skin}
        instr={selInstr}
        onSave={(op, args) => apply(updateInstr(program, sel!, { op, args }))}
        onAddTag={(t: TagDecl) => apply({ ...program, tags: [...program.tags, t] })}
      />

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="All instructions" wide>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(OPS).map((o) => (
            <button key={o.op} type="button" className="card-link card p-3 text-left cursor-pointer" onClick={() => { setMoreOpen(false); addOp(o.op); }}>
              <span className="font-mono font-bold text-heading">{o.op}</span>
              {skin.mnemonic[o.op] && <span className="text-muted text-sm"> · {skin.mnemonic[o.op]}</span>}
              <span className="block text-sm">{o.title}</span>
              <span className="block text-xs text-muted">{o.summary}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <CommentSheet open={commentOpen} onClose={() => setCommentOpen(false)} initial={selRung?.comment ?? ''} onSave={(c) => sel && apply(setComment(program, sel.rungId, c))} />

      <Sheet open={xref !== null} onClose={() => setXref(null)} title={`Cross-reference: ${xref}`}>
        {xref && (
          <ul className="space-y-1.5 p-0 m-0 list-none">
            {crossReference(program, xref).map((x, i) => (
              <li key={i} className="flex justify-between gap-3 rounded-lg bg-raised px-3 py-2 text-sm">
                <span>Rung {x.rungIndex} · <span className="font-mono">{x.op}</span></span>
                <span className={x.write ? 'text-warn font-semibold' : 'text-muted'}>{x.write ? 'writes' : 'reads'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted mt-3 mb-0">Real software has the same tool. Find what <em>writes</em> an output, then work backward.</p>
      </Sheet>

      <DeviceSheet rt={rt} id={device} onClose={() => setDevice(null)} onUnsafe={onUnsafe} onPick={onDevicePick} pickLabel={devicePickLabel} />
    </div>
  );
}

function CommentSheet({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: string; onSave: (c: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial, open]);
  return (
    <Sheet open={open} onClose={onClose} title="Rung comment">
      <textarea className="input !min-h-[110px] py-2" value={v} onChange={(e) => setV(e.target.value)} maxLength={300} aria-label="Rung comment" data-autofocus />
      <p className="text-xs text-muted">Good comments say <em>why</em>, not just what. The next tech will thank you.</p>
      <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { onSave(v); onClose(); }}>Save</button></div>
    </Sheet>
  );
}

function TagMonitor({ rt, program, map }: { rt: SimRuntime; program: Program; map: Map<string, { primary: string; secondary?: string; address: string }> }) {
  const [open, setOpen] = useState(false);
  const p = rt.plc;
  return (
    <details className="card" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer p-4 font-semibold text-heading min-h-[44px] flex items-center gap-2"><Icon name="layers" size={18} /> Tag monitor ({program.tags.length})</summary>
      {open && (
        <div className="px-3 pb-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-left text-muted text-xs"><th className="py-1.5 pr-3 font-semibold">Tag</th><th className="py-1.5 pr-3 font-semibold">Address</th><th className="py-1.5 pr-3 font-semibold">Type</th><th className="py-1.5 font-semibold">Value</th></tr></thead>
            <tbody>
              {program.tags.map((d) => {
                const v = p.tags.values.get(d.name);
                let shown: ReactNode = '';
                if (typeof v === 'boolean') {
                  const isInput = d.io?.kind === 'DI';
                  shown = (
                    <button type="button" className={`chip cursor-pointer ${v ? 'chip-live' : ''}`} disabled={isInput} title={isInput ? 'Inputs come from the field every scan' : 'Toggle (like a watch table)'} onClick={() => { p.tags.write(d.name, !v); rt.notify(); }}>
                      {v ? '1 · ON' : '0 · OFF'}
                    </button>
                  );
                } else if (typeof v === 'number') shown = <span className="font-mono">{Number.isInteger(v) ? v : v.toFixed(3)}</span>;
                else if (d.type === 'TIMER') { const t = v as TimerValue; shown = <span className="font-mono text-xs">ACC {t.ACC} / PRE {t.PRE} · EN {+t.EN} TT {+t.TT} DN {+t.DN}</span>; }
                else if (d.type === 'COUNTER') { const c = v as CounterValue; shown = <span className="font-mono text-xs">ACC {c.ACC} / PRE {c.PRE} · DN {+c.DN}</span>; }
                return (
                  <tr key={d.name} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3 font-mono text-heading">{d.name}{d.description && <span className="block font-body text-xs text-muted">{d.description}</span>}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{map.get(d.name)?.address}</td>
                    <td className="py-1.5 pr-3 text-xs">{d.type}</td>
                    <td className="py-1.5">{shown}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

function DeviceSheet({ rt, id, onClose, onUnsafe, onPick, pickLabel }: { rt: SimRuntime; id: string | null; onClose: () => void; onUnsafe?: (w: string) => void; onPick?: (id: string) => void; pickLabel?: string }) {
  const d = MOTOR_DEVICES.find((x) => x.id === id);
  const [confirm, setConfirm] = useState<boolean | null>(null);
  useEffect(() => setConfirm(null), [id]);
  if (!d) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const kind = d.io?.kind;
  const point = d.io?.point ?? 0;
  const table = kind === 'DI' || kind === 'DO' ? rt.plc.forces[kind] : null;
  const forced = table?.get(point);
  const doForce = (v: boolean | null) => {
    if (!table) return;
    if (v === null) table.delete(point);
    else {
      table.set(point, v);
      onUnsafe?.(`Forced ${kind === 'DI' ? 'input' : 'output'} ${point} ${v ? 'ON' : 'OFF'}`);
    }
    setConfirm(null);
    rt.notify();
  };
  return (
    <Sheet open={Boolean(id)} onClose={onClose} title={d.label}>
      <p className="mt-0">{d.wiring}</p>
      {kind && <p className="text-sm text-muted">Wired to <strong className="text-heading font-mono">{kind === 'DI' ? 'input' : 'output'} {point}</strong>. Right now: <strong className="text-heading">{(kind === 'DI' ? rt.io.DI[point] : rt.io.DO[point]) ? 'ON' : 'OFF'}</strong>{forced !== undefined && <span className="text-warn"> (forced {forced ? 'ON' : 'OFF'})</span>}.</p>}
      {onPick && (
        <button type="button" className="btn btn-primary w-full mb-3" onClick={() => { onPick(d.id); onClose(); }}>
          <Icon name="flag" size={18} /> {pickLabel ?? 'This is the problem'}
        </button>
      )}
      {table && (
        <div className="callout callout-gotcha space-y-2">
          <p className="m-0 text-sm"><strong className="text-heading">Forces</strong> override this point no matter what the field or logic says. On real equipment, forcing can start machinery. Know what moves and who is near it.</p>
          {confirm === null ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setConfirm(true)}>Force ON</button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirm(false)}>Force OFF</button>
              <button type="button" className="btn btn-sm" disabled={forced === undefined} onClick={() => doForce(null)}>Remove force</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="m-0 text-sm text-warn font-semibold">Confirm: is everyone clear and is this authorized? (In the sim, yes. On the job, ask.)</p>
              <div className="flex gap-2"><button type="button" className="btn btn-sm btn-danger" onClick={() => doForce(confirm)}>Yes, force {confirm ? 'ON' : 'OFF'}</button><button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Cancel</button></div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
