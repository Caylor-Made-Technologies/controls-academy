import { memo, type KeyboardEvent } from 'react';
import { OPS } from '../../engine/ops';
import type { Plc } from '../../engine/plc';
import type { Elem, Instr, Program, Rung, TimerValue, CounterValue } from '../../engine/types';
import { addressMap, displayRef, mnemonic, type AddressInfo, type Skin } from '../../skins';
import type { Sel } from './edit';

interface Props {
  program: Program;
  skin: Skin;
  plc?: Plc;
  /** Bumps on every scan so memoized children re-render. */
  version?: number;
  selected?: Sel | null;
  onSelect?: (s: Sel) => void;
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
  pointerRung?: number | null;
  compact?: boolean;
}

interface Ctx {
  p: Program;
  skin: Skin;
  map: Map<string, AddressInfo>;
  plc?: Plc;
  sel?: Sel | null;
  onSelect?: (s: Sel) => void;
  rungId: string;
}

export function Ladder({ program, skin, plc, version, selected, onSelect, onKey, pointerRung, compact }: Props) {
  const routine = program.routines.find((r) => r.name === program.main)!;
  const map = addressMap(program, skin);
  return (
    <div className="ladder" role="list" aria-label={`Ladder logic, ${routine.rungs.length} rungs, ${skin.brand} style`} onKeyDown={onKey} data-v={version}>
      {routine.rungs.map((r, i) => (
        <RungView key={r.id} rung={r} index={i} ctx={{ p: program, skin, map, plc, sel: selected, onSelect, rungId: r.id }} pointer={pointerRung === i} compact={compact} />
      ))}
      {routine.rungs.length === 0 && <p className="muted text-sm font-body p-4">No rungs yet. Add one with the + Rung button.</p>}
      <div className="flex items-center gap-2 mt-2 pl-8.5">
        <span className="font-body text-2xs text-muted">(End)</span>
      </div>
    </div>
  );
}

const RungView = memo(function RungView({ rung, index, ctx, pointer, compact }: { rung: Rung; index: number; ctx: Ctx; pointer: boolean; compact?: boolean }) {
  const live = ctx.plc ? Boolean(ctx.plc.rungTrue.get(rung.id)) && ctx.plc.mode === 'RUN' : false;
  const selected = ctx.sel?.rungId === rung.id && !ctx.sel.elemId;
  return (
    <div className="rung" role="listitem" data-live={live} data-selected={selected} data-pointer={pointer} aria-label={`Rung ${index}${live ? ', true' : ', false'}${pointer ? ', scan pointer here' : ''}`}>
      <button
        type="button"
        className="rung-num !border-0 bg-transparent cursor-pointer"
        style={{ borderRight: `3px solid ${live ? 'var(--live)' : 'var(--dead)'}` }}
        onClick={(e) => { e.stopPropagation(); ctx.onSelect?.({ rungId: rung.id }); }}
        aria-label={`Select rung ${index}`}
        aria-pressed={selected}
      >
        {index}
      </button>
      <div className="rung-body">
        <Series elems={rung.elems} ctx={ctx} rungIn={ctx.plc ? ctx.plc.mode === 'RUN' : false} last />
      </div>
      {rung.comment && !compact && <p className="rung-comment m-0">{rung.comment}</p>}
    </div>
  );
});

function Series({ elems, ctx, rungIn, last }: { elems: Elem[]; ctx: Ctx; rungIn: boolean; last?: boolean }) {
  let power = rungIn;
  const parts = elems.map((e) => {
    const inPower = power;
    const t = ctx.plc?.trace.get(e.id);
    if (t) power = t.out;
    return (
      <div key={e.id} className="flex items-center">
        <span className="wire" data-live={inPower && Boolean(ctx.plc)} />
        {e.kind === 'branch' ? <BranchView b={e} ctx={ctx} power={inPower} /> : <InstrView ins={e} ctx={ctx} />}
      </div>
    );
  });
  return (
    <div className="series">
      {parts}
      <span className="series-fill" data-live={power && Boolean(ctx.plc)} />
      {last && <span className="rung-end" />}
    </div>
  );
}

