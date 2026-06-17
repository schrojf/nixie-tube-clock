import type { TimeSource } from './clock';

const STORAGE_KEY = 'nixie:countdown';
const DEFAULT_DURATION = 5 * 60_000; // 5 minutes

interface CountdownState {
  /** Whether the countdown is currently counting down. */
  running: boolean;
  /** Date.now() target when it hits zero, or null while paused/stopped. */
  endsAt: number | null;
  /** Remaining ms while paused/stopped. */
  remaining: number;
  /** Configured total duration, restored by reset(). */
  duration: number;
  /** Whether it has reached zero. */
  finished: boolean;
}

/**
 * A countdown as a {@link TimeSource}: `readMs()` returns remaining ms (clamped
 * at zero), decoupled from rendering like the other sources. State is persisted
 * to localStorage and remaining is derived from an absolute `endsAt` timestamp,
 * so it stays correct across reloads — including finishing while the window was
 * closed, which restores as the zero/finished state rather than a negative value.
 *
 * Completion: it clamps at zero, stops, and fires {@link onComplete} once.
 */
export class CountdownSource implements TimeSource {
  /** Called once when the countdown reaches zero while running. */
  onComplete?: () => void;

  private state: CountdownState;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly storage: Storage = localStorage) {
    this.state = this.load();
    if (this.state.running) this.scheduleCompletion();
  }

  /** Remaining time in milliseconds (never negative). */
  readMs(): number {
    const { running, endsAt, remaining } = this.state;
    if (running && endsAt !== null) return Math.max(0, endsAt - Date.now());
    return Math.max(0, remaining);
  }

  get running(): boolean {
    return this.state.running;
  }
  get finished(): boolean {
    return this.state.finished;
  }
  get duration(): number {
    return this.state.duration;
  }

  /** Start or resume counting down from the remaining time. */
  start(): void {
    if (this.state.running) return;
    const remaining = this.readMs();
    if (remaining <= 0) return; // nothing left to count down
    this.state = {
      ...this.state,
      running: true,
      endsAt: Date.now() + remaining,
      remaining,
      finished: false,
    };
    this.save();
    this.scheduleCompletion();
  }

  /** Pause, banking the remaining time so a later start() continues it. */
  pause(): void {
    if (!this.state.running) return;
    this.clearTimer();
    this.state = {
      ...this.state,
      running: false,
      endsAt: null,
      remaining: this.readMs(),
    };
    this.save();
  }

  /** Stop and restore the remaining time to the configured duration. */
  reset(): void {
    this.clearTimer();
    this.state = {
      ...this.state,
      running: false,
      endsAt: null,
      remaining: this.state.duration,
      finished: false,
    };
    this.save();
  }

  /** Set the countdown duration; re-arms (stops and refills) to the new value. */
  setDuration(ms: number): void {
    this.clearTimer();
    const duration = Math.max(0, Math.floor(ms));
    this.state = {
      running: false,
      endsAt: null,
      remaining: duration,
      duration,
      finished: false,
    };
    this.save();
  }

  private scheduleCompletion(): void {
    this.clearTimer();
    if (!this.state.running) return;
    const remaining = this.readMs();
    if (remaining <= 0) {
      this.complete();
      return;
    }
    this.timer = setTimeout(() => this.complete(), remaining);
  }

  private complete(): void {
    this.clearTimer();
    this.state = {
      ...this.state,
      running: false,
      endsAt: null,
      remaining: 0,
      finished: true,
    };
    this.save();
    this.onComplete?.();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private load(): CountdownState {
    const fallback: CountdownState = {
      running: false,
      endsAt: null,
      remaining: DEFAULT_DURATION,
      duration: DEFAULT_DURATION,
      finished: false,
    };
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const p = JSON.parse(raw) as Partial<CountdownState>;
      const duration =
        typeof p.duration === 'number' && p.duration >= 0
          ? p.duration
          : DEFAULT_DURATION;
      const running = p.running === true;
      const endsAt = typeof p.endsAt === 'number' ? p.endsAt : null;
      // Finished while the window was closed → restore the zero/finished state.
      if (running && endsAt !== null && endsAt - Date.now() <= 0) {
        return {
          running: false,
          endsAt: null,
          remaining: 0,
          duration,
          finished: true,
        };
      }
      const remaining =
        typeof p.remaining === 'number' && p.remaining >= 0
          ? p.remaining
          : duration;
      return {
        running,
        endsAt,
        remaining,
        duration,
        finished: p.finished === true,
      };
    } catch {
      return fallback;
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
