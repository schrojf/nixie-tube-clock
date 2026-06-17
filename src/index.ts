import './index.css';
import { NixieDisplay } from './nixie/nixie-display';
import { NixieSwitch } from './nixie/nixie-switch';
import { WallClockSource, startClock } from './nixie/clock';

NixieDisplay.register();
NixieSwitch.register();

const display = document.querySelector<NixieDisplay>('nixie-display');
if (!display) throw new Error('<nixie-display> element not found');

// Composition root: pair the display with a time source. Swap WallClockSource
// for a StopwatchSource / CountdownSource later — the display and driver are
// untouched.
startClock(display, new WallClockSource());

// Mode switch. The switch only reports a selected index; mapping that onto a
// time source (clock / stopwatch / countdown) is the composition root's job and
// lands in onChange once those modes exist — the switch stays unchanged.
const modeSwitch = document.querySelector<NixieSwitch>('nixie-switch');
modeSwitch?.configure({
  states: 3,
  labels: ['Stopwatch', 'Clock', 'Countdown'],
  value: 1,
  ariaLabel: 'Clock mode',
  onChange: (index, label) => {
    console.info(`mode → ${index} (${label})`);
  },
});
