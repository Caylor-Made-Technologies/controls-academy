import { lazy, Suspense, use } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { SkeletonPage } from '../../components/Skeleton';
import { Button, NotFound } from '../../components/ui';
import { TRACK_BY_ID, TRACKS } from '../../content/catalog';
import { loadLessons } from '../../content/lesson-load';
import type { Track } from '../../content/types';
import type { TrackId } from '../../content/types';
import { href } from '../../lib/router';

const SummaryTrack = lazy(() => import('./SummaryTrack'));

function LoadedTrack({ t }: { t: Track }) {
  return <SummaryTrack t={t} lessons={use(loadLessons(t.lessons))} />;
}

/** Study summaries: the list of tracks, or one track's summary (its code and lessons load when opened). */
export default function SummaryPage({ track }: { track?: string }) {
  const t = TRACK_BY_ID.get(track as TrackId);
  if (track && !t) return <NotFound what="Summary" backHref={href('summary')} backLabel="All summaries" />;
  if (t) return <Suspense fallback={<SkeletonPage />}><LoadedTrack t={t} /></Suspense>;
  return (
    <div>
      <Button href={href('learn')} variant="ghost" size="sm" className="-ml-2 mb-2"><Icon name="back" size={16} /> Learn</Button>
      <PageHead eyebrow="Learn" title="Study summaries">One printable page per track: key terms, formulas, safety points and common mistakes.</PageHead>
      <ul className="list-none p-0 m-0 grid gap-2 sm:grid-cols-2">
        {TRACKS.map((x) => <li key={x.id}><a className="card card-link card-pad block" href={href(`summary/${x.id}`)}><span className="eyebrow">Track {x.n}</span><span className="block font-bold text-heading mt-1">{x.title}</span></a></li>)}
      </ul>
    </div>
  );
}
