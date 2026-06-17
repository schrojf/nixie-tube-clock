export interface NixieButtonSpec {
  label: string;
  onPress: () => void;
}

export interface NixieButtonsConfig {
  buttons: NixieButtonSpec[];
  ariaLabel?: string;
}

// Same frosted frame + idle-fade behavior as nixie-switch (see idle.ts).
const FRAME_CLASS =
  'inline-flex items-center gap-1 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 select-none transition-opacity duration-300 group-data-[idle]:opacity-20 group-data-[idle]:duration-1000';
// Retro nixie label with a soft glow; hover/press/focus feedback.
const BUTTON_CLASS =
  'cursor-pointer rounded-xl px-4 py-1.5 text-sm font-medium uppercase tracking-[0.2em] text-orange-300 transition duration-150 [text-shadow:0_0_8px_#fb923c80] hover:bg-white/10 hover:text-orange-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';

/**
 * A horizontal group of labeled action buttons in the nixie aesthetic. Pure
 * input control: each button fires its `onPress`; it holds no mode state, so
 * stopwatch/countdown can reuse it. Light DOM so global Tailwind utilities
 * apply.
 */
export class NixieButtons extends HTMLElement {
  /** Define the element once; safe to call repeatedly. */
  static register(tag = 'nixie-buttons'): void {
    if (!customElements.get(tag)) customElements.define(tag, NixieButtons);
  }

  /** Build (or rebuild) the control from a configuration. */
  configure(config: NixieButtonsConfig): this {
    this.className = FRAME_CLASS;
    this.setAttribute('role', 'group');
    if (config.ariaLabel) this.setAttribute('aria-label', config.ariaLabel);

    this.replaceChildren();
    for (const spec of config.buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = BUTTON_CLASS;
      button.textContent = spec.label;
      button.addEventListener('click', () => spec.onPress());
      this.appendChild(button);
    }
    return this;
  }
}
