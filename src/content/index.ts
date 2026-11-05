import { FOUNDATION_LESSONS } from './lessons-foundations';
import { PLC_LESSONS } from './lessons-plc';
import { FIELD_LESSONS } from './lessons-field';
import { CORE2_LESSONS } from './lessons-core2';
import { PRO_LESSONS } from './lessons-pro';
import type { Lesson, Track, TrackId } from './types';

const raw = [...FOUNDATION_LESSONS, ...PLC_LESSONS, ...FIELD_LESSONS, ...CORE2_LESSONS, ...PRO_LESSONS];

/** Lessons with globally unique question ids (`lessonId.q1`). */
export const LESSONS: Lesson[] = raw.map((l) => ({ ...l, quiz: l.quiz.map((q) => ({ ...q, id: `${l.id}.${q.id}` })) }));
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

/** Lesson order inside each track: basics first, building to the hard parts. */
const ORDER: Record<TrackId, string[]> = {
  t1: ['volts-amps-ohms', 'meter', 'relays-contactors', 'protection-devices', 'lototo', 'boundaries-ppe'],
  t2: ['reading-ladder-prints', 'panel-layouts', 'print-drills'],
  t3: ['three-wire', 'hardwired-safety', 'jog-fwd-rev', 'reduced-voltage'],
  t4: ['what-is-a-plc', 'sinking-sourcing', 'analog-420', 'numbers', 'data-types'],
  t5: ['contacts-coils', 'timers', 'counters', 'latch-unlatch', 'duplicate-coils', 'compare-math', 'alarm-ack', 'sequencers', 'program-organization'],
  t6: ['upload-download', 'forcing', 'compare-online'],
  t7: ['troubleshooting-method', 'fault-codes'],
  t8: ['ip-basics', 'profinet-names', 'modbus', 'legacy-networks'],
  t9: ['vfd-basics', 'hmi-basics', 'bacnet-bms'],
  t10: ['capstone-build', 'capstone-mixer'],
  t11: ['pid-tuning', 'analog-alarming', 'structured-text', 'reusable-logic', 'network-troubleshooting', 'commissioning', 'safety-systems', 'change-management'],
};
const ids = (t: TrackId) => ORDER[t];

export const TRACKS: Track[] = [
  { id: 't1', n: 1, level: 'Beginner', title: 'Electrical & Safety Foundations', blurb: 'Volts, amps, your meter, the devices in every panel, LOTOTO, boundaries and PPE.', lessons: ids('t1'), planned: [] },
  { id: 't2', n: 2, level: 'Beginner', title: 'Reading Prints', blurb: 'Ladder diagrams, panel layouts, terminal plans and tracing a fault on paper.', lessons: ids('t2'), planned: [] },
  { id: 't3', n: 3, level: 'Beginner', title: 'Hardwired Motor Control', blurb: 'Seal-ins, E-stops, jog, forward/reverse interlocks and soft starting.', lessons: ids('t3'), planned: [] },
  { id: 't4', n: 4, level: 'Intermediate', title: 'PLC Fundamentals', blurb: 'Hardware, the scan, sinking/sourcing, analog, number systems and data types.', lessons: ids('t4'), planned: [] },
  { id: 't5', n: 5, level: 'Intermediate', title: 'Ladder Logic Programming', blurb: 'Every core instruction, alarms, state machines and organizing real programs.', lessons: ids('t5'), planned: [] },
  { id: 't6', n: 6, level: 'Advanced', title: 'Going Online Without Fear', blurb: 'Upload, download, online edits, forces and proving what changed.', lessons: ids('t6'), planned: [] },
  { id: 't7', n: 7, level: 'Advanced', title: 'Troubleshooting', blurb: 'A method that works, controller faults, then Fault-Hunt practice.', lessons: ids('t7'), planned: [] },
  { id: 't8', n: 8, level: 'Advanced', title: 'Networks & Communications', blurb: 'IP basics, PROFINET and EtherNet/IP, Modbus and the legacy buses.', lessons: ids('t8'), planned: [] },
  { id: 't9', n: 9, level: 'Advanced', title: 'VFDs, HMIs & Building Automation', blurb: 'Drives, operator screens, BACnet and data-center plants.', lessons: ids('t9'), planned: [] },
  { id: 't10', n: 10, level: 'Expert', title: 'Capstone', blurb: 'Build start/stop from a blank rung, then design a full batch mixer.', lessons: ids('t10'), planned: [] },
  { id: 't11', n: 11, level: 'Expert', title: 'Expert Practice', blurb: 'PID tuning, Structured Text, code standards, commissioning, safety systems and change control.', lessons: ids('t11'), planned: ['3D wiring trainer', 'Servo and motion basics'] },
];

export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));

export * from './types';
