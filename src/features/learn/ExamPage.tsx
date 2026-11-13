import { useEffect, useMemo, useState } from 'react';
import { PageHead, RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { LESSON_BY_ID, TRACK_BY_ID } from '../../content';
import { EXAMS, EXAM_BY_ID, bankFor, drawExam, scoreExam, type BankItem, type ExamDef, type ExamId } from '../../content/bank';
import type { TrackId } from '../../content/types';
import { href } from '../../lib/router';
import { PRACTICE_RECORD } from '../../lib/practice';
import { arrangeChoices } from '../../lib/shuffle';
import { useProgress } from '../../state/progress';


const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

function ExamHome() {
  const exams = useProgress((s) => s.exams);
  return (
    <div>
      <a href={href('learn')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Learn</a>
      <RouteHead seg="exam" />
      <div className="grid gap-3 sm:grid-cols-2">
        {EXAMS.map((e) => {
          const r = exams[e.id];
          return (
            <a key={e.id} href={href(`exam/${e.id}`)} className={`card card-link card-pad ${e.id === 'readiness' ? 'sm:col-span-2' : ''}`} style={e.id === 'readiness' ? { boxShadow: 'var(--glow)' } : undefined}>
              <p className="eyebrow m-0">{e.id === 'readiness' ? 'Final assessment' : 'Practice exam'}</p>
              <h2 className="text-lg font-bold mt-1">{e.title}</h2>
              <p className="text-sm text-muted m-0 mt-1">{e.blurb}</p>
              <p className="text-xs text-muted m-0 mt-2">{e.size} questions · drawn from {bankFor(e).length} · optional {Math.round((e.size * e.secsPerQ) / 60)}-minute timer</p>
              {r && <p className="m-0 mt-2"><span className="chip chip-live">Best {pct(r.best, r.total)} % · last {pct(r.last, r.total)} %</span></p>}
              {e.id === 'readiness' && <p className="text-xs m-0 mt-2 text-muted">{PRACTICE_RECORD}</p>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Sitting({ exam }: { exam: ExamDef }) {
  const lessons = useProgress((s) => s.lessons);
  const recordExam = useProgress((s) => s.recordExam);
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [timed, setTimed] = useState(false);
  const [items, setItems] = useState<BankItem[]>([]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(0);
  const [gain, setGain] = useState(0);
  const limit = exam.size * exam.secsPerQ;

  const start = () => {
    // Readiness leans toward topics where lesson checks weren't perfect (weak topics get extra questions).
    const weights: Partial<Record<TrackId, number>> = {};
    if (exam.id === 'readiness') {
      for (const [id, r] of Object.entries(lessons)) {
        const l = LESSON_BY_ID.get(id);
        if (l && r.total && r.score < r.total) weights[l.track] = 1;
      }
    }
    setItems(drawExam(exam, Date.now() % 2147483647, weights));
    setAnswers({});
    setI(0);
    setLeft(limit);
    setPhase('run');
    window.scrollTo(0, 0);
  };

  const finish = () => {
    const s = scoreExam(items, answers);
    setGain(recordExam(exam.id, s.right, s.total, s.missedIds));
    setPhase('done');
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (phase !== 'run' || !timed) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timed]);
  useEffect(() => { if (phase === 'run' && timed && left <= 0) finish(); });

  const result = useMemo(() => (phase === 'done' ? scoreExam(items, answers) : null), [phase, items, answers]);

  if (phase === 'intro') {
    return (
      <div className="max-w-[68ch]">
        <a href={href('exam')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Exams</a>
        <PageHead eyebrow={exam.id === 'readiness' ? 'Final assessment' : 'Practice exam'} title={exam.title}>{exam.blurb}</PageHead>
        <div className="card card-pad space-y-3">
          <ul className="pl-5 list-disc m-0 space-y-1 text-sm">
            <li>{exam.size} questions, drawn at random from {bankFor(exam).length}. A new set every time.</li>
            <li>You can go back and change answers. Answers and explanations are shown at the end.</li>
            <li>Missed questions are added to your Review.</li>
            {exam.id === 'readiness' && <li>Topics where your lesson checks weren't perfect get a few extra questions.</li>}
          </ul>
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-[var(--blue)]" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            <span>Timed: {Math.round(limit / 60)} minutes (it finishes itself when time runs out)</span>
          </label>
          <p className="text-xs text-muted m-0">{PRACTICE_RECORD} Training only.</p>
          <button type="button" className="btn btn-primary" onClick={start}><Icon name="play" size={16} /> Start</button>
        </div>
      </div>
    );
  }

  if (phase === 'run') {
    const q = items[i];
    const answered = Object.keys(answers).length;
    return (
      <div className="max-w-[68ch]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="m-0 font-semibold text-heading">{exam.title}</p>
          {timed && <span className={`chip ${left < 60 ? 'chip-alarm' : ''}`} aria-label={`Time left ${mmss(left)}`}><Icon name="slow" size={14} /> {mmss(left)}</span>}
        </div>
        <div className="h-2 rounded-full bg-raised overflow-hidden mb-4" role="progressbar" aria-label="Answered" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={answered}>
          <div className="h-full" style={{ width: `${pct(answered, items.length)}%`, background: 'var(--grad)' }} />
        </div>
        <div className="card card-pad">
          <p className="text-xs text-muted m-0 mb-1 font-semibold">Question {i + 1} of {items.length} · {TRACK_BY_ID.get(q.track)!.title}</p>
          <p className="font-semibold text-heading mt-0 text-[1.02rem]" id="exam-q"><Rich text={q.q} /></p>
          <div className="grid gap-2" role="radiogroup" aria-labelledby="exam-q">
            {arrangeChoices(q).order.map((k, pos) => (
              <button key={k} type="button" role="radio" aria-checked={answers[q.id] === k} className="btn !justify-start text-left !h-auto py-2.5 !font-medium"
                style={answers[q.id] === k ? { borderColor: 'var(--blue-glow)', background: 'var(--blue-soft)' } : undefined}
                onClick={() => setAnswers({ ...answers, [q.id]: k })}>
                <span className="flex-none w-6 h-6 rounded-full border border-line-strong flex items-center justify-center text-xs font-bold" aria-hidden="true">{String.fromCharCode(65 + pos)}</span>
                <span><Rich text={q.choices[k]} /></span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="back" size={16} /> Back</button>
          {i + 1 < items.length
            ? <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>Next <Icon name="chevron" size={16} /></button>
            : <button type="button" className="btn btn-primary" onClick={finish}><Icon name="check" size={16} /> Finish ({answered}/{items.length} answered)</button>}
          {i + 1 < items.length && answered === items.length && <button type="button" className="btn" onClick={finish}>Finish now</button>}
        </div>
      </div>
    );
  }

  const r = result!;
  const passed = r.right / r.total >= exam.pass;
  return (
    <div className="max-w-[68ch]">
      <a href={href('exam')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Exams</a>
      <section className="card card-pad mb-4" aria-labelledby="res-h" role="status">
        <p className="eyebrow m-0">{exam.title}</p>
        <h1 id="res-h" className="text-[1.6rem] font-extrabold mt-1">{pct(r.right, r.total)} % · {r.right} of {r.total}</h1>
        <p className="m-0 mt-1">{passed ? 'Solid. Keep the weak topics below fresh with Review.' : `Not yet — ${Math.round(exam.pass * 100)} % is the practice target. Revisit the lessons below and try a new set.`}{gain ? ` +${gain} XP.` : ''}</p>
        <p className="text-sm text-muted m-0 mt-2 flex items-start gap-1.5"><Icon name="shield" size={16} className="flex-none mt-0.5" /> <span>{PRACTICE_RECORD}</span></p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary" onClick={() => setPhase('intro')}><Icon name="reset" size={16} /> New set</button>
          {r.missedIds.length > 0 && <a className="btn" href={href('review')}>Go to Review</a>}
        </div>
      </section>

      <h2 className="text-lg font-bold">By topic</h2>
      <ul className="list-none p-0 m-0 space-y-2 mb-5">
        {r.topics.map((t) => {
          const tr = TRACK_BY_ID.get(t.track)!;
          const p = pct(t.right, t.total);
          return (
            <li key={t.track} className="card card-pad !py-3">
              <div className="flex justify-between gap-2 text-sm"><span className="font-semibold text-heading">Track {tr.n} · {tr.title}</span><span className="tabular-nums">{t.right}/{t.total}</span></div>
              <div className="h-2 rounded-full bg-raised overflow-hidden mt-1.5" aria-hidden="true"><div className="h-full" style={{ width: `${p}%`, background: p >= 80 ? 'var(--live)' : p >= 50 ? 'var(--warn)' : 'var(--alarm)' }} /></div>
            </li>
          );
        })}
      </ul>

      {r.missedLessons.length > 0 && (
        <>
          <h2 className="text-lg font-bold">Lessons to revisit</h2>
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0 mb-5">
            {r.missedLessons.map((id) => <li key={id}><a className="chip" href={href(`lesson/${id}`)}>{LESSON_BY_ID.get(id)?.title}</a></li>)}
          </ul>
        </>
      )}

      <h2 className="text-lg font-bold">Every question, explained</h2>
      <ol className="list-none p-0 m-0 space-y-3">
        {items.map((q, k) => {
          const mine = answers[q.id];
          const ok = mine === q.answer;
          return (
            <li key={q.id} className="card card-pad" style={{ borderColor: ok ? 'var(--live)' : 'var(--alarm)' }}>
              <p className="text-xs text-muted m-0 mb-1 font-semibold">{k + 1}. {ok ? 'Right' : mine === undefined ? 'Not answered' : 'Missed'}</p>
              <p className="font-semibold text-heading mt-0"><Rich text={q.q} /></p>
              {!ok && mine !== undefined && <p className="text-sm m-0"><strong>Your answer:</strong> <Rich text={q.choices[mine]} /></p>}
              <p className="text-sm m-0"><strong>Correct:</strong> <Rich text={q.choices[q.answer]} /></p>
              <p className="text-sm m-0 mt-1 text-muted"><Rich text={q.why} /> <a href={href(`lesson/${q.lesson}`)}>Lesson: {LESSON_BY_ID.get(q.lesson)?.title}</a></p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ExamPage({ id }: { id?: string }) {
  const exam = id ? EXAM_BY_ID.get(id as ExamId) : undefined;
  if (!id) return <ExamHome />;
  if (!exam) return <div className="card card-pad"><h1 className="text-xl font-bold">Exam not found</h1><a href={href('exam')}>All practice exams</a></div>;
  return <Sitting key={exam.id} exam={exam} />;
}
