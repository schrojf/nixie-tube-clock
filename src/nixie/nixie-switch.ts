import { SWITCH_SRCS, SWITCH_KNOB_CENTER } from './assets';

export type StateCount = 2 | 3 | 5;

/** Which control graphics back each supported state count (see assets/controls). */
const IMAGES_BY_STATE_COUNT: Record<StateCount, number[]> = {
  2: [1, 5], // far-left, far-right
  3: [1, 3, 5], // far-left, center, far-right
  5: [1, 2, 3, 4, 5], // every detent
};

export interface NixieSwitchConfig {
  /** Number of selectable states: 2, 3, or 5. */
  states: StateCount;
  /** Display label per state (length must equal `states`). */
  labels: string[];
  /** Initially selected index (default 0). */
  value?: number;
  /** Accessible name for the control. */
  ariaLabel?: string;
  /** Called whenever the user changes the selection. */
  onChange?: (index: number, label: string) => void;
}

const FRAME_CLASS =
  'inline-flex flex-col items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 shadow-xl shadow-black/50 ring-1 ring-white/10 select-none';
// Retro nixie label: warm orange with a soft glow, wide uppercase tracking.
const LABEL_CLASS =
  'text-sm font-medium uppercase tracking-[0.3em] text-orange-300 [text-shadow:0_0_8px_#fb923c,0_0_18px_#f97316]';
// Track keeps the native 129/19 aspect; touch-none lets us own swipe gestures.
const TRACK_CLASS =
  'relative mt-1 aspect-[129/19] w-72 max-w-full cursor-pointer touch-none rounded outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';
const IMG_CLASS =
  'pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-150';

/** Index of the detent whose center is nearest the given 0–1 fraction. */
export function nearestIndex(
  fraction: number,
  centers: readonly number[],
): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const distance = Math.abs(fraction - centers[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/**
 * A horizontal nixie switch with 2, 3, or 5 selectable states. It is purely an
 * input control: it renders the knob graphic + active label and reports the
 * selected index via an `onChange` callback and a bubbling `change` event. It
 * knows nothing about clock modes, so the composition root can map selections
 * onto time sources (clock / stopwatch / countdown) without changing this code.
 *
 * Works with mouse, touch (tap + swipe/drag), and keyboard (arrows/Home/End).
 * Light DOM so global Tailwind utilities apply.
 */
export class NixieSwitch extends HTMLElement {
  /** Define the element once; safe to call repeatedly. */
  static register(tag = 'nixie-switch'): void {
    if (!customElements.get(tag)) customElements.define(tag, NixieSwitch);
  }

  private states: StateCount = 2;
  private labels: string[] = [];
  private centers: number[] = [];
  private layers: HTMLImageElement[] = [];
  private index = 0;
  private onChangeCb?: (index: number, label: string) => void;

  private labelEl?: HTMLElement;
  private trackEl?: HTMLElement;

  /** Build (or rebuild) the switch from a configuration. */
  configure(config: NixieSwitchConfig): this {
    this.states = config.states;
    this.labels = config.labels.slice();
    this.onChangeCb = config.onChange;
    this.index = clamp(config.value ?? 0, 0, this.states - 1);
    if (config.ariaLabel) this.setAttribute('aria-label', config.ariaLabel);
    this.build();
    return this;
  }

  /** Currently selected index. Setting it updates the UI without emitting. */
  get value(): number {
    return this.index;
  }
  set value(next: number) {
    this.select(next, false);
  }

  get selectedLabel(): string {
    return this.labels[this.index] ?? '';
  }

  private build(): void {
    const images = IMAGES_BY_STATE_COUNT[this.states];
    this.centers = images.map((n) => SWITCH_KNOB_CENTER[n - 1]);

    this.className = FRAME_CLASS;
    this.replaceChildren();

    const label = document.createElement('div');
    label.className = LABEL_CLASS;
    this.labelEl = label;
    this.appendChild(label);

    const track = document.createElement('div');
    track.className = TRACK_CLASS;
    track.tabIndex = 0;
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(this.states - 1));
    this.trackEl = track;

    this.layers = images.map((n, i) => {
      const img = document.createElement('img');
      img.src = SWITCH_SRCS[n - 1];
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.className = `${IMG_CLASS} ${i === this.index ? 'opacity-100' : 'opacity-0'}`;
      track.appendChild(img);
      return img;
    });

    this.appendChild(track);
    this.bindInput(track);
    this.reflect();
  }

  private bindInput(track: HTMLElement): void {
    const pick = (clientX: number): void => {
      const rect = track.getBoundingClientRect();
      const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
      this.select(nearestIndex(fraction, this.centers), true);
    };

    // Pointer Events unify mouse, touch and pen. Capturing on pointerdown means
    // a tap selects, and a swipe/drag keeps updating even past the edges.
    track.addEventListener('pointerdown', (e) => {
      // Capture so a drag keeps tracking past the edges; ignore if the
      // environment rejects the pointer id (e.g. synthetic events).
      try {
        track.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      pick(e.clientX);
    });
    track.addEventListener('pointermove', (e) => {
      if (track.hasPointerCapture(e.pointerId)) pick(e.clientX);
    });

    track.addEventListener('keydown', (e) => {
      const step =
        e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -1
          : e.key === 'ArrowRight' || e.key === 'ArrowUp'
            ? 1
            : 0;
      if (step !== 0) {
        e.preventDefault();
        this.select(this.index + step, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.select(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.select(this.states - 1, true);
      }
    });
  }

  private select(next: number, emit: boolean): void {
    const clamped = clamp(next, 0, this.states - 1);
    if (clamped === this.index || this.layers.length === 0) return;

    this.layers[this.index].classList.replace('opacity-100', 'opacity-0');
    this.layers[clamped].classList.replace('opacity-0', 'opacity-100');
    this.index = clamped;
    this.reflect();

    if (emit) {
      const label = this.selectedLabel;
      this.onChangeCb?.(clamped, label);
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { index: clamped, label },
          bubbles: true,
        }),
      );
    }
  }

  private reflect(): void {
    const label = this.selectedLabel;
    if (this.labelEl) this.labelEl.textContent = label;
    this.trackEl?.setAttribute('aria-valuenow', String(this.index));
    this.trackEl?.setAttribute('aria-valuetext', label || String(this.index));
  }
}
