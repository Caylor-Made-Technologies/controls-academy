/**
 * Counts shown on the Reference index, kept here so that screen doesn't download the full glossary and
 * hardware data just to print a number. tests/unit/counts.test.ts fails if they drift from the real lists.
 */
export const GLOSSARY_COUNT = 123;
export const HARDWARE_COUNT = 87;
export const HARDWARE_BRAND_COUNT = 25;
/** Questions each exam draws from (its bank size), shown before the bank itself has loaded. */
export const EXAM_BANK_SIZE = { beginner: 82, intermediate: 44, advanced: 36, expert: 30, readiness: 192 };
