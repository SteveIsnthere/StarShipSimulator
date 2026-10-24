/**
 * Autopilot control primitives, ported from
 * backend/flightcontrol/autoPilotLowLevelFunctions.js.
 *
 * These are what every autopilot mode steers with. `precisionAlignment` is the
 * heart of it: a second-order attitude controller that picks its actuator by
 * what is currently available — gimbal, fins, or RCS.
 *
 * Names were corrected in M1.10; RENAME-MAP.md@d2839b9 is the dictionary for
 * reading these against the 2021 originals (`presisionAlignment`, `…Aera`,
 * `throttleLowwerLimmit`, `gimbol…`).
 *
 * Every one of these wrote `pitchControl` or `throttle` to a DOM input as its
 * last act. Here they write SimState instead — the value is identical, the
 * getElementById is gone.
 */
import { localGravity } from './guidance-physics';
import * as C from '../constants';
import { SHIP, type VehicleDefinition } from '../vehicle';
import { getDrag, relativeAirspeed } from '../physics/aero';
import { airVelocityX } from '../physics/wind';
import {
  getTotalMaxThrust,
  getTotalMinThrust,
  getWorkingSeaLevelCount,
  gimballedShare,
} from '../physics/engines';
import { createMassProperties, writeMassProperties } from '../physics/mass';
import { writeFlightMassQuery } from '../physics/flight-mass-query';
import { createDamageMassProperties } from '../physics/damage-mass';
import { damageModelFor } from '../physics/damage-model';
import { createDamageControlForces, writeDamageControls } from '../physics/damage-controls';
import { writeFlightGridForces } from '../physics/damage-flight';
import { createGridFinForces } from '../physics/grid-fins';
import { MAX_DAMAGE_COMPONENTS } from '../damage-state';

/** M11.8 — the arms for the step in hand; written before read, every call. */
const arms = createMassProperties();
const queriedMass = createDamageMassProperties();
const finAuthority = createDamageControlForces(MAX_DAMAGE_COMPONENTS);
const gridAuthority = createGridFinForces();
import type { RaptorIndex, SimState } from '../state';
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
 * some but not all of them would be the worst of both. The 2021 ladder lives in
 * tests/proofs/fixtures/legacy-ladders.ts (Phase 6 moved it out of shipped
 * code), the independent second implementation the collapse is proved against.
 */
