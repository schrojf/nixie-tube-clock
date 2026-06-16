import type { NixieDisplay } from './nixie-display';

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

/** Maps a millisecond value to display digits. */
export type DigitFormatter = (ms: number) => number[];

/** Split a millisecond value into six HH:mm:ss digits. */
export const toHHMMSS: DigitFormatter = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return [
    Math.floor(hh / 10) % 10,
    hh % 10,
    Math.floor(mm / 10),
    mm % 10,
    Math.floor(ss / 10),
    ss % 10,
  ];
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
  format: DigitFormatter = toHHMMSS,
): () => void {
  let frame = 0;
  let running = true;

  void display.ready.then(() => {
    const tick = () => {
      if (!running) return;
      display.setDigits(format(source.readMs()));
      frame = requestAnimationFrame(tick);
    };
    tick();
  });

  return () => {
    running = false;
    cancelAnimationFrame(frame);
  };
}