function BranchView({ b, ctx, power }: { b: Extract<Elem, { kind: 'branch' }>; ctx: Ctx; power: boolean }) {
  const t = ctx.plc?.trace.get(b.id);
  const selected = ctx.sel?.elemId === b.id;
  return (
    <div className="branch" data-in={power && Boolean(ctx.plc)} data-out={Boolean(t?.out)} style={selected ? { outline: '2px solid var(--select)', borderRadius: 10 } : undefined}>
      {b.legs.map((leg, i) => {
        let legOut = power;
        for (const e of leg) {
          const tt = ctx.plc?.trace.get(e.id);
          if (tt) legOut = tt.out;
        }
        return (
          <div className="leg" key={i} data-in={power && Boolean(ctx.plc)} data-out={legOut && Boolean(ctx.plc)}>
            <Series elems={leg} ctx={ctx} rungIn={power} />
          </div>
        );
      })}
    </div>
  );
}

function isBitOp(op: string) {
  return ['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS', 'AFI', 'NOP'].includes(op);
}

function InstrView({ ins, ctx }: { ins: Instr; ctx: Ctx }) {
  const t = ctx.plc?.trace.get(ins.id);
  const plc = ctx.plc;
  const spec = OPS[ins.op];
  const selected = ctx.sel?.elemId === ins.id;
  const name = mnemonic(ins.op, ctx.skin);
  let cond = false;
  let stateLabel = '';
  let forced = false;
  if (plc && isBitOp(ins.op) && ins.args[0]) {
    try {
      const v = plc.tags.readBool(ins.args[0]);
      stateLabel = v ? '1' : '0';
      const decl = plc.tags.decls.get(ins.args[0]);
      if (decl?.io && (decl.io.kind === 'DI' || decl.io.kind === 'DO')) forced = plc.forces[decl.io.kind].has(decl.io.point);
      cond = ins.op === 'XIC' ? v : ins.op === 'XIO' ? !v : ['OTE', 'OTL', 'OTU'].includes(ins.op) ? v : Boolean(t?.cond);
    } catch {
      stateLabel = '?';
    }
  } else if (t) cond = spec.role === 'input' ? t.cond : t.in;

  const label = ins.args[0] ? displayRef(ins.args[0], ctx.p, ctx.skin, ctx.map) : '?';
  const base = ins.args[0]?.split(/[.[]/)[0];
  const secondary = base ? ctx.map.get(base)?.secondary : undefined;
  const aria = `${spec.title} ${name !== ins.op ? `(${name}) ` : ''}${ins.args.join(', ') || 'no operand'}${plc ? (cond ? ', true' : ', false') : ''}${forced ? ', forced' : ''}`;

  return (
    <button
      type="button"
      className="instr"
      data-cond={cond && Boolean(plc)}
      data-selected={selected}
      data-forced={forced}
      data-elem={ins.id}
      aria-label={aria}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect?.({ rungId: ctx.rungId, elemId: ins.id });
      }}
    >
      {isBitOp(ins.op) ? (
        <>
          <span className="tagname" title={ins.args[0]}>{ins.op === 'AFI' || ins.op === 'NOP' ? ins.op : label}</span>
          <BitSymbol op={ins.op} />
          <span className="addr">{secondary ?? (name !== ins.op ? name : '')}</span>
          {plc && stateLabel && <span className="state" aria-hidden="true">{stateLabel}</span>}
        </>
      ) : (
        <BoxInstr ins={ins} ctx={ctx} name={name} />
      )}
    </button>
  );
}

function BitSymbol({ op }: { op: string }) {
  const coil = ['OTE', 'OTL', 'OTU'].includes(op);
  return (
    <svg className="sym" viewBox="0 0 76 26" width="76" height="26" aria-hidden="true">
      {coil ? (
        <>
          <path className="s" d="M0 13 H24 M52 13 H76" />
          <path className="fill" d="M30 3 Q20 13 30 23 H46 Q56 13 46 3 Z" />
          <path className="s" d="M30 3 Q20 13 30 23 M46 3 Q56 13 46 23" />
          {op !== 'OTE' && (
            <text x="38" y="17.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor">{op === 'OTL' ? 'L' : 'U'}</text>
          )}
        </>
      ) : (
        <>
          <path className="s" d="M0 13 H29 M47 13 H76" />
          <rect className="fill" x="30" y="2" width="16" height="22" />
          <path className="s" d="M30 2 V24 M46 2 V24" />
          {op === 'XIO' && <path className="s" d="M28 23 L48 3" />}
          {op === 'ONS' && <text x="38" y="17" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="currentColor">ONS</text>}
          {op === 'AFI' && <path className="s" d="M33 6 L43 20 M43 6 L33 20" />}
        </>
      )}
    </svg>
  );
}

