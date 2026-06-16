import { DIGIT_SRCS, SEPARATOR_SRC } from './assets';

const POSITION_COUNT = 6; // HH mm ss
const SEPARATOR_AFTER = new Set([1, 3]); // dots sit after HH and after mm

// Every cell (digit or separator) is one native glyph: width comes from the
// flex track, height from the 180/460 aspect ratio, so the whole row scales
// uniformly. See index.html for how the row width is bounded responsively.
const CELL_CLASS = 'relative flex-1 aspect-[180/460]';
const IMG_CLASS =
  'pointer-events-none absolute inset-0 h-full w-full object-contain';

interface Position {
  /** One decoded <img> per digit 0–9, stacked; exactly one is opaque. */
  layers: HTMLImageElement[];
  /** The digit currently shown. */
  value: number;
}

/**
 * The rendering layer: a light-DOM web component that draws a fixed
 * HH:mm:ss layout from preloaded glyph images. It knows nothing about where
 * the time comes from — call {@link setDigits} from any driver (see clock.ts).
 *
 * Light DOM (no shadow root) is intentional so global Tailwind utilities apply.
 */
export class NixieDisplay extends HTMLElement {
  /** Define the element once; safe to call repeatedly. */
  static register(tag = 'nixie-display'): void {
    if (!customElements.get(tag)) customElements.define(tag, NixieDisplay);
  }

  /** Resolves once every glyph is decoded and ready to paint flicker-free. */
  readonly ready: Promise<void>;
  private markReady!: () => void;

  private readonly positions: Position[] = [];
  private built = false;

  constructor() {
    super();
    this.ready = new Promise<void>((resolve) => {
      this.markReady = resolve;
    });
  }

  connectedCallback(): void {
    if (this.built) return;
    this.built = true;
    this.classList.add('flex', 'items-center', 'select-none');
    this.render();
  }

  /**
   * Update the six HH:mm:ss digits. Only glyphs whose value changed touch the
   * DOM, and a change is a single opacity flip on an already-decoded layer —
   * a compositor-only operation, so this is cheap even at frame cadence.
   */
  setDigits(digits: number[]): void {
    for (let i = 0; i < POSITION_COUNT; i++) {
      const position = this.positions[i];
      const next = digits[i];
      if (position.value === next) continue;
      position.layers[position.value].classList.replace(
        'opacity-100',
        'opacity-0',
      );
      position.layers[next].classList.replace('opacity-0', 'opacity-100');
      position.value = next;
    }
  }

  private render(): void {
    const images: HTMLImageElement[] = [];

    for (let i = 0; i < POSITION_COUNT; i++) {
      const cell = document.createElement('div');
      cell.className = CELL_CLASS;

      const layers = DIGIT_SRCS.map((src, digit) => {
        const img = this.createImage(src);
        // Stack all ten digits; only "0" starts visible.
        img.classList.add(digit === 0 ? 'opacity-100' : 'opacity-0');
        cell.appendChild(img);
        images.push(img);
        return img;
      });

      this.positions.push({ layers, value: 0 });
      this.appendChild(cell);

      if (SEPARATOR_AFTER.has(i)) {
        const sepCell = document.createElement('div');
        sepCell.className = CELL_CLASS;
        const sep = this.createImage(SEPARATOR_SRC);
        sepCell.appendChild(sep);
        this.appendChild(sepCell);
        images.push(sep);
      }
    }

    // Preloading/caching strategy: every glyph for every position is a
    // persistent DOM <img>. We decode them all up front so that no network
    // fetch and no JPEG decode ever happens during a swap — runtime updates
    // are pure opacity flips. Identical PNG URLs share one decoded bitmap in
    // the browser cache, so this costs ~11 decodes, not 62.
    void Promise.all(
      images.map((img) => img.decode().catch(() => undefined)),
    ).then(() => this.markReady());
  }

  private createImage(src: string): HTMLImageElement {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    img.className = IMG_CLASS;
    return img;
  }
}
