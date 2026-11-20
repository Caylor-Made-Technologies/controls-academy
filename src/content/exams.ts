import { TRACKS } from './tracks';
import type { Level, TrackId } from './types';

/** Exam definitions only (light): the question bank in ./bank loads when a sitting starts. */
export type ExamId = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'readiness';

export interface ExamDef {
  id: ExamId;
  title: string;
  blurb: string;
  /** Which tracks it draws from. */
  tracks: TrackId[];
  /** Questions per sitting. The bank must hold at least 3× this. */
  size: number;
  /** Seconds per question when the timer is on. */
  secsPerQ: number;
  /** Pass mark for the practice record (fraction). */
  pass: number;
}

const tracksAt = (lv: Level) => TRACKS.filter((t) => t.level === lv).map((t) => t.id);

export const EXAMS: ExamDef[] = [
  { id: 'beginner', title: 'Beginner practice exam', blurb: 'Start from Zero, electrical and safety foundations, prints and hardwired motor control.', tracks: tracksAt('Beginner'), size: 20, secsPerQ: 75, pass: 0.8 },
  { id: 'intermediate', title: 'Intermediate practice exam', blurb: 'PLC fundamentals and ladder programming.', tracks: tracksAt('Intermediate'), size: 12, secsPerQ: 90, pass: 0.8 },
  { id: 'advanced', title: 'Advanced practice exam', blurb: 'Going online, troubleshooting, networks, drives, HMIs and building automation.', tracks: tracksAt('Advanced'), size: 12, secsPerQ: 90, pass: 0.8 },
  { id: 'expert', title: 'Expert practice exam', blurb: 'Capstones, PID, Structured Text, commissioning, safety systems and change control.', tracks: tracksAt('Expert'), size: 10, secsPerQ: 105, pass: 0.8 },
  { id: 'readiness', title: 'Controls Technician Readiness', blurb: 'Every track, every level — with a per-topic breakdown and the lessons to revisit.', tracks: TRACKS.map((t) => t.id), size: 36, secsPerQ: 90, pass: 0.8 },
];
export const EXAM_BY_ID = new Map(EXAMS.map((e) => [e.id, e]));

