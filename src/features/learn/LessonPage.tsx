import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { LESSONS, LESSON_BY_ID, TRACK_BY_ID } from '../../content';
import type { Block, Lesson, Site } from '../../content/types';
import { program as buildProgram } from '../../engine/text';
import { href } from '../../lib/router';
import { sfx } from '../../lib/sound';
import { SKINS } from '../../skins';
import { usePrefs } from '../../state/prefs';
import { useProgress } from '../../state/progress';
import { Ladder } from '../simulator/Ladder';
import type { SimRuntime } from '../simulator/runtime';
import { Workbench } from '../simulator/Workbench';
import { OrderDrill, SortDrill } from './Drills';
import { Figure } from './Figures';
import { QuestionCard } from './Quiz';
import { createChecker, taskProgram, taskSetup } from './tasks';

function BlockView({ b }: { b: Block }) {
  const skinId = usePrefs((s) => s.skin);
  switch (b.t) {
    case 'p':
      return <p className="leading-relaxed"><Rich text={b.text} /></p>;
    case 'h':
      return <h2 className="text-lg font-bold mt-6 mb-2"><Rich text={b.text} /></h2>;
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul';
      return (
        <L className={`pl-5 space-y-1.5 ${b.ordered ? 'list-decimal' : 'list-disc'} marker:text-glow`}>
          {b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}
        </L>
      );
    }
    case 'callout':
      return (
        <div className={`callout callout-${b.tone} my-4`} role={b.tone === 'safety' ? 'note' : undefined}>
          {b.title && (
            <p className="m-0 mb-1 font-bold text-heading flex items-center gap-2">
              <Icon name={b.tone === 'safety' ? 'shield' : b.tone === 'gotcha' ? 'warn' : b.tone === 'brand' ? 'layers' : 'info'} size={18} />
              {b.title}
            </p>
          )}
          <p className="m-0"><Rich text={b.text} /></p>
        </div>
      );
    case 'figure':
      return (
        <figure className="my-4 mx-0">
          <Figure id={b.fig} />
          {b.caption && <figcaption className="text-sm text-muted mt-2">{b.caption}</figcaption>}
        </figure>
      );
    case 'table':
      return (
        <div className="overflow-x-auto my-4 rounded-xl border border-line">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-raised"><tr>{b.head.map((h) => <th key={h} className="text-left p-2.5 font-semibold text-heading">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="p-2.5 align-top"><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'rung': {
      const p = buildProgram('example', b.tags, [b.text]);
      return (
        <figure className="my-4 mx-0 card p-2">
          <Ladder program={p} skin={SKINS[skinId]} compact />
          {b.caption && <figcaption className="text-sm text-muted px-2 pb-1">{b.caption} <span className="text-xs">({SKINS[skinId].brand} style — change it in Profile or the Simulator)</span></figcaption>}
        </figure>
      );
    }
    case 'code':
      return (
        <figure className="my-4 mx-0">
          <pre className="code-block" tabIndex={0} aria-label={b.caption ?? 'Code example'}><code>{b.text}</code></pre>
          {b.caption && <figcaption className="text-sm text-muted mt-1.5">{b.caption}</figcaption>}
        </figure>
      );
    case 'order':
      return <OrderDrill prompt={b.prompt} steps={b.steps} why={b.why} />;
    case 'sort':
      return <SortDrill prompt={b.prompt} bins={b.bins} items={b.items} />;
    case 'brands':
      return (
        <div className="my-4 rounded-xl border border-line overflow-hidden">
          <p className="m-0 px-3 py-2 bg-raised text-xs font-bold tracking-widest uppercase text-muted">On different platforms</p>
          {b.rows.map((r) => (
            <div key={r.skin} className={`px-3 py-2.5 border-t border-line text-sm ${r.skin === skinId ? 'bg-[var(--blue-soft)]' : ''}`}>
              <strong className="text-heading">{SKINS[r.skin].brand}:</strong> <Rich text={r.text} />
            </div>
          ))}
        </div>
      );
  }
}

export const SITE_LABEL: Record<Site, string> = { mill: 'Flour mill', datacenter: 'Data center', water: 'Water / wastewater plant' };

