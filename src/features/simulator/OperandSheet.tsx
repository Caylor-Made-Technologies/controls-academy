import { useEffect, useId, useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { OPS, OP_LIST, type ArgKind } from '../../engine/ops';
import { TagStore, structMembers } from '../../engine/tags';
import type { DataType, Instr, OpCode, Program, TagDecl } from '../../engine/types';
import { addressMap, displayRef, mnemonic, type Skin } from '../../skins';

const KIND_TYPES: Partial<Record<ArgKind, DataType[]>> = {
  timer: ['TIMER'], counter: ['COUNTER'], struct: ['TIMER', 'COUNTER'], pid: ['PID'], storage: ['BOOL'],
};

/** Suggestions for an operand of a given kind. */
export function suggestions(p: Program, kind: ArgKind): string[] {
  const out: string[] = [];
  for (const d of p.tags) {
    const want = KIND_TYPES[kind];
    if (want) {
      if (want.includes(d.type)) out.push(d.name);
      continue;
    }
    if (kind === 'array') { if (d.dim) out.push(d.name); continue; }
    if (kind === 'routine' || kind === 'expr') continue;
    if (d.type === 'BOOL' && !d.dim) out.push(d.name);
    else if (['TIMER', 'COUNTER'].includes(d.type)) {
      for (const m of structMembers(d.type)) {
        const isBit = !['PRE', 'ACC'].includes(m);
        if ((kind === 'bool' && isBit) || (kind !== 'bool' && !isBit) || kind === 'dest') out.push(`${d.name}.${m}`);
      }
    } else if (['INT', 'DINT', 'REAL'].includes(d.type) && kind !== 'bool' && !d.dim) out.push(d.name);
  }
  if (kind === 'routine') return p.routines.map((r) => r.name).filter((n) => n !== p.main);
  return out;
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;

export function OperandSheet({
  open, onClose, program, skin, instr, onSave, onAddTag,
}: {
  open: boolean;
  onClose: () => void;
  program: Program;
  skin: Skin;
  instr: Instr | null;
  onSave: (op: OpCode, args: string[]) => void;
  onAddTag: (t: TagDecl) => void;
}) {
  const [op, setOp] = useState<OpCode>('XIC');
  const [args, setArgs] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DataType>('BOOL');
  const [newPre, setNewPre] = useState('5000');
  const listId = useId();
  useEffect(() => {
    if (instr && open) {
      setOp(instr.op);
      setArgs([...instr.args]);
    }
  }, [instr, open]);
  const spec = OPS[op];
  const store = useMemo(() => new TagStore(program.tags), [program.tags]);
  const map = useMemo(() => addressMap(program, skin), [program, skin]);
  if (!instr) return null;

  const fixedArgs = spec.args.map((_, i) => args[i] ?? '');
  const problems = spec.args.map((a, i) => {
    const v = fixedArgs[i].trim();
    if (!v) return 'Required';
    if (a.kind === 'routine') return program.routines.some((r) => r.name === v) ? '' : 'No routine with that name';
    if (a.kind === 'expr') return '';
    if (!store.isValidRef(v)) return 'Not a tag in this program (or a number). Create it below.';
    const want = KIND_TYPES[a.kind];
    if (want && !want.includes(store.decls.get(v.split(/[.[]/)[0])?.type ?? 'BOOL')) return `Needs a ${want.join(' or ')} tag`;
    return '';
  });
  const ok = problems.every((p) => !p);

  const createTag = () => {
    if (!NAME.test(newName) || store.has(newName)) return;
    onAddTag({ name: newName, type: newType, initial: ['TIMER', 'COUNTER'].includes(newType) ? Number(newPre) || 0 : undefined });
    const firstEmpty = fixedArgs.findIndex((a) => !a);
    const i = firstEmpty < 0 ? 0 : firstEmpty;
    const next = [...fixedArgs];
    next[i] = newName;
    setArgs(next);
    setNewName('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit instruction">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) {
            onSave(op, fixedArgs.map((a) => a.trim()));
            onClose();
          }
        }}
      >
        <label className="block">
          <span className="text-sm font-semibold text-heading">Instruction</span>
          <select className="input mt-1" value={op} onChange={(e) => { const o = e.target.value as OpCode; setOp(o); if (OPS[o].args.length !== spec.args.length) setArgs([]); }} data-autofocus>
            {OP_LIST.map((o) => (
              <option key={o.op} value={o.op}>{o.op} — {o.title}{mnemonic(o.op, skin) !== o.op ? ` (${mnemonic(o.op, skin)})` : ''}</option>
            ))}
          </select>
          <span className="block text-sm text-muted mt-1">{spec.summary}</span>
        </label>

        <datalist id={listId}>{suggestions(program, 'bool').concat(suggestions(program, 'num')).map((s) => <option key={s} value={s} />)}</datalist>
        {spec.args.map((a, i) => {
          const sugg = suggestions(program, a.kind);
          const v = fixedArgs[i];
          return (
            <div key={i}>
              <label className="block">
                <span className="text-sm font-semibold text-heading">{a.name}</span>
                <input
                  className="input mt-1 font-mono"
                  value={v}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  list={a.kind === 'expr' ? undefined : listId}
                  onChange={(e) => { const next = [...fixedArgs]; next[i] = e.target.value; setArgs(next); }}
                  aria-invalid={Boolean(problems[i])}
                  aria-describedby={`${listId}-${i}`}
                  placeholder={a.kind === 'expr' ? '(Raw - 4000) * 0.0125' : a.kind === 'num' ? 'Tag or number' : 'Tag name'}
                />
              </label>
              <p id={`${listId}-${i}`} className={`text-xs mt-1 mb-1 ${problems[i] ? 'text-warn' : 'text-muted'}`}>
                {problems[i] || (v && store.isValidRef(v) && !/^[-\d.]/.test(v) ? `${skin.brand}: ${displayRef(v, program, skin, map)}${map.get(v.split(/[.[]/)[0])?.secondary ? ` · ${map.get(v.split(/[.[]/)[0])?.secondary}` : ''}` : ' ')}
              </p>
              {sugg.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label={`Suggestions for ${a.name}`}>
                  {sugg.slice(0, 24).map((s) => (
                    <button type="button" key={s} className="chip whitespace-nowrap cursor-pointer !min-h-[36px]" aria-pressed={v === s} onClick={() => { const next = [...fixedArgs]; next[i] = s; setArgs(next); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer font-semibold text-heading min-h-[28px]">Create a new tag</summary>
          <div className="grid gap-2 mt-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
            <label className="block"><span className="text-xs text-muted">Name</span><input className="input font-mono" value={newName} onChange={(e) => setNewName(e.target.value.replace(/\s/g, '_'))} placeholder="Pump1_Run" /></label>
            <label className="block"><span className="text-xs text-muted">Type</span>
              <select className="input" value={newType} onChange={(e) => setNewType(e.target.value as DataType)}>
                {(['BOOL', 'INT', 'DINT', 'REAL', 'TIMER', 'COUNTER'] as DataType[]).map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            {['TIMER', 'COUNTER'].includes(newType) && (
              <label className="block"><span className="text-xs text-muted">{newType === 'TIMER' ? 'Preset (ms)' : 'Preset'}</span><input className="input w-28" inputMode="numeric" value={newPre} onChange={(e) => setNewPre(e.target.value.replace(/[^\d]/g, ''))} /></label>
            )}
            <button type="button" className="btn" onClick={createTag} disabled={!NAME.test(newName) || store.has(newName)}>Add tag</button>
          </div>
          {newName && !NAME.test(newName) && <p className="text-xs text-warn mt-2 mb-0">Start with a letter; letters, numbers and _ only.</p>}
          {store.has(newName) && <p className="text-xs text-warn mt-2 mb-0">That tag already exists.</p>}
        </details>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!ok}>Save</button>
        </div>
      </form>
    </Sheet>
  );
}
