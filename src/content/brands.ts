/**
 * Brand Field Guides. Descriptive use of brand names only; no logos. Anything we are not certain
 * of carries "// VERIFY" (rendered as a "check your manual" flag) and is listed in docs/VERIFY.md.
 */
import type { SkinId } from '../skins';

export interface BrandGuide {
  id: string;
  name: string;
  skin: SkinId;
  software: { name: string; for: string }[];
  hardware: string[];
  addressing: [string, string][];
  firstDay: string[];
  tips: string[];
  gotchas: string[];
}

export const BRAND_GUIDES: BrandGuide[] = [
  {
    id: 'rockwell', name: 'Allen-Bradley / Rockwell Automation', skin: 'ab-logix',
    software: [
      { name: 'Studio 5000 Logix Designer', for: 'ControlLogix, CompactLogix, GuardLogix' },
      { name: 'RSLogix 500', for: 'SLC 500, MicroLogix' },
      { name: 'RSLogix 5', for: 'PLC-5 (legacy)' },
      { name: 'Connected Components Workbench', for: 'Micro800 family' },
      { name: 'FactoryTalk View ME / SE', for: 'HMI (PanelView) / SCADA' },
      { name: 'RSLinx Classic / FactoryTalk Linx', for: 'Communication drivers' },
    ],
    hardware: ['ControlLogix (1756 chassis)', 'CompactLogix (5370/5380/5480)', 'GuardLogix (safety)', 'SLC 500 / MicroLogix (legacy)', 'Micro800', 'PowerFlex drives', 'PanelView HMIs'],
    addressing: [['Logix tag', 'Start_PB, Motor1.Run'], ['Logix module I/O', 'Local:1:I.Data.0 // VERIFY per module'], ['Timer member', 'MyTimer.DN, .ACC, .PRE (ms)'], ['SLC input', 'I:1/0'], ['SLC bit / int / timer', 'B3:0/5, N7:10, T4:0.DN']],
    firstDay: [
      'Find the controller, note its catalog number and firmware revision.',
      'Get a copy of the program: go online and UPLOAD, save with today\'s date.',
      'Check the mode switch (RUN/REM/PROG) and the status LEDs (RUN, OK, FORCE, I/O).',
      'Learn where the backups and the software license live.',
      'Ask which systems include GuardLogix safety logic — and who is authorized to touch it.',
    ],
    tips: [
      'Right-click a tag → Go To Cross Reference to find every rung that uses it.',
      'Use Trends to catch intermittent problems (a prox that flickers for one scan).',
      'Add-On Instructions (AOIs) package reusable logic like a motor or valve block.',
      'Check the controller\'s firmware revision matches the project before you try to download.',
      'Search (Ctrl+F) works on tag names and comments; good comments save hours.',
    ],
    gotchas: [
      'Firmware mismatch blocks the download — the project must match the controller\'s major revision.',
      'Forces show on the controller (FORCE LED). Remove them before you leave.',
      'Duplicate destructive OTEs: the last rung wins.',
      'Logix timers are milliseconds; SLC timers use a time base. 5 s is 5000 in one and 500 in the other.',
      'Online edits that aren\'t assembled are still pending.',
      'GuardLogix safety tasks are locked and signature-protected. Don\'t touch without authorization.',
    ],
  },
  {
    id: 'siemens', name: 'Siemens', skin: 'siemens-tia',
    software: [
      { name: 'TIA Portal (STEP 7 Basic/Professional)', for: 'S7-1200, S7-1500, ET 200' },
      { name: 'STEP 7 Classic / SIMATIC Manager', for: 'S7-300, S7-400' },
      { name: 'LOGO! Soft Comfort', for: 'LOGO! logic modules' },
      { name: 'WinCC (in TIA Portal / Classic)', for: 'HMI and SCADA' },
      { name: 'PLCSIM', for: 'Simulating a CPU on your PC' },
    ],
    hardware: ['S7-1200', 'S7-1500', 'ET 200SP / MP remote I/O', 'S7-300 / S7-400 (legacy)', 'SINAMICS drives', 'Comfort / Unified HMI panels'],
    addressing: [['Input / output bit', '%I0.0, %Q0.0'], ['Memory bit / word', '%M10.0, %MW20'], ['Data block', '"Motor_DB".Run (symbolic), DB10.DBX0.0 (absolute)'], ['IEC timer', '"Tmr_DB".Q, .ET, PT := T#5S'], ['Classic', 'I 0.0, Q 4.0, M 0.0, T 1']],
    firstDay: [
      'Find the CPU, note its order number and firmware.',
      'Go online and read the **diagnostic buffer** first — it tells you what happened and when.',
      'Upload the project from the device and save a dated archive.',
      'Find the watch tables and force tables already in the project.',
      'Note which CPUs run fail-safe (F) programs and who may change them.',
    ],
    tips: [
      'Watch tables let you monitor and modify tags; force tables override I/O.',
      '"Monitor all" on a block shows live power flow.',
      'Compare offline/online before and after any change.',
      'Cross-references work on tags, blocks and addresses.',
      'Optimized block access (default on 1200/1500) is faster; use symbols, not absolute addresses.',
    ],
    gotchas: [
      'Byte order: %MW0 = %MB0 (high byte) + %MB1. %MW0 and %MW1 overlap — classic bug.',
      'PROFINET device names must match the project exactly, or the device won\'t connect.',
      'Some downloads (hardware config, certain block changes) need the CPU in STOP.',
      'IEC timers and counters need an instance DB (or a multi-instance in an FB).',
      'A forced value shows as a force indication on the CPU. // VERIFY per model',
    ],
  },
  {
    id: 'schneider', name: 'Schneider Electric / Modicon', skin: 'modicon',
    software: [
      { name: 'EcoStruxure Control Expert (formerly Unity Pro)', for: 'M340, M580, Quantum' },
      { name: 'EcoStruxure Machine Expert', for: 'M241, M251, M262' },
      { name: 'EcoStruxure Machine Expert – Basic', for: 'M221' },
    ],
    hardware: ['Modicon M221', 'M241 / M251', 'M340', 'M580', 'Quantum (legacy)', 'Altivar drives'],
    addressing: [['Topological I/O', '%I0.1.0 (rack.slot.channel)'], ['Memory', '%M100, %MW100'], ['Modbus mapping', '%MW0 ↔ 400001 (usually) // VERIFY per device']],
    firstDay: ['Upload and archive the application.', 'Identify which variables are mapped to Modbus for SCADA/BMS.', 'Note the CPU and network modules in each rack.'],
    tips: ['Modicon invented Modbus; many register maps trace back to %MW words.', 'Use the animation tables to watch values live.'],
    gotchas: ['Off-by-one between %MW numbers and 4xxxx registers.', 'Word order for 32-bit values differs between devices.'],
  },
  {
    id: 'mitsubishi', name: 'Mitsubishi Electric', skin: 'mitsubishi',
    software: [{ name: 'GX Works2', for: 'FX3, Q series' }, { name: 'GX Works3', for: 'iQ-F (FX5), iQ-R' }, { name: 'GT Designer', for: 'GOT HMIs' }],
    hardware: ['FX3 / iQ-F (FX5)', 'Q series', 'iQ-R', 'FR inverters (drives)'],
    addressing: [['Inputs / outputs', 'X0–X7, X10… / Y0… (octal on FX)'], ['Internal relay', 'M0'], ['Data register', 'D0'], ['Timer / counter', 'T0 K50, C0 K10']],
    firstDay: ['Read the PLC and save a copy.', 'Check whether I/O numbering is octal (FX) or hex (Q/iQ-R). // VERIFY', 'Find the device comments file — it\'s often separate.'],
    tips: ['Huge in OEM machines; you\'ll meet it on packaging and imported equipment.', 'Device comments make addresses readable — always load them.'],
    gotchas: ['FX X/Y numbers are octal: there is no X8 or X9.', 'Timer resolution depends on the timer number range. // VERIFY per series'],
  },
  {
    id: 'automationdirect', name: 'AutomationDirect', skin: 'automationdirect',
    software: [{ name: 'CLICK Programming Software', for: 'CLICK PLCs' }, { name: 'Productivity Suite', for: 'Productivity series' }, { name: 'Do-more Designer', for: 'BRX / Do-more' }, { name: 'DirectSOFT', for: 'DirectLOGIC (legacy)' }],
    hardware: ['CLICK', 'Productivity1000/2000/3000', 'BRX (Do-more)', 'DirectLOGIC DL05/06/205/405'],
    addressing: [['CLICK I/O', 'X001, Y001'], ['CLICK memory', 'C1 (bits), DS1 (int), DF1 (float)'], ['DirectLOGIC', 'X0–X7 octal, V2000 V-memory']],
    firstDay: ['Save a copy of the project.', 'Note whether it\'s tag-based (Productivity, Do-more) or address-based (CLICK, DirectLOGIC).'],
    tips: ['The programming software for these families is a free download — a great way to practice at home. Check current licensing on the vendor\'s site.'],
    gotchas: ['DirectLOGIC uses octal I/O and V-memory addresses.'],
  },
  {
    id: 'omron', name: 'Omron', skin: 'omron',
    software: [{ name: 'Sysmac Studio', for: 'NX / NJ machine controllers' }, { name: 'CX-Programmer (CX-One)', for: 'CP1, CJ2, CS1' }],
    hardware: ['CP1 / CP2', 'CJ2', 'NX1 / NJ', 'NX102'],
    addressing: [['CIO bits', '0.00 (word 0, bit 00)'], ['Work / holding', 'W0.00 / H0.00'], ['Data memory', 'D0'], ['Timer', 'T0000 with #50 (0.1 s units)']],
    firstDay: ['Transfer from PLC and save.', 'Check which areas are retentive (H, D) — they survive power loss.'],
    tips: ['Sysmac (NX/NJ) is IEC variable-based; CX-Programmer is address-based. Different worlds.'],
    gotchas: ['Classic TIM timers count DOWN and are BCD by default. // VERIFY per model'],
  },
  {
    id: 'emerson', name: 'Emerson (formerly GE) PACSystems', skin: 'iec',
    software: [{ name: 'PAC Machine Edition / Proficy Machine Edition', for: 'PACSystems RX3i, RSTi, VersaMax' }],
    hardware: ['PACSystems RX3i', 'RX7i (legacy)', 'Series 90-30 (legacy)', 'VersaMax'],
    addressing: [['Discrete in / out', '%I00001, %Q00001'], ['Internal bits', '%M00001'], ['Registers', '%R00001']],
    firstDay: ['Upload and save.', 'Note the register (%R) map used by HMIs and SCADA.'],
    tips: ['%R registers are 16-bit words, 1-based.'],
    gotchas: ['Old 90-30 systems are still common in water/wastewater. // VERIFY'],
  },
  {
    id: 'beckhoff', name: 'Beckhoff', skin: 'iec',
    software: [{ name: 'TwinCAT 3', for: 'PC-based control (runs inside Visual Studio)' }],
    hardware: ['Embedded PCs (CX series)', 'EtherCAT terminals (EL/KL)', 'Industrial PCs'],
    addressing: [['Variables', 'Declared in VAR blocks; linked to I/O in the System Manager'], ['I/O', 'AT %I* / %Q* placeholders linked to terminals']],
    firstDay: ['Get the solution and the target\'s current configuration.', 'Learn the EtherCAT topology — terminals report their state.'],
    tips: ['Structured Text heavy; ladder is available but less common.', 'EtherCAT diagnostics show exactly which terminal dropped.'],
    gotchas: ['Runs on Windows plus a real-time kernel — Windows updates and IT policies matter.'],
  },
];

export interface PracticeTool {
  name: string;
  what: string;
  note: string;
}

/** Free / trial tools for practicing at home. Licensing changes — the page tells learners to verify. */
export const PRACTICE_TOOLS: PracticeTool[] = [
  { name: 'CODESYS Development System', what: 'IEC 61131-3 programming with a built-in soft PLC simulation', note: 'Check current licensing on the vendor\'s site.' },
  { name: 'AutomationDirect CLICK / Productivity / Do-more software', what: 'Real vendor tools with simulators (Do-more has a built-in simulator)', note: 'Check current licensing on the vendor\'s site.' },
  { name: 'Rockwell Connected Components Workbench', what: 'Micro800 programming; standard edition has been offered free', note: 'Check current licensing on the vendor\'s site.' },
  { name: 'OpenPLC', what: 'Open-source PLC runtime and editor; runs on a PC or small boards', note: 'Open source — check the project\'s current license.' },
  { name: 'Siemens LOGO! Soft Comfort', what: 'Small logic module programming with simulation', note: 'Check current availability and licensing on the vendor\'s site.' },
];
