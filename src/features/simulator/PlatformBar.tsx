import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { Sheet } from '../../components/Sheet';
import type { Program } from '../../engine/types';
import { SKINS, addressMap, mnemonic, skinsByMaker, type SkinId } from '../../skins';
import { usePrefs } from '../../state/prefs';

/** Short manufacturer name for chips ("Allen-Bradley (Rockwell Automation)" → "Allen-Bradley"). */
export function makerShort(maker: string): string {
  return maker.replace(/\s*\(.*\)$/, '');
}

/**
 * Says exactly which PLC platform the simulator is speaking right now, with live examples
 * from the loaded program. Tap to switch; the picker is grouped by manufacturer.
 */
export function PlatformBar({ program }: { program: Program }) {
  const skinId = usePrefs((s) => s.skin);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const [open, setOpen] = useState(false);
  const skin = SKINS[skinId];
  const groups = useMemo(() => skinsByMaker(), []);
  const map = useMemo(() => addressMap(program, skin), [program, skin]);
  const firstIn = program.tags.find((t) => t.io?.kind === 'DI');
  const firstOut = program.tags.find((t) => t.io?.kind === 'DO');
  const timer = program.tags.find((t) => t.type === 'TIMER');

  const examples: [string, string][] = [];
  if (firstIn) examples.push([firstIn.name, map.get(firstIn.name)?.address ?? '']);
  if (firstOut) examples.push([firstOut.name, map.get(firstOut.name)?.address ?? '']);
  if (timer) examples.push(['5 s timer', skin.timerPreset(5000)]);

  return (
    <>
      <button
        type="button"
        className="platform-bar w-full text-left"
        onClick={() => setOpen(true)}
        aria-label={`PLC platform: ${skin.brand}, ${skin.family}, ${skin.style}. Tap to change.`}
      >
        <span className="platform-maker">{makerShort(skin.maker)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-head font-extrabold text-heading text-[0.98rem] leading-tight">{skin.family}</span>
          <span className="block text-[0.74rem] text-muted leading-snug">{skin.style}</span>
          <span className="flex flex-wrap gap-1.5 mt-1.5">
            {examples.map(([tag, addr]) => (
              <span key={tag} className="platform-ex" title={`${tag} → ${addr}`}>
                <span className="text-muted">{tag}</span> <Icon name="right" size={11} className="inline -mt-0.5" /> <span className="font-mono text-heading">{addr}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="chip chip-blue flex-none !min-h-[32px] self-start"><Icon name="layers" size={14} /><span className="hidden sm:inline">Change</span></span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Which PLC are you working on?" wide>
        <p className="text-sm text-muted mt-0 mb-4">Same logic, different dialect. Pick the platform you see at work — addresses, instruction names and timer units change to match. Brand names describe conventions only.</p>
        <div className="space-y-4" role="radiogroup" aria-label="PLC platform">
          {groups.map((g) => (
            <section key={g.maker}>
              <h3 className="text-[0.72rem] font-bold tracking-[0.14em] uppercase text-muted mb-2">{g.maker}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.skins.map((sk) => {
                  const m = addressMap(program, sk);
                  const on = sk.id === skinId;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className="card card-link p-3 text-left cursor-pointer"
                      style={on ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}
                      onClick={() => { setPrefs({ skin: sk.id as SkinId, hwModel: '' }); setOpen(false); }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block font-bold text-heading text-sm">{sk.family}</span>
                          <span className="block text-xs text-muted">{sk.style}</span>
                        </span>
                        {on && <Icon name="check" size={18} className="text-glow flex-none" />}
                      </span>
                      <span className="flex flex-wrap gap-1 mt-2">
                        {firstIn && <span className="platform-ex"><span className="font-mono text-heading">{m.get(firstIn.name)?.address}</span></span>}
                        {firstOut && <span className="platform-ex"><span className="font-mono text-heading">{m.get(firstOut.name)?.address}</span></span>}
                        <span className="platform-ex"><span className="font-mono text-heading">{mnemonic('XIC', sk)}</span></span>
                        <span className="platform-ex"><span className="text-muted">5 s:</span> <span className="font-mono text-heading">{sk.timerPreset(5000)}</span></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="callout callout-brand mt-4 text-sm">
          <strong className="text-heading">{skin.brand}: </strong><Rich text={skin.notes[0]} />
        </div>
      </Sheet>
    </>
  );
}
