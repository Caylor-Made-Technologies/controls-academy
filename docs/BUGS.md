# Bugs

Every bug found, with steps to reproduce, status and the test that now guards it. Newest first.
Phase 0 sweep (2026-11-05): every button on 18 routes tapped at 375 × 812 (dark), plus the 4 e2e scripts
and Lighthouse on live. No console errors from the app, no horizontal overflow, axe 0.

| ID | Severity | Found | Status |
|---|---|---|---|
| B-023 | Medium | Jonathon, iPhone home-screen app (2026-11-20) | Fixed (work branch) |
| B-022 | High | Jonathon, Chromebook (2026-11-20) | Fixed (work branch) |
| B-021 | Low | Phase 6.2 QA agent | Fixed (unreleased) |
| B-020 | Medium | Phase 6.2 QA agent | Fixed (unreleased) |
| B-019 | Low | Phase 6.2 QA agent | Fixed (unreleased) |
| B-018 | Medium | Phase 6.2 QA agent | Fixed (unreleased) |
| B-017 | Medium | Phase 6.2 QA agent | Fixed (unreleased) |
| B-016 | High | Phase 6.2 QA agent | Fixed (unreleased) |
| B-015 | High | Phase 6.2 QA agent | Fixed (unreleased) |
| B-014 | High | Phase 6.2 QA sweep | Fixed (unreleased) |
| B-007 | High | Phase 2 (unit test) | Fixed before release |
| B-006 | High | Phase 1 (exam screenshot) | Fixed in 0.6.0 |
| B-005 | Medium | Phase 0 flake → Phase 1 | Fixed in 0.6.0 |
| B-004 | High | Phase 0 | Fixed in 0.5.1 |
| B-003 | High | Phase 0 | Fixed in 0.5.1 |
| B-002 | Low | Phase 0 (Lighthouse) | Fixed in 0.5.1 |
| B-013 | Low | Phase 5 verify (day-one e2e) | Fixed 5.5 |
| B-012 | Low | v0.9.0 gate (verify:live) | Fixed at the gate |
| B-011 | Low | Phase 4 verify (3D suite) | Fixed 4.3 |
| B-010 | Medium | Phase 3 gate (Lighthouse live) | Fixed 4.1; confirmed live at 0.9.0 (LCP ≤ 2.21 s) |
| B-009 | Low | Phase 3 review | Fixed 3.6 |
| B-008 | High | Phase 3 review | Fixed 3.3 |
| B-001 | Medium | Phase 0 (Lighthouse) | Fixed 3.1–3.8 (live 45 → 95) |

## B-011 — "Transition was aborted" console error when opening a heavy 3D screen on a slow device
- **Found by:** `tests/e2e/three.mjs` (no console errors) on the cloud software GPU, switching quickly between machine scenes.
- **Cause:** screen changes run inside a View Transition. Mounting a 3D scene on a slow device can take longer than the browser's limit for the update (about 4 s); the browser then skips the animation and rejects the transition's promises, which nothing handled.
- **Fix:** the promises are handled in `withViewTransition` (`src/lib/motion.ts`). The screen was always updated; only the animation is skipped.
- **Guard:** the 3D suite's "no console errors/warnings" check, which caught it.

