/**
 * Autopilot control primitives, ported from
 * backend/flightcontrol/autoPilotLowLevelFunctions.js.
 *
 * These are what every autopilot mode steers with. `precisionAlignment` is the
 * heart of it: a second-order attitude controller that picks its actuator by
 * what is currently available — gimbal, fins, or RCS.
 *
 * Names were corrected in M1.10; docs/RENAME-MAP.md is the dictionary for
 * reading these against the 2021 originals (`presisionAlignment`, `…Aera`,
 * `throttleLowwerLimmit`, `gimbol…`).
 *
 * Every one of these wrote `pitchControl` or `throttle` to a DOM input as its
 * last act. Here they write SimState instead — the value is identical, the
 * getElementById is gone.
 */
import * as C from '../constants';
import { getDrag, relativeAirspeed } from '../physics/aero';
import { getThrust, getTotalMaxThrust, getWorkingEngineCount } from '../physics/engines';
import type { SimState } from '../state';
import { rad, type Rad } from '../units';

/** autoPilotLowLevelFunctions.js:23 — signed error, wrapped to (-pi, pi]. */
export function getPitchDifference(pitch: Rad, goal: Rad): number {
  let pitchDifference: number = pitch - goal;
  if (pitchDifference < -Math.PI) {
    pitchDifference = Math.PI * 2 + pitchDifference;
  } else if (pitchDifference > Math.PI) {
    pitchDifference = -(Math.PI * 2 - pitchDifference);
  }
  return pitchDifference;
}

/**
 * physics.js:477 — max thrust projected onto the vertical.
 *
 * The quadrant ladder here was a seventh copy of `verticalThrustCoefficient`
 * from physics/components.ts, inlined in 2021. It collapses to `cos` like the
 * other six and, since M2.10, ships collapsed like the other six — collapsing
 * some but not all of them would be the worst of both. The ladder is preserved
 * below as `legacyEffectiveVerticalMaxThrust`, originally for the parity suite;
 * since M10.2 its one consumer is tests/core/collapsed-trig.test.ts, which uses
 * it as the independent second implementation the collapse is proved against.
 * It is not dead code — deleting it would break that proof.
 */
export function getEffectiveVerticalMaxThrust(
  running: readonly boolean[],
  gimbalPointingDirection: Rad,
): number {
  const maxThrust = getWorkingEngineCount(running) * C.maxThrustPerRaptor;
  return maxThrust * Math.cos(gimbalPointingDirection);
}

/**
 * physics.js:477 verbatim — the 2021 quadrant ladder. Kept not for parity (that
 * suite is gone) but as the independent second implementation that
 * tests/core/collapsed-trig.test.ts proves the collapsed `cos` form against.
 */
export function legacyEffectiveVerticalMaxThrust(
  running: readonly boolean[],
  gimbalPointingDirection: Rad,
): number {
  const maxThrust = getWorkingEngineCount(running) * C.maxThrustPerRaptor;

  let coefficient: number;
  if (0 <= gimbalPointingDirection && gimbalPointingDirection <= Math.PI / 2) {
    coefficient = Math.cos(gimbalPointingDirection);
  } else if (Math.PI / 2 < gimbalPointingDirection && gimbalPointingDirection <= Math.PI) {
    coefficient = -Math.sin(gimbalPointingDirection - Math.PI / 2);
  } else if (-Math.PI / 2 <= gimbalPointingDirection && gimbalPointingDirection < 0) {
    coefficient = Math.cos(gimbalPointingDirection);
  } else {
    coefficient = Math.sin(gimbalPointingDirection + Math.PI / 2);
  }

  return maxThrust * coefficient;
}

/** physics.js:533 — the dynamic-pressure speed ceiling autoMaxThrust flies to. */
export function getMaxSpeedWithSafeDynamicPressure(airDensity: number): number {
  const maxDynamicPressure = 35;
  return Math.sqrt((maxDynamicPressure / airDensity) * 2000);
}

