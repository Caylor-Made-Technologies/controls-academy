// Every-feature check. Usage: SITE_URL=https://…/controls-academy/ node tests/e2e/features.mjs
// (defaults to a local `vite preview --port 4180`). Each check reports ✓/✗ and the run continues.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const axeSrc = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const URL0 = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
mkdirSync('test-results', { recursive: true });

let pass = 0;
let fail = 0;
const errors = [];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
let lastPage = null;
const contexts = [];
async function check(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  const opened = contexts.length;
  try {
    await fn();
    pass++;
    console.log('✓', name);
  } catch (e) {
    fail++;
    try { await lastPage?.screenshot({ path: `test-results/fail-${fail}.png` }); } catch { /* page gone */ }
    // Close any browser contexts this check opened, so one failure can't slow down the rest of the run.
    for (const c of contexts.splice(opened)) await c.close().catch(() => {});
    console.log('✗', name, `[test-results/fail-${fail}.png]`, '—', process.env.VERBOSE ? String(e.message ?? e).slice(0, 1500) : String(e.message ?? e).split('\n')[0].slice(0, 220));
  }
}
const expect = (c, msg) => { if (!c) throw new Error(msg); };

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function newPage({ prefs = { onboarded: true }, progress, w = 1280, h = 900, motion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, bypassCSP: true, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(([pr, pg]) => {
    sessionStorage.setItem('ca:powered', '1');
    if (pr) localStorage.setItem('ca:prefs', JSON.stringify(pr));
    if (pg) localStorage.setItem('ca:progress', JSON.stringify(pg));
  }, [prefs, progress]);
  contexts.push(ctx);
  const page = await ctx.newPage();
  lastPage = page;
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${page.url().split('#')[1] ?? ''}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url().split('#')[1] ?? ''}: pageerror ${e.message}`));
  return { ctx, page };
}
const go = async (page, route) => {
  await page.goto(`${URL0}#/${route}`);
  await page.waitForTimeout(350); // let the previous page's exit transition finish
  await page.waitForSelector('main#main h1', { timeout: 15000 });
};
const clean = async (page) => {
  for (let i = 0; i < 3 && (await page.locator('[role=dialog]').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};
async function axe(page, label) {
  await page.waitForTimeout(700); // let entrance animations finish
  await page.addScriptTag({ content: axeSrc });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
  expect(v.length === 0, `${label} axe: ${v.join('; ')}`);
}
const press = async (page, name, ms = 250) => {
  const b = page.getByRole('button', { name: new RegExp(`^${name} pushbutton`) }).first();
  await b.scrollIntoViewIfNeeded();
  await b.click({ delay: ms });
};

// ---------- A. Onboarding ----------
await check('Onboarding: 4 screens, choices, axe on each, lands on first lesson', async () => {
  const { ctx, page } = await newPage({ prefs: null });
  await page.goto(URL0);
  await page.getByRole('dialog', { name: 'Welcome to Controls Academy' }).waitFor();
  await axe(page, 'onboarding 1');
  await page.getByRole('button', { name: 'Get started' }).click();
  expect(await page.getByRole('button', { name: 'Next' }).isDisabled(), 'Next should wait for a goal');
  await page.getByRole('radio', { name: /Building automation/ }).click();
  await axe(page, 'onboarding 2');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: /FX \/ iQ-F/ }).click();
  await axe(page, 'onboarding 3');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel(/What should we call you/).fill('Test Tech');
  await axe(page, 'onboarding 4');
  await page.getByRole('button', { name: 'Start my first lesson' }).click();
  await page.waitForSelector('h1:has-text("What electricity is")');
  await go(page, 'learn');
  expect(await page.getByText('Welcome back, Test Tech').isVisible(), 'name greeting');
  await ctx.close();
});

