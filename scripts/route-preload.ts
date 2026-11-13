/**
 * Vite plugin: start downloading the current route's code at the same time as the main bundle.
 *
 * The app is one HTML file with hash routes, so the server can't know which screen is being opened. A tiny
 * inline script reads the hash and adds <link rel="modulepreload"> for that route's chunks (found from
 * src/routes.json → page component → built chunk + its static imports). Without it the route chunk is only
 * requested after the main bundle has downloaded and run, which is what pushed LCP past budget (B-010).
 * The script's SHA-256 is added to the page's Content-Security-Policy, so inline scripts stay blocked.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { ROUTE_HEADS } from '../src/content/heads';

interface Chunk { type: 'chunk'; fileName: string; isEntry: boolean; facadeModuleId: string | null; moduleIds: string[]; imports: string[]; dynamicImports: string[] }

export function routePreload(): Plugin {
  let base = '/';
  return {
    name: 'route-preload',
    apply: 'build',
    configResolved(c) { base = c.base; },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const routes = JSON.parse(readFileSync(new URL('../src/routes.json', import.meta.url), 'utf8')) as Record<string, { page: string }>;
        const chunks = Object.values(ctx.bundle).filter((c): c is never => c.type === 'chunk') as unknown as Chunk[];
        const byFile = new Map(chunks.map((c) => [c.fileName, c]));
        const entry = chunks.find((c) => c.isEntry);
        // Everything the entry already pulls in statically is loaded anyway.
        const loaded = new Set<string>();
        const walk = (f: string, into: Set<string>) => { if (into.has(f)) return; into.add(f); for (const i of byFile.get(f)?.imports ?? []) walk(i, into); };
        if (entry) walk(entry.fileName, loaded);
        const pageChunk = (page: string): Chunk => {
          const c = chunks.find((x) => x.facadeModuleId?.endsWith(`/${page}.tsx`)) ?? chunks.find((x) => x.moduleIds.some((m) => m.endsWith(`/${page}.tsx`)));
          if (!c) throw new Error(`route-preload: no chunk found for page "${page}"`);
          return c;
        };
        const closure = (f: string): string[] => { const need = new Set<string>(); walk(f, need); return [...need].filter((x) => !loaded.has(x)); };
        const is3D = (files: string[]) => files.some((f) => byFile.get(f)?.moduleIds.some((m) => /node_modules\/three\//.test(m)));
        // [needed to paint the page, wanted right after]. The second list is the page's own lazy parts (the
        // workbench), fetched at low priority; anything that pulls in the 3D engine is left to load on demand.
        const filesFor = (page: string): [string[], string[]] => {
          const c = pageChunk(page);
          const first = closure(c.fileName);
          const later = new Set<string>();
          for (const d of c.dynamicImports) { const files = closure(d); if (!is3D(files)) for (const f of files) if (!first.includes(f)) later.add(f); }
          return [first, [...later]];
        };
        const map: Record<string, [string[], string[]]> = {};
        for (const [seg, r] of Object.entries(routes)) map[seg] = filesFor(r.page);
        const first = filesFor('Onboarding')[0];
        // Static shell: the header bar and (for top-level screens) the page heading, painted straight from the
        // HTML. The markup mirrors App.tsx's pre-hydration shell and PageHead; an e2e test compares them.
        const heads = Object.fromEntries(Object.entries(ROUTE_HEADS).map(([k, h]) => [k, [h.eyebrow, h.title, h.body ?? '', ...(h.back ?? [])]]));
        const shell = `<div class="with-rail" aria-busy="true"><header class="app-header lg:hidden" data-scrolled="false"><div class="app-header-inner"><a href="#/learn" class="flex items-center gap-2.5 no-underline min-w-0"><img src="${base}favicon.svg" width="32" height="32" alt="" class="rounded-[22%]"><span class="flex flex-col leading-none"><span class="font-head font-extrabold tracking-tight text-heading text-base">Controls <span class="grad-text">Academy</span></span></span></a></div></header><main class="page"><div id="shell-head"></div></main></div>`;
        const js = `(function(){var m=${JSON.stringify(map)},o=${JSON.stringify(first)},H=${JSON.stringify(heads)},d=document,q=location.hash.replace(/^#\\/?/,"").split("?")[0].split("/"),s=q[0]||"learn",r=m[s]||m.learn,a=r[0].slice(),c="";try{c=localStorage.getItem("ca:prefs")||"";var t=/"theme":"(light|dark)"/.exec(c);if(t)d.documentElement.dataset.theme=t[1];if(!/"onboarded":true/.test(c))a=a.concat(o)}catch(e){}function p(l,low){for(var i=0;i<l.length;i++){var e=d.createElement("link");e.rel="modulepreload";if(low)e.fetchPriority="low";e.href=${JSON.stringify(base)}+l[i];d.head.appendChild(e)}}p(a);p(r[1],1);var h=H[s],x=function(v){return v.replace(/&/g,"&amp;").replace(/</g,"&lt;")};if(h&&q.length<2){d.getElementById("shell-head").innerHTML=(h[3]?'<a href="#/'+h[4]+'" class="btn btn-ghost btn-sm -ml-2 mb-2"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg> '+x(h[3])+"</a>":"")+'<header class="page-head"><p class="eyebrow m-0 mb-1.5">'+x(h[0])+'</p><h1 class="text-2xl sm:text-3xl font-extrabold">'+x(h[1])+"</h1>"+(h[2]?'<div class="mt-2 text-muted max-w-[60ch]">'+x(h[2])+"</div>":"")+"</header>"}})();`;
        const hash = createHash('sha256').update(js).digest('base64');
        if (!/script-src 'self'/.test(html)) throw new Error('route-preload: could not find script-src in the CSP meta tag');
        if (!html.includes('<div id="root"></div>')) throw new Error('route-preload: could not find the empty #root in index.html');
        return html
          .replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`)
          .replace('<div id="root"></div>', `<div id="root">${shell}</div>\n    <script>${js}</script>`);
      },
    },
  };
}
