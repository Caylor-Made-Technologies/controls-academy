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
  /** Where you meet this brand in the US and how common it is. */
  us?: string;
  hmi?: string[];
  drives?: string[];
  networks?: string[];
}

const BASE_GUIDES: BrandGuide[] = [
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

/** US field notes for every brand: where you'll see it, HMIs, drives and networks. */
const US_NOTES: Record<string, Pick<BrandGuide, 'us' | 'hmi' | 'drives' | 'networks'>> = {
  rockwell: {
    us: 'The most common PLC brand in US plants. Expect it in food and beverage, grain and flour, automotive, water, and data-center utility controls. If you learn one platform first, learn this one.',
    hmi: ['PanelView Plus / PanelView 5000 (FactoryTalk View ME or Optix) // VERIFY current names', 'FactoryTalk View SE (SCADA)'],
    drives: ['PowerFlex 4-class (40, 525) small drives', 'PowerFlex 750-series large drives'],
    networks: ['EtherNet/IP (current standard)', 'DeviceNet and ControlNet (older)', 'DH+ and Remote I/O (legacy PLC-5/SLC)', 'DF1 serial'],
  },
  siemens: {
    us: 'Second most common in the US and the world leader overall. Very common on machines built in Europe, in automotive, and in larger process plants.',
    hmi: ['SIMATIC Basic / Comfort panels', 'WinCC Unified panels and PC runtime'],
    drives: ['SINAMICS G120 (general purpose)', 'SINAMICS S120 (motion)', 'MICROMASTER (legacy)'],
    networks: ['PROFINET (current standard)', 'PROFIBUS DP (older, still common)', 'MPI (legacy programming)'],
  },
  schneider: {
    us: 'Strong in US water and wastewater, infrastructure, and Square D power equipment. Modicon invented Modbus, so you will see Modbus everywhere it goes.',
    hmi: ['Magelis / Harmony HMIs (Vijeo Designer, EcoStruxure Operator Terminal Expert) // VERIFY current names'],
    drives: ['Altivar drives (ATV320, ATV340, ATV600/900 families)'],
    networks: ['Modbus TCP and Modbus RTU', 'EtherNet/IP on newer controllers', 'Modbus Plus (legacy)'],
  },
  mitsubishi: {
    us: 'Common on packaging, assembly and imported Japanese machines. Less common as a plant-wide standard in the US, but you will meet it on OEM equipment.',
    hmi: ['GOT HMIs (GT Designer)'],
    drives: ['FR-series inverters (FR-D, FR-E, FR-A)'],
    networks: ['CC-Link / CC-Link IE', 'SLMP over Ethernet', 'Serial (older FX)'],
  },
  automationdirect: {
    us: 'A US company (Georgia) selling low-cost PLCs online. Popular with small shops, farms, grain elevators and home learners because the software is free.',
    hmi: ['C-more touch panels', 'C-more Micro (small text panels)'],
    drives: ['GS-series drives (GS10, GS20, DURApulse)'],
    networks: ['Modbus TCP / RTU', 'EtherNet/IP (Productivity, Do-more) // VERIFY per model'],
  },
  omron: {
    us: 'Common on packaging, food machines and Japanese-built equipment. Big in sensors and safety relays too.',
    hmi: ['NB and NA series HMIs'],
    drives: ['MX2 and RX inverters'],
    networks: ['EtherNet/IP', 'EtherCAT (for motion on NX/NJ)', 'Host Link / serial (older CP/CJ)'],
  },
  emerson: {
    us: 'Formerly GE Fanuc / GE Intelligent Platforms. Still strong in US municipal water and wastewater, power and oil and gas.',
    hmi: ['QuickPanel+ HMIs', 'iFIX / Cimplicity SCADA (often seen with these PLCs) // VERIFY current ownership of these SCADA products'],
    drives: ['Not a major drive brand; expect third-party drives'],
    networks: ['Ethernet (SRTP, EGD), Modbus TCP', 'PROFINET on RX3i', 'Genius bus (legacy)'],
  },
  beckhoff: {
    us: 'PC-based control from Germany, growing in US high-speed machinery and some building automation. Structured Text heavy.',
    hmi: ['TwinCAT HMI on panel PCs'],
    drives: ['AX-series servo drives'],
    networks: ['EtherCAT (Beckhoff invented it)', 'ADS for PC communication', 'Many fieldbus terminals (PROFINET, EtherNet/IP, Modbus, BACnet)'],
  },
};

/** Other brands you commonly meet in US panels. */
const MORE_GUIDES: BrandGuide[] = [
  {
    id: 'idec', name: 'IDEC', skin: 'iec',
    software: [{ name: 'WindLDR (Automation Organizer)', for: 'MicroSmart PLCs' }, { name: 'WindO/I-NV4', for: 'HMIs // VERIFY' }],
    hardware: ['MicroSmart FC6A / FC6A Plus', 'MicroSmart FC5A (older)', 'SmartAXIS logic modules', 'HG HMIs'],
    addressing: [['Inputs / outputs', 'I0, Q0 // VERIFY numbering scheme per model'], ['Internal relay', 'M0'], ['Data register', 'D0']],
    firstDay: ['Upload the program and save it with the date.', 'Note the model and any expansion modules.'],
    tips: ['IDEC is also a big name in pushbuttons, relays and E-stops — you will see their devices even where the PLC is another brand.'],
    gotchas: ['Check the address numbering on your model before you write new logic. // VERIFY'],
    us: 'A Japanese company with a large US presence. Common in small machines, pump panels and HVAC. Their pilot devices and relays are everywhere.',
    networks: ['Modbus TCP / RTU', 'Ethernet'],
  },
  {
    id: 'unitronics', name: 'Unitronics', skin: 'iec',
    software: [{ name: 'UniLogic', for: 'UniStream' }, { name: 'VisiLogic', for: 'Vision series' }, { name: 'U90 Ladder', for: 'Jazz / M91 (older) // VERIFY' }],
    hardware: ['UniStream (HMI + PLC)', 'Vision series (HMI + PLC)', 'Samba', 'Jazz (small)'],
    addressing: [['Memory bits / integers (Vision)', 'MB0, MI0 // VERIFY'], ['Inputs / outputs (Vision)', 'I0, O0 // VERIFY'], ['UniStream', 'Tags']],
    firstDay: ['Back up the project from the panel and save it with the date.', 'Note whether the HMI screens and the logic live in the same project (they usually do).'],
    tips: ['One project holds both the screens and the ladder logic.'],
    gotchas: ['If the screen dies, the controller may be dead too — they are one unit.', 'Default network settings and passwords should be changed on any connected unit.'],
    us: 'Common on small US machines, water skids and pump stations because the screen and PLC are one low-cost unit.',
    networks: ['Modbus TCP / RTU', 'EtherNet/IP (some models) // VERIFY', 'CANopen'],
  },
  {
    id: 'wago', name: 'WAGO', skin: 'iec',
    software: [{ name: 'e!COCKPIT', for: 'PFC100 / PFC200 // VERIFY current tool name' }, { name: 'CODESYS V3', for: 'PFC controllers' }],
    hardware: ['PFC100 / PFC200 controllers', '750 / 753 I/O system', 'Compact Controller 100', 'Terminal blocks and relays'],
    addressing: [['Variables', 'IEC 61131-3 variables (CODESYS)'], ['I/O', '%IX / %QX linked to the I/O image']],
    firstDay: ['Get the project and the controller\'s web management page address.', 'List the I/O slices in order; it must match the project.'],
    tips: ['WAGO push-in terminals are the orange-lever and push-in blocks you see in many panels.', 'Controllers have a web management page for status and diagnostics.'],
    gotchas: ['A slice added or moved changes the process image. Update the project.'],
    us: 'Very common for terminal blocks; WAGO controllers show up in building automation, energy and water.',
    networks: ['Modbus TCP', 'EtherNet/IP', 'BACnet (some controllers) // VERIFY', 'MQTT and IIoT'],
  },
  {
    id: 'phoenix', name: 'Phoenix Contact', skin: 'iec',
    software: [{ name: 'PLCnext Engineer', for: 'PLCnext controllers (AXC F)' }, { name: 'PC WORX', for: 'Older ILC controllers' }],
    hardware: ['PLCnext AXC F controllers', 'ILC (older)', 'Axioline and Inline I/O', 'Power supplies, terminals, surge protection'],
    addressing: [['Variables', 'IEC 61131-3 variables']],
    firstDay: ['Get the project and find the controller\'s address.', 'Note the I/O station layout.'],
    tips: ['You will see their terminal blocks, power supplies and surge protection in panels of every brand.'],
    gotchas: ['PLCnext can run code in several languages at once. Ask what runs where before changing anything.'],
    us: 'Huge for terminal blocks, power supplies and surge protection in US panels. PLCnext controllers are growing in infrastructure and energy.',
    networks: ['PROFINET', 'Modbus TCP', 'EtherNet/IP (some) // VERIFY'],
  },
  {
    id: 'eaton', name: 'Eaton', skin: 'iec',
    software: [{ name: 'easySoft', for: 'easyE4 programmable relays' }, { name: 'XSOFT-CODESYS', for: 'XC controllers // VERIFY' }, { name: 'Galileo', for: 'XV HMIs // VERIFY' }],
    hardware: ['easyE4 / easy relays', 'XC controllers', 'XV HMIs', 'DG1 and PowerXL drives', 'Contactors, starters, breakers'],
    addressing: [['easyE4', 'I1, Q1, M1 (operand-style) // VERIFY']],
    firstDay: ['Read the program from the relay and save it.', 'Many Eaton panels are mostly hardwired with starters and relays — check the print first.'],
    tips: ['Eaton (and Cutler-Hammer before it) built a huge share of US motor control centers.'],
    gotchas: ['Small logic relays are often programmed from the front keys; a hand-edited program may differ from the office copy.'],
    us: 'Everywhere in US power distribution and motor control (breakers, MCCs, starters). easy relays show up in simple controls.',
    drives: ['DG1, PowerXL DM1, DC1'],
    networks: ['Modbus', 'Ethernet'],
  },
  {
    id: 'keyence', name: 'Keyence', skin: 'iec',
    software: [{ name: 'KV STUDIO', for: 'KV series PLCs' }],
    hardware: ['KV-8000 / KV-7000 (building block)', 'KV Nano (compact)', 'Sensors, vision systems, safety scanners'],
    addressing: [['Relays / data memory', 'R000, MR000, DM0 // VERIFY'], ['Timers / counters', 'T0, C0 // VERIFY']],
    firstDay: ['Upload the project and save it.', 'Check whether vision or sensor settings are stored in the devices themselves.'],
    tips: ['Keyence sensors and vision cameras are common even where the PLC is another brand.'],
    gotchas: ['Address names differ a lot from other brands. Keep the manual handy. // VERIFY'],
    us: 'Growing fast in US automotive and electronics assembly, inspection and packaging, partly because of strong local sales support.',
    networks: ['EtherNet/IP', 'KV proprietary links // VERIFY'],
  },
  {
    id: 'opto22', name: 'Opto 22', skin: 'iec',
    software: [{ name: 'PAC Control', for: 'SNAP PAC and groov EPIC (flowchart-based)' }, { name: 'CODESYS', for: 'groov EPIC // VERIFY' }, { name: 'groov View', for: 'HMI' }],
    hardware: ['groov EPIC', 'groov RIO (remote I/O)', 'SNAP PAC (older)'],
    addressing: [['Variables / points', 'Named points and variables (tag-based)']],
    firstDay: ['Back up the strategy file and the controller configuration.', 'Find out whether it also runs Node-RED or other software. // VERIFY'],
    tips: ['A US company (California). Popular for data collection, energy monitoring and IIoT projects.'],
    gotchas: ['PAC Control uses flowcharts, not ladder. Expect a different way of reading logic.'],
    us: 'Found in water, energy monitoring, test stands and IIoT projects across the US.',
    networks: ['Ethernet, Modbus TCP', 'MQTT, OPC UA // VERIFY'],
  },
  {
    id: 'delta', name: 'Delta Electronics', skin: 'mitsubishi',
    software: [{ name: 'ISPSoft / WPLSoft', for: 'DVP series // VERIFY' }, { name: 'DIADesigner', for: 'AS series // VERIFY' }],
    hardware: ['DVP series (ES2, SS2, SE…)', 'AS series', 'DOP HMIs', 'VFD drives (MS300, C2000)'],
    addressing: [['Inputs / outputs (DVP)', 'X0, Y0 (octal) // VERIFY'], ['Internal relay / data register', 'M0, D0']],
    firstDay: ['Upload and save the program.', 'Check the exact model; DVP and AS families use different software.'],
    tips: ['Addressing on DVP feels a lot like Mitsubishi FX. The simulator\'s Mitsubishi dialect is the closest match.'],
    gotchas: ['Low-cost machines sometimes ship with no backup. Make one before touching anything.'],
    us: 'Common on low-cost and imported OEM machines; Delta drives are common too.',
    drives: ['MS300, C2000, VFD-E'],
    networks: ['Modbus RTU / TCP', 'EtherNet/IP (some) // VERIFY'],
  },
  {
    id: 'bnr', name: 'B&R (part of ABB)', skin: 'iec',
    software: [{ name: 'B&R Automation Studio', for: 'X20, X90, Power Panel' }],
    hardware: ['X20 controllers and I/O', 'X90 mobile controllers', 'Power Panel HMIs', 'ACOPOS servo drives'],
    addressing: [['Variables', 'IEC 61131-3 variables']],
    firstDay: ['Get the Automation Studio project and the exact version used.', 'Ask the OEM for support contacts; many B&R machines are tightly OEM-controlled.'],
    tips: ['Heavy on motion and Structured Text.'],
    gotchas: ['Projects often need the exact Automation Studio version that built them. // VERIFY'],
    us: 'Seen on European packaging, plastics and printing machines in US plants.',
    networks: ['POWERLINK', 'OPC UA', 'Ethernet'],
  },

  {
    id: 'yaskawa', name: 'Yaskawa', skin: 'iec',
    software: [{ name: 'DriveWizard', for: 'GA500, GA800, A1000, V1000 drives' }, { name: 'DriveWizard Mobile', for: 'Phone app over Bluetooth on newer drives // VERIFY' }],
    hardware: ['GA500 (compact)', 'GA800 (general purpose)', 'A1000 / V1000 / J1000 (older)', 'Motoman robots', 'Servo drives (Sigma series)'],
    addressing: [['Parameters', 'Grouped by letter and number (e.g. b1-01, C1-01) // VERIFY per model'], ['Fault codes', 'Short codes on the keypad (e.g. oC overcurrent, ov overvoltage) // VERIFY']],
    firstDay: ['Find the drive model and the motor nameplate it is set up for.', 'Save the parameter set (DriveWizard or keypad copy function) before changing anything.', 'Find out where the run command and speed reference come from: keypad, terminals or network.'],
    tips: ['Yaskawa drives are everywhere in the US — on conveyors, pumps, fans and OEM machines of every brand.', 'The keypad fault history shows the last several faults and the conditions at the time. // VERIFY'],
    gotchas: ['Changing the control method or motor data after commissioning can make the motor misbehave. Write down every parameter you touch.'],
    us: 'One of the most common drive brands in US plants (Japanese company with a large US headquarters near Chicago). Also big in robots and servos.',
    networks: ['Modbus RTU built in', 'Option cards for EtherNet/IP, PROFINET, Modbus TCP, BACnet // VERIFY'],
  },
  {
    id: 'abb', name: 'ABB', skin: 'iec',
    software: [{ name: 'Drive Composer', for: 'ACS/ACH drives' }, { name: 'Automation Builder', for: 'AC500 PLCs' }],
    hardware: ['ACS580 / ACH580 (general / HVAC)', 'ACS880 (industrial)', 'ACS355 / ACS380 (machinery)', 'AC500 PLCs', 'Motors, breakers and contactors'],
    addressing: [['Drive parameters', 'Group.index (e.g. 99.06) // VERIFY'], ['AC500 PLC', 'IEC 61131-3 variables (CODESYS-based)']],
    firstDay: ['Back up the drive parameters with the control panel or Drive Composer.', 'Note whether the ACH580 is in BACnet control from the building system.'],
    tips: ['The ACH580 is a very common HVAC drive in US buildings and data centers.', 'The assistant control panel has a fault and event log with timestamps. // VERIFY'],
    gotchas: ['HVAC drives are often in "hand / off / auto"; the building system only controls them in auto.'],
    us: 'Common for HVAC and pump drives in US buildings and data centers, and for big industrial drives. ABB also owns B&R.',
    drives: ['ACS580, ACH580, ACS880, ACS355, ACS380'],
    networks: ['BACnet MS/TP and Modbus RTU built in on HVAC drives // VERIFY', 'Option adapters for EtherNet/IP, PROFINET, Modbus TCP'],
  },
  {
    id: 'danfoss', name: 'Danfoss', skin: 'iec',
    software: [{ name: 'MCT 10 Set-up Software', for: 'VLT drives' }],
    hardware: ['VLT HVAC Drive FC 102', 'VLT AutomationDrive FC 302', 'VLT Micro Drive FC 51', 'VACON drives'],
    addressing: [['Parameters', 'Numbered by group (e.g. 1-20 motor power) // VERIFY']],
    firstDay: ['Copy the parameters to the LCP (the keypad can store a set) or save with MCT 10.', 'Check hand/off/auto mode and where the reference comes from.'],
    tips: ['The FC 102 is all over US data-center cooling: CRAH fans, cooling towers, chilled-water pumps.'],
    gotchas: ['Several parameter set-ups can exist in one drive; check which one is active. // VERIFY'],
    us: 'A Danish company very common on HVAC in US commercial buildings and data centers.',
    networks: ['BACnet and Modbus RTU built in on HVAC drives // VERIFY', 'Option cards for EtherNet/IP, PROFINET'],
  },
  {
    id: 'redlion', name: 'Red Lion', skin: 'iec',
    software: [{ name: 'Crimson', for: 'Graphite HMIs, FlexEdge, Data Stations' }],
    hardware: ['Graphite HMIs', 'FlexEdge intelligent edge platform', 'Data Station protocol converters', 'Panel meters and counters', 'Industrial Ethernet switches'],
    addressing: [['Tags', 'Crimson tags mapped to each device\'s own addresses']],
    firstDay: ['Back up the Crimson database from the unit.', 'List every device it talks to — it is often the "translator" between brands.'],
    tips: ['Red Lion boxes are often the glue between a PLC and a SCADA, a drive or a BMS that speak different protocols.', 'Their digital panel meters and counters are common on machines.'],
    gotchas: ['If one brand of device stops talking to another, check the Red Lion in the middle before blaming either end.'],
    us: 'A US company (Pennsylvania). Common in water, oil and gas, and mixed-brand plants as HMIs and protocol converters.',
    networks: ['Talks many protocols at once (Modbus, EtherNet/IP, PROFINET, DF1, and more) // VERIFY per model'],
  },
  {
    id: 'pilz', name: 'Pilz', skin: 'iec',
    software: [{ name: 'PNOZmulti Configurator', for: 'Configurable safety relays' }, { name: 'PAS4000', for: 'PSS 4000 safety controllers // VERIFY' }],
    hardware: ['PNOZ X / PNOZsigma / PNOZ s (safety relays)', 'PNOZmulti 2 (configurable)', 'PSS 4000 (safety controller)', 'Safety gate switches and light curtains'],
    addressing: [['Safety relay', 'Terminals S11/S12/S21/S22 for channels, 13-14 / 23-24 for safety outputs // VERIFY per model']],
    firstDay: ['Find every safety relay and what device each one monitors.', 'Read the LEDs: power, channel 1, channel 2, outputs.', 'Ask who is qualified to change safety circuits — usually nobody on a normal shift.'],
    tips: ['A safety relay that will not reset usually means one channel opened and the other did not: a stuck contact or broken wire. That is it doing its job.'],
    gotchas: ['Never jumper a safety relay input to get a machine running. It removes the protection and is a serious violation.'],
    us: 'German company that invented the safety relay. Very common on US machine guarding next to every PLC brand.',
  },
  {
    id: 'tridium', name: 'Tridium (Niagara Framework)', skin: 'iec',
    software: [{ name: 'Niagara Workbench', for: 'JACE controllers and Niagara supervisors' }],
    hardware: ['JACE 8000 / JACE 9000 // VERIFY', 'Niagara Supervisor (server)', 'Edge controllers'],
    addressing: [['Points', 'Named points in stations, linked to BACnet / Modbus / LON objects']],
    firstDay: ['Get read-only access first. Back up the station.', 'Learn the network layout: which JACE talks to which floor, AHU or CRAH units.'],
    tips: ['Niagara is sold by many brands under their own names (Honeywell WEBs, Distech, and others).'],
    gotchas: ['An override left in "manual" on a BAS point is the building version of a forced PLC output. Look for overrides first.'],
    us: 'Very common in US data centers and commercial buildings as the system that ties many vendors\' controllers together.',
    networks: ['BACnet/IP and MS/TP', 'Modbus TCP / RTU', 'LonWorks', 'SNMP for data-center equipment // VERIFY'],
  },
  {
    id: 'jci', name: 'Johnson Controls (Metasys)', skin: 'iec',
    software: [{ name: 'Metasys', for: 'Building automation (web UI)' }, { name: 'Controller Configuration Tool (CCT)', for: 'Field controllers // VERIFY' }],
    hardware: ['SNE / NAE network engines // VERIFY', 'FEC / FAC / CGM field controllers // VERIFY', 'VAV controllers', 'York chillers (often on the same system)'],
    addressing: [['Points', 'Named objects in the site database; BACnet objects underneath']],
    firstDay: ['Get your login and learn the alarm screen.', 'Find the points list for the equipment you cover: chillers, CRAHs, pumps.'],
    tips: ['Metasys trends are the fastest way to see what a unit did before an alarm.'],
    gotchas: ['Changing a setpoint in the BAS may be overridden by a schedule or a higher-priority command. Check the command priority. // VERIFY'],
    us: 'One of the most common building automation systems in US data centers and large buildings.',
    networks: ['BACnet/IP and BACnet MS/TP', 'N2 (legacy)'],
  },
  {
    id: 'honeywell', name: 'Honeywell Building Automation', skin: 'iec',
    software: [{ name: 'WEBs (Niagara-based)', for: 'Building automation // VERIFY' }, { name: 'EBI / Enterprise Buildings Integrator', for: 'Large sites // VERIFY' }],
    hardware: ['WEBs controllers', 'Spyder field controllers', 'Excel controllers (older) // VERIFY', 'Sensors, valves and actuators'],
    addressing: [['Points', 'Named points; BACnet or LON objects underneath']],
    firstDay: ['Find out which front end the site uses.', 'Learn where overrides and schedules live.'],
    tips: ['Honeywell valves, actuators and sensors show up on almost every brand of BAS.'],
    gotchas: ['LON and BACnet devices can sit on the same site; know which trunk you are on before troubleshooting.'],
    us: 'Common in US commercial buildings, campuses and some data centers.',
    networks: ['BACnet', 'LonWorks', 'Modbus'],
  },
];

export const BRAND_GUIDES: BrandGuide[] = [...BASE_GUIDES.map((g) => ({ ...g, ...US_NOTES[g.id] })), ...MORE_GUIDES];

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
