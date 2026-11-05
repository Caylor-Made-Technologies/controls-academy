# Bugs

Every bug found, with steps to reproduce, status and the test that now guards it. Newest first.
Phase 0 sweep (2026-11-05): every button on 18 routes tapped at 375 × 812 (dark), plus the 4 e2e scripts
and Lighthouse on live. No console errors from the app, no horizontal overflow, axe 0.

| ID | Severity | Found | Status |
|---|---|---|---|
| B-004 | High | Phase 0 | Fixed in 0.5.1 |
| B-003 | High | Phase 0 | Fixed in 0.5.1 |
| B-002 | Low | Phase 0 (Lighthouse) | Fixed in 0.5.1 |
| B-001 | Medium | Phase 0 (Lighthouse) | Scheduled: Phase 3.1 / 6.1 |

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

## B-002 — Intro app mark is blurry on phones
- **Steps:** Lighthouse mobile on `#/learn` → Best Practices → "Serves images with low resolution".
- **Cause:** `brand/app-mark.png` is 96 px, shown at 96 CSS px on 2–3× screens.
- **Fix:** rendered at 192 px by `npm run icons`. Lighthouse re-check at the phase gate.

## B-001 — Simulator route is slow on low-end devices
- **Steps:** Lighthouse mobile on `#/sim` (4× CPU, no GPU): Performance 44, TBT ≈ 72 s.
- **Cause:** the 3D panel opens by default and every 10 ms sim tick invalidates the canvas, so it re-renders continuously even when nothing visible changed and when it's scrolled off-screen. In a GPU-less headless browser that's software rendering; on a phone it's battery and heat.
- **Plan:** render only when an I/O bit or motor value changes, cap idle frame rate, pause when the canvas is off-screen, defer 3D until after first paint (Phase 3.1); Lighthouse 95+ target in Phase 6.1.

## Not bugs (checked)
- Sweep showed many simulator buttons "not clickable" with a 0.6 s timeout: the page is busy with software 3D in headless Chromium. With a 2 s timeout every button clicks; `features.mjs` covers them.
- "GPU stall due to ReadPixels" console lines come from headless SwiftShader during screenshots, not the app.
- One every-feature run (right after the 3D gate) reported 103/104; the failing check didn't reproduce in 3 straight reruns (104/104). Watching for it; if it recurs, the failing check's name goes here.
