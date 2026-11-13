/**
 * The heading of every top-level screen, in one place. Three things read it and must agree word for word:
 * the page itself, the placeholder shown while its code loads, and the static shell that
 * scripts/route-preload.ts writes into index.html so the heading paints before any JavaScript runs.
 * Plain text only.
 */
import { MACHINE_INFO } from '../plant/catalog';
import { TRACKS } from './tracks';

export interface RouteHead { eyebrow: string; title: string; body?: string }

const lessons = TRACKS.reduce((n, t) => n + t.lessons.length, 0);

export const ROUTE_HEADS: Record<string, RouteHead> = {
  learn: { eyebrow: 'Controls Academy', title: 'From zero to panel-ready', body: `From "what's a volt?" to tuning PID loops and commissioning a machine — ${lessons} lessons in 4 levels: Beginner, Intermediate, Advanced, Expert.` },
  skills: { eyebrow: 'Learn', title: 'Skill map', body: 'Every lesson and what it builds on. Nothing is ever locked shut — "Locked" just means its prerequisites aren\'t done yet.' },
  exam: { eyebrow: 'Learn', title: 'Practice exams', body: 'Randomized from the question bank every time. Answers and explanations come at the end, like a real test. Missed questions go to Review.' },
  review: { eyebrow: 'Review', title: 'Spaced repetition', body: 'Missed questions come back tomorrow, then further apart each time you get them right (SM-2 spaced repetition). Weak topics come back sooner, and anything you miss today is asked once more at the end.' },
  sim: { eyebrow: 'Simulator', title: 'PLC workbench', body: 'A real scan cycle driving a real-feeling machine. Press buttons, watch power flow, edit the logic online, switch brands.' },
  wiring: { eyebrow: 'Practice', title: 'Wiring trainer', body: 'Wire real circuits terminal by terminal. The checker powers your circuit, runs it through a test and explains the first thing that goes wrong.' },
  troubleshoot: { eyebrow: 'Troubleshoot', title: 'Fault Hunt', body: `A fault is hidden in one of ${MACHINE_INFO.length} machines. You get the operator's complaint, I/O LEDs, the live logic, a meter and a stopwatch. Scored on speed and on staying safe.` },
  reference: { eyebrow: 'Reference', title: 'Field reference', body: 'Quick answers for the plant floor: brand field guides, a 3D hardware library, the instruction reference, a glossary and the safety rules. Everything works offline.' },
  profile: { eyebrow: 'Profile', title: 'Your progress', body: 'Your level, streak, badges and practice records. Everything here stays on this device. Nothing is uploaded.' },
  about: { eyebrow: 'About', title: 'Controls Academy' },
};

/** The heading for a route path, if it is one of the top-level screens (deeper pages build their own). */
export function headFor(route: string[]): RouteHead | undefined {
  if (route.length > 1) return undefined;
  return ROUTE_HEADS[route[0] ?? 'learn'];
}
