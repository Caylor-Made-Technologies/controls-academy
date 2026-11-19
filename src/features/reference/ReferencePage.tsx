import { lazy, Suspense, type ReactNode } from 'react';
import { SkeletonPage } from '../../components/Skeleton';
import { RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { GLOSSARY_COUNT, HARDWARE_BRAND_COUNT, HARDWARE_COUNT } from '../../content/counts';
import { href } from '../../lib/router';

// The index only shows cards; every view behind them loads on demand so the index paints fast on a slow phone.
// scripts/route-preload.ts preloads the right chunk at full priority for a deep link (#/reference/<section>).
const views = () => import('./ReferenceViews');
const hw = () => import('./HardwarePages');
const inside = () => import('./InsidePages');
const devices = () => import('./DevicePages');
const flows = () => import('./FlowPage');
const Brands = lazy(() => views().then((m) => ({ default: m.Brands })));
const BrandGuide = lazy(() => views().then((m) => ({ default: m.BrandGuide })));
const Instructions = lazy(() => views().then((m) => ({ default: m.Instructions })));
const Glossary = lazy(() => views().then((m) => ({ default: m.Glossary })));
const Safety = lazy(() => views().then((m) => ({ default: m.Safety })));
const Practice = lazy(() => views().then((m) => ({ default: m.Practice })));
const HardwareLibrary = lazy(() => hw().then((m) => ({ default: m.HardwareLibrary })));
const HardwareDetail = lazy(() => hw().then((m) => ({ default: m.HardwareDetail })));
const FeaturedFronts = lazy(() => hw().then((m) => ({ default: m.FeaturedFronts })));
const InsideList = lazy(() => inside().then((m) => ({ default: m.InsideList })));
const InsideDetail = lazy(() => inside().then((m) => ({ default: m.InsideDetail })));
const ComparePage = lazy(() => import('./ComparePage'));
const CheatPage = lazy(() => import('./CheatPage'));
const DayOnePage = lazy(() => import('./DayOnePage'));
const DeviceList = lazy(() => devices().then((m) => ({ default: m.DeviceList })));
const DeviceDetail = lazy(() => devices().then((m) => ({ default: m.DeviceDetail })));
const FlowList = lazy(() => flows().then((m) => ({ default: m.FlowList })));
const FlowDetail = lazy(() => flows().then((m) => ({ default: m.FlowDetail })));
const sub = (node: ReactNode) => <Suspense fallback={<SkeletonPage />}>{node}</Suspense>;

const SECTIONS = [
  { id: 'brands', title: 'Brand field guides', desc: 'Software, hardware, addressing, first-day checklists, tips and gotchas.', icon: 'layers' as const },
  { id: 'flow', title: 'Troubleshooting flowcharts', desc: 'Motor won\'t start, trips, input not seen, analog wrong, comms lost, VFD faults.', icon: 'wrench' as const },
  { id: 'devices', title: 'Field devices', desc: 'Prox sensors, photo-eyes, E-stops, starters, safety relays, transmitters and valves, in 3D.', icon: 'meter' as const },
  { id: 'day-one', title: 'Day one at a new plant', desc: 'A checklist for your first days: safety, people, prints, backups. Tick and export.', icon: 'check' as const },
  { id: 'cheats', title: 'Cheat sheets', desc: 'Wire colors, contact numbers, NEMA vs IEC symbols, 4–20 mA and Ohm\'s law. Printable.', icon: 'download' as const },
  { id: 'compare', title: 'Brands side by side', desc: 'Timers, forcing, going online, backups and more, compared across platforms.', icon: 'branch' as const },
  { id: 'instructions', title: 'Instruction reference', desc: 'Every instruction, with its name on each platform.', icon: 'sim' as const },
  { id: 'glossary', title: 'Glossary', desc: `${GLOSSARY_COUNT} terms in plain English.`, icon: 'book' as const },
  { id: 'safety', title: 'Safety rules', desc: 'The hard stops. Read these before you touch a panel.', icon: 'shield' as const },
  { id: 'inside', title: 'What\'s inside', desc: 'Exploded 3D views: overload relay, prox sensor, input card, VFD.', icon: 'search' as const },
  { id: 'practice', title: 'Practice at home', desc: 'Free and trial tools to keep learning.', icon: 'download' as const },
];

export default function ReferencePage({ section, item }: { section?: string; item?: string }) {
  const sec = section?.split('?')[0];
  const id = item?.split('?')[0];
  if (sec === 'brand' && id) return sub(<BrandGuide id={id} />);
  if (sec === 'brands') return sub(<Brands />);
  if (sec === 'compare') return sub(<ComparePage />);
  if (sec === 'cheats') return sub(<CheatPage />);
  if (sec === 'day-one') return sub(<DayOnePage />);
  if (sec === 'devices') return sub(<DeviceList />);
  if (sec === 'device' && id) return sub(<DeviceDetail id={id} />);
  if (sec === 'flow') return sub(id ? <FlowDetail id={id} /> : <FlowList />);
  if (sec === 'hardware') return sub(<HardwareLibrary />);
  if (sec === 'hw' && id) return sub(<HardwareDetail id={id} />);
  if (sec === 'instructions') return sub(<Instructions />);
  if (sec === 'glossary') return sub(<Glossary />);
  if (sec === 'safety') return sub(<Safety />);
  if (sec === 'practice') return sub(<Practice />);
  if (sec === 'inside') return sub(id ? <InsideDetail id={id} /> : <InsideList />);
  return (
    <div>
      <RouteHead seg="reference" />
      <a href={href('reference/hardware')} className="card card-link hw-card mb-3 block overflow-hidden" aria-label={`PLC hardware library: ${HARDWARE_COUNT} 3D models of hardware you see in US plants`}>
        <span className="grid grid-cols-3 gap-1.5 p-2 hw-thumb">
          <Suspense fallback={[0, 1, 2].map((i) => <span key={i} className="block w-full h-16 sm:h-24" />)}><FeaturedFronts /></Suspense>
        </span>
        <span className="flex items-center gap-3 card-pad">
          <span className="flex-1">
            <span className="block eyebrow">New · 3D</span>
            <span className="block font-bold text-heading text-lg">PLC hardware library</span>
            <span className="block text-sm text-muted">{HARDWARE_COUNT} PLCs, drives, HMIs, safety relays, remote I/O and building controllers from {HARDWARE_BRAND_COUNT} brands you see in US plants and data centers. Turn them, spread the modules, put a PLC in the simulator.</span>
          </span>
          <Icon name="chevron" className="text-glow flex-none" />
        </span>
      </a>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={href(`reference/${s.id}`)} className="card card-link card-pad flex gap-3 items-start">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: 'var(--blue-soft)' }}><Icon name={s.icon} className="text-glow" /></span>
            <span>
              <span className="block font-bold text-heading">{s.title}</span>
              <span className="block text-sm text-muted">{s.desc}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
