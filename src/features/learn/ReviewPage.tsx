import { useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { LESSONS } from '../../content';
import { href } from '../../lib/router';
import { dueReviews, useProgress } from '../../state/progress';
import { QuestionCard } from './Quiz';

export default function ReviewPage() {
  const p = useProgress();
  const [ids] = useState(() => dueReviews(p));
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const qs = useMemo(() => {
    const all = new Map(LESSONS.flatMap((l) => l.quiz.map((q) => [q.id, q] as const)));
    return ids.map((id) => all.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  }, [ids]);
  const q = qs[i];
  return (
    <div className="max-w-[68ch]">
      <PageHead eyebrow="Review" title="Spaced repetition">
        Questions you missed come back after 1 day, then 2, 4, 7 and 14 as you get them right.
      </PageHead>
      {!q ? (
        <div className="card card-pad text-center">
          <Icon name="check" size={36} className="text-live mx-auto" />
          <h2 className="text-lg font-bold mt-2">{qs.length ? 'Review done for today' : 'Nothing due'}</h2>
          <p className="text-muted">Missed quiz questions land here automatically. Keep learning and check back tomorrow.</p>
          <a className="btn btn-primary" href={href('learn')}>Back to Learn</a>
        </div>
      ) : (
        <div className="space-y-3">
          <QuestionCard key={q.id} q={q} n={i + 1} of={qs.length} onAnswer={(c) => { p.reviewAnswer(q.id, c); setAnswered(true); }} />
          <button type="button" className="btn btn-primary" disabled={!answered} onClick={() => { setI(i + 1); setAnswered(false); }}>
            {i + 1 < qs.length ? 'Next question' : 'Finish'} <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
