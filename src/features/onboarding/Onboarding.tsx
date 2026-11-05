import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { AppMark, Disclaimer, Traces } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { skinsByMaker, type SkinId } from '../../skins';
import { usePrefs, type Goal } from '../../state/prefs';
import { recommendedLesson } from '../learn/LearnPage';

const GOALS: { id: Goal; title: string; desc: string }[] = [
  { id: 'maintenance', title: 'Maintenance tech', desc: 'Keep machines running. Safety, prints, troubleshooting first.' },
  { id: 'new-tech', title: 'New controls tech', desc: 'Program and support PLCs. Logic and going online first.' },
  { id: 'bas', title: 'Building automation', desc: 'Data centers and buildings. Analog, networks, BMS.' },
  { id: 'curious', title: 'Just curious', desc: 'See how machines think. Start with the PLC basics.' },
];

/** First launch: 4 screens. Personalizes the brand skin and the recommended path. */
export function Onboarding({ onDone }: { onDone: (path?: string) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [skin, setSkin] = useState<SkinId>('ab-logix');
  const [name, setName] = useState('');
  const setPrefs = usePrefs((s) => s.setPrefs);
  const reduce = useReducedMotion();

  const finish = (start: boolean) => {
    setPrefs({ goal: goal ?? 'maintenance', skin, name: name.trim().slice(0, 30) });
    const rec = recommendedLesson(goal ?? 'maintenance', {});
    onDone(start && rec ? `lesson/${rec}` : undefined);
  };

  const screens = [
    <div key="0" className="text-center">
      <div className="relative inline-block mb-4"><AppMark size={96} /></div>
      <p className="eyebrow m-0">Caylor Made Technologies</p>
      <h1 className="text-[1.9rem] font-extrabold mt-1 mb-3">Controls <span className="grad-text">Academy</span></h1>
      <p className="text-body max-w-sm mx-auto">Go from "what's a relay?" to reading prints, writing ladder logic and troubleshooting a live machine.</p>
      <ul className="text-left max-w-sm mx-auto space-y-2 list-none p-0 my-5">
        {['A real PLC scan you can single-step', 'Ten brand dialects: Allen-Bradley, Siemens and more', 'Fault Hunts with a meter and a stopwatch', 'Works offline. Nothing leaves your device.'].map((t) => (
          <li key={t} className="flex gap-2 items-start"><Icon name="check" className="text-live flex-none mt-0.5" size={18} /> {t}</li>
        ))}
      </ul>
    </div>,
    <div key="1">
      <h2 className="text-xl font-bold mb-1">What's your goal?</h2>
      <p className="text-muted mt-0 mb-4">We'll order the tracks for you. You can change it any time.</p>
      <div className="grid gap-2" role="radiogroup" aria-label="Your goal">
        {GOALS.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={goal === g.id} onClick={() => setGoal(g.id)} className="card card-link p-4 text-left cursor-pointer" style={goal === g.id ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}>
            <span className="block font-bold text-heading">{g.title}</span>
            <span className="block text-sm text-muted">{g.desc}</span>
          </button>
        ))}
      </div>
    </div>,
    <div key="2">
      <h2 className="text-xl font-bold mb-1">Which brand will you see most?</h2>
      <p className="text-muted mt-0 mb-4">The simulator will speak its dialect — addresses, instruction names, timer units. Not sure? Allen-Bradley Logix is the most common in North American plants.</p>
      <div className="space-y-3" role="radiogroup" aria-label="PLC platform">
        {skinsByMaker().map((g) => (
          <div key={g.maker}>
            <p className="text-[0.7rem] font-bold tracking-[0.14em] uppercase text-muted m-0 mb-1.5">{g.maker}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.skins.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={skin === s.id} onClick={() => setSkin(s.id)} className="card card-link p-3 text-left cursor-pointer" style={skin === s.id ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}>
                  <span className="block font-bold text-heading text-sm">{s.family}</span>
                  <span className="block text-xs text-muted">{s.style}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    <div key="3">
      <h2 className="text-xl font-bold mb-1">One rule before we start</h2>
      <div className="callout callout-safety my-4">
        <p className="m-0 font-bold text-heading flex gap-2 items-center"><Icon name="shield" size={18} /> Safety first, always</p>
        <p className="m-0 mt-1 text-sm">Real panels have 120 V and 480 V in them. Real machines move. LOTOTO before your hands go in; never bypass a safety circuit; never force anything on real equipment without authorization.</p>
      </div>
      <Disclaimer />
      <label className="block mt-5">
        <span className="text-sm font-semibold text-heading">What should we call you? (optional, stays on this device)</span>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" />
      </label>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ background: 'var(--bg)' }} role="dialog" aria-modal="true" aria-label="Welcome to Controls Academy">
      <div className="absolute top-0 right-0 w-[320px] opacity-60 pointer-events-none" aria-hidden="true"><Traces className="w-full h-auto" /></div>
      <div className="min-h-full flex flex-col max-w-xl mx-auto px-4" style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5" role="img" aria-label={`Step ${step + 1} of 4`}>
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 28 : 10, background: i <= step ? 'var(--blue-glow)' : 'var(--border)' }} />)}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => finish(false)}>Skip</button>
        </div>
        <div className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
              {screens[step]}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex gap-2 mt-6">
          {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}><Icon name="back" size={18} /> Back</button>}
          {step < 3 ? (
            <button type="button" className="btn btn-primary flex-1" disabled={step === 1 && !goal} onClick={() => setStep(step + 1)}>{step === 0 ? 'Get started' : 'Next'} <Icon name="chevron" size={18} /></button>
          ) : (
            <button type="button" className="btn btn-primary flex-1" onClick={() => finish(true)}>Start my first lesson <Icon name="bolt" size={18} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