## B-010 — LCP 2.7 s on Simulator, Troubleshoot and Wiring (budget 2.5 s)
- **Found by:** Lighthouse mobile on the live v0.8.0 site: `#/sim`, `#/troubleshoot`, `#/wiring` LCP 2.7 s (Learn 2.4 s). Performance score is 95 on all four, CLS 0.
- **Cause:** the largest element (the page heading) could only paint after the main bundle (React + an animation library, 115 KB gz) had downloaded and run, and then the route's chunk after that.
- **Fix (4.1):** `index.html` now carries the header bar and each top-level screen's real heading (a hashed inline script picks it from the URL), so it paints with the HTML. The same script preloads the route's chunks in parallel with the main bundle. The animation library is gone (CSS + View Transitions); main bundle 115 → 76 KB gz. Workbench and machine code are separate chunks. Fonts subset (86 → 52 KB), logo 99 → 7 KB.
- **Measured (local, throttled network + 4× CPU, 3 runs):** Learn, Simulator, Troubleshoot, Wiring, Reference, Profile all 1.6–1.7 s LCP, CLS 0.
- **Guards:** `features.mjs` "Static shell" checks (heading is in the HTML before any script, matches the app word for word, and doesn't move), `tests/unit/routes.test.ts`, `npm run lighthouse`.
- **Still open for 6.1:** Skill map, About and Review screens (not key routes) need the same treatment for first-visit; Review has a layout shift of 0.17.

## B-009 — Small buttons are 36 px tall (target 44 px)
- **Found by:** Phase 3 review. `.btn-sm` is `min-height: 36px` across the app; the project rule is 44 px touch targets. The 3D HUD chips were fixed (now 44 px) in 3.3.
- **Fix (3.6):** `.btn-sm`, segmented controls, operand and category chips and the platform select are 44 px. The route gate (no horizontal overflow at 375 px) passed after the change.

## B-008 — The "Failing fan bearing" Fault Hunt couldn't be solved (caught before release)
- **Found by:** the Phase 3 scene review. Fault `vfd-ol` names `motor` as the culprit, but the VFD machine had no device or button with that id, so nothing you could tap was ever "the problem".
- **Fix:** the VFD, screw and conveyor machines now have a motor device card (the 3D motors open it). **Test:** `tests/unit/machines.test.ts` → every fault's culprit is a device or hunt choice of its machine (fails without the fix).

## B-007 — New lift-station program short-cycled pumps on the backup float (caught before release)
- **Found by:** the frozen-transmitter test. With the float as the only control, both pumps chattered on/off every second at 4.2 m until their overloads tripped from repeated inrush — then the well flooded.
- **Fix:** the float has its natural tether deadband (4.2 m on, 4.0 m off) and the program holds both pumps on 60 s after it drops (TOF). **Test:** `tests/unit/pumps.test.ts` → no overload trips, no flooding with the transmitter frozen.

## B-006 — The right answer was almost always "B"
- **Steps:** take any quiz or exam and always pick the second choice.
- **Expected:** a normal score. **Actual:** 161 of 192 correct answers were in position B; a practice exam scored 100 % by picking B every time.
- **Fix:** choices are shown in a stable shuffled order per question (same order every visit). **Test:** `tests/unit/bank.test.ts` → displayed answer positions stay between 15 % and 40 % each.

## B-005 — A quick tap on Start/Stop could be missed
- **Steps:** on a slow or busy device, tap Stop quickly while the motor runs. Seen as the intermittent e2e failure "Sim: motor starts, seals in, stops" (Phase 0 "flake").
- **Cause:** inputs are sampled when the simulation steps; if the page stalled longer than the tap, press and release both happened between steps and no scan saw it.
- **Fix:** momentary buttons are held for at least 60 ms of simulated time after a press (pulse stretching), so every tap reaches the PLC. **Test:** `tests/unit/motor.test.ts` → "a tap that starts and ends between two sim steps is still seen".

## B-004 — "Up next" never recommends Track 11
- **Steps:** finish every lesson in Tracks 1–10 (any goal). Learn home.
- **Expected:** "Up next" points at the first Expert Practice lesson. **Actual:** no recommendation; 8 lessons left unreachable from the card.
- **Cause:** the per-goal track order lists were written before Track 11 existed.
- **Fix:** goal order first, then every remaining track in course order. **Test:** `tests/unit/learn.test.ts` walks every goal to the end of the course.

## B-003 — "Next lesson" skips lessons and jumps between tracks
- **Steps:** open *Relays and contactors* (Track 1), finish the check, tap **Next**.
- **Expected:** *Protection devices* (next in Track 1). **Actual:** *Reading ladder prints* (Track 2); *Protection devices* is skipped. 9 of 49 "Next" links pointed to the wrong lesson.
- **Cause:** `LESSONS` kept source-file order; tracks have their own order.
- **Fix:** `LESSONS` sorted by `COURSE_ORDER` (track by track). **Test:** `tests/unit/quality.test.ts` → "course order".

## B-023 — The installed iPhone app stayed on an old version
- **Found by:** Jonathon's iPhone (app added to the home screen): the Simulator showed no machine picker and no Wiring trainer button, a layout from about two weeks earlier, while the same page in a browser was current.
- **Cause:** a home-screen app is usually resumed, not reloaded. The service worker fetched new versions, but the open page kept running the old code, and nothing asked it to check or reload.
- **Fix:** `src/lib/update.ts` asks the service worker to check whenever the app comes back to the screen (and hourly). When a newer version has taken over, the page reloads at the next screen change. Progress is saved on the device, so nothing is lost.
- **Guard:** `tests/unit/update.test.ts` (checks on return to screen, reloads only at a screen change and only after a real update, not on first install).
- **For a copy that is already stuck:** close the app completely (swipe it away) and open it again. If it still shows the old layout, remove it from the home screen and add it again from Safari.

## B-022 — Switching machines froze the page on a low-power laptop
- **Found by:** Jonathon on a Chromebook: after tapping a machine card, the page sat frozen with the hover highlight stuck on the card ("stays stuck").
- **Cause:** each machine has its own 3D view. Switching built the new scene, compiled all its shaders in the first frame, and dropped the old view's graphics context, all in long blocks on the page's only thread. Measured at 4× slower CPU on a software GPU: up to 11 s in one block (data center).
- **Fix (`src/three/Stage.tsx`):** shaders are compiled in parallel before the first frame where the browser supports it, while the poster still shows; the old context is released when the browser is idle instead of in the middle of the switch.
- **Measured (same test, this machine):** data center 14.0 s → 0.5–15 s depending on when the deferred release lands; the click and the new screen are no longer stuck behind it. The remaining cost here is releasing a context on a software GPU, which is much cheaper on real graphics hardware; not verified on Jonathon's Chromebook yet.
- **Guard:** the 3D gate (`tests/e2e/three.mjs`): leak test, no console errors. No automated timing check: frame timing on the shared test machine is too noisy to gate on.

## B-021 — A long name ran off the certificate
- **Steps:** a 30-character name with no spaces (the field's maximum), then save a certificate. **Actual:** the name, drawn at a fixed 84 px, ran past both edges.
- **Fix:** title, name and track lines shrink to fit the page (`fitSize`). **Test:** `tests/unit/certificate.test.ts`.

## B-020 — "Erase all progress" left other machines' programs behind
- **Steps:** edit the programs on two machines, Profile → Erase → reload. **Actual:** only the motor program was erased; the dialog didn't say settings stay.
- **Fix:** erase removes every machine's program and the day-one ticks (`src/state/stored.ts`); the dialog lists what goes and says settings stay. **Test:** `tests/unit/stored.test.ts`.

## B-019 — A double-tap on a wrong Fault Hunt answer was charged twice
- **Fix:** wrong picks go through the same charge-once rule as meter mistakes. **Test:** e2e "Fault Hunt: wrong pick costs points…" double-taps and expects 2 charges in total. Also: replaying a solved hunt paid full XP every time; now full XP on the first solve and 10 for a faster time (like exams). **Test:** `tests/unit/progress.test.ts`.

## B-018 — Double-tapping a wire's remove button removed two wires
- **Cause:** the list closes up after the first removal, so the second click landed on the next wire's button. **Fix:** the button ignores repeat clicks of a double-click (keyboard unaffected). **Test:** e2e wiring check double-taps and expects one wire gone.

## B-017 — "constructor" or "toString" as a hardware id crashed the page
- **Steps:** `#/reference/hw/constructor`. **Cause:** a plain-object lookup matched inherited names; the startup script's route tables had the same weakness. **Fix:** a `Map` for hardware, own-property checks for route headings and in the startup script. **Tests:** `tests/unit/router.test.ts`, e2e not-found check.

## B-016 — A malformed % escape in a link gave a blank page
- **Steps:** `#/lesson/%E0%A4%A` or `#/lesson/%`. **Cause:** `decodeURIComponent` threw outside the error boundary. **Fix:** `parsePath` keeps an undecodable segment as typed, so the page shows "not found". **Tests:** `tests/unit/router.test.ts`, e2e not-found check.

## B-015 — An imported program with missing operands crashed the simulator, even after reload
- **Steps:** import (or open a share link with) a rung holding `TON` with no operands. **Actual:** the error screen, and again after every reload because the program had been saved; a `MOV` with one operand threw ~60 errors a second.
- **Fix:** `validateProgram` requires exactly the operands each instruction takes; saved programs pass the same check on load, so a stuck simulator recovers. **Test:** `tests/unit/edit.test.ts` (plus every built-in machine program validates).

## B-014 — A wrong-typed saved setting crashed Learn, lessons and the simulator
- **Steps:** saved settings (`ca:prefs`) holding a value of the wrong type, e.g. `goal: "x"`, `skin: "nope"` or `theme: 5` (an old version, a hand-edited or imported file, a browser extension), then open Learn, a lesson or the Simulator.
- **Expected:** the app uses the default for that one setting. **Actual:** the error screen ("n is not iterable", "reading 'brand'", "reading 'address'").
- **Cause:** settings were spread over the defaults with no checks; progress was already validated, settings were not.
- **Fix:** `validatePrefs()` checks every field against its allowed values (skin ids, themes, goals, quality, the four text sizes, name ≤ 30 characters) and falls back per field. **Tests:** `tests/unit/prefs.test.ts` (fails without the fix); e2e "Saved data: wrong-typed settings…".

## B-013 — A change followed by a quick reload could be lost
- **Steps:** tick an item on Day one (or change any saved setting), reload at once (seen under load in the day-one e2e check).
- **Cause:** `save()` wrote IndexedDB first and the synchronous localStorage copy only after it finished; a reload in between lost both. `load()` also preferred IndexedDB, which could still hold the older value.
- **Fix:** localStorage is written first (synchronously) and read first; a failed localStorage write removes the older copy. Test: the e2e check waits for the restore and the tick must survive the reload.

## B-012 — Light theme could flash dark on first load
- **Steps:** save the light theme, reload the live site on a normal connection (verify:live "Static shell" check).
- **Cause:** the saved theme was applied by the route script that sits after the static header in `<body>`; over a real network the header could paint in the dark theme first. Locally the page arrives at once, so only the live run showed it.
- **Fix:** a tiny theme script in `<head>` (its own CSP hash) runs before anything in `<body>`. Test: the served HTML must apply the theme before `<body>`.

## B-002 — Intro app mark is blurry on phones
- **Steps:** Lighthouse mobile on `#/learn` → Best Practices → "Serves images with low resolution".
- **Cause:** `brand/app-mark.png` is 96 px, shown at 96 CSS px on 2–3× screens.
- **Fix:** rendered at 192 px by `npm run icons`. Lighthouse re-check at the phase gate.

## B-001 — Simulator route is slow on low-end devices
- **Steps:** Lighthouse mobile on `#/sim` (4× CPU, no GPU): Performance 44, TBT ≈ 72 s.
- **Cause:** the 3D panel opens by default and every 10 ms sim tick invalidates the canvas, so it re-renders continuously even when nothing visible changed and when it's scrolled off-screen. In a GPU-less headless browser that's software rendering; on a phone it's battery and heat.
- **Plan:** render only when an I/O bit or motor value changes, cap idle frame rate, pause when the canvas is off-screen, defer 3D until after first paint (Phase 3.1); Lighthouse 95+ target in Phase 6.1.
- **Fix (3.1):** all 3D goes through one `Stage` (`src/three/Stage.tsx`): draws only when the panel's visible state changes (plus a 0.5 s settle), 30 fps cap on the low tier, paused off-screen and in hidden tabs, mounted after first paint. A second cause turned up while testing: the workbench re-renders every scan, which re-rendered the 3D tree and drew a frame each time — the 3D panel is now memoized. GPU-less devices (software renderer) open in 2D on "auto". **Tests:** `tests/e2e/three.mjs` → idle panel draws ≤ 4 frames in 2 s (measured 0), off-screen 0 frames; `tests/unit/three-support.test.ts`. Lighthouse mobile `#/sim` local: 45 → 85 (TBT 72 s → 0.24 s); live v0.8.0: **95** (TBT 110 ms).

## Not bugs (checked)
- Sweep showed many simulator buttons "not clickable" with a 0.6 s timeout: the page is busy with software 3D in headless Chromium. With a 2 s timeout every button clicks; `features.mjs` covers them.
- "GPU stall due to ReadPixels" console lines come from headless SwiftShader during screenshots, not the app.
- The intermittent every-feature failure from Phase 0 turned out to be a real bug: B-005.
