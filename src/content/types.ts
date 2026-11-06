import type { TagDecl } from '../engine/types';
import type { SkinId } from '../skins';

export type FigureId = 'ohms' | 'sinksource' | 'scaling' | 'numbers' | 'scan' | 'hardwired-3wire' | 'meter' | 'seriesparallel';

/**
 * Inline markup inside text:
 *   **bold**   [[term-id]] or [[term-id|shown text]] → glossary popover
 */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'callout'; tone: 'safety' | 'tip' | 'gotcha' | 'brand'; title?: string; text: string }
  | { t: 'figure'; fig: FigureId; caption?: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'rung'; text: string; tags: TagDecl[]; caption?: string }
  | { t: 'brands'; rows: { skin: SkinId; text: string }[] }
  | { t: 'code'; lang: 'st' | 'text'; text: string; caption?: string }
  /** Interactive: put the steps in the right order (shown shuffled). */
  | { t: 'order'; prompt: string; steps: string[]; why?: string }
  /** Interactive: tap each item into the right bin. */
  | { t: 'sort'; prompt: string; bins: string[]; items: { text: string; bin: number; why?: string }[] };

/** The three plants every example rotates through. */
export type Site = 'mill' | 'datacenter' | 'water';

export interface RealWorld {
  site: Site;
  text: string;
}

/** Either a safety note, or the reason the topic never touches energized work. */
export type SafetyNote = { note: string } | { na: string };

export interface Question {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  why: string;
  /** 1 easy · 2 medium · 3 hard. Defaults to the lesson's level (see content/bank.ts). */
  difficulty?: 1 | 2 | 3;
}

/** What the sim task checks for. Implemented in features/learn/tasks.ts. */
export type TaskCheck = 'motor-sealed' | 'scan-stepped' | 'stop-fixed' | 'timer-done' | 'dup-fixed' | 'counter-five' | 'latch-reset' | 'build-start-stop';

export interface SimTask {
  goal: string;
  steps: string[];
  /** Rung text overrides for the motor scene (Logix neutral text). Omit to use the shipped program. */
  rungs?: { text: string; comment?: string }[];
  extraTags?: TagDecl[];
  check: TaskCheck;
  /** Editing allowed in this task. */
  edit?: boolean;
}

export type TrackId = 't0' | 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8' | 't9' | 't10' | 't11';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Lesson {
  id: string;
  track: TrackId;
  title: string;
  minutes: number;
  summary: string;
  blocks: Block[];
  task?: SimTask;
  quiz: Question[];
  /** Quality bar 1: one line, "Why this matters on the job". */
  why: string;
  /** Quality bar 8: lesson ids that should come first. Empty array = starts from zero. */
  prereqs: string[];
  /** Quality bar 4: a flour mill, data center or water plant example. */
  realWorld: RealWorld;
  /** Quality bar 5: common mistakes (2–4). */
  mistakes: string[];
  /** Quality bar 6: safety note where energized work is involved. */
  safety: SafetyNote;
}

export interface Track {
  id: TrackId;
  n: number;
  level: Level;
  title: string;
  blurb: string;
  lessons: string[];
  /** Planned lessons not built yet — shown honestly as "coming". */
  planned: string[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  def: string;
  /** Other names people use. */
  aka?: string[];
}
