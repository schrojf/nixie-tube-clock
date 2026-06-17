import type { NixieDisplay } from './nixie-display';
import type { GlyphCell, GlyphKey } from './assets';

/**
 * A time source yields the value to display, in milliseconds. Each source owns
 * its own time base — that decoupling is what lets new modes drop in without
 * touching the display or the driver below.
 */
export interface TimeSource {
  readMs(): number;
}

/** Wall-clock time as milliseconds since local midnight (DST-safe). */
export class WallClockSource implements TimeSource {
  readMs(): number {
    const d = new Date();
    return (
      ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 +
      d.getMilliseconds()
    );
  }
}

// Stopwatch and countdown modes (added later) implement the same interface and
// pass straight into startClock(), e.g.:
//
//   export class StopwatchSource implements TimeSource {
//     private origin = performance.now();
//     readMs() { return performance.now() - this.origin; }
//   }
//
//   export class CountdownSource implements TimeSource {
//     constructor(private endsAt: number) {}
//     readMs() { return Math.max(0, this.endsAt - Date.now()); }
//   }

/** Maps a millisecond value to the display's 8 glyph cells. */
export type ContentFormatter = (ms: number) => GlyphCell[];

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

/** Format a millisecond value as the 8 cells "HH.mm.ss". */
export const toHHMMSS: ContentFormatter = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return [tens(hh), ones(hh), '.', tens(mm), ones(mm), '.', tens(ss), ones(ss)];
};

/**
 * Drive a display from a time source. Reads the source every animation frame
 * and pushes formatted digits; the display mutates only the glyphs that
 * actually changed, so this stays cheap whether updating each second or each
 * frame. Using rAF keeps it ready for millisecond-level formats too.
 *
 * Returns a stop() function.
 */
export function startClock(
  display: NixieDisplay,
  source: TimeSource,
  format: ContentFormatter = toHHMMSS,
): () => void {
  let frame = 0;
  let running = true;

  void display.ready.then(() => {
    const tick = () => {
      if (!running) return;
      display.setContent(format(source.readMs()));
      frame = requestAnimationFrame(tick);
    };
    tick();
  });

  return () => {
    running = false;
    cancelAnimationFrame(frame);
  };
}
