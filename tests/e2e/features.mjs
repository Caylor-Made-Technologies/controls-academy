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
async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log('✓', name);
  } catch (e) {
    fail++;
    console.log('✗', name, '—', String(e.message ?? e).split('\n')[0].slice(0, 220));
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
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${page.url().split('#')[1] ?? ''}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url().split('#')[1] ?? ''}: pageerror ${e.message}`));
  return { ctx, page };
}
const go = async (page, route) => {
  await page.goto(`${URL0}#/${route}`);
  await page.waitForSelector('main#main h1', { timeout: 15000 });
};
async function axe(page, label) {
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
  await page.getByRole('radio', { name: /Mitsubishi/ }).click();
  await axe(page, 'onboarding 3');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel(/What should we call you/).fill('Test Tech');
  await axe(page, 'onboarding 4');
  await page.getByRole('button', { name: 'Start my first lesson' }).click();
  await page.waitForSelector('h1:has-text("Volts, amps and ohms")');
  await go(page, 'learn');
  expect(await page.getByText('Welcome back, Test Tech').isVisible(), 'name greeting');
  await ctx.close();
});

// ---------- B. Every lesson + quiz + glossary popover ----------
const LESSON_IDS = ['volts-amps-ohms', 'meter', 'lototo', 'relays-contactors', 'reading-ladder-prints', 'three-wire', 'hardwired-safety', 'what-is-a-plc', 'sinking-sourcing', 'analog-420', 'numbers', 'contacts-coils', 'timers', 'counters', 'duplicate-coils', 'latch-unlatch', 'upload-download', 'forcing', 'troubleshooting-method', 'modbus'];
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
  await check('Learn: all 20 lessons show completed, XP awarded', async () => {
    await go(page, 'learn');
    await page.getByText('20/20 lessons').waitFor();
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
  await page.getByText('FAULT').waitFor();
  await go(page, 'lesson/numbers');
  await page.locator('input[inputmode=numeric]').fill('8');
  await page.getByText('X10', { exact: true }).waitFor();
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
  for (let i = 0; i < 5; i++) { await press(page, 'Start', 150); await page.waitForTimeout(150); }
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

// ---------- E. Simulator workbench ----------
{
  const { ctx, page } = await newPage();
  await go(page, 'sim');
  await check('Sim: motor starts, seals in, stops; lights follow', async () => {
    await press(page, 'Start');
    await page.getByRole('img', { name: 'Running light on' }).waitFor({ timeout: 6000 });
    await press(page, 'Stop');
    await page.getByRole('img', { name: 'Running light off' }).waitFor({ timeout: 6000 });
  });
  await check('Sim: E-stop drops the motor and it does not restart on release', async () => {
    await press(page, 'Start');
    await page.getByRole('img', { name: 'Running light on' }).waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: /^Emergency stop/ }).click();
    await page.getByRole('img', { name: 'Running light off' }).waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: /^Emergency stop/ }).click();
    await page.waitForTimeout(800);
    expect(await page.getByRole('img', { name: 'Running light off' }).isVisible(), 'restarted on E-stop release!');
  });
  await check('Sim: jam the load → overload trips → reset overload', async () => {
    await press(page, 'Start');
    await page.getByRole('button', { name: 'Jam the load' }).click();
    await page.getByText('OL tripped').waitFor({ timeout: 20000 });
    await page.getByRole('img', { name: 'Fault light on' }).waitFor();
    await page.getByRole('button', { name: 'Clear the jam' }).click();
    await page.getByRole('button', { name: 'Reset overload' }).click();
    await page.getByText('OL tripped').waitFor({ state: 'detached' });
  });
  await check('Sim: Slow-mo and Step modes, scan pointer', async () => {
    await page.getByRole('button', { name: 'Slow-mo' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Step', exact: true }).first().click();
    await page.locator('button.btn-primary:has-text("Step")').click();
    await page.getByText('about to READ INPUTS', { exact: false }).waitFor();
    await page.locator('button.btn-primary:has-text("Step")').click();
    await page.getByText(/about to SOLVE rung 0/).waitFor();
    await page.getByRole('button', { name: 'Run', exact: true }).click();
  });
  await check('Sim: PROG/RUN mode toggle', async () => {
    await page.getByRole('button', { name: /Controller mode RUN/ }).click();
    await page.getByRole('button', { name: /Controller mode PROG/ }).waitFor();
    await page.getByRole('button', { name: /Controller mode PROG/ }).click();
    await page.getByRole('button', { name: /Controller mode RUN/ }).waitFor();
  });
  await check('Sim: all 10 brand skins render the ladder', async () => {
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
  await check('Sim editor: add rung, add contact with operand, branch, comment, dup, move, undo/redo, delete', async () => {
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
  await check('Sim editor: keyboard — arrows, Enter edits, Delete, Ctrl+Z', async () => {
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
  await check('Sim: Verify panel + cross-reference', async () => {
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByText(/^Verify:/).waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    await page.locator('.instr').first().click();
    await page.getByRole('button', { name: /^Cross-reference/ }).click();
    await page.getByRole('dialog', { name: /Cross-reference/ }).getByText(/reads|writes/).first().waitFor();
    await page.keyboard.press('Escape');
  });
  await check('Sim: "More…" sheet adds any instruction (TON)', async () => {
    await page.getByRole('button', { name: 'More…' }).click();
    await page.getByRole('dialog', { name: 'All instructions' }).getByRole('button', { name: /^TON/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Edit instruction' });
    await dlg.locator('details summary').click();
    await dlg.getByPlaceholder('Pump1_Run').fill('Test_Tmr');
    await dlg.getByRole('combobox').nth(1).selectOption('TIMER');
    await dlg.getByRole('button', { name: 'Add tag' }).click();
    await dlg.getByRole('button', { name: 'Save' }).click();
    await page.locator('.box-title', { hasText: 'TON' }).last().waitFor();
  });
  await check('Sim: tag monitor opens and toggles an internal bit', async () => {
    await page.getByText(/Tag monitor/).click();
    const row = page.locator('tr', { hasText: 'Fail_Alarm' });
    await row.getByRole('button').click();
    await row.getByRole('button', { name: /1 · ON/ }).waitFor();
    await row.getByRole('button').click();
    await page.getByText(/Tag monitor/).click();
  });
  await check('Sim: force an input with confirmation, FORCE shown, remove force', async () => {
    await page.getByRole('button', { name: /^Input 4, Reset/ }).click();
    await page.getByRole('button', { name: 'Force ON' }).click();
    await page.getByRole('button', { name: 'Yes, force ON' }).click();
    await page.keyboard.press('Escape');
    await page.getByText('FORCE', { exact: true }).waitFor();
    await page.getByRole('button', { name: /^Input 4, Reset: ON, forced/ }).click();
    await page.getByRole('button', { name: 'Remove force' }).click();
    await page.keyboard.press('Escape');
    await page.getByText('FORCE', { exact: true }).waitFor({ state: 'detached' });
  });
  let exported = '';
  await check('Sim: export program JSON', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
    exported = 'test-results/exported-program.json';
    await dl.saveAs(exported);
    const j = JSON.parse(readFileSync(exported, 'utf8'));
    expect(j.routines?.[0]?.rungs?.length > 0, 'program has rungs');
  });
  await check('Sim: restore Original, then import the exported program', async () => {
    await page.getByRole('button', { name: 'Original' }).click();
    await page.getByText('Restored the original motor program.').waitFor();
    await page.locator('input[type=file]').setInputFiles(exported);
    await page.getByText(/^Imported "/).waitFor();
    const bad = 'test-results/bad.json';
    writeFileSync(bad, JSON.stringify({ hello: 'world' }));
    await page.locator('input[type=file]').setInputFiles(bad);
    await page.getByText("That file isn't a Controls Academy program.").waitFor();
  });
  let shareUrl = '';
  await check('Sim: share link copies, and opening it loads the program', async () => {
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByText(/Link copied/).waitFor();
    shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl.includes('#/sim?p='), 'link format');
    const p2 = await ctx.newPage();
    await p2.goto(shareUrl);
    await p2.getByText('Loaded a shared program from the link.').waitFor();
    await p2.close();
  });
  await check('Sim: program autosaves across reload', async () => {
    await page.getByRole('button', { name: 'Rung', exact: true }).click();
    const n = await page.locator('.rung').count();
    await page.waitForTimeout(700);
    await page.reload();
    await page.waitForSelector('.rung');
    expect((await page.locator('.rung').count()) === n, 'rung count persisted');
    await page.getByRole('button', { name: 'Original' }).click();
  });
  await check('Sim: "Same logic, ten dialects" table', async () => {
    await page.getByRole('heading', { name: 'Same logic, ten dialects' }).scrollIntoViewIfNeeded();
    await page.getByRole('region', { name: 'Addresses in every brand dialect' }).getByText('%I0.0').first().waitFor();
  });
  await check('Sim page axe (2D)', async () => axe(page, 'sim'));
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
    await page.getByRole('button', { name: 'OK' }).click();
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
    await page.getByText('8 of 8 motor-station faults solved').waitFor();
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
  await page.locator('[role=radio]').first().click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.locator('[role=radio]').first().click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByText('Review done for today').waitFor();
  await ctx.close();
});

// ---------- J. Profile ----------
{
  const t1done = { version: 1, xp: 250, lessons: Object.fromEntries(['volts-amps-ohms', 'meter', 'lototo', 'relays-contactors'].map((k) => [k, { score: 3, total: 3, taskDone: false, at: '2026-11-04' }])), review: {}, hunts: {}, days: [], skinsSeen: [], stepped: false, perfectQuizzes: 4, lastRoute: 'lesson/meter' };
  const { ctx, page } = await newPage({ progress: t1done });
  await check('Profile: level, badges, Track 1 certificate saves a PNG', async () => {
    await go(page, 'profile');
    await page.getByText('Panel Rookie').waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save certificate for track 1' }).click()]);
    expect(dl.suggestedFilename().endsWith('.png'), 'png');
    expect(await page.getByRole('button', { name: 'Save certificate for track 2' }).isDisabled(), 'track 2 locked');
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
