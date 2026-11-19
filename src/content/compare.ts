/**
 * Brand guides side by side: the same everyday jobs on the platforms a US tech meets. Data only.
 *
 * Rules (CLAUDE.md): describe conventions in general terms, never invent menu paths, part numbers or fault codes.
 * Anything that varies by model, version or site ends with "// VERIFY <what>" (shows a "check your manual" chip)
 * and has a line in docs/VERIFY.md. Generic IEC 61131-3 behavior is the baseline column.
 */

export type TopicId = 'addressing' | 'timers' | 'counters' | 'online' | 'forcing' | 'transfer' | 'backups' | 'firmware' | 'gotchas';

export interface Topic { id: TopicId; title: string; why: string; safety?: string }

export const TOPICS: Topic[] = [
  { id: 'addressing', title: 'Addressing', why: 'How an input, an output and a memory bit are named.' },
  { id: 'timers', title: 'Timers', why: 'What a 5-second on-delay looks like, and its units.' },
  { id: 'counters', title: 'Counters', why: 'Counting up, down, and resetting.' },
  { id: 'online', title: 'Going online', why: 'Connecting a laptop to a running controller.' },
  { id: 'forcing', title: 'Forcing', why: 'Overriding an input or output, and how it shows.', safety: 'A forced output can start motors or move cylinders. Forcing an input fools the logic, not the field device. Never force a safety input or output to get around a guard or E-stop. Get permission and clear the area first, and remove every force before you leave.' },
  { id: 'transfer', title: 'Upload / download', why: 'Which way the program moves, and what it does to the machine.', safety: 'A download can stop the machine and replace live values (setpoints, counts, recipes). Back up first, get permission, and make sure the machine is in a safe state.' },
  { id: 'backups', title: 'Backups', why: 'What to save before you change anything.' },
  { id: 'firmware', title: 'Firmware', why: 'Controller operating software and why the version matters.' },
  { id: 'gotchas', title: 'Gotchas', why: 'The mistakes that catch people on this platform.' },
];

export interface Platform {
  id: string;
  name: string;
  /** Short label for the picker chips. */
  short: string;
  /** Brand guide id (src/content/brands.ts) for "Open the full guide". */
  guide?: string;
  software: string;
  cells: Record<TopicId, string>;
}

