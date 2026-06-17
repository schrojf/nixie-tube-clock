import type { ContentFormatter } from './clock';
import type { GlyphCell, GlyphKey } from './assets';

// The display is 8 cells: 7 digit glyphs and one dot.
const TOTAL_DIGITS = 7;
const MS_PER_DAY = 86_400_000;

const DIGITS: readonly GlyphKey[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];
const tens = (n: number): GlyphKey => DIGITS[Math.floor(n / 10) % 10];
const ones = (n: number): GlyphKey => DIGITS[n % 10];

/** Split a string of digits and a single dot into glyph cells. */
const toCells = (text: string): GlyphCell[] =>
  [...text].map((ch) => (ch === '.' ? '.' : (ch as GlyphKey)));

/**
 * Render a non-negative value as a fixed-width decimal filling all 8 cells:
 * the integer part (no leading zeros, min "0"), a dot, then as many fractional
 * digits as fit. e.g. 0.5 → "0.500000", 12 → "12.00000", 43200 → "43200.00".
 */
const decimal = (value: number): GlyphCell[] => {
  const v = Math.max(0, value);
  let intLen = Math.floor(v).toString().length;
  let fracLen = TOTAL_DIGITS - intLen;
  let text = v.toFixed(Math.max(0, fracLen));
  // Rounding can carry a new integer digit (9.999999 → "10.000000"); recompute.
  const dot = text.indexOf('.');
  const realIntLen = dot === -1 ? text.length : dot;
  if (realIntLen !== intLen) {
    intLen = realIntLen;
    fracLen = TOTAL_DIGITS - intLen;
    text = v.toFixed(Math.max(0, fracLen));
  }
  return toCells(text);
};

/** "HH.mm.ss" — the standard clock readout (current behavior). */
export const toClock: ContentFormatter = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return [tens(hh), ones(hh), '.', tens(mm), ones(mm), '.', tens(ss), ones(ss)];
};

// The same instant as a single normalized decimal at different scales. `ms` is
// milliseconds since local midnight, so the day fraction is ms / MS_PER_DAY and
// every other scale is that fraction times the units in a day.
const scaled =
  (unitsPerDay: number): ContentFormatter =>
  (ms) =>
    decimal((ms / MS_PER_DAY) * unitsPerDay);

/** Fraction of the day, 0.0–1.0 (1.000000 = 24:00:00). */
export const toDay: ContentFormatter = scaled(1);
/** Time of day in hours, 0.0–24.0. */
export const toHours: ContentFormatter = scaled(24);
/** Time of day in minutes, 0.0–1440.0. */
export const toMinutes: ContentFormatter = scaled(1440);
/** Time of day in seconds, 0.0–86400.0. */
export const toSeconds: ContentFormatter = scaled(86_400);

/** One time-representation option: a switch label and the formatter it selects. */
export interface Representation {
  label: string;
  format: ContentFormatter;
}

/**
 * Clock-mode time representations, in switch order. Add a representation here
 * (and bump the switch's state count) to offer a new readout — the display and
 * driver are untouched.
 */
export const REPRESENTATIONS: readonly Representation[] = [
  { label: 'Normal', format: toClock },
  { label: 'Day', format: toDay },
  { label: 'Hours', format: toHours },
  { label: 'Minutes', format: toMinutes },
  { label: 'Seconds', format: toSeconds },
];
