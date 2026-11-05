import { motion, useReducedMotion } from 'framer-motion';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { ProgressRing } from '../../components/ProgressRing';
import { LESSON_META_BY_ID as LESSON_BY_ID, TRACKS } from '../../content/catalog';
import { href } from '../../lib/router';
import { usePrefs, type Goal } from '../../state/prefs';
import { dueReviews, level, streak, trackProgress, useProgress } from '../../state/progress';

const GOAL_ORDER: Record<Goal, string[]> = {
  maintenance: ['t0', 't1', 't2', 't3', 't4', 't5', 't7', 't6', 't8', 't9', 't10'],
  'new-tech': ['t0', 't4', 't5', 't1', 't6', 't7', 't3', 't2', 't8', 't9', 't10'],
  bas: ['t0', 't1', 't4', 't8', 't9', 't5', 't7', 't2', 't3', 't6', 't10'],
  curious: ['t0', 't4', 't1', 't5', 't3', 't2', 't6', 't7', 't8', 't9', 't10'],
};

export function recommendedLesson(goal: Goal | null, done: Record<string, unknown>): string | null {
  // The goal's preferred tracks first, then every other track in course order — so no track is ever skipped (B-004).
  const preferred = GOAL_ORDER[goal ?? 'maintenance'];
  for (const tid of [...preferred, ...TRACKS.map((t) => t.id).filter((id) => !preferred.includes(id))]) {
    const t = TRACKS.find((x) => x.id === tid)!;
    const next = t.lessons.find((id) => !done[id]);
    if (next) return next;
  }
  return null;
}

function routeLabel(r: string): string | null {
  const [a, b] = r.split('/');
  if (a === 'lesson' && b) return LESSON_BY_ID.get(b)?.title ?? null;
  if (a === 'sim') return 'the Simulator';
  if (a === 'troubleshoot') return 'Fault Hunt';
  if (a === 'reference') return 'Reference';
  return null;
}