/** Prerequisite links shown under the lesson title. */
function Prereqs({ ids }: { ids: string[] }) {
  const done = useProgress((s) => s.lessons);
  if (!ids.length) return <p className="text-sm text-muted m-0 mt-3"><strong className="text-heading">Before this:</strong> nothing — this lesson starts from zero.</p>;
  return (
    <div className="mt-3">
      <p className="text-sm m-0 mb-1.5"><strong className="text-heading">Before this:</strong></p>
      <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
        {ids.map((pid) => {
          const l = LESSON_BY_ID.get(pid);
          if (!l) return null;
          return <li key={pid}><a className={`chip ${done[pid] ? 'chip-live' : ''}`} href={href(`lesson/${pid}`)}>{done[pid] && <Icon name="check" size={12} />} {l.title}</a></li>;
        })}
      </ul>
    </div>
  );
}

/** Quality-bar sections that sit after the explainer, in the same order on every lesson. */
function OnTheJob({ lesson }: { lesson: Lesson }) {
  return (
    <>
      {lesson.realWorld && (
        <section className="card card-pad my-5 real-world" aria-label="Real-world example">
          <p className="eyebrow m-0">On the job · {SITE_LABEL[lesson.realWorld.site]}</p>
          <p className="m-0 mt-1.5"><Rich text={lesson.realWorld.text} /></p>
        </section>
      )}
      {lesson.mistakes && lesson.mistakes.length > 0 && (
        <div className="callout callout-gotcha my-4">
          <p className="m-0 mb-1 font-bold text-heading flex items-center gap-2"><Icon name="warn" size={18} /> Common mistakes</p>
          <ul className="pl-5 list-disc space-y-1 m-0">{lesson.mistakes.map((m, i) => <li key={i}><Rich text={m} /></li>)}</ul>
        </div>
      )}
      {lesson.safety && 'note' in lesson.safety && (
        <div className="callout callout-safety my-4" role="note">
          <p className="m-0 mb-1 font-bold text-heading flex items-center gap-2"><Icon name="shield" size={18} /> Safety first</p>
          <p className="m-0"><Rich text={lesson.safety.note} /></p>
        </div>
      )}
    </>
  );
}