export const PLATFORMS: Platform[] = [
  {
    id: 'logix', name: 'Allen-Bradley Logix', short: 'AB Logix', guide: 'rockwell', software: 'Studio 5000 Logix Designer',
    cells: {
      addressing: 'Tags by name (Start_PB, Motor1.Run). Module I/O has its own tags like Local:1:I.Data.0; an alias tag gives the point a readable name. // VERIFY module I/O tag format per module',
      timers: 'TON, TOF and RTO use a TIMER tag: .PRE and .ACC in milliseconds, plus .EN, .TT and .DN bits. 5 s = PRE 5000.',
      counters: 'CTU and CTD share a COUNTER tag (.PRE, .ACC, .DN). RES clears it. .ACC keeps counting past the preset.',
      online: 'Pick the communication path to the controller, then go online. If the project and the controller differ, stop and find out why. Never download just to clear the message; if you must upload, upload into a new, dated file so you don\'t overwrite offline work.',
      forcing: 'I/O forces are installed, then enabled. Enabling turns on every installed force at once. The FORCE LED flashes when forces are installed but not enabled and is steady when enabled. Forces stay in the controller after you disconnect and through a power cycle: remove them before you leave. // VERIFY LED states per controller',
      transfer: 'Download sends your project and replaces what is in the controller: it stops the logic (Program mode) and replaces live values like setpoints and counts with the ones in your file. Upload copies the controller into a project file.',
      backups: 'Upload and save the project (.ACD) with the date before any change. Note the controller firmware revision with it.',
      firmware: 'The project\'s major revision must match the controller firmware, or the download is refused. Firmware is updated with Rockwell\'s firmware update tool (ControlFLASH or ControlFLASH Plus), only with a plan and approval.',
      gotchas: 'Timers are milliseconds (SLC used a time base). Duplicate OTE coils: the last rung wins. Test-mode online edits don\'t run until tested or accepted, and nothing reaches your file until you save: after online edits, save the project or the offline .ACD is out of date.',
    },
  },
  {
    id: 'slc', name: 'Allen-Bradley SLC 500 / MicroLogix', short: 'SLC / MicroLogix', guide: 'rockwell', software: 'RSLogix 500',
    cells: {
      addressing: 'Data-file addresses: I:1/0 (input, slot 1, bit 0), O:2/3, B3:0/5 (bit), N7:10 (integer), T4:0 (timer), C5:0 (counter). MicroLogix built-in I/O is slot 0 (I:0/0).',
      timers: 'TON, TOF and RTO in timer file T4. The preset counts in the timer\'s time base (1.0 s or 0.01 s; some MicroLogix also 0.001 s), so 5 s is 500 at 0.01 s or 5 at 1.0 s.',
      counters: 'CTU and CTD in counter file C5 (.PRE, .ACC, .DN); RES resets.',
      online: 'RSLogix 500 connects through RSLinx with the right driver for the port (serial, DH+ or Ethernet on later models). // VERIFY ports per model',
      forcing: 'Forces apply to I/O files only, and must be enabled. A FORCE LED shows on the processor.',
      transfer: 'Download replaces the processor program and its data values (it goes to Program mode). Upload copies it into a .RSS file, but the processor does not store rung comments or symbols: without the matching offline file you get logic with no documentation.',
      backups: 'Keep the documented offline .RSS (comments live only there) and a dated upload. Some processors also keep a copy on a memory module. // VERIFY memory module per model',
      firmware: 'Legacy hardware: firmware changes are rare and need the exact series and revision. Leave it alone unless the vendor tells you otherwise.',
      gotchas: 'Time base, not milliseconds. Integer math past 32767 sets the overflow trap bit (S:5/0); if the logic doesn\'t clear it by the end of the scan, the processor major-faults. Addresses follow the slot, so moving a card moves its addresses.',
    },
  },
  {
    id: 'micro800', name: 'Allen-Bradley Micro800', short: 'Micro800', guide: 'rockwell', software: 'Connected Components Workbench (CCW)',
    cells: {
      addressing: 'Named variables. Built-in I/O has system names like _IO_EM_DI_00 and _IO_EM_DO_00. // VERIFY embedded I/O variable names',
      timers: 'IEC function blocks TON, TOF and TP with a TIME preset (PT = T#5s); outputs Q and ET.',
      counters: 'IEC CTU, CTD and CTUD blocks: PV preset, CV current value, Q output (CTUD has QU and QD), and RESET / LOAD inputs.',
      online: 'Connect from CCW over USB, Ethernet or serial, depending on the model. It is not Studio 5000, even though it is Allen-Bradley.',
      forcing: 'I/O variables can be forced from the software, which marks them as forced. // VERIFY force indication',
      transfer: 'Download builds and sends the project and puts the controller in Program mode, so the machine stops. Upload reads it back. // VERIFY whether an upload brings back comments',
      backups: 'Keep the CCW project file with the date. Some models take a plug-in memory module for backup. // VERIFY memory module per model',
      firmware: 'The controller firmware and the CCW version have to be compatible. Check both before an update. // VERIFY',
      gotchas: 'Different software from bigger Allen-Bradley PLCs, and IEC timers (TIME values) instead of TIMER tags.',
    },
  },
  {
    id: 'siemens', name: 'Siemens S7-1200 / S7-1500', short: 'Siemens S7', guide: 'siemens', software: 'TIA Portal (STEP 7)',
    cells: {
      addressing: 'Byte.bit addresses: I0.0 to I0.7, then I1.0; outputs Q0.0; memory M10.0; words like MW10. Data lives in data blocks (DBs) and is reached by symbolic name.',
      timers: 'IEC TON, TOF, TP and TONR with a TIME preset (T#5S); each timer keeps its data in an instance DB or in the calling block\'s data. Older S7-300/400 programs also use S5 timers (the S7-1200 has none).',
      counters: 'IEC CTU, CTD and CTUD with PV, CV, Q (CTUD has QU and QD) and reset R, each with its own instance data.',
      online: 'Go online through the PC\'s network interface. TIA Portal compares online and offline and marks blocks that differ.',
      forcing: 'Forces are set from a force table, for I/O, and stay through a power cycle; the CPU shows active forces (MAINT LED on S7-1200/1500). Changing a value from a watch table is not forcing: it lasts only until the logic writes it again. // VERIFY force behavior and LED per CPU',
      transfer: 'Download to device compiles first and sends changed blocks; some changes need the CPU in STOP, and downloading a changed data block can reset its values to their start values. Upload from device reads the program back.',
      backups: 'Archive the project with the date. S7-1500: the memory card holds the program and the CPU won\'t run without it. S7-1200: the program is in internal memory; a card is optional. // VERIFY card role per CPU',
      firmware: 'The device version in the project should match the CPU. Firmware updates come from Siemens and are loaded online or by memory card; plan them.',
      gotchas: 'Eight bits per byte: after I0.7 comes I1.0. Words overlap: MW10 uses bytes 10 and 11, so MW10 and MW11 share a byte. Optimized data blocks have no fixed offsets. Watch-table changes are not forces.',
    },
  },
  {
    id: 'schneider', name: 'Schneider Electric Modicon', short: 'Modicon', guide: 'schneider', software: 'EcoStruxure Control Expert (M340 / M580 / Quantum; was Unity Pro). M221 / M241 / M251 use EcoStruxure Machine Expert.',
    cells: {
      addressing: 'Named variables, plus topological I/O addresses that follow rack, slot and channel, and %MW memory words. // VERIFY topological address format',
      timers: 'IEC TON, TOF and TP with a TIME preset; outputs Q and ET.',
      counters: 'IEC CTU, CTD and CTUD.',
      online: 'Connect from the software; it shows whether the PLC and the project are equal or different before you change anything.',
      forcing: 'In Control Expert only EBOOL bits can be forced, from an animation table; forced bits are marked. // VERIFY force indication',
      transfer: 'Build, then transfer the project to the PLC (download) or from the PLC (upload). // VERIFY',
      backups: 'Archive the project with the date. Many M340/M580 CPUs can also hold the application on a memory card.',
      firmware: 'Firmware is updated with the Schneider firmware update tool named in the CPU\'s manual, matching the CPU version the project expects.',
      gotchas: 'The software has changed names over the years (Concept, Unity Pro, Control Expert). Older Modicon PLCs use 0x/1x/3x/4x register numbers, like Modbus, and they are off by one: register 40001 is offset 0 on the wire.',
    },
  },
  {
    id: 'mitsubishi', name: 'Mitsubishi Electric MELSEC', short: 'MELSEC', guide: 'mitsubishi', software: 'GX Works2 / GX Works3',
    cells: {
      addressing: 'Device letters: X inputs, Y outputs, M internal relays, D data registers, T timers, C counters. FX series numbers X and Y in octal (X0–X7, then X10); other series use hex. // VERIFY numbering per series',
      timers: 'Timer coils T with a K preset. Units depend on the timer range (often 100 ms), so K50 can mean 5 s. // VERIFY timer ranges per series',
      counters: 'Counter coils C with a K preset; RST resets them.',
      online: 'Set the connection destination (USB or Ethernet), then read or monitor.',
      forcing: 'Setting a device from the software usually lasts only until the logic writes it again; true forced I/O exists only on some CPUs. // VERIFY per series',
      transfer: '"Write to PLC" is the download; "Read from PLC" is the upload. Comments come back only if someone chose to write them to the PLC. // VERIFY',
      backups: 'Read from PLC and save the project with the date. Some CPUs take a memory card. // VERIFY',
      firmware: 'Firmware depends on the series; check the CPU version against the software before any change. // VERIFY',
      gotchas: 'Octal I/O on FX (there is no X8). K means a decimal constant, H means hex. Numbering (octal or hex) and device ranges differ by series.',
    },
  },
  {
    id: 'ad', name: 'AutomationDirect', short: 'AutomationDirect', guide: 'automationdirect', software: 'DirectSOFT (DirectLOGIC), CLICK, Productivity Suite or Do-more Designer',
    cells: {
      addressing: 'Depends on the family: DirectLOGIC uses octal X0 / Y0 and V-memory; CLICK uses X001 / Y001 / C control bits / DS data registers; Productivity uses named tags; Do-more uses X, Y, C and V memory. // VERIFY per family',
      timers: 'A timer instruction with a preset. Some families let you choose units (for example ms or s); DirectLOGIC TMR has a fixed 0.1 s time base (TMRF: 0.01 s).',
      counters: 'A counter instruction with a preset and a reset input.',
      online: 'Each family has its own software. Connect over USB, serial or Ethernet depending on the model. // VERIFY ports per family',
      forcing: 'The software can override bits for testing. // VERIFY name and indication per family',
      transfer: 'Write the project to the PLC (download) or read it from the PLC (upload).',
      backups: 'Read the project and save it with the date. // VERIFY',
      firmware: 'Firmware is usually updated through the same software. Match it to the software version. // VERIFY',
      gotchas: 'Four families, four different programs. Check which one you have before you download anything. DirectLOGIC timer presets are BCD. // VERIFY',
    },
  },
  {
    id: 'omron', name: 'Omron', short: 'Omron', guide: 'omron', software: 'Sysmac Studio (NJ/NX) · CX-Programmer (CJ/CP)',
    cells: {
      addressing: 'NJ/NX: named variables. CJ/CP: memory areas with channel.bit addresses (CIO 0.00), work bits (W), data memory (D). // VERIFY',
      timers: 'NJ/NX: IEC TON, TOF and TP with TIME. CJ/CP: TIM counts down in 0.1 s steps from its set value (BCD by default), so 5 s is 50. // VERIFY per model',
      counters: 'NJ/NX: IEC CTU, CTD and CTUD. CJ/CP: CNT counts down from its set value, with a reset input. // VERIFY',
      online: 'Go online from Sysmac Studio (or CX-Programmer for CJ/CP) over USB or Ethernet.',
      forcing: 'Force set and force reset are available for testing; forced bits are marked. // VERIFY',
      transfer: 'Transfer to the controller (download) or from the controller (upload).',
      backups: 'Save the project with the date. Many CPUs can also hold a backup on a memory card (an SD card on NJ/NX).',
      firmware: 'Unit and firmware versions matter for which features work. Check before changing. // VERIFY',
      gotchas: 'Old CJ/CP programs and new NJ/NX programs look nothing alike. CJ timer and counter set values are often BCD. // VERIFY',
    },
  },
  {
    id: 'iec', name: 'Generic IEC 61131-3', short: 'IEC 61131-3', software: 'Any IEC-based tool (CODESYS-style)',
    cells: {
      addressing: 'Named variables are the norm. Direct addresses look like %IX0.0 (input bit), %QX0.0 (output bit) and %MW10 (memory word).',
      timers: 'TON, TOF and TP function blocks: input IN, preset PT as TIME (T#5s), outputs Q and ET.',
      counters: 'CTU, CTD and CTUD: PV preset, CV current value, Q output (CTUD has QU and QD), R reset (CTU), LD load (CTD).',
      online: 'Your vendor\'s tool connects to the controller and compares the project before you change anything.',
      forcing: 'Most tools can force variables; the standard does not say how forcing is shown. A forced output can start motors or move cylinders; forcing an input fools the logic, not the field device. Get permission and clear the area first.',
      transfer: 'Download replaces the program in the controller and can stop the machine; upload reads it back. Names vary by vendor.',
      backups: 'Keep dated copies offline and on the site\'s backup system. Back up before every change.',
      firmware: 'Never update firmware without a backup, a plan and approval: it can change how the program behaves.',
      gotchas: 'Every vendor adds its own extensions to the standard. The idea is the same; the details are in your manual.',
    },
  },
];

export const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));
