/**
 * The autopilot, ported from backend/flightcontrol/autoPilotModes.js.
 *
 * Six modes, run in the 2021 order every step (updateBackEnd.js:184):
 *
 *     demoAutoLand  autoMaxThrust  pitchHold  autoTakeOff  autoLand  autoBoostBack
 *
 * Order matters. Several modes write `pitchControl` or `throttle`, and a later
 * mode simply overwrites an earlier one's command. Reordering changes flight.
 *
 * All six were ported verbatim first, misspellings included, and renamed in
 * M1.10 once the goldens had locked behaviour. docs/RENAME-MAP.md maps these
 * back to their 2021 names (`aeroDesent…`, `presisionAlignment`,
 * `finalDesentStage…`).
 *
 * ONE MECHANISM CHANGE, behaviour-preserving. autoPilotModes.js:118 arms a
 * `setTimeout(..., 5000 / timeAccel)` to decide whether aerodynamic deceleration
 * is working. Wall 5 forbids wall-clock timers in core/, so it becomes a
 * dt-ticked countdown. It is not a bug fix: 5000/timeAccel ms of real time at
 * timeAccel speed-up is exactly 5 s of simulated time, so the ported countdown
 * fires at the same simulated instant. What changes is that it now survives
 * pause, respects warp exactly, and is deterministic under replay.
 */
import * as C from '../constants';
import * as cmd from '../control/commands';
import * as prim from '../control/primitives';
import { getFreeFallTimeRemainingPrediction } from '../physics/prediction';
import * as gravity from '../physics/gravity';
import { getAngularAcceleration } from '../physics/aero';
import { getWorkingEngineCount, getTotalMaxThrust } from '../physics/engines';
import type { SimState } from '../state';
import { rad } from '../units';

const toggleRaptor = cmd.toggleRaptor;
const toggleFin = cmd.toggleFin;

/** autoPilotModes.js:1 — hold the current attitude. */
export function pitchHold(state: SimState): void {
  const { autopilot, kinematics } = state;
  if (!autopilot.pitchHoldOn || autopilot.manualControlOn) return;

  // The gate reads pitchRateOfChange, which M2.4 made a genuine rad/s rate.
  // The threshold value is unchanged at 0.4 — at the 60 fps reference, where
  // the old expression happened to be correct, 0.4 in the old units WAS
  // 0.4 rad/s. What changed is that it now means that at every frame rate.
  if (Math.abs(kinematics.pitchRateOfChange) < C.PITCH_HOLD_RATE_THRESHOLD) {
    autopilot.holdingPitch = kinematics.pitch;
  }
  prim.precisionAlignment(state, autopilot.holdingPitch, 0.5);
}

/** autoPilotModes.js:420 — fly at the dynamic-pressure speed ceiling. */
export function autoMaxThrust(state: SimState): void {
  if (!state.autopilot.autoMaxThrustOn) return;
  prim.speedAdjustment(
    state,
    prim.getMaxSpeedWithSafeDynamicPressure(state.atmosphere.airDensity),
    10,
    4,
  );
}

