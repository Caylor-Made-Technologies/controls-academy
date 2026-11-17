import { useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { Button, Callout, NotFound } from '../../components/ui';
import { FLOWCHARTS, FLOW_BY_ID } from '../../content/flowcharts';
import { href } from '../../lib/router';

const TRAINING = 'Training material, not site procedure. Follow your site\'s lockout and live-work rules.';

/** The list of troubleshooting flowcharts. */
export function FlowList() {
  return (
    <div>
      <Button href={href('reference')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Reference</Button>
      <PageHead eyebrow="Reference" title="Troubleshooting flowcharts">Start from the symptom. Each step tells you what to check, what a good and a bad reading look like, and when to stop and lock out.</PageHead>
      <div className="grid gap-3 sm:grid-cols-2">
        {FLOWCHARTS.map((f) => (
          <a key={f.id} href={href(`reference/flow/${f.id}`)} className="card card-link card-pad">
            <span className="block font-bold text-heading">{f.title}</span>
            <span className="block text-sm text-muted mt-1">{f.symptom}</span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">{TRAINING}</p>
    </div>
  );
}

/** Walk one flowchart a step at a time; the trail of answers stays visible and you can step back. */
export function FlowDetail({ id }: { id: string }) {
  const f = FLOW_BY_ID.get(id);
  const [trail, setTrail] = useState<{ step: string; answer: string }[]>([]);
  const [at, setAt] = useState(f?.start ?? '');
  if (!f) return <NotFound what="Flowchart" backHref={href('reference/flow')} backLabel="All flowcharts" />;
  const step = f.steps.find((s) => s.id === at)!;
  const choose = (label: string, next: string) => { setTrail((t) => [...t, { step: at, answer: label }]); setAt(next); };
  const back = () => { const last = trail[trail.length - 1]; if (!last) return; setTrail((t) => t.slice(0, -1)); setAt(last.step); };
  const restart = () => { setTrail([]); setAt(f.start); };
  return (
    <div>
      <Button href={href('reference/flow')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">All flowcharts</Button>
      <PageHead eyebrow="Troubleshooting" title={f.title}>{f.symptom}</PageHead>

      {trail.length > 0 && (
        <ol className="flow-trail" aria-label="Your answers so far">
          {trail.map((t, i) => {
            const s = f.steps.find((x) => x.id === t.step)!;
            return <li key={i}><span className="text-muted">{s.ask}</span> <strong className="text-heading">{t.answer}</strong></li>;
          })}
        </ol>
      )}

      {step.end ? (
        <section className="card card-pad flow-end" aria-live="polite" aria-labelledby="flow-found">
          <p className="eyebrow m-0">What you found</p>
          <h2 id="flow-found" className="text-lg font-bold m-0 mt-1">{step.end.found}</h2>
          <p className="m-0 mt-2"><Rich text={step.end.fix} /></p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="primary" icon="reset" onClick={restart}>Start over</Button>
            <Button onClick={back} icon="back">Back one step</Button>
            {f.lesson && <Button href={href(`lesson/${f.lesson}`)} iconEnd="chevron">Related lesson</Button>}
          </div>
        </section>
      ) : (
        <section className="card card-pad" aria-live="polite" aria-labelledby="flow-ask">
          <p className="eyebrow m-0">Step {trail.length + 1}</p>
          <h2 id="flow-ask" className="text-lg font-bold m-0 mt-1">{step.ask}</h2>
          {step.how && <p className="text-sm m-0 mt-2"><Icon name="meter" size={16} className="inline-block align-[-3px] mr-1 text-glow" /><Rich text={step.how} /></p>}
          {step.safety && <Callout tone="safety" className="mt-3"><span className="text-sm">{step.safety}</span></Callout>}
          <div className="grid gap-2 mt-3">
            {step.answers!.map((a) => <Button key={a.label} className="!justify-between text-left" onClick={() => choose(a.label, a.next)} iconEnd="chevron">{a.label}</Button>)}
          </div>
          {trail.length > 0 && <div className="mt-3"><Button variant="ghost" size="sm" icon="back" onClick={back}>Back one step</Button></div>}
        </section>
      )}
      <p className="text-xs text-muted mt-3">{TRAINING}</p>
    </div>
  );
}