// ---------- B. Every lesson + quiz + glossary popover ----------
const LESSON_IDS = ['z-electricity', 'z-ohms-power', 'z-ac-dc', 'z-series-parallel', 'z-circuits-faults', 'z-grounding', 'z-safety', 'z-tools-ppe', 'z-symbols', 'z-control-panel', 'z-jobs', 'volts-amps-ohms', 'meter', 'relays-contactors', 'protection-devices', 'lototo', 'boundaries-ppe', 'reading-ladder-prints', 'panel-layouts', 'print-drills', 'three-wire', 'hardwired-safety', 'jog-fwd-rev', 'reduced-voltage', 'what-is-a-plc', 'sinking-sourcing', 'analog-420', 'numbers', 'data-types', 'contacts-coils', 'timers', 'counters', 'latch-unlatch', 'duplicate-coils', 'compare-math', 'alarm-ack', 'sequencers', 'program-organization', 'upload-download', 'forcing', 'compare-online', 'troubleshooting-method', 'fault-codes', 'ip-basics', 'profinet-names', 'modbus', 'legacy-networks', 'vfd-basics', 'hmi-basics', 'bacnet-bms', 'capstone-build', 'capstone-mixer', 'pid-tuning', 'analog-alarming', 'structured-text', 'reusable-logic', 'network-troubleshooting', 'commissioning', 'safety-systems', 'change-management'];
{
  const { ctx, page } = await newPage({ w: 390, h: 844 });
  for (const id of LESSON_IDS) {
    await check(`Lesson ${id}: loads, term popover, quiz completes`, async () => {
      await go(page, `lesson/${id}`);
      const term = page.locator('main .term').first();
      if (await term.count()) {
        await term.scrollIntoViewIfNeeded();
        await term.click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
      }
      for (const g of await page.locator('[role=radiogroup]').all()) await g.locator('[role=radio]').nth(1).click();
      await page.getByRole('button', { name: 'Finish lesson' }).click();
      await page.getByText(/Lesson complete/).waitFor();
    });
  }
  await check(`Learn: all ${LESSON_IDS.length} lessons show completed, XP awarded`, async () => {
    await go(page, 'learn');
    await page.getByText(`${LESSON_IDS.length}/${LESSON_IDS.length} lessons`).waitFor();
  });
  await check('Exams: a full sitting, results by topic with explanations, practice-record label, best score saved', async () => {
    await go(page, 'exam/intermediate');
    await page.getByRole('button', { name: 'Start' }).click();
    for (let i = 0; i < 12; i++) {
      await page.locator('[role=radiogroup] [role=radio]').first().click();
      const next = page.getByRole('button', { name: /^Next/ });
      if (await next.count()) await next.click(); else await page.getByRole('button', { name: /^Finish/ }).click();
    }
    await page.getByRole('heading', { name: /% · \d+ of 12/ }).waitFor();
    await page.getByText('By topic').waitFor();
    await page.getByText('Every question, explained').waitFor();
    if (!(await page.getByText(/Practice record — not a qualification or license/).count())) throw new Error('missing practice-record label');
    await go(page, 'exam');
    await page.getByText(/Best \d+ %/).first().waitFor();
  });
  await check('Study summary: terms, formulas, safety, mistakes; Markdown download', async () => {
    await go(page, 'summary/t4');
    for (const h of ['Why each lesson matters', 'Formulas', 'Safety points', 'Common mistakes']) await page.getByRole('heading', { name: h }).waitFor();
    await page.getByRole('heading', { name: /Key terms \(\d+\)/ }).waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download (.md)' }).click()]);
    if (!/track-4-summary\.md$/.test(dl.suggestedFilename())) throw new Error(dl.suggestedFilename());
  });
  await check('Machines: VFD station runs from the panel; a VFD fault hunt loads the VFD machine', async () => {
    await go(page, 'sim?m=vfd');
    await page.getByRole('heading', { name: 'Fan on a VFD' }).waitFor();
    await press(page, 'Start');
    await page.getByText(/\d+\.\d Hz · \d+\.\d A/).waitFor({ timeout: 8000 });
    await page.getByText('Drive parameters (generic names)').click();
    await page.getByRole('slider', { name: /Decel time/ }).waitFor();
    await go(page, 'troubleshoot/vfd-sto');
    await page.getByText(/STO/).first().waitFor();
    await page.getByRole('button', { name: 'A drive parameter is wrong' }).waitFor();
  });
  await check('Skill map: map and list views, every lesson listed, finished lessons marked', async () => {
    await go(page, 'skills');
    await page.locator('.skill-map svg').waitFor();
    await page.getByRole('button', { name: 'List' }).click();
    const items = page.locator('main section li a');
    if ((await items.count()) !== LESSON_IDS.length) throw new Error(`list shows ${await items.count()} lessons`);
    if (!(await page.locator('main .skill-chip.skill-done, main .skill-chip.skill-mastered').count())) throw new Error('no finished lessons marked');
    await page.getByRole('button', { name: 'Map' }).click();
  });
  await check('Drills: order drill explains a wrong tap, then completes; sort drill scores', async () => {
    await go(page, 'lesson/z-safety');
    const order = page.locator('[data-drill=order]');
    await order.scrollIntoViewIfNeeded();
    await order.getByRole('button', { name: 'Do the work' }).click();
    await order.getByText(/Not yet/).waitFor();
    for (const step of ['Tell the operators', 'Stop the machine', 'Open the disconnect', 'Release or block', 'Try to start it', 'prove absence', 'Do the work']) await order.getByRole('button', { name: new RegExp(step) }).click();
    await order.getByText('All in order.').waitFor();
    await go(page, 'lesson/z-control-panel');
    const sort = page.locator('[data-drill=sort]');
    await sort.scrollIntoViewIfNeeded();
    for (const g of await sort.locator('[role=group]').all()) await g.getByRole('button').first().click();
    await sort.getByText(/of 5 right\./).waitFor();
  });
  await check('Review: missed questions are scheduled (not due until tomorrow)', async () => {
    await go(page, 'review');
    await page.getByText('Nothing due').waitFor();
  });
  await ctx.close();
}

