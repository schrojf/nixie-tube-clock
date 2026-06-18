import './index.css';
import { NixieDisplay } from './nixie/nixie-display';
import { NixieSwitch } from './nixie/nixie-switch';
import { NixieButtons } from './nixie/nixie-buttons';
import { WallClockSource, startClock } from './nixie/clock';
import { StopwatchSource } from './nixie/stopwatch';
import { CountdownSource } from './nixie/countdown';
import { REPRESENTATIONS } from './nixie/representations';
import { installIdleAutoHide } from './nixie/idle';

NixieDisplay.register();
NixieSwitch.register();
NixieButtons.register();

const display = document.querySelector<NixieDisplay>('nixie-display');
if (!display) throw new Error('<nixie-display> element not found');

// Time sources. Stopwatch and countdown both restore from localStorage, so they
// keep running correctly across reloads and tab closes.
const wallClock = new WallClockSource();
const stopwatch = new StopwatchSource();
const countdown = new CountdownSource();

// The driver: a source + formatter, both swappable live as the mode changes.
const clock = startClock(display, wallClock, REPRESENTATIONS[0].format);

// --- Modes ----------------------------------------------------------------
const MODE = { stopwatch: 0, clock: 1, countdown: 2 } as const;

// Display height reserve depends on how many control rows a mode shows;
// countdown adds the duration switch. Whole class literals so Tailwind sees them.
// clamp() floors the width so a very short viewport (where the reserve exceeds
// 100dvh) can't drive the calc negative and collapse the display to 0; the page
// scrolls instead (main is min-h, so it grows).
const DISPLAY_FIT_DEFAULT =
  'w-[clamp(16rem,calc((100dvh-26rem)*1440/460),1440px)]';
const DISPLAY_FIT_COUNTDOWN =
  'w-[clamp(16rem,calc((100dvh-31rem)*1440/460),1440px)]';

const stopwatchControls = document.querySelector<HTMLElement>(
  '#stopwatch-controls',
);
const durationControls =
  document.querySelector<HTMLElement>('#duration-controls');
const countdownControls = document.querySelector<HTMLElement>(
  '#countdown-controls',
);

let representationIndex = 0;
let currentMode: number = MODE.clock;

// Pulse the display while a finished countdown is the thing on screen.
function reflectFinish(): void {
  display.classList.toggle(
    'animate-pulse',
    currentMode === MODE.countdown && countdown.finished,
  );
}
countdown.onComplete = reflectFinish;

function applyMode(mode: number): void {
  currentMode = mode;
  const stopwatchMode = mode === MODE.stopwatch;
  const countdownMode = mode === MODE.countdown;

  // Only the source differs between modes; the representation switch picks the
  // formatter for all of them, so elapsed/remaining get the same readouts.
  clock.setSource(
    stopwatchMode ? stopwatch : countdownMode ? countdown : wallClock,
  );
  clock.setFormat(REPRESENTATIONS[representationIndex].format);

  // Show the controls for the active mode; the representation switch is shared.
  stopwatchControls?.classList.toggle('hidden', !stopwatchMode);
  durationControls?.classList.toggle('hidden', !countdownMode);
  countdownControls?.classList.toggle('hidden', !countdownMode);

  // Countdown shows an extra control row, so it needs more reserved height.
  display.classList.remove(DISPLAY_FIT_DEFAULT, DISPLAY_FIT_COUNTDOWN);
  display.classList.add(
    countdownMode ? DISPLAY_FIT_COUNTDOWN : DISPLAY_FIT_DEFAULT,
  );

  reflectFinish();
}

// Open in whichever timer is actively running so it's visible again on return.
const initialMode = countdown.running
  ? MODE.countdown
  : stopwatch.running || stopwatch.readMs() > 0
    ? MODE.stopwatch
    : MODE.clock;

// Top: mode switch.
const modeSwitch = document.querySelector<NixieSwitch>('#mode-switch');
modeSwitch?.configure({
  states: 3,
  labels: ['Stopwatch', 'Clock', 'Countdown'],
  value: initialMode,
  ariaLabel: 'Mode',
  onChange: (index) => applyMode(index),
});

// Representation switch: shared by every mode (formats whatever source is live).
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

// Stopwatch actions. The rAF driver reflects the new elapsed automatically.
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

// Countdown duration presets — a 5-state switch picks the target to count from.
const DURATION_PRESETS = [
  { label: '1 Min', ms: 60_000 },
  { label: '5 Min', ms: 5 * 60_000 },
  { label: '10 Min', ms: 10 * 60_000 },
  { label: '30 Min', ms: 30 * 60_000 },
  { label: '1 Hour', ms: 60 * 60_000 },
];
const durationIndex = Math.max(
  0,
  DURATION_PRESETS.findIndex((p) => p.ms === countdown.duration),
);
const durationSwitch = document.querySelector<NixieSwitch>('#duration-switch');
durationSwitch?.configure({
  states: 5,
  labels: DURATION_PRESETS.map((p) => p.label),
  value: durationIndex,
  ariaLabel: 'Countdown duration',
  onChange: (index) => {
    countdown.setDuration(DURATION_PRESETS[index].ms);
    reflectFinish();
  },
});

// Countdown actions — same start / pause / reset as the stopwatch.
const countdownActions =
  document.querySelector<NixieButtons>('#countdown-actions');
countdownActions?.configure({
  ariaLabel: 'Countdown controls',
  buttons: [
    {
      label: 'Start',
      onPress: () => {
        countdown.start();
        reflectFinish();
      },
    },
    { label: 'Pause', onPress: () => countdown.pause() },
    {
      label: 'Reset',
      onPress: () => {
        countdown.reset();
        reflectFinish();
      },
    },
  ],
});

applyMode(initialMode);

// Fade all controls after inactivity; reveal on any pointer/touch/key activity.
installIdleAutoHide({ switchSelector: 'nixie-switch, nixie-buttons' });