/** autoPilotModes.js:426 — ascent, following a pitch programme by altitude. */
export function autoTakeOff(state: SimState): void {
  const { autopilot, kinematics, vehicle, engines } = state;
  if (!autopilot.autoTakeOffOn || autopilot.manualControlOn) return;

  if (!autopilot.autoTakeOffInitialised) {
    if (!autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
    if (getWorkingEngineCount(engines.running) === 0) cmd.toggleAllRaptors(state);
    autopilot.autoTakeOffInitialised = true;
  }

  if (kinematics.altitude < 25000) {
    prim.precisionAlignment(state, rad((C.aomAt_25km * kinematics.altitude) / 25000), 3);
  } else if (kinematics.altitude < 80000) {
    prim.precisionAlignment(
      state,
      rad(C.aomAt_25km + ((C.aomAt_80km - C.aomAt_25km) * (kinematics.altitude - 25000)) / 55000),
      3,
    );
  } else {
    prim.precisionAlignment(state, C.aomAt_80km, 3);
  }

  if (vehicle.propellantMass < C.dumpLimit && getWorkingEngineCount(engines.running) > 0) {
    cmd.toggleAllRaptors(state);
    cmd.toggleAutoTakeOff(state);
  }
}

/** autoPilotModes.js:16 — turn around and fly back to the launch site. */
export function autoBoostBack(state: SimState, dt: number): void {
  const { autopilot, kinematics, vehicle, engines } = state;
  if (!autopilot.autoBoostBackOn || autopilot.manualControlOn) return;

  const finishBoostBack = (): void => {
    cmd.toggleBoostBack(state);
    resetBoostBackState(state);
    if (!autopilot.autoLandOn) cmd.toggleAutoLand(state);
  };

  if (!autopilot.boostBackInitCompleted) {
    autopilot.boostBackDirection =
      kinematics.downRangeDistance > C.starBaseXPos - C.flipInducedXPosChange
        ? -Math.PI * 0.5
        : Math.PI * 0.5;
    if (!state.status.rcsActive) cmd.toggleRcs(state);
    if (getWorkingEngineCount(engines.running) === 0) cmd.toggleAllRaptors(state);
    if (!autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
    if (autopilot.autoTakeOffOn) cmd.toggleAutoTakeOff(state);
    autopilot.boostBackInitCompleted = true;
  }

  // boostBackController
  if (!autopilot.accelerationStageCompleted) {
    autopilot.decelerationStageEstDuration =
      Math.abs(kinematics.speedX) / C.decelerationStageHorizontalAcc + 4;

    prim.precisionAlignment(state, rad(autopilot.boostBackDirection), 1.5);

    if (
      (C.starBaseXPos - kinematics.downRangeDistance - C.flipInducedXPosChange) /
        (kinematics.speedX * 0.5) <
        autopilot.decelerationStageEstDuration + 2 &&
      (C.starBaseXPos - kinematics.downRangeDistance) / kinematics.speedX > 0
    ) {
      cmd.toggleAllRaptors(state);
      if (autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
      autopilot.accelerationStageCompleted = true;
    }
  } else {
    if (!autopilot.boostBackDecelerationStageInitCompleted) {
      // The 5 s setTimeout, as a dt-ticked countdown. See the file header.
      autopilot.boostBackDecelerationCheckCountdown = 5;
      autopilot.boostBackDecelerationStageInitCompleted = true;
    }

    if (autopilot.boostBackDecelerationCheckCountdown !== null) {
      autopilot.boostBackDecelerationCheckCountdown -= dt;
      if (autopilot.boostBackDecelerationCheckCountdown <= 0) {
        autopilot.boostBackDecelerationCheckCountdown = null;
        if (kinematics.accelerationX < C.decelerationStageHorizontalAcc * 0.95) {
          autopilot.boostBackAeroDeceleration = false;
          cmd.toggleAllRaptors(state);
        }
      }
    }

    if (autopilot.boostBackAeroDeceleration) {
      prim.controlHorizontalAccelerationByAeroBreaking(
        state,
        autopilot.boostBackDirection < 0
          ? C.decelerationStageHorizontalAcc
          : -C.decelerationStageHorizontalAcc,
        dt,
        toggleFin,
      );
    } else {
      prim.precisionAlignment(state, rad(-autopilot.boostBackDirection), 1);
      prim.raptorAutoShutDown_KeepMinTWRBelow1(state, toggleRaptor);
      prim.controlEnginebyTWR(state, C.decelerationStageHorizontalAcc / C.gravity);
    }

    if (Math.abs(kinematics.speedX) < 3) {
      finishBoostBack();
      return;
    }
  }

  if (
    vehicle.propellantMass < C.dumpLimit ||
    (kinematics.altitude < 700 && kinematics.speedY < 0)
  ) {
    finishBoostBack();
  }
}

/** initAutoBoostBack() — reset to spawn values without touching anything else. */
function resetBoostBackState(state: SimState): void {
  const { autopilot } = state;
  autopilot.autoBoostBackOn = false;
  autopilot.decelerationStageEstDuration = 0;
  autopilot.finalXPosPrediction = Infinity;
  autopilot.freeFallTimeRemainingPrediction = Infinity;
  autopilot.boostBackDirection = 0;
  autopilot.boostBackInitCompleted = false;
  autopilot.boostBackAeroDeceleration = true;
  autopilot.boostBackDecelerationStageInitCompleted = false;
  autopilot.boostBackDecelerationCheckCountdown = null;
  autopilot.accelerationStageCompleted = false;
}

/** initAutoLand() */
function resetAutoLandState(state: SimState): void {
  const { autopilot } = state;
  autopilot.autoLandOn = false;
  autopilot.initVehicleConfigCompleted = false;
  autopilot.landingSiteXPos = C.starBaseXPos;
  autopilot.dualRaptorMode = false;
  autopilot.trialRaptorMode = false;
  autopilot.aeroDescentCompleted = false;
  autopilot.fineTunePercentage = undefined;
  autopilot.bellyFlopTriggerAltitude = 0;
  autopilot.flipStageInitialised = false;
  autopilot.flipCompleted = false;
  autopilot.horizontalAdjustmentStageCompleted = false;
  autopilot.horizontalAdjustmentStageInitialised = false;
  autopilot.horizontalAdjustmentTimeLeft = undefined;
  autopilot.horizontalAdjustmentDesiredSpeed = undefined;
  autopilot.effectiveVerticalMaxThrust = undefined;
  autopilot.finalStagePessimisticAltitude = undefined;
  autopilot.finalDescentStageInitialised = false;
  autopilot.distanceToGround = undefined;
  autopilot.finalDescentStageCompleted = false;
}

export { getFreeFallTimeRemainingPrediction, getAngularAcceleration, getTotalMaxThrust };

/** autoPilotModes.js:147 — the landing programme: four stages, in order. */
export function autoLand(state: SimState, dt: number): void {
  const { autopilot, vehicle, engines, status } = state;
  if (!autopilot.autoLandOn || autopilot.manualControlOn) return;

  if (!autopilot.initVehicleConfigCompleted) {
    if (!status.finActive) cmd.toggleFin(state);
    if (!status.rcsActive) cmd.toggleRcs(state);
    vehicle.throttle = C.throttleLowerLimit;
    if (vehicle.propellantMass > C.dumpLimit && !status.dumpingFuel) cmd.toggleDumpFuel(state);
    if (getWorkingEngineCount(engines.running) > 0) cmd.toggleAllRaptors(state);
    autopilot.initVehicleConfigCompleted = true;
  }

  if (!autopilot.aeroDescentCompleted) {
    updateBellyFlopTriggerAltitude(state);
    aeroDescentController(state);
  } else if (!autopilot.flipCompleted) {
    flipStageController(state);
  } else if (!autopilot.horizontalAdjustmentStageCompleted) {
    horizontalAdjustmentStageController(state);
  } else if (!autopilot.finalDescentStageCompleted) {
    finalDescentStageController(state, dt);
  }
}

/** autoPilotModes.js:194 — how high to start the flip, worst case. */
function updateBellyFlopTriggerAltitude(state: SimState): void {
  const { autopilot, kinematics, vehicle } = state;

  let finalStagePessimisticAvailableThrust = C.finalStagePessimisticAvailableThrust;
  let horizontalAdjustmentDurationEstimate = C.horizontalAdjustmentDurationEstimateSingleEngine;
  autopilot.dualRaptorMode = false;
  autopilot.trialRaptorMode = false;

  if (finalStagePessimisticAvailableThrust * 0.8 < C.gravity * vehicle.vehicleMass) {
    finalStagePessimisticAvailableThrust = C.finalStagePessimisticAvailableThrustDualRaptorMode;
    horizontalAdjustmentDurationEstimate = C.horizontalAdjustmentDurationEstimateDualRaptorMode;
    autopilot.dualRaptorMode = true;
    if (finalStagePessimisticAvailableThrust * 0.8 < C.gravity * vehicle.vehicleMass) {
      horizontalAdjustmentDurationEstimate = C.horizontalAdjustmentDurationEstimateDualRaptorMode;
      finalStagePessimisticAvailableThrust = C.finalStagePessimisticAvailableThrustTrialRaptorMode;
      autopilot.trialRaptorMode = true;
    }
  }

  const finalStagePessimisticAvailableAcc =
    finalStagePessimisticAvailableThrust / vehicle.vehicleMass - C.gravity;
  const finalStagePessimisticDuration = -kinematics.speedY / finalStagePessimisticAvailableAcc;
  autopilot.finalStagePessimisticAltitude =
    -kinematics.speedY * finalStagePessimisticDuration * 0.5;

  const flipStagePessimisticAcc = getAngularAcceleration(
    C.flipStagePessimisticAvailableThrust,
    C.engineDistanceFromCenterOfMass,
    vehicle.vehicleMomentOfInertia,
  );
  const flipStagePessimisticDuration =
    Math.sqrt((((Math.PI / 2 + C.flipGoalAngle) / 2 / flipStagePessimisticAcc) * 2)) * 2;

  autopilot.bellyFlopTriggerAltitude =
    autopilot.finalStagePessimisticAltitude +
    -kinematics.speedY * (flipStagePessimisticDuration + C.raptorIgnitionTimeMean * 0.001) -
    C.horizontalAdjustmentVerticalSpeedLimit * horizontalAdjustmentDurationEstimate +
    C.vehicleHeight / 2;
}

/** autoPilotModes.js:222 — glide belly-down, steering toward the pad. */
function aeroDescentController(state: SimState): void {
  const { autopilot, kinematics } = state;

  const distanceToSite =
    kinematics.downRangeDistance - autopilot.landingSiteXPos + C.flipInducedXPosChange;
  const timeToSite = -distanceToSite / kinematics.speedX;

  let correctionAngle: number;
  if (Math.abs(kinematics.speedX) > 20) {
    correctionAngle = kinematics.angleOfMotion - Math.PI;
  } else if (distanceToSite > 0) {
    correctionAngle = -C.aeroDescentMaxCorrectionAngle;
    if (timeToSite < 5 && timeToSite > 0) {
      autopilot.fineTunePercentage =
        Math.abs(kinematics.speedX) > C.fineTuneMaxSpeed
          ? 1
          : Math.abs(kinematics.speedX) / C.fineTuneMaxSpeed;
      correctionAngle =
        C.aeroDescentMaxCorrectionAngle * C.fineTuneMultiplier * autopilot.fineTunePercentage;
    }
  } else {
    correctionAngle = C.aeroDescentMaxCorrectionAngle;
    if (timeToSite < 5 && timeToSite > 0) {
      autopilot.fineTunePercentage =
        Math.abs(kinematics.speedX) > C.fineTuneMaxSpeed
          ? 1
          : Math.abs(kinematics.speedX) / C.fineTuneMaxSpeed;
      correctionAngle =
        -C.aeroDescentMaxCorrectionAngle * C.fineTuneMultiplier * autopilot.fineTunePercentage;
    }
  }
  prim.precisionAlignment(state, rad(correctionAngle + Math.PI / 2), 0.7);

  if (
    (kinematics.altitude < autopilot.bellyFlopTriggerAltitude &&
      kinematics.speedY < 5 &&
      kinematics.altitude < 2500) ||
    kinematics.altitude < 300
  ) {
    autopilot.aeroDescentCompleted = true;
  }
}

/** autoPilotModes.js:266 — the flip to vertical. */
function flipStageController(state: SimState): void {
  const { autopilot, kinematics, vehicle, status } = state;

  if (!autopilot.flipStageInitialised) {
    if (status.dumpingFuel) cmd.toggleDumpFuel(state);
    if (status.rcsActive) cmd.toggleRcs(state);
    cmd.toggleAllRaptors(state);
    autopilot.flipStageInitialised = true;
  }

  prim.precisionAlignment(state, C.flipGoalAngle, 0.4);

  if (kinematics.pitch < 0) vehicle.throttle = C.throttleUpperLimit;
  if (kinematics.pitch < C.flipGoalAngle) autopilot.flipCompleted = true;
}

/** autoPilotModes.js:290 — null out horizontal error before the final burn. */
function horizontalAdjustmentStageController(state: SimState): void {
  const { autopilot, kinematics, vehicle, engines, status } = state;

  if (!autopilot.horizontalAdjustmentStageInitialised) {
    if (status.finActive) cmd.toggleFin(state);
    status.finLocked = true;
    if (getWorkingEngineCount(engines.running) < 3) {
      // Mutates the tuning values for the rest of the landing. In 2021 these
      // were globals, so the change persisted across runs until a reload;
      // here they live in SimState and reset with the scenario.
      autopilot.horizontalAdjustmentVerticalSpeedLimit =
        autopilot.horizontalAdjustmentVerticalSpeedLimit / 1.5;
      autopilot.horizontalAdjustmentHorizontalSpeedLimit *= 2;
    }
    autopilot.horizontalAdjustmentStageInitialised = true;
  }

  // updateParams
  let targetDifference = autopilot.landingSiteXPos - kinematics.downRangeDistance;
  const [n1, n2, n3] = engines.running;
  if (n1 && !n2 && !n3) {
    targetDifference -= 12;
  } else if (!n1 && n2 && n3) {
    targetDifference += 4;
  } else if (!n1 && ((n2 && !n3) || (!n2 && n3))) {
    targetDifference += 4;
  }

  const finalStagePessimisticAvailableAcc =
    getTotalMaxThrust(engines.running) / vehicle.vehicleMass - C.gravity;
  const finalStagePessimisticDuration =
    -kinematics.speedY / finalStagePessimisticAvailableAcc + 1;
  autopilot.finalStagePessimisticAltitude =
    -kinematics.speedY * finalStagePessimisticDuration * 0.5 + C.vehicleHeight * 0.5;

  autopilot.horizontalAdjustmentTimeLeft =
    (kinematics.altitude - autopilot.finalStagePessimisticAltitude - C.vehicleHeight / 2) /
    -kinematics.speedY;


  autopilot.horizontalAdjustmentDesiredSpeed =
    targetDifference / autopilot.horizontalAdjustmentTimeLeft;

  if (
    autopilot.horizontalAdjustmentDesiredSpeed > autopilot.horizontalAdjustmentHorizontalSpeedLimit
  ) {
    autopilot.horizontalAdjustmentDesiredSpeed = autopilot.horizontalAdjustmentHorizontalSpeedLimit;
  } else if (
    autopilot.horizontalAdjustmentDesiredSpeed < -autopilot.horizontalAdjustmentHorizontalSpeedLimit
  ) {
    autopilot.horizontalAdjustmentDesiredSpeed =
      -autopilot.horizontalAdjustmentHorizontalSpeedLimit;
  }

  if (kinematics.speedY > autopilot.horizontalAdjustmentVerticalSpeedLimit) {
    prim.raptorAutoShutDown_KeepMinTWRBelow1(state, toggleRaptor);
  }

  // steering
  if (autopilot.horizontalAdjustmentTimeLeft < 3 && autopilot.horizontalAdjustmentTimeLeft > -3) {
    prim.horizontalSteering(state, 0, C.adjustmentMaxAngle, 10, 0.8);
  } else {
    prim.horizontalSteering(
      state,
      autopilot.horizontalAdjustmentDesiredSpeed ?? 0,
      C.adjustmentMaxAngle,
      6,
      1,
    );
  }

  prim.verticalSpeedAdjustment(state, autopilot.horizontalAdjustmentVerticalSpeedLimit, 10, 2);

  if (autopilot.finalStagePessimisticAltitude * 1.1 > kinematics.altitude) {
    autopilot.horizontalAdjustmentStageCompleted = true;
  }
}

/**
 * autoPilotModes.js:361 — the final descent and touchdown.
 *
 * Shared with the intro demo, which runs this stage alone from a standing
 * start. `speedYShutdownThreshold` is the only difference between them: -5 for
 * a real landing, -20 for the demo (welcome.js:11).
 */
export function finalDescentStageController(
  state: SimState,
  dt: number,
  speedYShutdownThreshold = -5,
  onTouchdown?: (s: SimState) => void,
): void {
  const { autopilot, kinematics, vehicle, engines, status } = state;

  if (!autopilot.finalDescentStageInitialised) autopilot.finalDescentStageInitialised = true;

  autopilot.distanceToGround = kinematics.altitude - C.vehicleHeight * 0.5;

  // steering
  if (kinematics.altitude > C.vehicleHeight * 0.5 + C.noSteeringHeight) {
    const [n1, n2, n3] = engines.running;
    if (n1 && !n2 && !n3) {
      prim.horizontalSteering(state, -0.8, rad(C.adjustmentMaxAngle / 2), 5, 0.7);
    } else if (!n1 && n2 && n3) {
      prim.horizontalSteering(state, 0.8, rad(C.adjustmentMaxAngle / 2), 5, 0.7);
    } else if (!n1 && ((n2 && !n3) || (!n2 && n3))) {
      prim.horizontalSteering(state, 0.72, rad(C.adjustmentMaxAngle / 2), 5, 0.7);
    } else {
      prim.horizontalSteering(state, 0, rad(C.adjustmentMaxAngle / 2), 5, 0.7);
    }
  } else {
    prim.precisionAlignment(state, rad(0), 0.4);
  }

  if (kinematics.speedY > speedYShutdownThreshold) {
    prim.raptorAutoShutDown_KeepMinTWRBelow1(state, toggleRaptor);
  }

  prim.verticalSpeedAdjustment(state, -autopilot.distanceToGround / 3 - 0.1, 10, 3);

  // checkIfTD
  if (kinematics.altitude <= C.vehicleHeight * 0.5 + 0.05) {
    if (onTouchdown) {
      onTouchdown(state);
      return;
    }
    vehicle.throttle = C.throttleLowerLimit;
    cmd.toggleAllRaptors(state);
    status.forceDump = true;
    if (!status.dumpingFuel) cmd.toggleDumpFuel(state);
    cmd.toggleAutoLand(state);
    resetAutoLandState(state);
  }
  void dt;
}

/**
 * utilities/welcome.js:1 — the intro auto-landing demo.
 *
 * CLAUDE.md lists this under "what must never change". It is the final-descent
 * controller run alone, from a standing start high in the render box, with a
 * -20 m/s engine-shutdown threshold instead of -5. On touchdown it restores the
 * vehicle for play rather than ending the flight.
 */
export function demoAutoLand(state: SimState, dt: number): void {
  if (!state.autopilot.demoAutoLandOn) return;

  finalDescentStageController(state, dt, -20, (s) => {
    cmd.toggleAllRaptors(s);
    s.autopilot.demoAutoLandOn = false;
    s.status.finLocked = false;
    s.vehicle.propellantMass = C.propellantMass;
    s.autopilot.pitchControl = 0;
    s.vehicle.throttle = 100;
  });
}

/** Retrograde, for a vehicle moving downrange. Prograde is +pi/2. */
const RETROGRADE = rad(-Math.PI / 2);

/**
 * Ground-track distance still to cover before reaching the landing site, in the
 * direction of travel. Always positive: going the long way round is still
 * going, and a target 100 m behind is a lap ahead.
 */
function distanceToLandingSite(state: SimState): number {
  const gap = state.autopilot.landingSiteXPos - state.kinematics.downRangeDistance;
  return gap < 0 ? gap + C.planetCircumference : gap;
}

/**
 * m — the range still to run from the CURRENT state: the conic coast down to
 * the entry interface, plus the atmosphere's own measured contribution.
 *
 * This is the guidance's error signal. During the burn it falls as speed comes
 * off, and the engines cut when it has fallen to the distance still to go.
 */
function rangeToGoFromHere(state: SimState): number {
  const { kinematics } = state;
  return (
    gravity.coastDownrangeDistance(
      kinematics.distanceToPlanetCenter,
      kinematics.speedX,
      kinematics.speedY,
      C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE,
    ) + C.DEORBIT_ENTRY_RANGE
  );
}

/**
 * How far the vehicle will travel if the deorbit burn starts NOW.
 *
 * Three pieces, and only the last is fitted:
 *
 *   THE BURN. The vehicle keeps moving while the engines are lit, and how long
 *   they are lit depends on its mass — which is why a fixed lead distance could
 *   not work. `dV * m / F` is the impulse time; the distance covered is the
 *   average speed over it, so the mean of the speed before and after.
 *
 *   THE COAST, from cutoff down to the entry interface: a conic, solved in
 *   `gravity.coastDownrangeDistance` from the post-burn state.
 *
 *   THE DESCENT, below the interface: `DEORBIT_ENTRY_RANGE`, measured, because
 *   it is whatever autoLand does and no formula predicts that.
 *
 * Returns Infinity when the burn would not bring the vehicle down at all — a
 * dV too small to reach the interface — which keeps the mode from firing into
 * an orbit it cannot leave.
 */
function predictedDeorbitRange(state: SimState): number {
  const { kinematics, vehicle, engines } = state;

  // The engines are OFF while this decision is being made — the mode shut them
  // down at configure — so what matters is the thrust that will light, not the
  // thrust that is lit. An engine that has failed will not.
  const willLight = engines.failed.reduce((n, failed) => (failed ? n : n + 1), 0);
  if (willLight <= 0) return Infinity;

  const burnSeconds = (C.DEORBIT_DELTA_V * vehicle.vehicleMass) / (willLight * C.maxThrustPerRaptor);
  const burnRange = (kinematics.speedX - C.DEORBIT_DELTA_V / 2) * burnSeconds;

  const coastRange = gravity.coastDownrangeDistance(
    kinematics.distanceToPlanetCenter,
    kinematics.speedX - C.DEORBIT_DELTA_V,
    kinematics.speedY,
    C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE,
  );

  return burnRange + coastRange + C.DEORBIT_ENTRY_RANGE;
}



/**
 * M2.9(c) — deorbit targeting. THE ONE MODE 2021 DID NOT HAVE.
 *
 * autoLand knows how to come home from a suborbital hop: it is handed a vehicle
 * already falling toward the landing site and trims the rest. It has no idea
 * how to leave an orbit, because in the 2021 flight model there were no orbits
 * to leave — the relief term was clamped at g, so a vehicle at orbital speed
 * still fell. Planet-centered gravity made orbit real, which made "come home
 * from one" a question the autopilot suddenly had to be able to answer.
 *
 * Four phases, and the mode itself is the first three:
 *
 *   1. CONFIGURE. Engines off, RCS on, throttle staged at the upper limit so
 *      the burn does not have to slew up from idle. Fins are left alone: they
 *      do nothing in vacuum, and autoLand configures them at handover anyway.
 *   2. COAST, turning to retrograde on RCS. Commanded from the first step of
 *      the coast, not at the firing point, because RCS is slow: measured at
 *      about 0.0015 rad/s, half a turn takes roughly 35 minutes and the vehicle
 *      is still 19.5 degrees short of retrograde when the burn starts. Waiting
 *      would mean burning sideways.
 *   3. BURN when the ground track left to the landing site has closed to what
 *      the vehicle would cover if it fired now — its burn arc, the conic coast
 *      to the entry interface, and the measured atmospheric descent — and CUT
 *      OFF when the range still to run has come down to the distance still to
 *      fly. Terminating on the guidance condition rather than on a fixed dV is
 *      what absorbs the pointing error: the vehicle is a few degrees off
 *      retrograde at ignition, and open-loop that is worth ~90 km of range.
 *   4. HAND OVER the moment the burn is done and the vehicle is falling.
 *
 * WHY HAND OVER IMMEDIATELY rather than at some entry interface. The first
 * version waited until 80 km — the altitude the Re-entry preset starts at,
 * which seemed like the natural boundary — and held retrograde all the way
 * down to it. That kills the vehicle: nose-into-the-airflow is the MINIMUM
 * cross-section, so it barely decelerates in the thin upper air, arrives low
 * and still fast, and the peak reaches the heat limit exactly. Measured:
 * breakup at 1194 s, peak 390.0 against a limit of 390. Handing over as soon
 * as it is falling lets autoLand put the vehicle broadside for the whole
 * descent, and the peak drops to 309 — 79% of the limit. Attitude, not the
 * burn, is what makes an entry survivable.
 *
 * WHY THE dV IS BOUNDED rather than free. The entry is heat-limited, and the
 * burn size is what sets how hot it is: Sutton-Graves peaks scale with
 * sqrt(density) * v^3, so a bigger burn drops the perigee, meets thick air
 * sooner and faster, and pushes the peak up. A guidance loop free to spend any
 * dV to hit a point could choose an entry that destroys the vehicle. So the
 * loop chooses cutoff inside a floor and a ceiling: it aims with the timing,
 * trims with the cutoff, and cannot trade the vehicle for accuracy.
 */
export function autoDeorbit(state: SimState): void {
  const { autopilot, kinematics, vehicle, engines, status } = state;
  if (!autopilot.autoDeorbitOn || autopilot.manualControlOn) return;

  if (!autopilot.deorbitInitCompleted) {
    autopilot.landingSiteXPos = C.starBaseXPos;
    if (!status.rcsActive) cmd.toggleRcs(state);
    if (getWorkingEngineCount(engines.running) > 0) cmd.toggleAllRaptors(state);
    vehicle.throttle = C.throttleUpperLimit;
    autopilot.deorbitInitCompleted = true;
  }

  // Held through every phase: during the coast so the burn can start the
  // instant the geometry is right, and during the burn because retrograde is
  // where the thrust has to point.
  prim.precisionAlignment(state, RETROGRADE, 4);

  if (!autopilot.deorbitBurnStarted) {
    if (distanceToLandingSite(state) <= predictedDeorbitRange(state)) {
      // Remembered so the burn can measure how much dV it has spent, and stop
      // itself if the guidance condition never arrives.
      autopilot.deorbitTargetSpeed = kinematics.speedX;
      cmd.toggleAllRaptors(state);
      vehicle.throttle = C.throttleUpperLimit;
      autopilot.deorbitBurnStarted = true;
    }
    return;
  }

  if (!autopilot.deorbitBurnCompleted) {
    const spent = (autopilot.deorbitTargetSpeed as number) - kinematics.speedX;
    // CUT OFF ON THE GUIDANCE CONDITION, not on a fixed dV — which is how a
    // deorbit burn is actually targeted. Before the engines light, the orbit is
    // closed and the range to go is infinite; every metre per second taken off
    // brings it down, and the burn ends the moment it has come down to the
    // distance still to fly. What that corrects for is everything an open-loop
    // dV cannot know: the few degrees the vehicle is off retrograde at
    // ignition, how that error moves during the burn, and the radial speed it
    // leaves behind. Measured, those are worth ~90 km of range.
    const onTarget = spent >= C.DEORBIT_DELTA_V_MIN && rangeToGoFromHere(state) <= distanceToLandingSite(state);
    // And a ceiling, because the entry is heat-limited: a burn that never
    // satisfies the condition must still stop somewhere survivable.
    const spentEnough = spent >= C.DEORBIT_DELTA_V_MAX;

    if (onTarget || spentEnough) {
      if (getWorkingEngineCount(engines.running) > 0) cmd.toggleAllRaptors(state);
      vehicle.throttle = C.throttleLowerLimit;
      autopilot.deorbitBurnCompleted = true;
    }
    return;
  }

  if (kinematics.speedY < 0) {
    autopilot.autoDeorbitOn = false;
    if (!autopilot.autoLandOn) cmd.toggleAutoLand(state);
  }
}

/**
 * updateBackEnd.js:184 — every mode, in the 2021 order.
 *
 * The order is load-bearing: later modes overwrite earlier ones' commands.
 * `autoDeorbit` is APPENDED rather than inserted for exactly that reason: it is
 * the one mode 2021 did not have, and running it last means it cannot change
 * what any of the six do. It hands over by switching itself off and autoLand
 * on, so the two are never both steering.
 */
export function runAutopilot(state: SimState, dt: number): void {
  demoAutoLand(state, dt);
  autoMaxThrust(state);
  pitchHold(state);
  autoTakeOff(state);
  autoLand(state, dt);
  autoBoostBack(state, dt);
  autoDeorbit(state);
}