/**
 * autoPilotLowLevelFunctions.js:1 — point the vehicle at `goal`.
 *
 * The commanded angular acceleration is
 *
 *     a = -dPitch / T^2  -  2*w / T  -  offAxisThrustDifferenceAcceleration
 *
 * a critically-damped second-order law with time constant T, minus a
 * feed-forward term cancelling the torque from asymmetric engine thrust.
 *
 * Actuator selection is by availability, and the two thrust-vector branches are
 * byte-identical in 2021 — `controlByThrustVector` and
 * `controlByThrustVectorAndFins` have the same body. Merged here; the
 * duplication is noted rather than reproduced because it cannot change
 * behaviour. Everything else is verbatim, including `* 0.98` when RCS is live
 * and the `controlByFins` path falling through into RCS as well.
 *
 * @param timeNeededToAlign seconds; smaller is more aggressive
 */
export function precisionAlignment(state: SimState, goal: Rad, timeNeededToAlign: number): void {
  const { kinematics, forces, status, vehicle, autopilot } = state;

  const pitchDifference = getPitchDifference(kinematics.pitch, goal);

  const accelerationNeeded =
    -pitchDifference / timeNeededToAlign ** 2 -
    (2 * kinematics.angularVelocity) / timeNeededToAlign -
    forces.offAxisThrustDifferenceAcceleration;

  const torqueRequired = accelerationNeeded * vehicle.vehicleMomentOfInertia;

  /**
   * Initialised to 0, where 2021 declared it with no initialiser.
   *
   * That is a deliberate, documented deviation and the only one in this file.
   * The RCS branch assigns yokePosition only when the required force exceeds
   * rcsMaxThrust; inside the limits it sets rcsThrust and leaves yokePosition
   * undefined, then runs `pitchControl = yokePosition` and writes that to the
   * slider. In a browser the assignment never produced undefined: pitchControl
   * is an `<input type="range" min="-100" max="100">`, and HTML value
   * sanitisation replaces a non-numeric value with `min + (max-min)/2` = 0,
   * which updateBackEnd.js:201 then read straight back.
   *
   * So 0 IS the shipped behaviour. Reproducing `undefined` faithfully would
   * reproduce a value the DOM never allowed to escape, and would poison the
   * control chain with NaN the moment the slider stopped covering for it.
   *
   * tests/parity/autopilot.test.ts asserted both halves of this until M10.2
   * deleted it. The v2 half — that the RCS path leaves a usable number here and
   * steers through `autopilot.rcsThrustCommand` — is held by
   * tests/core/rcs-dead-zone.test.ts and tests/core/autopilot.test.ts. The 2021
   * half is no longer asserted anywhere, by design: the archived tree is not a
   * standard. M10.5 owes this function a direct contract test.
   */
  let yokePosition = 0;

  const controlByRcs = (): void => {
    // M2.11, Bug fix. 2021 wrote the sub-saturation command straight to
    // `forces.rcsThrust`, where `controlTranslation` — running immediately
    // after the autopilot, in the same step, before rotational motion could
    // read it — unconditionally zeroed it. The command never once took effect.
    // It goes to `autopilot.rcsThrustCommand` now, which controlTranslation
    // consumes rather than clobbers.
    if (Math.abs(pitchDifference) > 0.1) {
      const rcsForceRequired = torqueRequired / C.rcsThrustDistanceFromCenterOfMass;
      if (rcsForceRequired > 0) {
        if (rcsForceRequired > C.rcsMaxThrust) {
          yokePosition = 100;
        } else {
          autopilot.rcsThrustCommand = rcsForceRequired;
        }
      } else if (rcsForceRequired < 0) {
        if (rcsForceRequired < -C.rcsMaxThrust) {
          yokePosition = -100;
        } else {
          autopilot.rcsThrustCommand = rcsForceRequired;
        }
      } else {
        yokePosition = 0;
      }
      autopilot.pitchControl = yokePosition;
    }
  };

  const controlByThrustVector = (): void => {
    const vectorForceRequired = torqueRequired / C.engineDistanceFromCenterOfMass;
    const ratio = vectorForceRequired / forces.thrust;

    if (ratio >= 1) {
      yokePosition = 100;
    } else if (ratio <= -1) {
      yokePosition = -100;
    } else {
      yokePosition = (Math.asin(ratio) * 100) / C.gimbalAngleLimit;
      if (yokePosition >= 100) {
        yokePosition = 100;
      } else if (yokePosition <= -100) {
        yokePosition = -100;
      }
    }
    if (status.rcsActive) yokePosition = yokePosition * 0.98;
    autopilot.pitchControl = yokePosition;
  };

  const controlByFins = (): void => {
    /*
      M11.1: the fins' authority is estimated from the AIR moving past them,
      because that is what the fin forces in step() are now computed from. With
      groundspeed here and airspeed there, the autopilot would misjudge its own
      control power by the square of the ratio — and a hover in wind, ground
      speed zero, would divide by zero and slam the fins to the stop. At zero
      wind this is the stored `trueSpeed`'s bits: nothing changes the speeds
      between where that was computed and here.
    */
    const finAirspeed = relativeAirspeed(
      kinematics.speedX,
      kinematics.speedY,
      state.world.wind,
      state.world.gust,
    );
    if (torqueRequired > 0) {
      const maxFinNoseDownTorque =
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          C.frontFinSurfaceArea,
          C.finDragCoefficient,
        ) *
          Math.sin(C.finActuationMaxAngle) *
          C.frontFinDistanceFromCenterOfMass +
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          C.aftFinSurfaceArea,
          C.finDragCoefficient,
        ) *
          C.aftFinDistanceFromCenterOfMass;
      yokePosition = (torqueRequired / maxFinNoseDownTorque) * 100;
      if (yokePosition >= 100) yokePosition = 100;
    } else if (torqueRequired < 0) {
      const maxFinNoseUpTorque =
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          C.aftFinSurfaceArea,
          C.finDragCoefficient,
        ) *
          Math.sin(C.finActuationMaxAngle) *
          C.aftFinDistanceFromCenterOfMass +
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          C.frontFinSurfaceArea,
          C.finDragCoefficient,
        ) *
          C.frontFinDistanceFromCenterOfMass;
      yokePosition = (torqueRequired / maxFinNoseUpTorque) * 100;
      if (yokePosition <= -100) yokePosition = -100;
    } else {
      yokePosition = 0;
    }

    if (status.rcsActive) {
      yokePosition *= 0.99;
      controlByRcs();
    }
    autopilot.pitchControl = yokePosition;
  };

  if (forces.thrust > 0) {
    // Both 2021 branches (with and without fins) have identical bodies.
    controlByThrustVector();
  } else if (status.finActive) {
    controlByFins();
  } else {
    controlByRcs();
  }
}

