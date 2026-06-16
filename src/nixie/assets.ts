// Glyph images live in /assets with a .png extension (they are actually
// JPEG-encoded, which browsers decode transparently). Each import becomes a
// bundled URL via the asset rule in rspack.config.ts. Every image is a
// uniform 180 x 460 canvas, including the separator.
import d0 from '../../assets/0.png';
import d1 from '../../assets/1.png';
import d2 from '../../assets/2.png';
import d3 from '../../assets/3.png';
import d4 from '../../assets/4.png';
import d5 from '../../assets/5.png';
import d6 from '../../assets/6.png';
import d7 from '../../assets/7.png';
import d8 from '../../assets/8.png';
import d9 from '../../assets/9.png';
import separator from '../../assets/11.png';

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
