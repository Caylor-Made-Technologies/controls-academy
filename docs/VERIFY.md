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

## Hardware library and US brand notes (added 0.4.0)
All in `src/content/hardware.ts` and `src/content/brands.ts`. The 3D shapes are simplified look-alikes; dimensions are approximate and are not a VERIFY item.
- GuardLogix safety status LED name per controller.
- CompactLogix 5380 field-side power terminals per module; 5370 built-in I/O per catalog number.
- MicroLogix 1100/1400 lifecycle status; port mix per model.
- PLC-5 octal rack/group addressing.
- POINT I/O field/potential distributor behavior; FLEX I/O module swap under power.
- ET 200SP light/dark base unit potential groups.
- S7-300 projects opening in TIA Portal; MMC per CPU.
- LOGO! programming languages per version.
- M221 built-in Ethernet per model; M251 has no built-in I/O.
- Quantum software (Unity/Concept/ProWORX) and Modbus Plus prevalence.
- FX3 Ethernet add-on; Q series hex I/O numbering; iQ-R CPU display.
- BRX port module; DL05/DL06 option slots; DL205 base power supply.
- Omron CP retentive areas per model.
- Series 90-30 software history and RX3i migration path.
- IDEC FC6A display options and I/O numbering; WindO/I-NV4.
- Unitronics I/O mounting per model, Vision operand names, EtherNet/IP support, U90 Ladder.
- WAGO tool name (e!COCKPIT vs CODESYS) and BACnet controllers.
- Phoenix Contact EtherNet/IP support.
- Eaton easyE4 operands and programming languages; XSOFT-CODESYS; Galileo.
- Keyence KV unit layout, device names (R, MR, DM), timers/counters, proprietary links.
- Opto 22 groov EPIC software (PAC Control, CODESYS), Node-RED, OPC UA/MQTT.
- Delta DVP octal X/Y, software names (ISPSoft/WPLSoft/DIADesigner), EtherNet/IP.
- B&R Automation Studio version matching.
- Rockwell HMI product names (PanelView / Optix); Schneider HMI names; Emerson SCADA product ownership; AutomationDirect EtherNet/IP per model.

## Added 0.5.0
- Motor model constants are illustrative (10 HP / 460 V / 14 A FLA / 1770 rpm, J = 0.22 kg·m², NEMA B–like curve, Class 10 thermal with τ heat 134 s / cool 28 s, reset below 80 %). Not a specific motor or relay; real overload reset rules vary by device.
- Drive details: parameter naming per Yaskawa/ABB/Danfoss model, Yaskawa fault code examples, DriveWizard Mobile, ABB/Danfoss built-in BACnet, Danfoss multiple set-ups, PowerFlex 4/40 and MICROMASTER lifecycle, Eaton and Delta software names, Altivar web server.
- HMI software names (FactoryTalk View ME vs Optix on PanelView Plus 7; Harmony tool names).
- Safety relays: Pilz terminal names and reset configuration per model; Guardmaster rotary function switch and configuration software.
- Building automation: JACE 8000/9000 names and expansion; Metasys engine/controller names, CCT, command priority behavior; Honeywell WEBs/EBI/Excel; Desigo PXC tools and I/O; SmartX tool name; Niagara SNMP.
- PLCs: MicroLogix 1500 processor/base split and ports; CompactLogix 5480 layout; S7-200 mode switch; FX2N front cover details.
- Red Lion protocol list per model; Keyence/Opto 22 items from 0.4.0 still open.

## Added 0.6.0 (Track 0 — Start from Zero)
- `z-ac-dc` realWorld: rack voltage in data centers (208/120 V, 415/240 V and others are used) — confirm wording is general enough.
- `z-jobs`: Texas electrician licensing (TDLR) and whether plant-maintenance work is exempt — check current TDLR rules.
- `z-safety` realWorld: roller-mill roll-engage mechanism (pneumatic vs spring) by make — check an OEM lockout procedure.
- `what-is-a-plc`: Logix RPI-based I/O update (inputs can change mid-scan) and buffering practice, per controller family.
- `analog-420`: low/high fault thresholds (~3.6 / ~21 mA, NAMUR NE 43 style) per analog card.
- `data-types`: array out-of-range behavior on non-Logix platforms (S7-1200/1500, FX and others).
- `latch-unlatch`: retentive memory on power-up — Siemens retentive settings; Mitsubishi FX latched M range per model.
- `compare-math`: integer division (Logix DIV truncates, SLC DIV rounds; REAL→DINT rounding) per instruction.
- `forcing`: FORCE LED solid vs flashing (installed vs enabled) per controller model; Siemens force-table indication.
- `upload-download`: online-edit wording (accept / test / assemble) per software version.
- `fault-codes`: Logix fault routine behavior; Siemens error OBs per CPU family.
- `legacy-networks`: terminator values and readings per network (DeviceNet ~60 Ω pair; Profibus active; ControlNet 75 Ω; DH+ 150/82 Ω).
- `vfd-basics`: output-contactor switching rules per drive manual.
- `hmi-basics`: how each HMI platform shows comms loss vs field overflow ("####").
- `ip-basics`: DHCP/BOOTP defaults per device.
- `capstone-mixer`: NFPA 61 → NFPA 660 consolidation status.
- `analog-alarming`: limits on alarm delays for regulatory (e.g. filter turbidity) alarms per plant permit.