/** autoPilotLowLevelFunctions.js:147 — throttle to hit a target TWR. */
export function controlEnginebyTWR(state: SimState, goalTWR: number): void {
  const { vehicle, engines } = state;
  let throttleGoalPercentage =
    ((goalTWR * vehicle.vehicleMass * C.gravity) /
      getThrust(engines.running, vehicle.throttleCurrent)) *
    100;

  /**
   * A NaN command would walk the throttle down forever. M10.5, Bug-fix tier.
   *
   * The clamp below is `if (x > upper) ... else if (x < lower) ...`, and NaN
   * fails BOTH comparisons, so it falls through unclamped and is written to
   * `vehicle.throttle`. That is reachable: the numerator is
   * `goalTWR * mass * gravity`, and `goalTWR` is literally 0 at three call
   * sites in this file (`verticalSpeedAdjustment` and both speed adjustments
   * command TWR 0 whenever the vehicle is going too fast), while the
   * denominator is 0 whenever no engine is lit or the throttle is closed. 0/0
   * is NaN.
   *
   * What follows is worse than a NaN in the state, because it does not look
   * like one. `throttleUpdate` slews the actual throttle toward the command
   * with `slewToward`, whose two comparisons against a NaN goal are both false,
   * so it takes the final branch and returns `current - perStep`: the throttle
   * walks DOWN by one step every frame, with no lower bound in that function,
   * and goes negative. `getThrust` is linear in it, so thrust goes negative and
   * the engine pushes backwards. While the engines are unlit the total max
   * thrust is 0 and the negative value is inert and invisible — it only bites
   * on relight.
   *
   * ONLY NaN. Infinity must fall through to the clamp below, which already
   * handles it correctly: a positive goalTWR with no thrust divides to
   * +Infinity, and `Infinity > throttleUpperLimit` commands FULL throttle —
   * which is right, because the vehicle needs thrust it does not yet have. A
   * first draft of this guard tested `!Number.isFinite` and so caught Infinity
   * too, quietly re-commanding those cases from 100% to the 40% floor. That is
   * a second, undeclared behaviour change: it made the vehicle throttle down at
   * every engine start, and it — not the NaN — was what moved four of the five
   * golden fixtures. `Number.isNaN` is the guard this comment describes.
   *
   * The lower limit is the right answer, not merely a safe one: a NaN arises
   * exactly when a TWR of zero is asked of an engine producing no thrust, and
   * the throttle setting that means "produce no thrust" is the lower limit.
   */
  if (Number.isNaN(throttleGoalPercentage)) {
    throttleGoalPercentage = C.throttleLowerLimit;
  }

  if (throttleGoalPercentage > C.throttleUpperLimit) {
    throttleGoalPercentage = C.throttleUpperLimit;
  } else if (throttleGoalPercentage < C.throttleLowerLimit) {
    throttleGoalPercentage = C.throttleLowerLimit;
  }
  vehicle.throttle = throttleGoalPercentage;
}

