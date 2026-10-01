/**
 * Edges: the moments a transient fires.
 *
 * WHY THIS IS NOT `view/effects.ts`. The task named that file, because it
 * already detects the same edges for the particle bursts and "there is one
 * place that knows an engine just stopped" is a good instinct. It is not done
 * that way here for a boundary reason: `audio/` importing from `view/` would
 * make sound depend on the renderer, so a headless run, a test, or a future
 * build without Pixi would carry a dependency on a layer it has no use for.
 *
 * The duplication is four booleans and a latch. The coupling would have been
 * permanent.
 *
 * THE LATCH PATTERN is `showedCrash` from effects.ts, generalised: an event
 * fires on the TRANSITION into a state, not while the state holds — otherwise a
 * crash would explode sixty times a second — and a restart re-arms it, because
 * the same flight flown again is a new flight.
 */
import type { SimState } from '$core/state';
import type { TransientName } from './transients';

export interface EdgeDetector {
  /**
   * Offer a frame. Calls `fire` once per transition, never while it holds.
   *
   * Takes a callback rather than returning a list so it can run on the frame
   * path without allocating one.
   */
  observe(state: SimState, fire: (name: TransientName) => void): void;
  /** Re-arm everything. Called when a flight is configured or restarted. */
  reset(): void;
}

export function createEdgeDetector(): EdgeDetector {
  /** Per-engine: was it lit last frame? */
  const wasLit: [boolean, boolean, boolean] = [false, false, false];
  let armed = false;
  let showedTouchdown = false;
  let showedCrash = false;
  let showedBreakup = false;

  const isLit = (state: SimState, i: number): boolean =>
    state.engines.running[i]! &&
    !state.engines.failed[i]! &&
    state.engines.ignitionCountdown[i] === null;

  return {
    reset() {
      wasLit[0] = false;
      wasLit[1] = false;
      wasLit[2] = false;
      armed = false;
      showedTouchdown = false;
      showedCrash = false;
      showedBreakup = false;
    },

    observe(state, fire) {
      /*
        The first frame after a reset SEEDS rather than fires. Without this, a
        scenario configured with engines already running would bark three
        ignitions at the moment it loaded — the sound reporting a transition
        that happened before the flight existed.
      */
      if (!armed) {
        for (let i = 0; i < 3; i++) wasLit[i] = isLit(state, i);
        armed = true;
        return;
      }

      for (let i = 0; i < 3; i++) {
        const lit = isLit(state, i);
        if (lit !== wasLit[i]) {
          // An engine that FAILS is not a shutdown — it is a failure, and M8.5's
          // warning tones are where that gets its own voice. What it must not
          // do is sound like the pilot chose it.
          if (lit) fire('ignition');
          else if (!state.engines.failed[i]!) fire('shutdown');
          wasLit[i] = lit;
        }
      }

      if (state.status.landed && !showedTouchdown) {
        showedTouchdown = true;
        fire('touchdown');
      }
      if (state.failures.crashed && !showedCrash) {
        showedCrash = true;
        fire('crash');
      }
      if (state.failures.inFlightBreakUp && !showedBreakup) {
        showedBreakup = true;
        fire('breakup');
      }
    },
  };
}
