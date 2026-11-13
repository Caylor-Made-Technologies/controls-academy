import { RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { BUSINESS } from '../../lib/business';
import { href } from '../../lib/router';

const BASE = import.meta.env.BASE_URL;

export default function AboutPage() {
  return (
    <div className="max-w-[72ch]">
      <RouteHead seg="about" />

      <section className="card card-pad mb-4 flex gap-4 items-center">
        <img src={`${BASE}brand/logo-mark.png`} width={72} height={72} alt="Caylor Made Technologies CM circuit monogram" />
        <div>
          <p className="m-0 font-head font-extrabold text-heading tracking-wide">CAYLOR MADE TECHNOLOGIES</p>
          <p className="m-0 grad-text font-semibold">Advanced Engineering. Built Different.</p>
          <p className="m-0 text-sm text-muted mt-1">{BUSINESS.city} · <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={BUSINESS.site} target="_blank" rel="noopener noreferrer">{BUSINESS.siteLabel}</a></p>
        </div>
      </section>

      <p>Controls Academy is a free trainer that takes you from zero to competent with PLCs and industrial controls: electrical basics, prints, hardwired motor control, ladder logic, going online, and troubleshooting a machine with a meter. Built by a tech who works in mills and data centers, for the people who keep machines running.</p>

      <a href={BUSINESS.sibling} target="_blank" rel="noopener noreferrer" className="card card-link card-pad flex items-center gap-3 my-4">
        <Icon name="bolt" className="text-glow" />
        <span className="flex-1"><span className="block font-bold text-heading">Sister app: Critical Facilities Simulator</span><span className="block text-sm text-muted">Data center power, cooling, redundancy and safety drills.</span></span>
        <Icon name="chevron" />
      </a>

      <h2 className="text-lg font-bold mt-6 mb-2">Privacy</h2>
      <ul className="pl-5 list-disc space-y-1.5">
        <li>No accounts, analytics, ads, cookies or trackers.</li>
        <li>Your progress, settings and programs are stored only in this browser (IndexedDB, with localStorage as a fallback). Erase them any time in Profile.</li>
        <li>Backups and shared program links are created on your device. A share link contains the program itself; nothing is uploaded.</li>
        <li>The app works offline after the first visit. The only network requests are to this site for its own files and updates.</li>
        <li>Not directed at children under 13.</li>
        <li>Questions or deletion requests: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. Since we hold no data, deleting your browser data deletes everything.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Training only</h2>
      <p>This is educational software. It is not a substitute for qualified training, manufacturer documentation, or your site's procedures. Never apply anything here to live equipment without authorization. Example values (motor current, overload timing, raw analog ranges) are illustrative. Items marked <span className="chip chip-warn !min-h-5.5 !text-2xs">check your manual</span> vary by platform, model or version.</p>
      <p className="text-sm text-muted">Terms and policy text here are templates until reviewed by an attorney.</p>

      <h2 className="text-lg font-bold mt-6 mb-2">Trademarks</h2>
      <p>Not affiliated with or endorsed by Rockwell Automation, Siemens, Schneider Electric, Mitsubishi Electric, AutomationDirect, Omron, Emerson, Beckhoff, or any other manufacturer. All trademarks belong to their owners. Brand names are used only to describe the conventions each platform uses. All interface artwork is original.</p>

      <h2 className="text-lg font-bold mt-6 mb-2">Credits & licenses</h2>
      <ul className="pl-5 list-disc space-y-1.5 text-sm">
        <li>Inter and Montserrat fonts — SIL Open Font License 1.1 (<a href={`${BASE}fonts/Inter-OFL.txt`}>Inter</a>, <a href={`${BASE}fonts/Montserrat-OFL.txt`}>Montserrat</a>), self-hosted.</li>
        <li>Built with React, Vite, Tailwind CSS, Framer Motion, Zustand and idb-keyval (MIT / Apache-2.0 licensed open-source projects).</li>
        <li>App icon, CM monogram and all diagrams: original artwork by Caylor Made Technologies. Sounds are generated on device.</li>
      </ul>
      <p className="text-sm text-muted mt-4">Source: <a href={BUSINESS.github} target="_blank" rel="noopener noreferrer">GitHub</a> · Version {__APP_VERSION__} · <a href={href('styleguide')}>Styleguide</a></p>
    </div>
  );
}