/** autoPilotLowLevelFunctions.js:160 — same, against vertical thrust only. */
export function controlEnginebyEffectiveVerticalTWR(state: SimState, goalTWR: number): void {
  const { vehicle, engines } = state;
  let throttleGoalPercentage =
    ((goalTWR * vehicle.vehicleMass * C.gravity) /
      getEffectiveVerticalMaxThrust(engines.running, vehicle.gimbalPointingDirection)) *
    100;

  // Same NaN escape as controlEnginebyTWR above, by the same 0/0 route: no
  // working engine makes the denominator exactly zero. NaN only — Infinity is
  // the clamp's business, and swallowing it here would silently turn "needs
  // full thrust" into "idle".
  //
  // Note that a gimbal of pi/2 does NOT produce it: Math.cos(Math.PI/2) is
  // 6.12e-17, not 0, so that divides to a very large finite number and clamps.
  if (Number.isNaN(throttleGoalPercentage)) {
    throttleGoalPercentage = C.throttleLowerLimit;
  }

  if (throttleGoalPercentage > C.throttleUpperLimit) {
    throttleGoalPercentage = C.throttleUpperLimit;
  } else if (throttleGoalPercentage < C.throttleLowerLimit) {
    throttleGoalPercentage = C.throttleLowerLimit;
  }
  vehicle.throttle = throttleGoalPercentage;
}

/**
 * autoPilotLowLevelFunctions.js:173 — steer toward a horizontal speed.
 *
 * Note that it calls precisionAlignment TWICE in the near-target case, the
 * second call overriding the first with a scaled-down angle. Wasteful, and
 * ported as found: the first call has side effects (it can write rcsThrust),
 * so collapsing it would change behaviour.
 */
export function horizontalSteering(
  state: SimState,
  targetSpeed: number,
  maxAngle: Rad,
  speedDifferenceThreshold: number,
  timeNeededToAlign: number,
): void {
  const speedDifference = state.kinematics.speedX - targetSpeed;

  if (speedDifference < 0) {
    precisionAlignment(state, maxAngle, timeNeededToAlign);
    if (-speedDifference < speedDifferenceThreshold) {
      precisionAlignment(
        state,
        rad((maxAngle * -speedDifference) / speedDifferenceThreshold),
        timeNeededToAlign,
      );
    }
  } else {
    precisionAlignment(state, rad(-maxAngle), timeNeededToAlign);
    if (speedDifference < speedDifferenceThreshold) {
      precisionAlignment(
        state,
        rad((-maxAngle * speedDifference) / speedDifferenceThreshold),
        timeNeededToAlign,
      );
    }
  }
}

/** autoPilotLowLevelFunctions.js:190 */
export function verticalSpeedAdjustment(
  state: SimState,
  targetSpeed: number,
  speedDifferenceThreshold: number,
  twrLimit: number,
): void {
  const speedDifference = state.kinematics.speedY - targetSpeed;

  if (speedDifference < 0) {
    controlEnginebyEffectiveVerticalTWR(state, twrLimit);
    if (-speedDifference < speedDifferenceThreshold) {
      controlEnginebyEffectiveVerticalTWR(state, 1 - speedDifference / speedDifferenceThreshold);
    }
  } else {
    controlEnginebyEffectiveVerticalTWR(state, 0);
    if (speedDifference < speedDifferenceThreshold) {
      controlEnginebyEffectiveVerticalTWR(state, 1 - speedDifference / speedDifferenceThreshold);
    }
  }
}

