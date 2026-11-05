import type { TagDecl } from '../engine/types';
import type { SkinId } from '../skins';

export type FigureId = 'ohms' | 'sinksource' | 'scaling' | 'numbers' | 'scan' | 'hardwired-3wire' | 'meter';

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
  | { t: 'code'; lang: 'st' | 'text'; text: string; caption?: string };

export interface Question {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  why: string;
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

export type TrackId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8' | 't9' | 't10' | 't11';

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