function fmt(n: number | boolean): string {
  if (typeof n === 'boolean') return n ? '1' : '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function BoxInstr({ ins, ctx, name }: { ins: Instr; ctx: Ctx; name: string }) {
  const plc = ctx.plc;
  const spec = OPS[ins.op];
  const val = (ref: string): string => {
    if (!plc || !ref) return '';
    try {
      return fmt(plc.tags.read(ref));
    } catch {
      return '';
    }
  };
  if ((ins.op === 'TON' || ins.op === 'TOF' || ins.op === 'RTO') && ins.args[0]) {
    let tm: TimerValue | undefined;
    try { tm = plc?.tags.struct<TimerValue>(ins.args[0], 'TIMER'); } catch { tm = undefined; }
    const decl = ctx.p.tags.find((d) => d.name === ins.args[0]);
    const pre = tm?.PRE ?? Number(decl?.initial ?? 0);
    const m = ctx.skin.members;
    return (
      <span className="box-instr" aria-hidden="true">
        <span className="box-title block">{name}</span>
        <span className="block">{displayRef(ins.args[0], ctx.p, ctx.skin, ctx.map)}</span>
        <span className="block text-muted">{ctx.skin.timerPreset(pre)}</span>
        {tm && <span className="block">{m.ACC ?? 'ACC'}: {(tm.ACC / 1000).toFixed(2)} s</span>}
        {tm && (
          <span className="box-bits">
            <span className="bit" data-on={tm.EN}>{m.EN ?? 'EN'}</span>
            {!m.DN && <span className="bit" data-on={tm.TT}>TT</span>}
            <span className="bit" data-on={tm.DN}>{m.DN ?? 'DN'}</span>
          </span>
        )}
      </span>
    );
  }
  if ((ins.op === 'CTU' || ins.op === 'CTD') && ins.args[0]) {
    let c: CounterValue | undefined;
    try { c = plc?.tags.struct<CounterValue>(ins.args[0], 'COUNTER'); } catch { c = undefined; }
    const decl = ctx.p.tags.find((d) => d.name === ins.args[0]);
    return (
      <span className="box-instr" aria-hidden="true">
        <span className="box-title block">{name}</span>
        <span className="block">{displayRef(ins.args[0], ctx.p, ctx.skin, ctx.map)}</span>
        <span className="block text-muted">Preset {c?.PRE ?? decl?.initial ?? 0}</span>
        {c && <span className="block">Accum {c.ACC}</span>}
        {c && (
          <span className="box-bits">
            <span className="bit" data-on={ins.op === 'CTU' ? c.CU : c.CD}>{ins.op === 'CTU' ? 'CU' : 'CD'}</span>
            <span className="bit" data-on={c.DN}>DN</span>
            {c.OV && <span className="bit" data-on>OV</span>}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="box-instr" aria-hidden="true">
      <span className="box-title block">{name}</span>
      {spec.args.map((a, i) => (
        <span key={i} className="block whitespace-nowrap">
          <span className="text-muted">{a.name}: </span>
          {ins.args[i] ? (a.kind === 'expr' || a.kind === 'routine' ? ins.args[i] : displayRef(ins.args[i], ctx.p, ctx.skin, ctx.map)) : '?'}
          {plc && ins.args[i] && !['expr', 'routine', 'array', 'pid', 'struct'].includes(a.kind) && /[A-Za-z]/.test(ins.args[i]) ? <span className="text-live"> = {val(ins.args[i])}</span> : null}
        </span>
      ))}
    </span>
  );
}
