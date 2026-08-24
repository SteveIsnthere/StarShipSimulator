/**
 * Control actuation, ported verbatim from backend/flightcontrol/flightControl.js.
 *
 * Every actuator here slews toward a goal at a fixed rate. In 2021 the rates
 * were "per frame" constants derived as `ratePerSecond / renderTimeInterval`,
 * and `1 / renderTimeInterval` is exactly the simulated seconds in one frame,
 * so `ratePerSecond * dt` is the same number. See core/physics/engines.ts.
 *
 * The asymmetries below are real and preserved: `frontFinActuation` uses `<`
 * where `aftFinActuation` uses `<=`, and RCS decrements its own reserve inside
 * a nested helper. They are ported as found. M1.10 renames; nothing here
 * changes behaviour.
 */
import * as C from '../constants';
import type { SimState } from '../state';
import type { Rad } from '../units';

/**
 * The shared shape of every actuator in flightControl.js: move `current` toward
 * `goal` by at most `perStep`, snapping when already within one step.
 *
 * `inclusive` selects the `<=` variant used by `aftFinActuation`. The two
 * differ only when `current === goal` exactly, where the inclusive form takes
 * the increment branch and overshoots by `perStep`. Preserved deliberately.
 */
export function slewToward(
  current: number,
  goal: number,
  perStep: number,
  inclusive = false,
): number {
  if (current < goal + perStep && current > goal - perStep) return goal;
  if (inclusive ? current <= goal : current < goal) return current + perStep;
  return current - perStep;
}

/** flightControl.js:29 */
export function frontFinActuation(state: SimState, goalPercentage: number, dt: number): void {
  state.vehicle.frontFinExtention = slewToward(
    state.vehicle.frontFinExtention,
    goalPercentage,
    C.finAcuationSpeed * dt,
  );
}

/** flightControl.js:38 — note the `<=`, unlike the front fin. */
export function aftFinActuation(state: SimState, goalPercentage: number, dt: number): void {
  state.vehicle.aftFinExtention = slewToward(
    state.vehicle.aftFinExtention,
    goalPercentage,
    C.finAcuationSpeed * dt,
    true,
  );
}

/**
 * flightControl.js:9 — split the commanded deflection across the fin pair.
 *
 * The split flips with angle of attack so the pair always produces a couple in
 * the commanded direction. Inactive fins go fully out (100) unless locked (0):
 * fins are the airbrake as well as the control surface.
 * @param goalPercentage -50 .. 50
 */
export function finsActuation(state: SimState, goalPercentage: number, dt: number): void {
  const { status, kinematics } = state;

  if (status.finActive) {
    if (kinematics.angleOfAttack < 0) {
      frontFinActuation(state, 50 - goalPercentage, dt);
      aftFinActuation(state, 50 + goalPercentage, dt);
    } else {
      frontFinActuation(state, 50 + goalPercentage, dt);
      aftFinActuation(state, 50 - goalPercentage, dt);
    }
  } else if (status.finLocked) {
    frontFinActuation(state, 0, dt);
    aftFinActuation(state, 0, dt);
  } else {
    frontFinActuation(state, 100, dt);
    aftFinActuation(state, 100, dt);
  }
}

/**
 * flightControl.js:48 — RCS is bang-bang: full thrust past +-99%, nothing inside.
 *
 * The reserve drains only while firing, and the drain is ported verbatim:
 * `(remaining * rti - 1) / rti` with `rti = 1 / dt`, not the algebraically
 * equivalent `remaining - dt`. The simplification was measured and rejected —
 * it differs by up to 11 ULP near an empty tank, over the 1-ULP bar CLAUDE.md
 * sets for a Refactor. See tests/proofs/rcs-reserve.test.ts. M1.9 may revisit
 * it with a proof that actually clears the bar.
 * @param goalPercentage -100 .. 100
 */
export function rcsControl(state: SimState, goalPercentage: number, dt: number): void {
  const { status, vehicle, forces } = state;

  if (status.rcsActive && vehicle.rcsRunTimeRemaining > 0) {
    const rti = 1 / dt;
    if (goalPercentage > 99) {
      forces.rcsThrust = C.rcsMaxThrust;
      if (vehicle.rcsRunTimeRemaining > 0) {
        vehicle.rcsRunTimeRemaining = (vehicle.rcsRunTimeRemaining * rti - 1) / rti;
      }
    } else if (goalPercentage < -99) {
      forces.rcsThrust = -C.rcsMaxThrust;
      if (vehicle.rcsRunTimeRemaining > 0) {
        vehicle.rcsRunTimeRemaining = (vehicle.rcsRunTimeRemaining * rti - 1) / rti;
      }
    } else {
      forces.rcsThrust = 0;
    }
  } else {
    forces.rcsThrust = 0;
  }
}

/** flightControl.js:70 — gimbal slews toward the commanded percentage. */
export function thrustVectorControl(state: SimState, goalPercentage: number, dt: number): void {
  state.vehicle.gimbolPosition = slewToward(
    state.vehicle.gimbolPosition,
    goalPercentage,
    C.gimbolSpeed * dt,
  );
}

/** flightControl.js:81 — actual throttle chases the commanded throttle. */
export function throttleUpdate(state: SimState, dt: number): void {
  state.vehicle.throttleCurrent = slewToward(
    state.vehicle.throttleCurrent,
    state.vehicle.throttle,
    C.throttleSpeed * dt,
  );
}

/**
 * flightControl.js:1 — one pitch command drives fins, RCS and gimbal together.
 *
 * The fins get half the commanded authority; RCS and gimbal get all of it.
 * @param pitchControl -100 .. 100
 */
export function controlTranslation(state: SimState, pitchControl: number, dt: number): void {
  if (!state.status.translationModeOn) return;
  finsActuation(state, pitchControl / 2, dt);
  rcsControl(state, pitchControl, dt);
  thrustVectorControl(state, pitchControl, dt);
}

/** flightControl.js:91 — set the commanded throttle. */
export function throttleControl(state: SimState, goalPercentage: number): void {
  state.vehicle.throttle = goalPercentage;
}

/** Re-export for callers that need the gimbal's world-space direction. */
export type { Rad };
