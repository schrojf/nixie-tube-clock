import './index.css';
import { NixieDisplay } from './nixie/nixie-display';
import { NixieSwitch } from './nixie/nixie-switch';
import { NixieButtons } from './nixie/nixie-buttons';
import { WallClockSource, startClock } from './nixie/clock';
import { StopwatchSource } from './nixie/stopwatch';
import { REPRESENTATIONS, toClock } from './nixie/representations';
import { installIdleAutoHide } from './nixie/idle';

NixieDisplay.register();
NixieSwitch.register();
NixieButtons.register();

const display = document.querySelector<NixieDisplay>('nixie-display');
if (!display) throw new Error('<nixie-display> element not found');

// Time sources. The stopwatch restores itself from localStorage, so it keeps
// running across reloads and tab closes.
const wallClock = new WallClockSource();
const stopwatch = new StopwatchSource();

// The driver: a source + formatter, both swappable live as the mode changes.
const clock = startClock(display, wallClock, REPRESENTATIONS[0].format);

// --- Modes ----------------------------------------------------------------
const MODE = { stopwatch: 0, clock: 1, countdown: 2 } as const;

const clockControls = document.querySelector<HTMLElement>('#clock-controls');
const stopwatchControls = document.querySelector<HTMLElement>(
  '#stopwatch-controls',
);
let representationIndex = 0;

function applyMode(mode: number): void {
  const stopwatchMode = mode === MODE.stopwatch;

  // Point the display at the mode's source + formatter.
  if (stopwatchMode) {
    clock.setSource(stopwatch);
    clock.setFormat(toClock); // elapsed as HH.mm.ss
  } else if (mode === MODE.clock) {
    clock.setSource(wallClock);
    clock.setFormat(REPRESENTATIONS[representationIndex].format);
  }
  // Countdown is not built yet — leave the display on the previous source.

  // Show exactly one bottom control (countdown keeps the clock controls for now).
  clockControls?.classList.toggle('hidden', stopwatchMode);
  stopwatchControls?.classList.toggle('hidden', !stopwatchMode);
}

// Open in stopwatch mode if one is in progress, so a running stopwatch is
// visible again on return; otherwise the clock.
const initialMode =
  stopwatch.running || stopwatch.readMs() > 0 ? MODE.stopwatch : MODE.clock;

// Top: mode switch.
const modeSwitch = document.querySelector<NixieSwitch>('#mode-switch');
modeSwitch?.configure({
  states: 3,
  labels: ['Stopwatch', 'Clock', 'Countdown'],
  value: initialMode,
  ariaLabel: 'Mode',
  onChange: (index) => applyMode(index),
});

// Bottom (clock mode): time representation — a different formatter per option.
const representationSwitch = document.querySelector<NixieSwitch>(
  '#representation-switch',
);
representationSwitch?.configure({
  states: 5,
  labels: REPRESENTATIONS.map((r) => r.label),
  value: 0,
  ariaLabel: 'Time representation',
  onChange: (index) => {
    representationIndex = index;
    clock.setFormat(REPRESENTATIONS[index].format);
  },
});

// Bottom (stopwatch mode): start / pause / reset. The rAF driver reflects the
// new elapsed automatically, so the actions just mutate the source.
const stopwatchActions =
  document.querySelector<NixieButtons>('#stopwatch-actions');
stopwatchActions?.configure({
  ariaLabel: 'Stopwatch controls',
  buttons: [
    { label: 'Start', onPress: () => stopwatch.start() },
    { label: 'Pause', onPress: () => stopwatch.pause() },
    { label: 'Reset', onPress: () => stopwatch.reset() },
  ],
});

applyMode(initialMode);

// Fade all controls after inactivity; reveal on any pointer/touch/key activity.
installIdleAutoHide({ switchSelector: 'nixie-switch, nixie-buttons' });