// ---------- C. Interactive figures ----------
await check('Figures: Ohm\'s law slider, sinking/sourcing, scaling, number bases, scan, print, meter', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/volts-amps-ohms');
  await page.getByRole('slider').first().fill('48');
  await page.getByText(/I = 200\.0 mA/).waitFor();
  await go(page, 'lesson/sinking-sourcing');
  await page.getByRole('button', { name: 'NPN sensor' }).click();
  await page.getByText(/No loop: both sides offer 0 V/).waitFor();
  await page.getByRole('button', { name: 'sourcing card' }).click();
  await page.getByText(/Works: card sources/).waitFor();
  await go(page, 'lesson/analog-420');
  await page.getByRole('slider').first().fill('2');
  await page.locator('figure').getByText('FAULT', { exact: true }).waitFor();
  await go(page, 'lesson/numbers');
  await page.locator('input[inputmode=numeric]').fill('8');
  await page.locator('figure').getByText('X10', { exact: true }).waitFor();
  await go(page, 'lesson/what-is-a-plc');
  await page.getByRole('button', { name: /Write outputs/ }).click();
  await page.getByText(/output image is copied/).waitFor();
  await go(page, 'lesson/three-wire');
  await page.getByRole('button', { name: 'Press Start' }).click();
  await page.getByText(/sealed in through its own contact/).waitFor();
  await go(page, 'lesson/meter');
  await page.getByRole('group', { name: /live terminal/ }).getByRole('button', { name: 'V' }).click();
  await page.getByText(/^Right\./).waitFor();
  await ctx.close();
});

// ---------- D. Hands-on tasks ----------
const taskDone = async (page) => page.getByText('Done! +25 XP').waitFor({ timeout: 12000 });
await check('Task three-wire: seal-in', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/three-wire');
  await press(page, 'Start');
  await taskDone(page);
  await ctx.close();
});
await check('Task what-is-a-plc: single-step a full scan', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/what-is-a-plc');
  await page.getByRole('button', { name: 'Step', exact: true }).first().click();
  for (let i = 0; i < 12; i++) await page.locator('button.btn-primary:has-text("Step")').click();
  await taskDone(page);
  await ctx.close();
});
await check('Task contacts-coils: change XIO → XIC on Stop_PB in the editor', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/contacts-coils');
  await press(page, 'Start');
  await page.waitForTimeout(400);
  expect(!(await page.getByText('Done! +25 XP').isVisible()), 'should not start before the fix');
  await page.getByRole('button', { name: /^Normally-closed contact \(?.*Stop_PB/ }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog', { name: 'Edit instruction' }).getByRole('combobox').first().selectOption('XIC');
  await page.getByRole('button', { name: 'Save' }).click();
  await press(page, 'Start');
  await taskDone(page);
  await ctx.close();
});
await check('Task timers: hold Start 3 s', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/timers');
  await press(page, 'Start', 3600);
  await taskDone(page);
  await ctx.close();
});
await check('Task counters: five presses', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/counters');
  for (let i = 0; i < 5; i++) { await press(page, 'Start', 250); await page.waitForTimeout(350); }
  await taskDone(page);
  await ctx.close();
});
await check('Task duplicate-coils: Verify finds it, delete rung 1 fixes it', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/duplicate-coils');
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByText(/has 2 output coils/).waitFor();
  await page.getByRole('button', { name: 'Select rung 1' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await press(page, 'Start');
  await taskDone(page);
  await ctx.close();
});
await check('Task latch-unlatch: alarm latches after 2 s, Reset clears it', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/latch-unlatch');
  await press(page, 'Start');
  await page.getByRole('img', { name: 'Fault light on' }).waitFor({ timeout: 6000 });
  await press(page, 'Reset');
  await taskDone(page);
  await ctx.close();
});

await check('Task capstone-build: write start/stop from a blank rung in the editor', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'lesson/capstone-build');
  const add = async (tag) => {
    await page.getByRole('button', { name: 'Select rung 0' }).click();
    await page.getByRole('button', { name: 'Add Normally-open contact' }).click();
    const dlg = page.getByRole('dialog', { name: 'Edit instruction' });
    await dlg.getByRole('button', { name: tag, exact: true }).first().click();
    await dlg.getByRole('button', { name: 'Save' }).click();
    await dlg.waitFor({ state: 'detached' });
  };
  await add('Start_PB');
  await page.getByRole('button', { name: /Normally-open contact .*Start_PB/ }).click();
  await page.getByRole('button', { name: 'Branch' }).click();
  let dlg = page.getByRole('dialog', { name: 'Edit instruction' });
  await dlg.getByRole('button', { name: 'Motor_Run', exact: true }).first().click();
  await dlg.getByRole('button', { name: 'Save' }).click();
  await dlg.waitFor({ state: 'detached' });
  for (const t of ['Stop_PB', 'EStop_OK', 'OL_OK']) await add(t);
  await press(page, 'Start');
  await page.getByRole('img', { name: 'Running light on' }).waitFor({ timeout: 6000 });
  await page.waitForTimeout(600); // let the motor come up to speed (real inertia now)
  await press(page, 'Stop');
  await taskDone(page);
  await ctx.close();
});

