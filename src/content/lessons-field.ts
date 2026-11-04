import type { Lesson } from './types';

export const FIELD_LESSONS: Lesson[] = [
  {
    id: 'upload-download',
    track: 't6',
    title: 'Upload, download, go online',
    minutes: 7,
    summary: 'The words that save (or wreck) your night shift.',
    blocks: [
      { t: 'table', head: ['Action', 'Direction', 'Risk'], rows: [
        ['[[upload|Upload]]', 'Controller → your laptop', 'Low. Gets you the real running program.'],
        ['[[download|Download]]', 'Laptop → controller', 'High. Overwrites what\'s running; often stops the process.'],
        ['Go online', 'Connect and watch live', 'Low to watch; high once you start changing things.'],
      ] },
      { t: 'callout', tone: 'safety', title: 'The golden rule', text: 'Before you change anything: **go online, upload, and save a dated copy**. The file on the shared drive may not match what\'s actually running. Downloading an old file can undo months of changes — or start equipment unexpectedly.' },
      { t: 'h', text: 'Online edits' },
      { t: 'p', text: '[[online-edit|Online edits]] change logic while the controller runs. On Logix-style platforms the flow is: start pending edits → make the change → accept (test) → test it → assemble (finalize). Until assembled, edits are still pending. On Siemens-style platforms you download changed blocks; some changes can require the CPU to go to STOP. // VERIFY exact wording per software version' },
      { t: 'h', text: 'Controller modes' },
      { t: 'list', items: [
        '**RUN** — scanning, outputs active.',
        '**PROG / STOP** — not scanning, outputs off. Downloads usually happen here.',
        '**REM** (on many AB controllers) — the software is allowed to change the mode remotely.',
      ] },
      { t: 'callout', tone: 'tip', title: 'Compare before you leave', text: 'Use your software\'s compare tool to diff online vs offline, save the final version with a clear name and date, and note what you changed in the rung comments.' },
    ],
    quiz: [
      { id: 'q1', q: 'First thing you do before editing a running controller?', choices: ['Download your copy', 'Upload and save a dated backup', 'Switch to PROG', 'Force all outputs'], answer: 1, why: 'Upload gets the real program; saving it gives you a way back.' },
      { id: 'q2', q: 'Download means…', choices: ['controller → laptop', 'laptop → controller', 'cloud backup', 'reading tags'], answer: 1, why: 'Download sends your file to the controller and replaces what\'s running.' },
      { id: 'q3', q: 'A Logix-style online edit that\'s been accepted but not assembled is…', choices: ['permanent', 'still pending', 'deleted', 'downloaded'], answer: 1, why: 'Assemble finalizes the edit.' },
    ],
  },
  {
    id: 'forcing',
    track: 't6',
    title: 'Forcing: power with a price',
    minutes: 6,
    summary: 'What a force really does, how to see one, and why you remove every one.',
    blocks: [
      { t: 'p', text: 'A [[force]] overrides an I/O point. A forced input makes the PLC see ON (or OFF) no matter what the field says. A forced output drives the field device no matter what the logic says.' },
      { t: 'callout', tone: 'safety', title: 'Forces move real equipment', text: 'Forcing an output can start a motor or open a valve with someone in the machine. Never force without knowing what moves, who\'s near it, and having authorization. Never force a safety device.' },
      { t: 'list', items: [
        'Most controllers show a **FORCE** indicator when forces are installed or enabled. // VERIFY per model',
        'Siemens-style systems use a force table; the CPU shows a maintenance/force indication. // VERIFY per model',
        'Forces are easy to forget. A machine that "stopped working after maintenance" is a classic forgotten force.',
      ] },
      { t: 'callout', tone: 'tip', title: 'The rule', text: 'Document every force you install, tell the next shift, and remove it before you leave. Check the force indicator on your way out.' },
    ],
    quiz: [
      { id: 'q1', q: 'An output is forced ON. The logic rung goes false. The field device…', choices: ['turns off', 'stays on', 'faults', 'blinks'], answer: 1, why: 'The force overrides the logic.' },
      { id: 'q2', q: 'Machine stopped working after last night\'s maintenance; the logic looks right. Check…', choices: ['the paint', 'for forces left installed', 'the HMI color', 'the IP address first'], answer: 1, why: 'A forgotten force is the classic cause.' },
    ],
  },
  {
    id: 'troubleshooting-method',
    track: 't7',
    title: 'A repeatable troubleshooting method',
    minutes: 8,
    summary: 'The order that finds faults fast and keeps you safe.',
    blocks: [
      { t: 'list', ordered: true, items: [
        '**Talk to the operator.** What happened, when, what changed, any alarms?',
        '**Check the obvious.** Power on? E-stops out? Overloads reset? Air on? Guards closed?',
        '**Look at the I/O LEDs.** Is the input the PLC needs actually ON? Is the output ON?',
        '**Find the output in the logic and work backward.** Use [[cross-reference]] to find the rung, then see which condition is false.',
        '**Half-split with your meter.** Measure in the middle of the circuit, then the middle of the bad half. That\'s [[half-split|half-splitting]].',
        '**Fix, test, document.** Write down what you found and what you did. Remove any forces.',
      ] },
      { t: 'callout', tone: 'safety', title: 'Safe first, fast second', text: 'Measuring live voltage is often necessary to find a fault — but only with the right PPE, a rated meter, and inside the rules for that equipment. When you need hands in, it\'s LOTOTO.' },
      { t: 'callout', tone: 'tip', title: 'Practice it', text: 'Fault-Hunt mode (Troubleshoot tab) injects real faults into the motor station. You get a meter, I/O LEDs and the logic. You\'re scored on time AND on staying safe.' },
    ],
    quiz: [
      { id: 'q1', q: 'Motor won\'t start. First step?', choices: ['Swap the PLC', 'Talk to the operator and check the obvious', 'Force the output', 'Download a backup'], answer: 1, why: 'Many calls are an E-stop, an overload or no air.' },
      { id: 'q2', q: 'Output LED is ON, coil has no voltage. Fault is likely…', choices: ['in the logic', 'between the output terminal and the coil', 'in the HMI', 'the input card'], answer: 1, why: 'The PLC is commanding it. Follow the wire: output terminal, fuses, interlocks, the coil.' },
      { id: 'q3', q: 'Half-splitting means…', choices: ['replacing half the parts', 'measuring in the middle and narrowing the bad half', 'running at half speed', 'two techs at once'], answer: 1, why: 'Each check cuts the suspects in half.' },
    ],
  },
  {
    id: 'modbus',
    track: 't8',
    title: 'Modbus: the off-by-one trap',
    minutes: 6,
    summary: 'Registers, offsets and swapped floats.',
    blocks: [
      { t: 'p', text: '[[modbus|Modbus]] is everywhere: meters, drives, chillers, gensets. Data lives in four tables:' },
      { t: 'table', head: ['Table', 'Classic number', 'Read/write'], rows: [
        ['Coils', '0xxxx', 'Read/write bits'],
        ['Discrete inputs', '1xxxx', 'Read-only bits'],
        ['Input registers', '3xxxx', 'Read-only 16-bit words'],
        ['Holding registers', '4xxxx', 'Read/write 16-bit words'],
      ] },
      { t: 'callout', tone: 'gotcha', title: 'Off by one', text: 'Register **40001** is holding register **offset 0** on the wire. Some software wants 40001, some wants 0, some wants 1. If every value looks like its neighbor\'s, you\'re off by one.' },
      { t: 'callout', tone: 'gotcha', title: 'Swapped floats', text: 'A 32-bit float uses two registers. Devices disagree on which comes first (word swap) and sometimes byte order. If you read 1.2e-38 instead of 72.5, try swapping words.' },
      { t: 'p', text: 'Common function codes: 01 read coils, 02 read discrete inputs, 03 read holding registers, 04 read input registers, 05 write single coil, 06 write single register, 16 write multiple registers.' },
    ],
    quiz: [
      { id: 'q1', q: 'Holding register 40001 is offset…', choices: ['0', '1', '40000', '40001'], answer: 0, why: '4xxxx numbering is 1-based; the protocol offset is 0-based.' },
      { id: 'q2', q: 'Every float reads as garbage but integers are fine. Try…', choices: ['a new cable', 'swapping word order', 'a faster baud rate', 'function code 01'], answer: 1, why: '32-bit values span two registers; devices order them differently.' },
      { id: 'q3', q: 'Function code 03 reads…', choices: ['coils', 'holding registers', 'input registers', 'discrete inputs'], answer: 1, why: '03 = read holding registers.' },
    ],
  },
];