export default function LearnPage() {
  const p = useProgress();
  const goal = usePrefs((s) => s.goal);
  const name = usePrefs((s) => s.name);
  const reduce = useReducedMotion();
  const lv = level(p.xp);
  const st = streak(p.days);
  const due = dueReviews(p);
  const rec = recommendedLesson(goal, p.lessons);
  const recLesson = rec ? LESSON_BY_ID.get(rec) : null;
  const resume = p.lastRoute && p.lastRoute !== `lesson/${rec}` ? routeLabel(p.lastRoute) : null;
  const totalLessons = TRACKS.reduce((n, t) => n + t.lessons.length, 0);
  const doneLessons = Object.keys(p.lessons).length;

  return (
    <div>
      <PageHead eyebrow={name ? `Welcome back, ${name}` : 'Controls Academy'} title="From zero to panel-ready">
        From "what's a volt?" to tuning PID loops and commissioning a machine — {TRACKS.reduce((n, t) => n + t.lessons.length, 0)} lessons in 4 levels: Beginner, Intermediate, Advanced, Expert.
      </PageHead>

      {/* Stats strip */}
      <section className="card card-pad flex items-center gap-4 mb-4" aria-label="Your progress">
        <ProgressRing pct={lv.pct} size={64} label={`Level progress to ${lv.next ?? 'max'}`}>
          <span className="text-center leading-none"><span className="block text-[0.6rem] text-muted">LVL</span>{lv.index + 1}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-head font-bold text-heading">{lv.name}</p>
          <p className="m-0 text-sm text-muted tabular-nums">{p.xp} XP{lv.next ? ` · ${lv.next - p.xp} to next level` : ''}</p>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <span className="chip"><Icon name="flame" size={14} className={st ? 'text-warn' : ''} /> {st} day streak</span>
            <span className="chip"><Icon name="check" size={14} /> {doneLessons}/{totalLessons} lessons</span>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {recLesson && (
          <motion.a layoutId={reduce ? undefined : `lesson-${recLesson.id}`} href={href(`lesson/${recLesson.id}`)} className="card card-link card-pad relative overflow-hidden" style={{ boxShadow: 'var(--glow)' }}>
            <p className="eyebrow m-0">{doneLessons ? 'Up next' : 'Start here'}</p>
            <h2 className="text-lg font-bold mt-1">{recLesson.title}</h2>
            <p className="text-sm text-muted m-0 mt-1">{recLesson.summary}</p>
            <span className="btn btn-primary btn-sm mt-3">{doneLessons ? 'Continue' : 'Start lesson'} <Icon name="chevron" size={16} /></span>
          </motion.a>
        )}
        {resume && (
          <a href={href(p.lastRoute)} className="card card-link card-pad">
            <p className="eyebrow m-0">Jump back in</p>
            <h2 className="text-lg font-bold mt-1">{resume}</h2>
            <p className="text-sm text-muted m-0 mt-1">Pick up where you left off.</p>
          </a>
        )}
        {due.length > 0 && (
          <a href={href('review')} className="card card-link card-pad">
            <p className="eyebrow m-0">Review</p>
            <h2 className="text-lg font-bold mt-1">{due.length} question{due.length > 1 ? 's' : ''} to review</h2>
            <p className="text-sm text-muted m-0 mt-1">Spaced repetition: the ones you missed come back until they stick.</p>
          </a>
        )}
        <a href={href('troubleshoot')} className="card card-link card-pad">
          <p className="eyebrow m-0">Practice</p>
          <h2 className="text-lg font-bold mt-1">Fault Hunt</h2>
          <p className="text-sm text-muted m-0 mt-1">A fault is hiding in the motor station. Meter, I/O LEDs, logic — and a stopwatch.</p>
        </a>
      </div>

      {/* Skill map */}
      <h2 className="text-xl font-bold mb-3">Skill map</h2>
      <ol className="relative list-none p-0 m-0 space-y-3" aria-label="Tracks">
        <span className="absolute left-[27px] top-6 bottom-6 w-[3px] rounded bg-line" aria-hidden="true" />
        {TRACKS.map((t, i) => {
          const tp = trackProgress(p, t.id);
          return (
            <motion.li
              key={t.id}
              className="relative pl-[68px]"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.2) }}
            >
              <div className="absolute left-0 top-2">
                <ProgressRing pct={tp.pct} size={56} live={tp.complete} label={`Track ${t.n} progress`}>
                  {tp.complete ? <Icon name="check" size={20} className="text-live" /> : t.n}
                </ProgressRing>
              </div>
              {(i === 0 || TRACKS[i - 1].level !== t.level) && (
                <p className={`level-heading level-${t.level.toLowerCase()}`}>{t.level}</p>
              )}
              <div className="card card-pad">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`level-pill level-${t.level.toLowerCase()}`}>{t.level}</span>
                    <h3 className="text-base font-bold mt-1">{t.title}</h3>
                    <p className="text-sm text-muted m-0">{t.blurb}</p>
                  </div>
                  {t.lessons.length > 0 && <span className="chip flex-none tabular-nums">{tp.done}/{tp.total}</span>}
                </div>
                <ul className="list-none p-0 m-0 mt-3 space-y-1.5">
                  {t.lessons.map((id) => {
                    const l = LESSON_BY_ID.get(id)!;
                    const rec2 = p.lessons[id];
                    return (
                      <li key={id}>
                        <motion.a layoutId={reduce || id === recLesson?.id ? undefined : `lesson-${id}`} href={href(`lesson/${id}`)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-raised no-underline text-body hover:text-heading min-h-[48px]">
                          <span className={`flex-none w-7 h-7 rounded-full flex items-center justify-center border-2 ${rec2 ? 'border-live bg-live text-[#062a1b]' : 'border-line-strong'}`} aria-hidden="true">
                            {rec2 ? <Icon name="check" size={15} /> : null}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-heading text-[0.95rem]">{l.title}</span>
                            <span className="block text-xs text-muted">{l.minutes} min{l.task ? ' · hands-on' : ''}{rec2 ? ` · quiz ${rec2.score}/${rec2.total}` : ''}</span>
                          </span>
                          <span className="sr-only">{rec2 ? 'Completed' : 'Not started'}</span>
                          <Icon name="chevron" size={18} className="text-muted" />
                        </motion.a>
                      </li>
                    );
                  })}
                  {t.planned.map((title) => (
                    <li key={title} className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted text-sm border border-dashed border-line">
                      <span className="flex-none w-7 h-7 rounded-full border-2 border-dashed border-line" aria-hidden="true" />
                      <span className="flex-1">{title}</span>
                      <span className="chip !min-h-[22px] !text-[0.65rem]">Coming</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
