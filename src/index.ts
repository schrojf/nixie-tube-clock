import './index.css';
import { NixieDisplay } from './nixie/nixie-display';
import { NixieSwitch } from './nixie/nixie-switch';
import { WallClockSource, startClock } from './nixie/clock';
import { REPRESENTATIONS } from './nixie/representations';

NixieDisplay.register();
NixieSwitch.register();

const display = document.querySelector<NixieDisplay>('nixie-display');
if (!display) throw new Error('<nixie-display> element not found');

// Composition root. The clock drives the display from a time source; the
// representation is swappable live via the controller.
const clock = startClock(
  display,
  new WallClockSource(),
  REPRESENTATIONS[0].format,
);

// Top: mode switch. Only reports a selected index; mapping it onto a source
// (clock / stopwatch / countdown) — and swapping the bottom control to that
// mode's options — lands here once those modes exist.
const modeSwitch = document.querySelector<NixieSwitch>('#mode-switch');
modeSwitch?.configure({
  states: 3,
  labels: ['Stopwatch', 'Clock', 'Countdown'],
  value: 1,
  ariaLabel: 'Mode',
  onChange: (index, label) => {
    console.info(`mode → ${index} (${label})`);
  },
});

// Bottom: clock-mode control — selects the time representation. Each option is
// just a different formatter over the same instant (see representations.ts).
const representationSwitch = document.querySelector<NixieSwitch>(
  '#representation-switch',
);
representationSwitch?.configure({
  states: 5,
  labels: REPRESENTATIONS.map((r) => r.label),
  value: 0,
  ariaLabel: 'Time representation',
  onChange: (index) => clock.setFormat(REPRESENTATIONS[index].format),
});
