# VERIFY — details to confirm against manufacturer documentation

Every item is marked `// VERIFY` in code/content and shows a "check your manual" chip in the app.
Confirm each against current manuals before removing the marker.

## Engine behavior (Logix-style baseline)
- `src/engine/plc.ts` — ONS / OSR / OSF storage-bit state set by prescan.
- `src/engine/plc.ts` — DIV by zero: we raise a minor fault and leave Dest unchanged; confirm what Logix writes to Dest.
- `src/engine/plc.ts` — TON clamps .ACC at .PRE once done.
- `src/engine/plc.ts` — prescan sets counter .CU/.CD so a true-at-start rung doesn't count.
- `src/engine/plc.ts` — whether RES on a COUNTER also clears .CU/.CD.
- `src/engine/plc.ts` — integer-only DIV truncates; mixed with a REAL Dest — confirm.
- `src/engine/tags.ts` — REAL → integer conversion rounds half-to-even.

## Skins (`src/skins/index.ts`)
- Logix module I/O tag format (`Local:1:I.Data.0`) per module type.
- SLC 500 vs MicroLogix one-shot names (OSR vs ONS); SLC PID control block shown as N10.
- Micro800 embedded I/O variable names (`_IO_EM_DI_00`).
- IEC "TONR"/LIMIT notes.
- S7-300 default I/O start addresses (I 0.0 / Q 4.0) per hardware config; S5 timer range.
- Modicon topological addressing per model (M340/M580 vs M221).
- Mitsubishi FX timer resolution by number range; retentive timer and up/down counter ranges; iQ-R/Q hex I/O numbering.
- AutomationDirect CLICK address ranges.
- Omron TIM BCD/down-counting default per model/setting.

## Content
- `lessons-foundations.ts` — contact cross-reference underline convention on prints.
- `lessons-plc.ts` — sinking/sourcing card naming per manufacturer; under-range (~3.6 mA) fault threshold per card; Siemens 0–27648 raw range per module.
- `lessons-field.ts` — online-edit wording per software version; FORCE LED / Siemens force indication per model.
- `brands.ts` — Logix module tags; Siemens force indication; Modbus %MW ↔ 400001 mapping per device; Mitsubishi numbering; Omron TIM; Emerson 90-30 prevalence.
- Practice tools page: licensing and availability — the page itself tells learners to check vendor sites; no prices stated.

## Needs a qualified reviewer
- All safety text (LOTOTO, NFPA 70E summary, meter use, forcing). Labeled "training, not procedure".
