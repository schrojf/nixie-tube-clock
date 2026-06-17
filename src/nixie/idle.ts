export interface IdleAutoHideOptions {
  /** Element that carries `class="group"`; gets `data-idle` toggled on it. */
  root?: HTMLElement;
  /** Selector for controls that should keep things visible while hovered/pressed. */
  switchSelector?: string;
  /** Inactivity (ms) before fading out. */
  idleMs?: number;
}

/**
 * Central idle auto-hide for the switch controls. One shared timer for the page
 * toggles `data-idle` on the root element; switches fade together via the
 * `group-data-[idle]` Tailwind variant (see nixie-switch.ts). Driven by activity
 * events — not `:hover` — so it works the same on desktop and touchscreens.
 *
 * Reveals on any pointer/touch/keyboard activity and resets the timer; while a
 * switch is hovered or pressed the timer is held off so it can't fade out
 * mid-interaction. Returns a teardown function.
 */
export function installIdleAutoHide(
  options: IdleAutoHideOptions = {},
): () => void {
  const root = options.root ?? document.body;
  const selector = options.switchSelector ?? 'nixie-switch';
  const idleMs = options.idleMs ?? 4000;

  let timer: number | undefined;
  let hovering = false; // pointer over a switch
  let pressing = false; // pointer held down on a switch

  const reveal = () => root.removeAttribute('data-idle');
  const fade = () => root.setAttribute('data-idle', '');

  // (Re)start the countdown unless an interaction is holding the controls open.
  const arm = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = hovering || pressing ? undefined : window.setTimeout(fade, idleMs);
  };

  const poke = () => {
    reveal();
    arm();
  };

  const overSwitch = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest(selector) !== null;

  // Page-wide activity reveals the controls and resets the idle timer.
  const activity = ['pointermove', 'pointerdown', 'touchstart', 'keydown'];
  for (const type of activity) {
    window.addEventListener(type, poke, { passive: true });
  }

  // Press tracking: hold visible while a switch is pressed, resume on release.
  const onPointerDown = (e: PointerEvent) => {
    if (overSwitch(e.target)) {
      pressing = true;
      poke();
    }
  };
  const endPress = () => {
    pressing = false;
    arm();
  };
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', endPress, { passive: true });
  window.addEventListener('pointercancel', endPress, { passive: true });

  // Hover tracking via delegation (handles child elements and dynamic switches).
  const onPointerOver = (e: PointerEvent) => {
    if (overSwitch(e.target)) {
      hovering = true;
      poke();
    }
  };
  const onPointerOut = (e: PointerEvent) => {
    if (!overSwitch(e.relatedTarget)) {
      hovering = false;
      arm();
    }
  };
  root.addEventListener('pointerover', onPointerOver);
  root.addEventListener('pointerout', onPointerOut);

  poke(); // start visible, then fade after the first idle period

  return () => {
    if (timer !== undefined) clearTimeout(timer);
    for (const type of activity) window.removeEventListener(type, poke);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', endPress);
    window.removeEventListener('pointercancel', endPress);
    root.removeEventListener('pointerover', onPointerOver);
    root.removeEventListener('pointerout', onPointerOut);
    reveal();
  };
}
