import { FOUNDATION_LESSONS } from './lessons-foundations';
import { PLC_LESSONS } from './lessons-plc';
import { FIELD_LESSONS } from './lessons-field';
import type { Lesson, Track, TrackId } from './types';

const raw = [...FOUNDATION_LESSONS, ...PLC_LESSONS, ...FIELD_LESSONS];

/** Lessons with globally unique question ids (`lessonId.q1`). */
export const LESSONS: Lesson[] = raw.map((l) => ({ ...l, quiz: l.quiz.map((q) => ({ ...q, id: `${l.id}.${q.id}` })) }));
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

const ids = (t: TrackId) => LESSONS.filter((l) => l.track === t).map((l) => l.id);

export const TRACKS: Track[] = [
  { id: 't1', n: 1, title: 'Electrical & Safety Foundations', blurb: 'Volts, amps, your meter, LOTOTO, and the devices in every panel.', lessons: ids('t1'),
    planned: ['Approach boundaries and PPE categories', 'Fuses, breakers and control transformers in depth'] },
  { id: 't2', n: 2, title: 'Reading Prints', blurb: 'Ladder diagrams, wire numbers, cross-references, P&IDs.', lessons: ids('t2'),
    planned: ['Panel layouts and terminal strips', '"Find it on the print" drills'] },
  { id: 't3', n: 3, title: 'Hardwired Motor Control', blurb: 'Before PLCs: seal-ins, interlocks and hardwired safety.', lessons: ids('t3'),
    planned: ['Jog and forward/reverse interlocks', 'Reduced-voltage starting overview'] },
  { id: 't4', n: 4, title: 'PLC Fundamentals', blurb: 'Hardware, the scan, sinking/sourcing, analog and number systems.', lessons: ids('t4'),
    planned: ['Data types, arrays and UDTs'] },
  { id: 't5', n: 5, title: 'Ladder Logic Programming', blurb: 'Every core instruction, one concept at a time, with a live sim.', lessons: ids('t5'),
    planned: ['Compare and math', 'Alarm with acknowledge', 'Sequencers and state machines', 'Program organization'] },
  { id: 't6', n: 6, title: 'Going Online Without Fear', blurb: 'Upload, download, online edits, forces and modes.', lessons: ids('t6'),
    planned: ['Comparing online vs offline'] },
  { id: 't7', n: 7, title: 'Troubleshooting', blurb: 'A method that works, then Fault-Hunt practice.', lessons: ids('t7'),
    planned: ['Controller fault codes and diagnostic buffers'] },
  { id: 't8', n: 8, title: 'Networks & Communications', blurb: 'EtherNet/IP, PROFINET, Modbus and the gotchas.', lessons: ids('t8'),
    planned: ['IP addressing for techs', 'PROFINET device names', 'Legacy networks you\'ll still meet'] },
  { id: 't9', n: 9, title: 'VFDs, HMIs & Building Automation', blurb: 'Drives, operator screens, BACnet and data-center plants.', lessons: ids('t9'),
    planned: ['VFD basics', 'HMI basics', 'BACnet and BMS vs PLC'] },
  { id: 't10', n: 10, title: 'Capstone', blurb: 'Build a machine from a spec, then survive the fault gauntlet.', lessons: ids('t10'),
    planned: ['Batch mixer capstone'] },
];

export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));

export * from './types';