/** autoPilotLowLevelFunctions.js:207 */
export function horizontalSpeedAdjustment(
  state: SimState,
  targetSpeed: number,
  speedDifferenceThreshold: number,
  twrLimit: number,
): void {
  const speedDifference = targetSpeed - Math.abs(state.kinematics.speedX);

  if (speedDifference < 0) {
    controlEnginebyTWR(state, 0);
  } else {
    controlEnginebyTWR(state, twrLimit);
    if (speedDifference < speedDifferenceThreshold) {
      controlEnginebyTWR(state, 1 + speedDifference / speedDifferenceThreshold);
    }
  }
}

/** autoPilotLowLevelFunctions.js:220 */
export function speedAdjustment(
  state: SimState,
  targetSpeed: number,
  speedDifferenceThreshold: number,
  twrLimit: number,
): void {
  const speedDifference = targetSpeed - state.kinematics.trueSpeed;

  if (speedDifference < 0) {
    controlEnginebyTWR(state, 0);
  } else {
    controlEnginebyTWR(state, twrLimit);
    if (speedDifference < speedDifferenceThreshold) {
      controlEnginebyTWR(state, 1 + speedDifference / speedDifferenceThreshold);
    }
  }
}

/** physics.js:510 — TWR of an arbitrary force. */
export function getTWR(force: number, vehicleMass: number): number {
  return force / (vehicleMass * C.gravity);
}

export { getTotalMaxThrust };

/**
 * autoPilotLowLevelFunctions.js:235 — hold a target horizontal deceleration by
 * varying how broadside the vehicle flies.
 *
 * Ramps a correction angle up or down at `aeroBreakingAdjDegreePerSec`, clamps
 * it to [0, pi/2], and points the vehicle that far off horizontal. The 2021
 * version also toggles the fins on if they are off; that side effect is kept.
 */
export function controlHorizontalAccelerationByAeroBreaking(
  state: SimState,
  goalHorizontalAcc: number,
  dt: number,
  toggleFin: (s: SimState) => void,
): void {
  const { status, kinematics, autopilot } = state;

  if (!status.finActive) toggleFin(state);

  if (Math.abs(kinematics.accelerationX) > Math.abs(goalHorizontalAcc)) {
    autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = rad(
      autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle - C.aeroBreakingAdjDegreePerSec * dt,
    );
  } else {
    autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = rad(
      autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle + C.aeroBreakingAdjDegreePerSec * dt,
    );
  }

  if (
    autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle > C.aeroBreakingMaxCorrectionAngle
  ) {
    autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = C.aeroBreakingMaxCorrectionAngle;
  } else if (autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle < 0) {
    autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = rad(0);
  }

  if (goalHorizontalAcc < 0) {
    precisionAlignment(
      state,
      rad(autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle - Math.PI / 2),
      1.5,
    );
  } else {
    precisionAlignment(
      state,
      rad(-autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle + Math.PI / 2),
      1.5,
    );
  }
}

/**
 * autoPilotLowLevelFunctions.js:265 — shut engines down until minimum thrust
 * can no longer hold the vehicle up.
 *
 * Needed because Raptors cannot throttle below 40%: with three lit, minimum
 * thrust exceeds weight near touchdown and the vehicle would accelerate upward.
 * The shutdown order is 2021's, and it is not simply "highest index first".
 */
export function raptorAutoShutDown_KeepMinTWRBelow1(
  state: SimState,
  toggleRaptor: (s: SimState, i: 0 | 1 | 2) => void,
): void {
  const { engines, vehicle } = state;
  const running = engines.running;
  const minThrust =
    getWorkingEngineCount(running) * C.maxThrustPerRaptor * C.throttleLowerLimit * 0.01;

  if (getTWR(minThrust, vehicle.vehicleMass) > 1) {
    const count = getWorkingEngineCount(running);
    if (count === 3) {
      toggleRaptor(state, 0);
    } else if (count === 2) {
      if (running[0] && running[1]) {
        toggleRaptor(state, 0);
      } else if (running[1] && running[2]) {
        toggleRaptor(state, 1);
      } else {
        toggleRaptor(state, 2);
      }
    } else {
      if (running[0]) {
        toggleRaptor(state, 0);
      } else if (running[1]) {
        toggleRaptor(state, 1);
      } else {
        toggleRaptor(state, 2);
      }
    }
  }
}
