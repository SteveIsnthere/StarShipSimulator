/**
 * The typed control surface between the panels and the simulation.
 *
 * THE WOUND THIS CLOSES. In 2021 every button carried its behaviour in an
 * `onclick` attribute naming a global function — `onclick="toggleRaptor1()"` —
 * so the set of things the UI could do to the simulation was "whatever is on
 * globalThis", discoverable only by reading the markup. Three near-identical
 * copies of `toggleRaptor` existed because there was nothing to parameterise.
 *
 * Here a control emits a `ControlEvent`, a discriminated union. That buys three
 * things a string on a button cannot:
 *
 *   The set of possible actions is enumerable and checked. A typo is a compile
 *   error, not a silent no-op at 3 a.m. on a launch.
 *
 *   Panels do not import core commands or touch SimState. They emit; the app
 *   applies. So a panel can be tested by asserting what it emitted.
 *
 *   Input sources are interchangeable. A keybind, a touch, and a click all
 *   produce the same event, so M4.3 adds keyboard and tilt without any panel
 *   knowing about them.
 */
import type { RaptorIndex, SimState } from '$core/state';
import * as cmd from '$core/control/commands';

/** Everything the UI can ask the simulation to do. */
export type ControlEvent =
  /** Toggle one Raptor. Ignition is a countdown; shutdown is immediate. */
  | { readonly type: 'raptor'; readonly engine: RaptorIndex }
  /** All three at once, with 2021's asymmetry preserved. */
  | { readonly type: 'allRaptors' }
  /** Commanded throttle, in percent. Clamped in core. */
  | { readonly type: 'throttle'; readonly percent: number }
  /** Yoke position, -100..100. Clamped in core. */
  | { readonly type: 'pitch'; readonly percent: number }
  /** Hand on the yoke: suspend attitude hold. */
  | { readonly type: 'yokeGrab' }
  /** Hand off the yoke: adopt the current attitude and resume the hold. */
  | { readonly type: 'yokeRelease' }
  | { readonly type: 'autoMaxThrust' }
  | { readonly type: 'autoTakeOff' }
  | { readonly type: 'boostBack' }
  | { readonly type: 'pitchHold' }
  | { readonly type: 'autoLand' }
  /** M2.9(c) — deorbit targeting. The one mode with no 2021 counterpart. */
  | { readonly type: 'autoDeorbit' }
  | { readonly type: 'fins' }
  | { readonly type: 'rcs' }
  | { readonly type: 'dumpFuel' };

/** What a panel is handed. Panels never see SimState. */
export type Emit = (event: ControlEvent) => void;

/**
 * Apply one event to the simulation.
 *
 * Exhaustive by construction: the `never` in the default branch means adding a
 * variant to ControlEvent without handling it here fails to compile.
 */
export function applyControl(state: SimState, event: ControlEvent): void {
  switch (event.type) {
    case 'raptor':
      cmd.toggleRaptor(state, event.engine);
      return;
    case 'allRaptors':
      cmd.toggleAllRaptors(state);
      return;
    case 'throttle':
      cmd.setThrottle(state, event.percent);
      return;
    case 'pitch':
      cmd.setPitchControl(state, event.percent);
      return;
    case 'yokeGrab':
      cmd.manualPitchControlOn(state);
      return;
    case 'yokeRelease':
      cmd.recordHoldingPitchResumeAuto(state);
      return;
    case 'autoMaxThrust':
      cmd.toggleAutoMaxThrust(state);
      return;
    case 'autoTakeOff':
      cmd.toggleAutoTakeOff(state);
      return;
    case 'boostBack':
      cmd.toggleBoostBack(state);
      return;
    case 'pitchHold':
      cmd.togglePitchHold(state);
      return;
    case 'autoLand':
      cmd.toggleAutoLand(state);
      return;
    case 'autoDeorbit':
      cmd.toggleAutoDeorbit(state);
      return;
    case 'fins':
      cmd.toggleFin(state);
      return;
    case 'rcs':
      cmd.toggleRcs(state);
      return;
    case 'dumpFuel':
      cmd.toggleDumpFuel(state);
      return;
    default: {
      const unhandled: never = event;
      throw new Error(`unhandled control event: ${JSON.stringify(unhandled)}`);
    }
  }
}
