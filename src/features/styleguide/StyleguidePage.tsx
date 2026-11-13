import { useState, type ReactNode } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon, ICON_NAMES } from '../../components/Icon';
import { href } from '../../lib/router';
import { Button, Callout, Card, Chip, EmptyState, ErrorState, ListRow, ProgressRing, Segmented, Sheet, Skeleton, Stat, toast } from '../../components/ui';

const COLORS: [string, string][] = [
  ['--bg', 'Page'], ['--bg-2', 'Page, deeper'], ['--surface', 'Card'], ['--surface-raised', 'Raised control'], ['--surface-sunk', 'Well / readout'],
  ['--border', 'Hairline'], ['--border-strong', 'Strong hairline'], ['--blue-glow', 'Brand / selected'], ['--blue-button', 'Brand fill'], ['--cyan', 'Brand accent'],
  ['--text-heading', 'Heading text'], ['--text-body', 'Body text'], ['--text-muted', 'Muted text'],
  ['--live', 'Live: energized, true'], ['--warn', 'Warn: forces, caution'], ['--alarm', 'Fault'], ['--safety', 'Safety notes only'], ['--dead', 'Dead: de-energized'],
];
const TYPE = ['3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs', '2xs'];
const SPACE = ['1', '2', '3', '4', '5', '6', '8', '10', '12'];
const RADII = ['--radius-xs', '--radius-sm', '--radius-md', '--radius', '--radius-lg', '--radius-pill'];
const ELEV = ['--elev-sunk', '--elev-1', '--elev-2', '--elev-3'];
const EASE = ['--ease', '--ease-spring', '--ease-bounce'];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
}

