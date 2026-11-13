import { useMemo, useState } from 'react';
import { RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { LESSONS } from '../../content';
import { href } from '../../lib/router';
import { dueReviews, useProgress } from '../../state/progress';
import { QuestionCard } from './Quiz';
import { EmptyState } from '../../components/ui';

export default function ReviewPage() {
  const p = useProgress();
  const [ids, setIds] = useState(() => dueReviews(p));
  const [first] = useState(() => new Set(dueReviews(p)));
  const [requeued, setRequeued] = useState<Set<string>>(() => new Set());
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const qs = useMemo(() => {
    const all = new Map(LESSONS.flatMap((l) => l.quiz.map((q) => [q.id, q] as const)));
    return ids.map((id) => all.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  }, [ids]);
  const q = qs[i];
  return (
    <div className="max-w-[68ch]">
      <RouteHead seg="review" />
      {!q ? (
        <EmptyState title={qs.length ? 'Review done for today' : 'Nothing due'} action={{ label: 'Back to Learn', href: href('learn') }}>
          Missed quiz questions land here automatically. Keep learning and check back tomorrow.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <QuestionCard key={`${q.id}-${i}`} q={q} n={i + 1} of={qs.length} onAnswer={(c) => {
            // The first answer today schedules the card; a re-ask at the end of the session is practice only.
            if (i < first.size) p.reviewAnswer(q.id, c);
            if (!c && !requeued.has(q.id)) { setRequeued(new Set(requeued).add(q.id)); setIds([...ids, q.id]); }
            setAnswered(true);
          }} />
          {i >= first.size && <p className="text-xs text-muted m-0">One more try — missed earlier in this session.</p>}
          <button type="button" className="btn btn-primary" disabled={!answered} onClick={() => { setI(i + 1); setAnswered(false); }}>
            {i + 1 < qs.length ? 'Next question' : 'Finish'} <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
