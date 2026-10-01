// Wall 5: no wall-clock timers — switches.js:20 ran engine ignition on setTimeout.
export function ignite(toggleOn: () => void, timeAccel: number): void {
  setTimeout(toggleOn, 1200 / timeAccel);
  setInterval(toggleOn, 50);
}
