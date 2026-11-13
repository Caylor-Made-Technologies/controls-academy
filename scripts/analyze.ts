/** Opt-in build report: `ANALYZE=1 npm run build` lists what is inside the entry chunk and the big shared chunks. */
import type { Plugin } from 'vite';

export function analyze(): Plugin {
  return {
    name: 'analyze',
    apply: () => Boolean(process.env.ANALYZE),
    generateBundle(_, bundle) {
      for (const c of Object.values(bundle)) {
        if (c.type !== 'chunk' || (!c.isEntry && c.code.length < 60_000)) continue;
        const groups = new Map<string, number>();
        for (const [id, m] of Object.entries(c.modules)) {
          const rel = id.replace(/.*\/node_modules\//, 'nm/').replace(/.*\/controls-academy\//, '');
          const g = rel.startsWith('nm/') ? rel.split('/').slice(0, rel.startsWith('nm/@') ? 3 : 2).join('/') : rel;
          groups.set(g, (groups.get(g) ?? 0) + m.renderedLength);
        }
        console.log(`\n== ${c.fileName}${c.isEntry ? ' (entry)' : ''}`);
        for (const [g, n] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`${String(Math.round(n / 1024)).padStart(5)} KB  ${g}`);
      }
    },
  };
}