/** Everything in one theme. Rendered twice (dark, light) so both can be checked side by side. */
function Sample({ theme }: { theme: 'dark' | 'light' }) {
  const [seg, setSeg] = useState<'run' | 'slow' | 'step'>('run');
  const [chip, setChip] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [moved, setMoved] = useState(false);
  return (
    <div className={`theme-${theme} sg-theme`} data-testid={`styleguide-${theme}`}>
      <h2 className="text-xl font-extrabold mb-4">{theme === 'dark' ? 'Dark (hero)' : 'Light'}</h2>

      <Block title="Color">
        <ul className="sg-swatches">
          {COLORS.map(([token, use]) => (
            <li key={token}>
              <span className="sg-swatch" style={{ background: `var(${token})` }} />
              <span className="text-xs"><code>{token}</code><br /><span className="text-muted">{use}</span></span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Type">
        <p className="font-head font-extrabold text-heading text-lg m-0">Montserrat 800: headings and legends</p>
        <p className="m-0 mb-2">Inter 400–700: everything else. <code>Motor_Run</code> and other tags use the device monospace.</p>
        {TYPE.map((t) => <p key={t} className="m-0 text-heading" style={{ fontSize: `var(--text-${t})`, lineHeight: 1.25 }}>text-{t} · Start the pump 0123456789</p>)}
        <p className="eyebrow mt-2 mb-0">Legend plate (eyebrow)</p>
      </Block>

      <Block title="Spacing (4 px grid)">
        <div className="flex items-end gap-2 flex-wrap">
          {SPACE.map((s) => <span key={s} className="text-2xs text-muted text-center"><span className="sg-space" style={{ width: `var(--space-${s})`, height: `var(--space-${s})` }} />{s}</span>)}
        </div>
      </Block>

      <Block title="Radii">
        <div className="flex gap-3 flex-wrap">
          {RADII.map((r) => <span key={r} className="text-2xs text-muted text-center"><span className="sg-radius" style={{ borderRadius: `var(${r})` }} />{r.replace('--radius', 'r') || 'r'}</span>)}
        </div>
      </Block>

      <Block title="Depth">
        <div className="grid grid-cols-2 gap-4">
          {ELEV.map((e) => <div key={e} className="sg-elev text-xs" style={{ boxShadow: `var(${e})` }}><code>{e}</code></div>)}
        </div>
      </Block>

      <Block title="Motion">
        <Button size="sm" onClick={() => setMoved(!moved)} icon="play">Play the curves</Button>
        <div className="mt-2 space-y-2">
          {EASE.map((e) => (
            <div key={e} className="sg-track"><span className="sg-dot" data-moved={moved} style={{ transitionTimingFunction: `var(${e})` }} /><code className="text-2xs">{e}</code></div>
          ))}
        </div>
        <p className="text-xs text-muted mt-2 mb-0">120 ms press · 200 ms fade · 420 ms land · 480 ms glide. Reduced motion makes every change instant.</p>
      </Block>

      <Block title="Icons (24 px grid, one stroke weight)">
        <div className="flex flex-wrap gap-3 text-heading">
          {ICON_NAMES.map((n) => <span key={n} title={n}><Icon name={n} role="img" aria-label={n} /></span>)}
        </div>
      </Block>

      <Block title="Button">
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="primary" icon="play">Primary</Button>
          <Button>Default</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon="trash">Danger</Button>
          <Button size="sm" iconEnd="chevron">Small</Button>
          <Button disabled>Disabled</Button>
          <Button icon="search" aria-label="Search (icon button)" />
          <Button href={href('about')} size="sm" icon="back">Link button</Button>
        </div>
      </Block>

      <Block title="Chip">
        <div className="flex flex-wrap gap-2 items-center">
          <Chip>Neutral</Chip>
          <Chip tone="live" icon="check">Live</Chip>
          <Chip tone="warn" icon="warn">Forced</Chip>
          <Chip tone="alarm">Fault</Chip>
          <Chip tone="blue">Selected</Chip>
          <Chip tone="safety" icon="shield">Safety</Chip>
          <Chip onClick={() => setChip(!chip)} pressed={chip}>Filter chip</Chip>
        </div>
      </Block>

      <Block title="Segmented / tabs">
        <Segmented label="Scan speed (demo)" value={seg} onChange={setSeg} options={[{ value: 'run', label: 'Run' }, { value: 'slow', label: 'Slow-mo' }, { value: 'step', label: 'Step' }]} />
      </Block>

      <Block title="Card">
        <div className="grid gap-3">
          <Card><h4 className="font-bold m-0">Card</h4><p className="text-sm text-muted m-0">The one surface. Hairline border, soft layered shadow.</p></Card>
          <Card glow href={href('styleguide')}><h4 className="font-bold m-0">Recommended card (link)</h4><p className="text-sm text-muted m-0">One per screen. Press and hover feedback.</p></Card>
          <Card tone="live"><h4 className="font-bold m-0">State card</h4><p className="text-sm text-muted m-0">Outlined in a state color when the whole card is in that state.</p></Card>
        </div>
      </Block>

      <Block title="Callout">
        <div className="space-y-2">
          <Callout tone="tip" title="Tip">Brand blue. Helpful, not urgent.</Callout>
          <Callout tone="safety" title="Safety">Safety yellow, used nowhere else. Training material, not your site's procedure.</Callout>
          <Callout tone="gotcha" title="Gotcha">Amber. A common mistake.</Callout>
          <Callout tone="brand" title="Brand difference">Neutral. How one maker does it differently.</Callout>
        </div>
      </Block>

      <Block title="Stat">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="XP" value={1250} icon="bolt" />
          <Stat label="Streak" value={7} unit="days" tone="live" />
          <Stat label="Score" value={92} unit="%" tone="blue" />
        </div>
      </Block>

      <Block title="List row">
        <div className="space-y-1.5">
          <ListRow href={href('styleguide')} lead="1" title="What electricity is" detail="6 min · Beginner" />
          <ListRow href={href('styleguide')} done lead={<Icon name="check" size={16} />} title="Ohm's law and power" detail="Done" />
          <ListRow icon="info" title="A row that goes nowhere" detail="No chevron, no pointer" />
        </div>
      </Block>

      <Block title="Progress ring">
        <div className="flex gap-4 items-center">
          <ProgressRing pct={0.35} label="Example progress">35%</ProgressRing>
          <ProgressRing pct={1} live label="Example complete"><Icon name="check" size={20} className="text-live" /></ProgressRing>
        </div>
      </Block>

      <Block title="Skeleton">
        <div className="space-y-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-16" /></div>
      </Block>

      <Block title="Sheet and toast">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSheet(true)}>Open a sheet</Button>
          <Button size="sm" onClick={() => toast('Saved on this device.', 'live')}>Show a toast</Button>
        </div>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="A sheet">
          <p className="mt-0">Bottom sheet on a phone (drag the handle down), dialog on wider screens. Esc and the backdrop close it; focus stays inside.</p>
          <Button variant="primary" onClick={() => setSheet(false)}>Done</Button>
        </Sheet>
      </Block>

      <Block title="Empty state">
        <EmptyState title="Nothing to review yet" action={{ label: 'Start a lesson', href: href('learn') }}>Questions you miss show up here the next day.</EmptyState>
      </Block>

      <Block title="Error state">
        <ErrorState title="This part didn't load" action={{ label: 'Try again', onClick: () => toast('Trying again…') }} secondary={{ label: 'Go to Learn', href: href('learn') }}>You may be offline and this screen wasn't saved yet. Your progress is safe on this device.</ErrorState>
      </Block>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div>
      <a href={href('about')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> About</a>
      <PageHead eyebrow="Design system" title="Styleguide">Every token and component, in both themes. The rules behind them are in the repo's design-system document.</PageHead>
      <div className="grid gap-4 xl:grid-cols-2 items-start">
        <Sample theme="dark" />
        <Sample theme="light" />
      </div>
    </div>
  );
}
