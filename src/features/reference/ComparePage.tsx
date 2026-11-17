import { useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Rich } from '../../components/RichText';
import { Button, Callout, Chip } from '../../components/ui';
import { PLATFORMS, PLATFORM_BY_ID, TOPICS, type TopicId } from '../../content/compare';
import { href, queryParam } from '../../lib/router';

const MAX = 3;
const DEFAULT = ['logix', 'siemens', 'iec'];

/** Which platforms to show: from ?p=logix,siemens (shareable), else the default trio. */
function initialPick(): string[] {
  const q = (queryParam('p') ?? '').split(',').filter((id) => PLATFORM_BY_ID.has(id));
  return q.length ? q.slice(0, MAX) : DEFAULT;
}

/**
 * Brands side by side: pick up to three platforms and read the same everyday jobs across them, one topic per
 * card. On a phone each topic stacks its platforms; on a wide screen they sit in columns.
 */
export default function ComparePage() {
  const [pick, setPick] = useState<string[]>(initialPick);
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : p.length >= MAX ? [...p.slice(1), id] : [...p, id]));
  const shown = pick.map((id) => PLATFORM_BY_ID.get(id)!);
  const topics = topic === 'all' ? TOPICS : TOPICS.filter((t) => t.id === topic);
  const cols = shown.length === 3 ? 'lg:grid-cols-3' : shown.length === 2 ? 'sm:grid-cols-2' : '';
  return (
    <div>
      <Button href={href('reference/brands')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Brand field guides</Button>
      <PageHead eyebrow="Reference" title="Brands side by side">The same everyday jobs on the platforms you meet in US plants. Brand names describe conventions only; not affiliated with any manufacturer.</PageHead>

      <section className="mb-3" aria-label="Choose platforms">
        <p className="text-sm font-semibold text-heading m-0 mb-1.5">Compare up to {MAX} <span className="text-muted font-normal">({pick.length} chosen)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => <Chip key={p.id} onClick={() => toggle(p.id)} pressed={pick.includes(p.id)} label={p.short === p.name ? undefined : `${p.short} (${p.name})`}>{p.short}</Chip>)}
        </div>
      </section>
      <section className="mb-4" aria-label="Choose a topic">
        <div className="flex gap-1.5 overflow-x-auto pb-1 chip-scroll" role="group" aria-label="Topic">
          <Chip onClick={() => setTopic('all')} pressed={topic === 'all'} className="whitespace-nowrap">All topics</Chip>
          {TOPICS.map((t) => <Chip key={t.id} onClick={() => setTopic(t.id)} pressed={topic === t.id} className="whitespace-nowrap">{t.title}</Chip>)}
        </div>
      </section>

      <div className="space-y-3">
        {topics.map((t) => (
          <section key={t.id} className="card card-pad" aria-labelledby={`cmp-${t.id}`}>
            <h2 id={`cmp-${t.id}`} className="text-base font-bold m-0">{t.title}</h2>
            <p className="text-xs text-muted m-0 mt-0.5">{t.why}</p>
            {t.safety && <Callout tone="safety" className="mt-2"><span className="text-sm">{t.safety}</span></Callout>}
            <div className={`grid gap-2 mt-3 ${cols}`}>
              {shown.map((p) => (
                <div key={p.id} className="compare-cell">
                  <p className="eyebrow m-0 mb-1">{p.name}</p>
                  <p className="text-sm m-0"><Rich text={p.cells[t.id]} /></p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card card-pad mt-3" aria-label="Software and full guides">
        <h2 className="text-base font-bold m-0 mb-2">Software and full guides</h2>
        <ul className="list-none p-0 m-0 space-y-2">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1"><strong className="text-heading">{p.name}:</strong> {p.software}</span>
              {p.guide && <Button size="sm" href={href(`reference/brand/${p.guide}`)} iconEnd="chevron">Full guide</Button>}
            </li>
          ))}
        </ul>
      </section>
      <Callout tone="safety" title="Before you go online or force anything" className="mt-3">
        Follow your site's procedure and get permission. Back up first, never force or bypass a safety circuit, and remove any force before you leave. This page is training material, not site procedure.
      </Callout>
    </div>
  );
}