export function getEffectiveVerticalMaxThrust(
  running: readonly boolean[],
  gimbalPointingDirection: Rad,
  ambientPressureKPa: number,
  pitch: Rad = gimbalPointingDirection,
  model: VehicleDefinition = SHIP,
): number {
  const maxThrust = getTotalMaxThrust(running, ambientPressureKPa, model);
  // The RVacs are fixed and push along the hull at `pitch` (Phase 6's
  // independent review); with none lit the share is exactly 1 and this is the
  // 2021 expression's bits.
  const share = gimballedShare(running, ambientPressureKPa, model);
  if (share === 1) return maxThrust * Math.cos(gimbalPointingDirection);
  return maxThrust * share * Math.cos(gimbalPointingDirection) + maxThrust * (1 - share) * Math.cos(pitch);
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
export function precisionAlignment(state: SimState, goal: Rad, timeNeededToAlign: number, model: VehicleDefinition = SHIP): void {
  const { kinematics, forces, status, vehicle, autopilot } = state;

  const pitchDifference = getPitchDifference(kinematics.pitch, goal);
  if (state.damage) writeFlightMassQuery(state, model, queriedMass, arms);
  else writeMassProperties(vehicle.propellantMass, arms, model);
  const supportAvailable = !state.damage || queriedMass.engineSupportAvailable;

  const accelerationNeeded =
    -pitchDifference / timeNeededToAlign ** 2 -
    (2 * kinematics.angularVelocity) / timeNeededToAlign -
    (supportAvailable ? forces.offAxisThrustDifferenceAcceleration : 0);

  const torqueRequired = accelerationNeeded * (state.damage ? queriedMass.momentOfInertia : vehicle.vehicleMomentOfInertia);
  // M11.8: the arms the controllers divide by follow the propellant, as the
  // step's do — a controller that assumed the empty-tank arms would ask a
  // full ship for half the deflection it needs.

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
      const rcsForceRequired = torqueRequired / arms.rcsArm;
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

  // Only the sea-level engines gimbal (the RVacs are fixed): the authority is
  // their share of the thrust, which is all of it when no RVac is lit.
  const gimballedThrust =
    supportAvailable ? forces.thrust * gimballedShare(state.engines.running, state.atmosphere.airPressure, model) : 0;

  const controlByThrustVector = (): void => {
    const vectorForceRequired = torqueRequired / arms.engineArm;
    const ratio = vectorForceRequired / gimballedThrust;

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
      airVelocityX(state.world, kinematics.altitude),
      state.world.gustVertical,
    );
    if (state.damage) {
      // Probe canonical delivered endpoint authority without altering live
      // extension, root temperatures, articulation or permanent loss policy.
      let bestTorque = 0, endpoint = 0;
      const q = .5 * state.atmosphere.airDensity * finAirspeed ** 2;
      if (model.gridFins) {
        for (let direction = -1; direction <= 1; direction += 2) {
          writeFlightGridForces(state, state.atmosphere.airDensity,
            kinematics.speedX - airVelocityX(state.world, kinematics.altitude),
            kinematics.speedY - state.world.gustVertical, kinematics.pitch, arms, model, gridAuthority,
            rad(direction * model.gridFins.maxAngle));
          if (gridAuthority.torque * torqueRequired > 0 && Math.abs(gridAuthority.torque) > Math.abs(bestTorque)) {
            bestTorque = gridAuthority.torque;
            endpoint = direction * 100;
          }
        }
      } else {
        const incidence = Math.abs(Math.sin(kinematics.angleInToTheWind));
        const sign = kinematics.angleOfAttack < 0 ? -1 : 1;
        for (let endpointIndex = 0; endpointIndex < 2; endpointIndex++) {
          const front = endpointIndex === 0;
          writeDamageControls(state.damage, damageModelFor(model).controls, q, incidence,
            front ? C.finActuationMaxAngle : 0, front ? 0 : C.finActuationMaxAngle, finAuthority);
          const torque = q * C.finDragCoefficient * incidence * sign
            * (finAuthority.frontArea * arms.frontFinArm - finAuthority.aftArea * arms.aftFinArm);
          if (torque * torqueRequired > 0 && Math.abs(torque) > Math.abs(bestTorque)) {
            bestTorque = torque;
            endpoint = (front ? sign : -sign) * 100;
          }
        }
      }
      yokePosition = bestTorque === 0 ? 0 : endpoint * Math.min(1, Math.abs(torqueRequired / bestTorque));
      if (status.rcsActive) { yokePosition *= .99; controlByRcs(); }
      autopilot.pitchControl = yokePosition;
      return;
    }
    if (torqueRequired > 0) {
      const maxFinNoseDownTorque =
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          model.frontFinArea,
          C.finDragCoefficient,
        ) *
          Math.sin(C.finActuationMaxAngle) *
          arms.frontFinArm +
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          model.aftFinArea,
          C.finDragCoefficient,
        ) *
          arms.aftFinArm;
      yokePosition = (torqueRequired / maxFinNoseDownTorque) * 100;
      if (yokePosition >= 100) yokePosition = 100;
    } else if (torqueRequired < 0) {
      const maxFinNoseUpTorque =
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          model.aftFinArea,
          C.finDragCoefficient,
        ) *
          Math.sin(C.finActuationMaxAngle) *
          arms.aftFinArm +
        getDrag(
          state.atmosphere.airDensity,
          finAirspeed,
          model.frontFinArea,
          C.finDragCoefficient,
        ) *
          arms.frontFinArm;
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

  if (gimballedThrust > 0) {
    // Both 2021 branches (with and without fins) have identical bodies.
    controlByThrustVector();
  } else if (status.finActive) {
    controlByFins();
  } else {
    controlByRcs();
  }
}

/**
 * autoPilotLowLevelFunctions.js:147 — throttle to hit a target TWR.
 *
 * TWR against the gravity the vehicle actually feels here (`localGravity`:
 * gravity at this altitude less the centrifugal term), not a flat 9.807 m/s².
 * Phase 5, Fidelity: with the flat g a commanded TWR of 1 climbed at
 * 0.08 m/s² on the pad and 0.32 m/s² at 80 km.
 */
