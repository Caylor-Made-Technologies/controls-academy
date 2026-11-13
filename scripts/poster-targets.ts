// Prints the 3D views that need a poster still, as JSON, for scripts/gen-posters.mjs.
import { MACHINES } from '../src/plant';
import { INSIDE } from '../src/content/inside';
import { EXERCISES } from '../src/lib/wiring';

const hunts = MACHINES.map((m) => ({ machine: m.id, hunt: m.create().faults[0]?.id })).filter((h) => h.hunt);
console.log(JSON.stringify({
  views: [
    { key: 'panel', route: 'sim' },
    ...MACHINES.filter((m) => m.id !== 'motor').map((m) => ({ key: `m:${m.id}`, route: `sim?m=${m.id}` })),
    ...EXERCISES.map((e) => ({ key: `wiring:${e.id}`, route: `wiring/${e.id}` })),
    ...INSIDE.map((d) => ({ key: `inside:${d.id}`, route: `reference/inside/${d.id}` })),
    ...hunts.map((h) => ({ key: `meter:${h.machine}`, route: `troubleshoot/${h.hunt}`, meter: true })),
  ],
}));
