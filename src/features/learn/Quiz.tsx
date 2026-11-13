import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import type { Question } from '../../content/types';
import { arrangeChoices } from '../../lib/shuffle';
import { buzz } from '../../lib/sound';

export function QuestionCard({ q, onAnswer, n, of }: { q: Question; onAnswer: (correct: boolean) => void; n?: number; of?: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const { order } = useMemo(() => arrangeChoices(q), [q]);
  const done = picked !== null;
  const right = picked === q.answer;
  return (
    <div className="card card-pad">
      {n !== undefined && <p className="text-xs text-muted m-0 mb-1 font-semibold">Question {n} of {of}</p>}
      <p className="font-semibold text-heading mt-0 text-[1.02rem]" id={`${q.id}-q`}><Rich text={q.q} /></p>
      <div className="grid gap-2" role="radiogroup" aria-labelledby={`${q.id}-q`}>
        {order.map((i, pos) => {
          const c = q.choices[i];
          const isAns = i === q.answer;
          const state = !done ? '' : isAns ? 'correct' : i === picked ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={done}
              onClick={() => { setPicked(i); buzz(i === q.answer ? 10 : 30); onAnswer(i === q.answer); }}
              className="btn !justify-start text-left !h-auto py-2.5 !font-medium"
              style={state === 'correct' ? { borderColor: 'var(--live)', background: 'var(--live-soft)' } : state === 'wrong' ? { borderColor: 'var(--alarm)', background: 'var(--alarm-soft)' } : state === 'dim' ? { opacity: 0.55 } : undefined}
            >
              <span className="flex-none w-6 h-6 rounded-full border border-line-strong flex items-center justify-center text-xs font-bold" aria-hidden="true">
                {state === 'correct' ? <Icon name="check" size={14} /> : state === 'wrong' ? <Icon name="x" size={14} /> : String.fromCharCode(65 + pos)}
              </span>
              <span><Rich text={c} /></span>
              {state === 'correct' && <span className="sr-only"> — correct answer</span>}
              {state === 'wrong' && <span className="sr-only"> — your answer, incorrect</span>}
            </button>
          );
        })}
      </div>
        {done && (
          <div data-enter="rise">
            <div className={`callout mt-3 ${right ? 'callout-tip' : 'callout-gotcha'}`} role="status">
              <strong className="text-heading">{right ? 'Correct.' : 'Not quite.'}</strong> <Rich text={q.why} />
            </div>
          </div>
        )}
    </div>
  );
}
