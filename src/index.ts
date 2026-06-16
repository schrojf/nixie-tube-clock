import './index.css';
import { NixieDisplay } from './nixie/nixie-display';
import { WallClockSource, startClock } from './nixie/clock';

NixieDisplay.register();

const display = document.querySelector<NixieDisplay>('nixie-display');
if (!display) throw new Error('<nixie-display> element not found');

// Composition root: pair the display with a time source. Swap WallClockSource
// for a StopwatchSource / CountdownSource later — the display and driver are
// untouched.
startClock(display, new WallClockSource());