export function controlEnginebyTWR(state: SimState, goalTWR: number, model: VehicleDefinition = SHIP): void {
  controlEngineForAcceleration(state, goalTWR * localGravity(state), model);
}

/**
 * Throttle for a target thrust acceleration (m/s²), against full-throttle thrust. Phase6b Task5, Bug fix: dividing by current thrust
 * counted the current throttle twice and overshot the requested acceleration. For targets that are accelerations already, such
 * as boost-back's horizontal deceleration, so no gravity enters them.
 */
export function controlEngineForAcceleration(state: SimState, acceleration: number, model: VehicleDefinition = SHIP): void {
  const { vehicle, engines } = state;
  if (state.damage) writeFlightMassQuery(state, model, queriedMass);
  const available = !state.damage || queriedMass.engineSupportAvailable;
  let throttleGoalPercentage =
    ((acceleration * (state.damage ? queriedMass.totalMass : vehicle.vehicleMass)) /
      (available ? getTotalMaxThrust(engines.running, state.atmosphere.airPressure, model) : 0)) *
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
export function controlEnginebyEffectiveVerticalTWR(state: SimState, goalTWR: number, model: VehicleDefinition = SHIP): void {
  const { vehicle, engines } = state;
  if (state.damage) writeFlightMassQuery(state, model, queriedMass);
  const available = !state.damage || queriedMass.engineSupportAvailable;
  let throttleGoalPercentage =
    ((goalTWR * (state.damage ? queriedMass.totalMass : vehicle.vehicleMass) * localGravity(state)) /
      (available ? getEffectiveVerticalMaxThrust(
        engines.running,
        vehicle.gimbalPointingDirection,
        state.atmosphere.airPressure,
        state.kinematics.pitch,
        model,
      ) : 0)) *
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
 * second call overriding the first with a scaled-down angle. It looks
 * wasteful, but the first call's side effects are load-bearing: it can set
 * `autopilot.rcsThrustCommand`, which the second call writes only when its own
 * pitch error is large enough to use RCS. Measured in
 * Phase 6, Task 1: a single call with the final angle moves the
 * landing-burn-autoland and landing-burn-headwind goldens. Keep both calls.
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
  model: VehicleDefinition = SHIP,
): void {
  const speedDifference = targetSpeed - state.kinematics.trueSpeed;

  if (speedDifference < 0) {
    controlEnginebyTWR(state, 0, model);
  } else {
    controlEnginebyTWR(state, twrLimit, model);
    if (speedDifference < speedDifferenceThreshold) {
      controlEnginebyTWR(state, 1 + speedDifference / speedDifferenceThreshold, model);
    }
  }
}

/** physics.js:510 — TWR of an arbitrary force, against a gravity in m/s² (`localGravity`). */
export function getTWR(force: number, vehicleMass: number, gravity: number): number {
  return force / (vehicleMass * gravity);
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
  toggleRaptor: (s: SimState, i: RaptorIndex) => void,
  model: VehicleDefinition = SHIP,
): void {
  const { engines } = state;
  writeFlightMassQuery(state, model, queriedMass);
  if (!queriedMass.engineSupportAvailable || !queriedMass.hasMass) return;
  const running = engines.running;
  // M11.2: the engine model's own minimum, at the ambient pressure. M10.8 had
  // noted this expression was a second copy of getTotalMinThrust; now it is
  // the one copy, and it knows about altitude.
  const minThrust = getTotalMinThrust(running, state.atmosphere.airPressure, model);

  if (getTWR(minThrust, queriedMass.totalMass, localGravity(state)) > 1) {
    const count = getWorkingSeaLevelCount(running, model);
    if (count === 0) return;
    // Preserve the Ship ladder's asymmetric shutdown order. For an explicitly
    // selected larger inventory, never turn an unlit nominal centre ON.
    const preferred = count === 3 ? 0 : count === 2
      ? running[0] && running[1] ? 0 : running[1] && running[2] ? 1 : 2
      : running[0] ? 0 : running[1] ? 1 : 2;
    if (running[preferred] && model.engines[preferred]?.kind === 'sea-level') {
      toggleRaptor(state, preferred);
    } else {
      for (let i = 0; i < model.engines.length; i++) {
        if (running[i] && model.engines[i]!.kind === 'sea-level') {
          toggleRaptor(state, i);
          break;
        }
      }
    }
  }
}
