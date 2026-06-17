// Glyph images live in /assets with a .png extension (they are actually
// JPEG-encoded, which browsers decode transparently). Each import becomes a
// bundled URL via the asset rule in rspack.config.ts. Every image is a
// uniform 180 x 460 canvas, including the separator.
import d0 from '../../assets/numbers/0.png';
import d1 from '../../assets/numbers/1.png';
import d2 from '../../assets/numbers/2.png';
import d3 from '../../assets/numbers/3.png';
import d4 from '../../assets/numbers/4.png';
import d5 from '../../assets/numbers/5.png';
import d6 from '../../assets/numbers/6.png';
import d7 from '../../assets/numbers/7.png';
import d8 from '../../assets/numbers/8.png';
import d9 from '../../assets/numbers/9.png';
import separator from '../../assets/numbers/11.png';

// Horizontal-switch control graphics (assets/controls). Real PNGs with alpha,
// each a uniform 129 x 19 canvas showing a 3-segment knob slid to one detent.
import c1 from '../../assets/controls/1.png';
import c2 from '../../assets/controls/2.png';
import c3 from '../../assets/controls/3.png';
import c4 from '../../assets/controls/4.png';
import c5 from '../../assets/controls/5.png';

/** Digit glyphs indexed 0–9. */
export const DIGIT_SRCS: readonly string[] = [
  d0,
  d1,
  d2,
  d3,
  d4,
  d5,
  d6,
  d7,
  d8,
  d9,
];

/** The dot/period separator drawn between HH:mm:ss segments. */
export const SEPARATOR_SRC: string = separator;

/** Native pixel size of every glyph canvas — drives the layout aspect ratio. */
export const GLYPH_WIDTH = 180;
export const GLYPH_HEIGHT = 460;

/** Switch knob graphics, indexed 0–4 (i.e. control images "1".."5"). */
export const SWITCH_SRCS: readonly string[] = [c1, c2, c3, c4, c5];

/** Native size of each switch graphic — drives the track aspect ratio. */
export const SWITCH_WIDTH = 129;
export const SWITCH_HEIGHT = 19;

/**
 * Knob-center position of each switch graphic as a fraction of the width,
 * measured from the assets (the detents are intentionally uneven — 1 and 2
 * sit close together). Indexed 0–4 alongside SWITCH_SRCS.
 */
export const SWITCH_KNOB_CENTER: readonly number[] = [
  0.199, 0.285, 0.455, 0.626, 0.796,
];
