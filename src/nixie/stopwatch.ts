import type { TimeSource } from './clock';

const STORAGE_KEY = 'nixie:stopwatch';

interface StopwatchState {
  /** Whether the stopwatch is currently counting. */
  running: boolean;
  /** Date.now() reference for the current run, or null while paused/stopped. */
  startedAt: number | null;
  /** Elapsed ms banked before the current run (the total while paused). */
  accumulated: number;
}

const STOPPED: StopwatchState = {
  running: false,
  startedAt: null,
  accumulated: 0,
};

/**
 * A stopwatch as a {@link TimeSource}: `readMs()` returns elapsed ms, decoupled
 * from rendering exactly like the wall clock. State is persisted to
 * localStorage and elapsed is always derived from an absolute `startedAt`
 * timestamp, so it keeps running correctly across reloads and tab closes.
 */
export class StopwatchSource implements TimeSource {
  private state: StopwatchState;

  constructor(private readonly storage: Storage = localStorage) {
    this.state = this.load();
  }

  /** Elapsed time in milliseconds. */
  readMs(): number {
    const { running, startedAt, accumulated } = this.state;
    const elapsed =
      running && startedAt !== null
        ? accumulated + (Date.now() - startedAt)
        : accumulated;
    return Math.max(0, elapsed);
  }

  get running(): boolean {
    return this.state.running;
  }

  /** Start or resume counting from the banked elapsed time. */
  start(): void {
    if (this.state.running) return;
    this.state = {
      running: true,
      startedAt: Date.now(),
      accumulated: this.state.accumulated,
    };
    this.save();
  }

  /** Stop counting, banking the elapsed time so a later start() continues it. */
  pause(): void {
    if (!this.state.running) return;
    this.state = {
      running: false,
      startedAt: null,
      accumulated: this.readMs(),
    };
    this.save();
  }

  /** Clear all elapsed time and stored state. */
  reset(): void {
    this.state = { ...STOPPED };
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — in-memory state is still correct */
    }
  }

  private load(): StopwatchState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return { ...STOPPED };
      const parsed = JSON.parse(raw) as Partial<StopwatchState>;
      return {
        running: parsed.running === true,
        startedAt:
          typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
        accumulated:
          typeof parsed.accumulated === 'number' && parsed.accumulated >= 0
            ? parsed.accumulated
            : 0,
      };
    } catch {
      return { ...STOPPED };
    }
  }

  private save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage unavailable — runtime state is still correct */
    }
  }
}
