/**
 * Which controls are lit, as a pure function of SimState.
 *
 * The same shape as readouts.ts, for the same reason. 2021's `updateButtons()`
 * called `buttonSwitchOn`/`buttonSwitchOff` on fourteen buttons, each of which
 * did TWO `getElementById` calls and then wrote two inline style properties —
 * unconditionally, whether or not the button had changed. Fifty-six lookups and
 * fifty-six style writes to communicate at most a couple of bits of change.
 *
 * The v2 version is a list of predicates, diffed by the same binder that drives
 * the readouts, toggling a single class.
 *
 * Note this is not merely cosmetic bookkeeping: an indicator can change without
 * anyone pressing anything. The autopilot shuts engines down on its own, and
 * `autoLand` clears itself when the vehicle is down. A panel that only repainted
 * on click would show a lie.
 */
import type { SimState } from '$core/state';

export interface Indicator {
  /** Matches the ControlEvent it corresponds to, where there is one. */
  readonly id: string;
  /** True when the control should read as active. */
  on(state: SimState): boolean;
}

export const INDICATORS: readonly Indicator[] = [
  // An engine reads as lit while it is igniting, not only once it has caught —
  // the countdown is up to ~0.6 s and a dead-looking button through it would
  // invite a second press, which switches.js:16 treats as a cancel.
  {
    id: 'raptor0',
    on: (s) => s.engines.running[0] || s.engines.ignitionCountdown[0] !== null,
  },
  {
    id: 'raptor1',
    on: (s) => s.engines.running[1] || s.engines.ignitionCountdown[1] !== null,
  },
  {
    id: 'raptor2',
    on: (s) => s.engines.running[2] || s.engines.ignitionCountdown[2] !== null,
  },
  { id: 'allRaptors', on: (s) => s.engines.running.some(Boolean) },

  { id: 'autoMaxThrust', on: (s) => s.autopilot.autoMaxThrustOn },
  { id: 'autoTakeOff', on: (s) => s.autopilot.autoTakeOffOn },
  { id: 'boostBack', on: (s) => s.autopilot.autoBoostBackOn },
  { id: 'pitchHold', on: (s) => s.autopilot.pitchHoldOn },
  { id: 'autoLand', on: (s) => s.autopilot.autoLandOn },

  { id: 'fins', on: (s) => s.status.finActive },
  { id: 'rcs', on: (s) => s.status.rcsActive },
  { id: 'dumpFuel', on: (s) => s.status.dumpingFuel },
];
