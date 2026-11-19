# VERIFY — details to confirm against manufacturer documentation

Every item below is marked `// VERIFY` in the code or content and shows a "check your manual" chip in the app.

**Sweep 2026-11-19 (step 5.6):** four researchers checked every marker. Applied: 19 corrections and 49 rewordings to safely general text; markers removed only where a source page backed the fact (5 hardware items, plus rewordings that no longer state an uncertain detail). Confirmations from knowledge alone were kept below for an expert or a sourced check. One engine fix: Logix DIV by zero now writes Source A (integers) or infinity (REAL), per the vendor's instruction help.

## Needs a qualified reviewer
- All safety text (LOTOTO, NFPA 70E summary, meter use, forcing, live work). Labeled "training, not procedure".
- Engine: whether RES on a COUNTER also clears .CU/.CD (sweep suggested yes, medium confidence; changes behavior, so not applied).
- Practice tools page: licensing and availability — the page tells learners to check vendor sites; no prices stated.

## `src/engine/plc.ts`
- line 345: details vary
- line 352: OSR prescan state
- line 358: OSF prescan state
- line 528: Logix clamps ACC at PRE when done
- line 594: Logix prescan sets .CU
- line 618: whether RES also clears CU/CD

## `src/skins/index.ts`
- line 83: details vary
- line 129: per processor
- line 130: details vary
- line 147: exact naming per controller
- line 213: details vary
- line 214: per hardware config
- line 275: per series
- line 277: details vary
- line 308: ranges
- line 337: per model/setting

## `src/content/hardware.ts`
- line 162: per catalog number
- line 203: details vary
- line 258: details vary
- line 269: per CPU
- line 304: per model
- line 314: details vary
- line 346: per system
- line 370: details vary
- line 379: details vary
- line 452: details vary
- line 510: details vary
- line 568: per model
- line 608: per model
- line 630: details vary
- line 651: details vary
- line 672: details vary
- line 682: details vary
- line 792: details vary
- line 801: details vary
- line 802: details vary
- line 811: details vary
- line 820: details vary
- line 830: details vary
- line 831: details vary

## `src/content/lessons-foundations.ts`
- line 186: conventions vary by drafter

## `src/content/lessons-core2.ts`
- line 77: per drawing
- line 261: per platform guidance
- line 263: per platform
- line 312: per instruction
- line 417: exact OB numbers per CPU family

## `src/content/lessons-plc.ts`
- line 39: per controller family
- line 107: per card
- line 117: per module
- line 336: per platform
- line 341: range per model

## `src/content/brands.ts`
- line 111: details vary
- line 169: current names
- line 183: per model
- line 209: details vary
- line 214: details vary
- line 220: details vary
- line 222: details vary
- line 222: details vary
- line 227: details vary
- line 238: details vary
- line 249: details vary
- line 253: details vary
- line 253: details vary
- line 255: details vary
- line 267: details vary
- line 267: details vary
- line 270: details vary
- line 276: details vary
- line 279: details vary
- line 283: details vary
- line 287: details vary
- line 287: details vary
- line 289: details vary
- line 295: details vary
- line 313: per model
- line 313: details vary
- line 315: details vary
- line 324: details vary
- line 326: details vary
- line 330: details vary
- line 336: details vary
- line 339: details vary
- line 341: details vary
- line 356: details vary
- line 367: details vary
- line 373: details vary
- line 377: details vary
- line 378: details vary
- line 378: details vary
- line 382: details vary
- line 388: details vary
- line 388: details vary

## `src/content/lessons-field.ts`
- line 27: exact wording per software version
- line 67: per model
- line 69: per model

## `src/content/lessons-pro.ts`
- line 27: tool names per software version
- line 70: details vary
- line 71: details vary
- line 111: per device
- line 141: per project setup
- line 180: per network
- line 205: per manual
- line 478: details vary
- line 545: delay limits with the plant's permit
- line 558: card thresholds

## `src/content/lessons-zero.ts`
- line 270: roll-engage mechanism (pneumatic vs spring) varies by roller-mill make; check the OEM lockout procedure.
- line 429: confirm current Texas electrician licensing rules and plant-maintenance exemptions with TDLR.

## `src/plant/datacenter.ts`
- line 98: site limits

## `src/three/info.ts`
- line 27: your site standard

## `src/lib/wiring.ts`
- line 158: wording vs NFPA 79 / NEC 430.74 practice (docs/VERIFY.md).

## Brands side by side (`src/content/compare.ts`)
- line 40: module I/O tag format per module
- line 44: LED states per controller
- line 57: ports per model
- line 60: memory module per model
- line 68: embedded I/O variable names
- line 72: force indication
- line 73: whether an upload brings back comments
- line 74: memory module per model
- line 75: details vary
- line 86: force behavior and LED per CPU
- line 88: card role per CPU
- line 96: topological address format
- line 100: force indication
- line 101: details vary
- line 110: numbering per series
- line 111: timer ranges per series
- line 114: per series
- line 115: details vary
- line 116: details vary
- line 117: details vary
- line 124: per family
- line 127: ports per family
- line 128: name and indication per family
- line 130: details vary
- line 131: details vary
- line 132: details vary
- line 138: details vary
- line 139: per model
- line 140: details vary
- line 142: details vary
- line 145: details vary
- line 146: details vary

## Troubleshooting flowcharts (`src/content/flowcharts.ts`)
- line 84: fault limits (NAMUR NE43) per transmitter and card
- line 94: breaker type and setting
- line 97: setting rule per overload maker and NEC 430.32
- line 112: per card
- line 124: comm-loss action per device
- line 126: per network
- line 141: auto-restart setting
- line 142: details vary
- line 143: details vary by model
- line 147: details vary by model

## Cheat sheets (`src/content/cheatsheets.ts`)
- line 33: edition
- line 35: edition
- line 42: code edition
- line 43: code edition
- line 44: site spec
- line 45: site spec
- line 77: per relay
- line 100: letter codes per print legend
- line 116: per transmitter and card
- line 131: code edition

## Field devices (`src/content/devices.ts`)
- line 44: per sensor
- line 46: per sensor
- line 63: per model
- line 92: color rules per NFPA 79 / IEC 60204-1 and your site
- line 112: per model
- line 123: per model
- line 141: setting rule and trip class per maker
- line 180: per standard and machine
- line 192: per model
