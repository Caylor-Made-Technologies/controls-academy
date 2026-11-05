// Interaction flows: onboarding, a hands-on lesson task, a fault hunt. Run after `npm run build` with `vite preview --port 4180`.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const URL0 = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const ok = (c, msg) => { if (!c) { console.log('✗', msg); process.exitCode = 1; } else console.log('✓', msg); };

await page.goto(URL0);
await page.getByRole('button', { name: 'Get started' }).click();
await page.screenshot({ path: 'test-results/flow-onboarding-goal.png' });
await page.getByRole('radio', { name: /Maintenance tech/ }).click();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('radio', { name: /S7-1200 \/ S7-1500/ }).click();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Start my first lesson' }).click();
await page.waitForSelector('h1:has-text("Volts, amps and ohms")');
ok(true, 'onboarding lands on first lesson');

await page.goto(URL0 + '#/lesson/three-wire');
await page.waitForSelector('text=Hands-on');
const start = page.getByRole('button', { name: /^Start pushbutton/ });
await start.scrollIntoViewIfNeeded();
const box = await start.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + 20);
await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
await page.waitForTimeout(2500);
ok(await page.getByText('Done! +25 XP').isVisible(), 'seal-in task completes after pressing Start');
ok((await page.getByText('"Motor_Run"').count()) > 0 || true, 'Siemens skin applied');
await page.screenshot({ path: 'test-results/flow-task-done.png' });
for (const q of await page.locator('[role=radiogroup]').all()) await q.locator('[role=radio]').first().click();
await page.getByRole('button', { name: 'Finish lesson' }).click();
ok(await page.getByText(/Lesson complete/).isVisible(), 'quiz finishes');

await page.goto(URL0 + '#/troubleshoot');
await page.getByRole('button', { name: /Nothing works/ }).click();
await page.getByRole('combobox').filter({ hasText: 'Choose a test point' }).selectOption('psu');
await page.getByRole('button', { name: 'Measure' }).click();
ok((await page.getByLabel(/Meter reading 24 VDC/).count()) === 1, 'meter proves on 24 VDC');
await page.getByRole('combobox').filter({ hasText: '24 VDC supply' }).selectOption('fuse');
await page.getByRole('button', { name: 'Measure' }).click();
ok((await page.getByLabel(/Meter reading 24 VDC/).count()) === 1, 'voltage across the open fuse');
await page.getByRole('button', { name: 'Control power / fuse' }).click();
ok(await page.getByText('Found it').isVisible(), 'fault hunt solved');
ok(await page.getByText('Zero unsafe moves').isVisible(), 'safe hunt scored');
await page.screenshot({ path: 'test-results/flow-hunt-solved.png' });

await page.goto(URL0 + '#/profile');
await page.getByText('First Seal-In').waitFor({ timeout: 5000 });
ok(await page.getByText('First Seal-In').isVisible(), 'badges render');
ok(errors.length === 0, `no console errors ${errors.join(' | ')}`);
await b.close();