export default function LessonPage({ id }: { id: string }) {
  const lesson = LESSON_BY_ID.get(id);
  const reduce = useReducedMotion();
  const completeLesson = useProgress((s) => s.completeLesson);
  const completeTask = useProgress((s) => s.completeTask);
  const record = useProgress((s) => s.lessons[id]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [taskDone, setTaskDone] = useState(Boolean(record?.taskDone));
  const [gained, setGained] = useState<number | null>(null);
  const rtRef = useRef<SimRuntime | null>(null);

  useEffect(() => {
    setAnswers({});
    setGained(null);
    setTaskDone(Boolean(useProgress.getState().lessons[id]?.taskDone));
  }, [id]);

  const initial = useMemo(() => (lesson?.task ? taskProgram(lesson.task) : null), [lesson]);

  const onRuntime = useCallback((rt: SimRuntime) => {
    if (!lesson?.task || rtRef.current === rt) return;
    rtRef.current = rt;
    taskSetup(lesson.task, rt);
    const check = createChecker(lesson.task);
    const unsub = rt.subscribe(() => {
      if (check(rt)) {
        unsub();
        setTaskDone(true);
        const xp = completeTask(lesson.id);
        if (xp) sfx.tick();
      }
    });
  }, [lesson, completeTask]);

  if (!lesson) {
    return (
      <div className="card card-pad">
        <h1 className="text-xl font-bold">Lesson not found</h1>
        <p>It may have moved. <a href={href('learn')}>Back to Learn</a></p>
      </div>
    );
  }

  const track = TRACK_BY_ID.get(lesson.track)!;
  const idx = LESSONS.findIndex((l) => l.id === id);
  const next = LESSONS[idx + 1];
  const answered = Object.keys(answers).length;
  const score = Object.values(answers).filter(Boolean).length;
  const allAnswered = answered === lesson.quiz.length;

  const finish = () => {
    const missed = lesson.quiz.filter((q) => answers[q.id] === false).map((q) => q.id);
    setGained(completeLesson(lesson.id, score, lesson.quiz.length, missed));
  };

  return (
    <article>
      <a href={href('learn')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Learn</a>
      <motion.header layoutId={reduce ? undefined : `lesson-${lesson.id}`} className="card card-pad mb-5 relative overflow-hidden">
        <p className="eyebrow m-0">Track {track.n} · {track.title}</p>
        <span className={`level-pill level-${track.level.toLowerCase()} mt-2`}>{track.level}</span>
        <h1 className="text-[1.5rem] sm:text-[1.9rem] font-extrabold mt-1">{lesson.title}</h1>
        <p className="text-muted m-0 mt-1">{lesson.summary}</p>
        {lesson.why && <p className="why-line m-0 mt-3"><strong>Why this matters on the job:</strong> <Rich text={lesson.why} /></p>}
        {lesson.prereqs && <Prereqs ids={lesson.prereqs} />}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="chip">{lesson.minutes} min</span>
          {lesson.task && <span className={`chip ${taskDone ? 'chip-live' : ''}`}>{taskDone ? <Icon name="check" size={14} /> : <Icon name="sim" size={14} />} Hands-on</span>}
          {record && <span className="chip chip-live"><Icon name="check" size={14} /> Completed · {record.score}/{record.total}</span>}
        </div>
      </motion.header>

      <div className="max-w-[68ch]">
        {lesson.blocks.map((b, i) => <BlockView key={i} b={b} />)}
        <OnTheJob lesson={lesson} />
      </div>

      {lesson.task && initial && (
        <section className="mt-8" aria-labelledby="task-h">
          <div className={`card card-pad mb-3 ${taskDone ? '' : ''}`} style={taskDone ? { borderColor: 'var(--live)', boxShadow: 'var(--live-glow)' } : undefined}>
            <p className="eyebrow m-0">Hands-on</p>
            <h2 id="task-h" className="text-lg font-bold mt-1">{lesson.task.goal}</h2>
            <ol className="pl-5 list-decimal text-sm space-y-1 mb-0">{lesson.task.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p className={`mt-3 mb-0 font-semibold flex items-center gap-2 ${taskDone ? 'text-live' : 'text-muted'}`} role="status">
              {taskDone ? <><Icon name="check" /> Done! +25 XP</> : 'Not done yet — try it below.'}
            </p>
          </div>
          <Workbench key={lesson.id} initial={initial} editable={Boolean(lesson.task.edit)} onRuntime={onRuntime} />
        </section>
      )}

      <section className="mt-8 space-y-3 max-w-[68ch]" aria-labelledby="check-h">
        <h2 id="check-h" className="text-xl font-bold">Check yourself</h2>
        {lesson.quiz.map((q, i) => (
          <QuestionCard key={`${id}-${q.id}`} q={q} n={i + 1} of={lesson.quiz.length} onAnswer={(c) => setAnswers((a) => ({ ...a, [q.id]: c }))} />
        ))}
        <div className="card card-pad flex flex-wrap items-center gap-3">
          {gained === null ? (
            <>
              <p className="m-0 flex-1 text-sm text-muted">{allAnswered ? `You got ${score} of ${lesson.quiz.length}.` : `Answer all ${lesson.quiz.length} questions to finish.`}</p>
              <button type="button" className="btn btn-primary" disabled={!allAnswered} onClick={finish}><Icon name="check" size={18} /> Finish lesson</button>
            </>
          ) : (
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-wrap items-center gap-3 w-full" role="status">
              <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--grad-live)' }}><Icon name="bolt" className="text-[#062a1b]" /></span>
              <div className="flex-1 min-w-[10rem]">
                <p className="m-0 font-bold text-heading">Lesson complete{gained ? ` · +${gained} XP` : ''}</p>
                <p className="m-0 text-sm text-muted">{score === lesson.quiz.length ? 'Perfect score.' : 'Missed questions come back in Review.'}</p>
              </div>
              {next ? <a className="btn btn-primary" href={href(`lesson/${next.id}`)}>Next: {next.title} <Icon name="chevron" size={16} /></a> : <a className="btn" href={href('learn')}>Back to Learn</a>}
            </motion.div>
          )}
        </div>
      </section>
    </article>
  );
}