// ---------- E. Simulator workbench ----------
{
  const { ctx, page } = await newPage();
  await go(page, 'sim');
  const _check = check;
  const check2 = async (name, fn) => _check(name, async () => { await clean(page); await fn(); });
  await check2('Sim: motor starts, seals in, stops; lights follow', async () => {
    await press(page, 'Start');
    await page.getByRole('img', { name: 'Running light on' }).waitFor({ timeout: 6000 });
    await press(page, 'Stop');
    await page.getByRole('img', { name: 'Running light off' }).waitFor({ timeout: 6000 });
  });
  await check2('Sim: E-stop drops the motor and it does not restart on release', async () => {
    await press(page, 'Start');
    await page.getByRole('img', { name: 'Running light on' }).waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: /^Emergency stop/ }).click();
    await page.getByRole('img', { name: 'Running light off' }).waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: /^Emergency stop/ }).click();
    await page.waitForTimeout(800);
    expect(await page.getByRole('img', { name: 'Running light off' }).isVisible(), 'restarted on E-stop release!');
  });
  await check2('Sim: jam the load → overload trips → reset overload', async () => {
    await press(page, 'Start');
    await page.getByRole('button', { name: 'Jam the load' }).click();
    await page.getByText('OL tripped').waitFor({ timeout: 20000 });
    await page.getByRole('img', { name: 'Fault light on' }).waitFor();
    await page.getByRole('button', { name: 'Clear the jam' }).click();
    // A thermal overload has to cool before it will reset.
    await page.getByRole('button', { name: /Cooling — reset in/ }).waitFor();
    expect(await page.getByRole('button', { name: /Cooling — reset in/ }).isDisabled(), 'reset blocked while hot');
    await page.getByRole('button', { name: 'Reset overload', exact: true }).click({ timeout: 30000 });
    await page.getByText('OL tripped').waitFor({ state: 'detached' });
  });
  await check2('Sim: Slow-mo and Step modes, scan pointer', async () => {
    await page.getByRole('button', { name: 'Slow-mo' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Step', exact: true }).first().click();
    await page.locator('button.btn-primary:has-text("Step")').click();
    await page.getByText('about to READ INPUTS', { exact: false }).waitFor();
    await page.locator('button.btn-primary:has-text("Step")').click();
    await page.getByText(/about to SOLVE rung 0/).waitFor();
    await page.getByRole('button', { name: 'Run', exact: true }).click();
  });
  await check2('Sim: PROG/RUN mode toggle', async () => {
    await page.getByRole('button', { name: /Controller mode RUN/ }).click();
    await page.getByRole('button', { name: /Controller mode PROG/ }).waitFor();
    await page.getByRole('button', { name: /Controller mode PROG/ }).click();
    await page.getByRole('button', { name: /Controller mode RUN/ }).waitFor();
  });
  await check2('Sim: platform bar names the PLC; grouped picker switches maker, family and addresses', async () => {
    const bar = page.locator('.platform-bar');
    expect((await bar.textContent()).includes('Allen-Bradley'), 'bar shows maker');
    await bar.click();
    const dlg = page.getByRole('dialog', { name: 'Which PLC are you working on?' });
    for (const h of ['Allen-Bradley (Rockwell Automation)', 'Siemens', 'Mitsubishi Electric', 'Schneider Electric', 'AutomationDirect', 'Omron']) await dlg.getByRole('heading', { name: h }).waitFor();
    await dlg.getByRole('radio', { name: /S7-1200 \/ S7-1500/ }).click();
    await page.locator('.platform-bar', { hasText: 'Siemens' }).waitFor();
    await page.locator('.platform-bar', { hasText: '%I0.0' }).waitFor();
    expect((await page.locator('.instr .tagname').first().textContent()) === '"Start_PB"', 'ladder relabeled');
    await page.locator('#skin-select').selectOption('ab-logix');
    await page.locator('.platform-bar', { hasText: 'ControlLogix' }).waitFor();
  });
  await check2('Sim: all 10 brand skins render the ladder', async () => {
    const sel = page.locator('#skin-select');
    const values = await sel.locator('option').evaluateAll((o) => o.map((x) => x.value));
    expect(values.length === 10, `found ${values.length} skins`);
    const seen = [];
    for (const v of values) {
      await sel.selectOption(v);
      await page.waitForTimeout(120);
      seen.push(await page.locator('.instr .tagname').first().textContent());
    }
    expect(seen.includes('X0') && seen.includes('I:1/0') && seen.includes('"Start_PB"'), `labels ${seen.join(',')}`);
    await sel.selectOption('ab-logix');
  });
  await check2('Sim editor: add rung, add contact with operand, branch, comment, dup, move, undo/redo, delete', async () => {
    const rungs = async () => page.locator('.rung').count();
    const n0 = await rungs();
    await page.getByRole('button', { name: 'Rung', exact: true }).click();
    expect((await rungs()) === n0 + 1, 'rung added');
    await page.getByRole('button', { name: 'Add Normally-open contact' }).click();
    const dlg = page.getByRole('dialog', { name: 'Edit instruction' });
    await dlg.getByRole('button', { name: 'Start_PB', exact: true }).first().click();
    await dlg.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Branch' }).click();
    await page.getByRole('dialog', { name: 'Edit instruction' }).getByRole('button', { name: 'Reset_PB', exact: true }).first().click();
    await page.getByRole('dialog', { name: 'Edit instruction' }).getByRole('button', { name: 'Save' }).click();
    expect(await page.locator('.branch').count() >= 3, 'branch added');
    await page.getByRole('button', { name: 'Comment' }).click();
    await page.getByRole('textbox', { name: 'Rung comment' }).fill('Test comment');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: /Move left/ }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Redo' }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: `Select rung ${n0}` }).click();
    await page.getByRole('button', { name: 'Dup' }).click();
    expect((await rungs()) === n0 + 2, 'rung duplicated');
    await page.getByRole('button', { name: 'Delete' }).click();
    expect((await rungs()) === n0 + 1, 'rung deleted');
  });
  await check2('Sim editor: keyboard — arrows, Enter edits, Delete, Ctrl+Z', async () => {
    const first = page.locator('.instr').first();
    await first.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Edit instruction' }).waitFor();
    await page.keyboard.press('Escape');
    const before = await page.locator('.instr').count();
    await page.locator('.instr').first().click();
    await page.keyboard.press('Delete');
    expect((await page.locator('.instr').count()) === before - 1, 'deleted by key');
    await page.keyboard.press('Control+z');
    expect((await page.locator('.instr').count()) === before, 'undo by key');
  });
  await check2('Sim: Verify panel + cross-reference', async () => {
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByText(/^Verify:/).waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    await page.locator('.instr').first().click();
    await page.getByRole('button', { name: /^Cross-reference/ }).click();
    await page.getByRole('dialog', { name: /Cross-reference/ }).getByText(/reads|writes/).first().waitFor();
    await page.keyboard.press('Escape');
  });
  await check2('Sim: "More…" sheet adds any instruction (TON)', async () => {
    await page.getByRole('button', { name: 'More…' }).click();
    await page.getByRole('dialog', { name: 'All instructions' }).getByRole('button', { name: /^TON/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Edit instruction' });
    await dlg.locator('details summary').click();
    await dlg.getByPlaceholder('Pump1_Run').fill('Test_Tmr');
    await dlg.locator('details select').selectOption('TIMER');
    await dlg.getByRole('button', { name: 'Add tag' }).click();
    await dlg.getByRole('button', { name: 'Save' }).click();
    await page.locator('.box-title', { hasText: 'TON' }).last().waitFor();
  });
  await check2('Sim: tag monitor opens and toggles an internal bit', async () => {
    await page.getByText(/Tag monitor/).click();
    const row = page.locator('tr', { hasText: 'Fail_Alarm' });
    await row.getByRole('button').click();
    await row.getByRole('button', { name: /1 · ON/ }).waitFor();
    await row.getByRole('button').click();
    await page.getByText(/Tag monitor/).click();
  });
  await check2('Sim: force an input with confirmation, FORCE shown, remove force', async () => {
    await page.getByRole('button', { name: /^Input 4, Reset/ }).click();
    await page.getByRole('button', { name: 'Force ON' }).click();
    await page.getByRole('button', { name: 'Yes, force ON' }).click();
    await page.keyboard.press('Escape');
    await page.getByText('FORCE', { exact: true }).waitFor();
    await page.getByRole('button', { name: /^Input 4, Reset: .*forced/ }).click();
    await page.getByRole('button', { name: 'Remove force' }).click();
    await page.keyboard.press('Escape');
    await page.getByText('FORCE', { exact: true }).waitFor({ state: 'detached' });
  });
  let exported = '';
  await check2('Sim: export program JSON', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
    exported = 'test-results/exported-program.json';
    await dl.saveAs(exported);
    const j = JSON.parse(readFileSync(exported, 'utf8'));
    expect(j.routines?.[0]?.rungs?.length > 0, 'program has rungs');
  });
  await check2('Sim: restore Original, then import the exported program', async () => {
    await page.getByRole('button', { name: 'Original' }).click();
    await page.getByText('Restored the original program for this machine.').waitFor();
    await page.locator('input[type=file]').setInputFiles(exported);
    await page.getByText(/^Imported "/).waitFor();
    const bad = 'test-results/bad.json';
    writeFileSync(bad, JSON.stringify({ hello: 'world' }));
    await page.locator('input[type=file]').setInputFiles(bad);
    await page.getByText("That file isn't a Controls Academy program.").waitFor();
  });
  let shareUrl = '';
  await check2('Sim: share link copies, and opening it loads the program', async () => {
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByText(/Link copied/).waitFor();
    shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl.includes('#/sim?p='), 'link format');
    const p2 = await ctx.newPage();
    await p2.goto(shareUrl);
    await p2.getByText('Loaded a shared program from the link.').waitFor();
    await p2.close();
  });
  await check2('Sim: program autosaves across reload', async () => {
    await page.getByRole('button', { name: 'Rung', exact: true }).click();
    const n = await page.locator('.rung').count();
    await page.waitForTimeout(700);
    await page.reload();
    await page.waitForSelector('.rung');
    expect((await page.locator('.rung').count()) === n, 'rung count persisted');
    await page.getByRole('button', { name: 'Original' }).click();
  });
  await check2('Sim: "Same logic, ten dialects" table', async () => {
    await page.getByRole('heading', { name: 'Same logic, ten dialects' }).scrollIntoViewIfNeeded();
    await page.getByRole('region', { name: 'Addresses in every brand dialect' }).getByText('%I0.0').first().waitFor();
  });
  await check2('Sim page axe (2D)', async () => axe(page, 'sim'));
  await ctx.close();
}

// ---------- F. Fault Hunt: every fault ----------
const HUNTS = [
  ['Nothing works', async (p) => p.getByRole('button', { name: 'Control power / fuse' }).click()],
  ['Start button does nothing', async (p) => { await p.getByRole('button', { name: /^Input 1, Stop/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
  ['stop and reset seem fine', async (p) => { await p.getByRole('button', { name: /^Input 0, Start/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
  ['amber fault light comes on after a couple', async (p) => { await p.getByRole('button', { name: /^Contactor M1/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
  ['ran a few seconds then stopped', async (p) => { await p.getByRole('button', { name: /^Overload relay/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
  ["last night's maintenance", async (p) => p.getByRole('button', { name: 'A force is installed' }).click()],
  ['hums for two seconds', async (p) => { await p.getByRole('button', { name: /^Input 3, M1 aux/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
  ['line is dead', async (p) => { await p.getByRole('button', { name: /^Input 5, E-stop/ }).click(); await p.getByRole('button', { name: 'This is the problem' }).click(); }],
];
{
  const { ctx, page } = await newPage();
  for (const [complaint, solve] of HUNTS) {
    await check(`Fault Hunt "${complaint}…": solvable, meter reads, scored`, async () => {
      await go(page, 'troubleshoot');
      await page.getByRole('button', { name: new RegExp(complaint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click();
      const sel = page.locator('select').filter({ hasText: 'Choose a test point' });
      for (const v of ['psu', 'i0', 'i1', 'coil', 'o0']) {
        await sel.selectOption(v);
        await page.getByRole('button', { name: 'Measure' }).click();
        expect(/\d/.test(await page.getByRole('status', { name: /Meter reading/ }).textContent()), 'meter shows a number');
      }
      await solve(page);
      await page.getByText('Found it').waitFor();
    });
  }
  await check('Fault Hunt: wrong pick costs points with a teaching moment; force costs points', async () => {
    await go(page, 'troubleshoot');
    await page.getByRole('button', { name: /Nothing works/ }).click();
    await page.getByRole('button', { name: 'The program is wrong' }).click();
    await page.getByRole('alert').getByText('Teaching moment').waitFor();
    await page.getByRole('alert').getByRole('button', { name: 'OK', exact: true }).click();
    await page.getByRole('button', { name: /^Input 4, Reset/ }).click();
    await page.getByRole('button', { name: 'Force ON' }).click();
    await page.getByRole('button', { name: 'Yes, force ON' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('alert').getByText(/Forcing can start equipment/).waitFor();
    await page.getByRole('button', { name: 'Control power / fuse' }).click();
    await page.getByText(/2 unsafe \/ wasted moves/).waitFor();
    await axe(page, 'hunt result');
  });
  await check('Fault Hunt list shows all 8 solved; Surprise me starts a hunt', async () => {
    await go(page, 'troubleshoot');
    await page.getByText('8/8 solved', { exact: false }).first().waitFor();
    await page.getByRole('button', { name: 'Start a hunt' }).click();
    await page.getByText('Work order').waitFor();
  });
  await ctx.close();
}

// ---------- G. Reference ----------
await check('Reference: 8 brand guides, skin button, instructions filter, glossary filter, safety, practice', async () => {
  const { ctx, page } = await newPage();
  for (const id of ['rockwell', 'siemens', 'schneider', 'mitsubishi', 'automationdirect', 'omron', 'emerson', 'beckhoff']) {
    await go(page, `reference/brand/${id}`);
    await page.getByRole('heading', { name: 'Gotchas' }).waitFor();
  }
  await go(page, 'reference/brand/siemens');
  await page.getByRole('button', { name: /Use Siemens S7-1200\/1500 skin/ }).click();
  await page.getByRole('button', { name: /Simulator uses Siemens/ }).waitFor();
  await go(page, 'reference/instructions');
  await page.getByRole('button', { name: 'Timers', exact: true }).click();
  expect((await page.locator('section[id^=op-]').count()) === 3, 'timer filter');
  await go(page, 'reference/glossary');
  await page.getByLabel('Filter glossary').fill('octal');
  expect((await page.locator('dl > div').count()) >= 1, 'glossary filter');
  await go(page, 'reference/glossary?t=seal-in');
  await go(page, 'reference/safety');
  await page.getByText('Never bypass a safety circuit.').waitFor();
  await go(page, 'reference/practice');
  await page.getByText('OpenPLC').waitFor();
  await ctx.close();
});

await check('Reference: 25 brand guides with US notes; hardware library lists every model with a front view', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'reference/brands');
  expect((await page.locator('a[href*="reference/brand/"]').count()) === 25, 'brand count');
  for (const id of ['idec', 'unitronics', 'wago', 'phoenix', 'eaton', 'keyence', 'opto22', 'delta', 'bnr', 'yaskawa', 'abb', 'danfoss', 'redlion', 'pilz', 'tridium', 'jci', 'honeywell']) {
    await go(page, `reference/brand/${id}`);
    await page.getByRole('heading', { name: 'Common models in 3D' }).waitFor();
  }
  await go(page, 'reference/brand/rockwell');
  await page.getByRole('heading', { name: 'Networks' }).waitFor();
  expect((await page.locator('a[href*="reference/hw/"]').count()) >= 8, 'rockwell models');
  await go(page, 'reference/hardware');
  const n = await page.locator('a[href*="reference/hw/"]').count();
  expect(n >= 45, `hardware count ${n}`);
  expect((await page.locator('a[href*="reference/hw/"] svg').count()) === n, 'every card has a front view');
  await page.getByRole('button', { name: 'Siemens', exact: true }).click();
  expect((await page.locator('a[href*="reference/hw/"]').count()) === 12, 'siemens filter');
  await page.getByRole('button', { name: 'All brands' }).click();
  await page.getByRole('button', { name: 'Legacy', exact: true }).click();
  expect((await page.locator('a[href*="reference/hw/"]').count()) === 13, 'legacy filter');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: /^Drives \(VFDs\)/ }).click();
  expect((await page.locator('a[href*="reference/hw/"]').count()) === 19, 'drive filter');
  await page.getByRole('button', { name: /^All types/ }).click();
  await page.getByLabel('Search hardware').fill('1756');
  expect((await page.locator('a[href*="reference/hw/"]').count()) === 2, 'search 1756');
  await ctx.close();
});

await check('Hardware: 3D model renders, tap-free module list explains parts, "Use in the simulator" swaps the 3D panel PLC', async () => {
  const { ctx, page } = await newPage({ prefs: { onboarded: true, quality: 'low' }, motion: 'no-preference' });
  await go(page, 'reference/hw/s7-1500');
  await page.locator('canvas').first().waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Spread modules' }).click();
  expect((await page.getByRole('button', { name: 'Spread modules' }).getAttribute('aria-pressed')) === 'true', 'spread on');
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByLabel('At a glance').getByText('DIN rail').waitFor();
  await page.getByRole('button', { name: 'CPU', exact: true }).click();
  await page.getByRole('heading', { name: /Controller \(CPU\)/ }).waitFor();
  await page.getByRole('button', { name: 'Show flat front view' }).click();
  await page.getByRole('img', { name: /Front view of SIMATIC S7-1500/ }).waitFor();
  await page.getByRole('button', { name: 'Use in the simulator' }).click();
  await page.getByRole('button', { name: 'Shown in the simulator' }).waitFor();
  await go(page, 'sim');
  const sel = page.getByLabel('PLC hardware shown in 3D');
  await sel.waitFor({ timeout: 30000 });
  expect((await sel.inputValue()) === 's7-1500', 'sim shows chosen model');
  await sel.selectOption('generic');
  await page.waitForTimeout(500);
  expect((await sel.inputValue()) === 'generic', 'generic rack');
  await ctx.close();
});

// ---------- H. Search ----------
await check('Search: Ctrl+K and phone search button find lessons, terms, instructions, brands', async () => {
  const { ctx, page } = await newPage();
  await go(page, 'learn');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search' }).fill('sinking');
  await page.keyboard.press('Enter');
  await page.waitForSelector('h1:has-text("Sinking vs sourcing")');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search' }).fill('TON');
  await page.getByRole('option', { name: /TON — On-delay timer/ }).click();
  await page.waitForSelector('#op-TON');
  await ctx.close();
  const m = await newPage({ w: 390, h: 844 });
  await go(m.page, 'learn');
  await m.page.getByRole('button', { name: /Search lessons/ }).click();
  await m.page.getByRole('combobox', { name: 'Search' }).fill('siemens');
  await m.page.getByRole('option', { name: /^Siemens/ }).first().click();
  await m.page.waitForSelector('h1:has-text("Siemens")');
  await m.ctx.close();
});

// ---------- I. Review with due items ----------
await check('Review: due questions appear, answer, finish', async () => {
  const due = { version: 1, xp: 100, lessons: {}, review: { 'meter.q1': { box: 0, due: '2020-01-01' }, 'lototo.q2': { box: 0, due: '2020-01-01' } }, hunts: {}, days: [], skinsSeen: [], stepped: false, perfectQuizzes: 0, lastRoute: '' };
  const { ctx, page } = await newPage({ progress: due });
  await go(page, 'learn');
  await page.getByText('2 questions to review').click();
  await page.getByText('Question 1 of 2').waitFor();
  // Missed questions are asked once more at the end, so the session is 2–4 questions long.
  for (let n = 0; n < 4; n++) {
    await page.locator('[role=radio]').first().click();
    const missed = (await page.getByText('Not quite.').count()) > 0;
    const finish = page.getByRole('button', { name: 'Finish' });
    if (await finish.count()) { if (!missed) { await finish.click(); break; } }
    await page.getByRole('button', { name: /^(Next question|Finish)$/ }).click();
    if (await page.getByText('Review done for today').count()) break;
  }
  await page.getByText('Review done for today').waitFor();
  await ctx.close();
});

// ---------- J. Profile ----------
{
  const t1done = { version: 1, xp: 250, lessons: Object.fromEntries(['volts-amps-ohms', 'meter', 'relays-contactors', 'protection-devices', 'lototo', 'boundaries-ppe'].map((k) => [k, { score: 3, total: 3, taskDone: false, at: '2026-11-04' }])), review: {}, hunts: {}, days: [], skinsSeen: [], stepped: false, perfectQuizzes: 4, lastRoute: 'lesson/meter' };
  const { ctx, page } = await newPage({ progress: t1done });
  await check('Profile: level, badges, Track 1 certificate saves a PNG', async () => {
    await go(page, 'profile');
    await page.getByText('Panel Rookie').waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save certificate for track 1', exact: true }).click()]);
    expect(dl.suggestedFilename().endsWith('.png'), 'png');
    expect(await page.getByRole('button', { name: 'Save certificate for track 2', exact: true }).isDisabled(), 'track 2 locked');
  });
  await check('Profile: theme Light/Dark/System, text size, sound, goal, name, intro again', async () => {
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'light');
    await axe(page, 'profile light');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'dark');
    await page.getByRole('button', { name: 'System', exact: true }).click();
    await page.getByRole('button', { name: 'A+', exact: true }).click();
    expect((await page.evaluate(() => document.documentElement.style.fontSize)) === '115%', 'text size');
    await page.getByRole('button', { name: 'A', exact: true }).click();
    await page.getByRole('button', { name: /^Off$|Off/ }).first().click();
    await page.getByLabel('Goal').selectOption('bas');
    await page.getByLabel('Your name').fill('Jon');
    await page.getByLabel('3D quality').selectOption('2d');
    await page.getByLabel('3D quality').selectOption('auto');
  });
  await check('Learn: "Jump back in" resumes last route', async () => {
    await go(page, 'learn');
    await page.getByText('Jump back in').waitFor();
  });
  let backup = '';
  await check('Profile: export progress, erase, import restores', async () => {
    await go(page, 'profile');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export progress' }).click()]);
    backup = 'test-results/progress-backup.json';
    await dl.saveAs(backup);
    await page.getByRole('button', { name: 'Erase everything' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Erase' }).click();
    await page.getByText('Erased.').waitFor();
    await page.getByText('Apprentice').waitFor();
    await page.locator('input[type=file]').setInputFiles(backup);
    await page.getByText('Progress restored.').waitFor();
    await page.getByText('Panel Rookie').waitFor();
  });
  await check('About: privacy, trademarks, font licenses reachable, sister-app link', async () => {
    await go(page, 'about');
    await page.getByText('Not affiliated with or endorsed by', { exact: false }).first().waitFor();
    for (const f of ['fonts/Inter-OFL.txt', 'fonts/Montserrat-OFL.txt']) {
      const r = await page.request.get(URL0 + f);
      expect(r.ok(), `${f} ${r.status()}`);
    }
    expect(await page.getByRole('link', { name: /Sister app/ }).getAttribute('href') === 'https://caylor-made-technologies.github.io/critical-facilities-sim/', 'sibling link');
  });
  await check('Profile: "Show intro again" re-opens onboarding', async () => {
    await go(page, 'profile');
    await page.getByRole('button', { name: 'Show again' }).click();
    await page.getByRole('dialog', { name: 'Welcome to Controls Academy' }).waitFor();
    await page.getByRole('button', { name: 'Skip' }).click();
  });
  await ctx.close();
}

// ---------- K. 3D ----------
await check('3D: opens by default on Simulator, tap a part opens its info sheet, tours, X-ray, explode', async () => {
  const { ctx, page } = await newPage({ prefs: { onboarded: true, quality: 'low' }, motion: 'no-preference', w: 1100, h: 860 });
  await go(page, 'sim');
  const canvas = page.locator('section[aria-label="3D control panel"] canvas');
  await canvas.waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'PLC rack' }).click();
  await page.waitForTimeout(2500);
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('dialog').getByText('How to test it').waitFor({ timeout: 8000 });
  const title = await page.getByRole('dialog').locator('h2').textContent();
  console.log('   tapped part:', title);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'X-ray current' }).click();
  await page.getByRole('note', { name: 'Current flow legend' }).waitFor();
  await page.getByRole('button', { name: 'Explode contactor' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/features-3d.png' });
  await ctx.close();
});
await check('3D: reduced motion and "2D only" open in 2D', async () => {
  const a = await newPage({ prefs: { onboarded: true, quality: 'auto' }, motion: 'reduce' });
  await go(a.page, 'sim');
  await a.page.waitForTimeout(800);
  expect((await a.page.locator('canvas').count()) === 0, 'reduced motion should not load 3D');
  await a.ctx.close();
  const b = await newPage({ prefs: { onboarded: true, quality: '2d' }, motion: 'no-preference' });
  await go(b.page, 'sim');
  await b.page.waitForTimeout(800);
  expect((await b.page.locator('canvas').count()) === 0 && (await b.page.getByRole('button', { name: '3D panel' }).count()) === 0, '2D only hides 3D');
  await b.ctx.close();
});

// ---------- L. PWA / offline ----------
await check('PWA: manifest + icons served; service worker controls the page; works offline', async () => {
  const { ctx, page } = await newPage();
  for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.svg', 'sw.js']) {
    const r = await page.request.get(URL0 + f);
    expect(r.ok(), `${f} ${r.status()}`);
  }
  const m = await (await page.request.get(URL0 + 'manifest.webmanifest')).json();
  expect(m.display === 'standalone' && m.start_url === '/controls-academy/', 'manifest fields');
  await go(page, 'learn');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await ctx.setOffline(true);
  await page.goto(`${URL0}#/lesson/timers`);
  await page.reload();
  await page.waitForSelector('h1:has-text("Timers")', { timeout: 15000 });
  await go(page, 'sim');
  await page.waitForSelector('.rung');
  await ctx.setOffline(false);
  await ctx.close();
});

await browser.close();
const relevant = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
console.log(`\n${pass} passed, ${fail} failed`);
if (relevant.length) console.log(`Console errors/warnings (${relevant.length}):\n  ${[...new Set(relevant)].slice(0, 20).join('\n  ')}`);
process.exit(fail || relevant.length ? 1 : 0);
