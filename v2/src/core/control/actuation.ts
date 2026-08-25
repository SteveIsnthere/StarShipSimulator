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
  state.vehicle.frontFinExtension = slewToward(
    state.vehicle.frontFinExtension,
    goalPercentage,
    C.finActuationSpeed * dt,
  );
}

/** flightControl.js:38 — note the `<=`, unlike the front fin. */
export function aftFinActuation(state: SimState, goalPercentage: number, dt: number): void {
  state.vehicle.aftFinExtension = slewToward(
    state.vehicle.aftFinExtension,
    goalPercentage,
    C.finActuationSpeed * dt,
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
 * flightControl.js:48 — the yoke's RCS command, and the reserve it spends.
 *
 * THE YOKE IS BANG-BANG, as in 2021: full thrust past +-99%, nothing inside.
 * That is the player's control, and it is unchanged.
 *
 * WHAT CHANGED AT M2.11, Bug-fix tier. The old middle branch read
 * `forces.rcsThrust = 0`, and since this function runs immediately after the
 * autopilot inside controlsUpdate, that zero landed on top of every
 * proportional command `precisionAlignment` had just written — before
 * rotational motion, the only consumer, could ever read one. The autopilot's
 * RCS path was dead code: measured across all seven golden scenarios,
 * `rcsThrust` was non-zero on exactly the steps where the yoke saturated and on
 * no others.
 *
 * The consequence was not subtle. The alignment law damps with `-2*omega/T`, so
 * a little rotation drops the demand below rcsMaxThrust — and there the
 * thrusters cut out completely, leaving the vehicle turning at whatever rate it
 * had reached with nothing to stop it. In vacuum, where RCS is the only
 * actuator, that is no attitude control at all.
 *
 * So the middle branch no longer clobbers: it applies
 * `autopilot.rcsThrustCommand`, which `precisionAlignment` writes and this
 * function consumes and clears inside the same step. Keeping the command in its
 * own field rather than in `forces.rcsThrust` is what makes this function a
 * function again — it produces the thrust from the yoke and the command, with
 * no dependence on someone else having cleared a force first.
 *
 * AND IT IS PAID FOR. 2021 charged the reserve only for full-deflection firing,
 * which is precisely the case that worked; leaving it at that would have made
 * partial-authority attitude control free and unlimited, which is a worse model
 * than the bug. The charge is proportional to commanded thrust, so a
 * full-deflection step costs exactly what it always did — the expression below
 * is the verbatim one with `fraction = 1`.
 *
 * The drain itself stays verbatim: `(remaining * rti - fraction) / rti` with
 * `rti = 1 / dt`, not the algebraically equivalent `remaining - dt * fraction`.
 * The simplification was measured and rejected — it differs by up to 11 ULP
 * near an empty tank, over the 1-ULP bar CLAUDE.md sets for a Refactor. See
 * tests/proofs/rcs-reserve.test.ts.
 *
 * @param goalPercentage -100 .. 100
 */
export function rcsControl(state: SimState, goalPercentage: number, dt: number): void {
  const { status, vehicle, forces, autopilot } = state;

  // Consumed and cleared here, so a command cannot survive into a step where
  // the autopilot has gone quiet.
  const commanded = autopilot.rcsThrustCommand;
  autopilot.rcsThrustCommand = 0;

  if (!status.rcsActive || vehicle.rcsRunTimeRemaining <= 0) {
    forces.rcsThrust = 0;
    return;
  }

  if (goalPercentage > 99) {
    forces.rcsThrust = C.rcsMaxThrust;
  } else if (goalPercentage < -99) {
    forces.rcsThrust = -C.rcsMaxThrust;
  } else {
    forces.rcsThrust = commanded;
  }

  if (forces.rcsThrust !== 0) {
    const rti = 1 / dt;
    const fraction = Math.abs(forces.rcsThrust) / C.rcsMaxThrust;
    vehicle.rcsRunTimeRemaining = (vehicle.rcsRunTimeRemaining * rti - fraction) / rti;
  }
}

/** flightControl.js:70 — gimbal slews toward the commanded percentage. */
export function thrustVectorControl(state: SimState, goalPercentage: number, dt: number): void {
  state.vehicle.gimbalPosition = slewToward(
    state.vehicle.gimbalPosition,
    goalPercentage,
    C.gimbalSpeed * dt,
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
