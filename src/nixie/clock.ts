import type { NixieDisplay } from './nixie-display';
import type { GlyphCell } from './assets';

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

/**
 * Maps a millisecond value to the display's 8 glyph cells. Implementations live
 * in representations.ts (clock / day / hours / …), keeping representation logic
 * decoupled from both the time source and the rendering.
 */
export type ContentFormatter = (ms: number) => GlyphCell[];

/** Handle to a running clock: stop it, or swap the time source / formatter. */
export interface ClockController {
  stop(): void;
  setSource(source: TimeSource): void;
  setFormat(format: ContentFormatter): void;
}

/**
 * Drive a display from a time source. Reads the source every animation frame
 * and pushes formatted content; the display mutates only the glyphs that
 * actually changed, so this stays cheap whether updating each second or each
 * frame. Using rAF keeps it ready for millisecond-level formats too.
 *
 * The format can be swapped live via the returned controller, so the same
 * running clock can switch representations without restarting.
 */
export function startClock(
  display: NixieDisplay,
  source: TimeSource,
  format: ContentFormatter,
): ClockController {
  let currentSource = source;
  let currentFormat = format;
  let frame = 0;
  let running = true;

  void display.ready.then(() => {
    const tick = () => {
      if (!running) return;
      display.setContent(currentFormat(currentSource.readMs()));
      frame = requestAnimationFrame(tick);
    };
    tick();
  });

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    setSource(next) {
      currentSource = next;
    },
    setFormat(next) {
      currentFormat = next;
    },
  };
}
