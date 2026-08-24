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
 * All six are ported verbatim, misspellings included (`aeroDesent`,
 * `presisionAlignment`, `finalDesentStage`). M1.10 renames.
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

  // The gate reads pitchRateOfChange, which is frame-rate dependent in the
  // 2021 formula — this is exactly why pitchHold behaved differently on
  // different devices. M2.4 fixes the rate; this line is unchanged.
  if (Math.abs(kinematics.pitchRateOfChange) < 0.4) {
    autopilot.holdingPitch = kinematics.pitch;
  }
  prim.presisionAlignment(state, autopilot.holdingPitch, 0.5);
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

  if (!autopilot.autoTakeOffInited) {
    if (!autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
    if (getWorkingEngineCount(engines.running) === 0) cmd.toggleAllRaptors(state);
    autopilot.autoTakeOffInited = true;
  }

  if (kinematics.altitude < 25000) {
    prim.presisionAlignment(state, rad((C.aomAt_25km * kinematics.altitude) / 25000), 3);
  } else if (kinematics.altitude < 80000) {
    prim.presisionAlignment(
      state,
      rad(C.aomAt_25km + ((C.aomAt_80km - C.aomAt_25km) * (kinematics.altitude - 25000)) / 55000),
      3,
    );
  } else {
    prim.presisionAlignment(state, C.aomAt_80km, 3);
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

  if (!autopilot.boostBackinitCompleted) {
    autopilot.boostbackDirection =
      kinematics.downRangeDistance > C.starBaseXpos - C.flipEnducedXposChange
        ? -Math.PI * 0.5
        : Math.PI * 0.5;
    if (!state.status.rcsActive) cmd.toggleRcs(state);
    if (getWorkingEngineCount(engines.running) === 0) cmd.toggleAllRaptors(state);
    if (!autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
    if (autopilot.autoTakeOffOn) cmd.toggleAutoTakeOff(state);
    autopilot.boostBackinitCompleted = true;
  }

  // boostBackController
  if (!autopilot.accelerationStageCompleted) {
    autopilot.decelerationStageEstDuration =
      Math.abs(kinematics.speedX) / C.decelerationStageHorizontalAcc + 4;

    prim.presisionAlignment(state, rad(autopilot.boostbackDirection), 1.5);

    if (
      (C.starBaseXpos - kinematics.downRangeDistance - C.flipEnducedXposChange) /
        (kinematics.speedX * 0.5) <
        autopilot.decelerationStageEstDuration + 2 &&
      (C.starBaseXpos - kinematics.downRangeDistance) / kinematics.speedX > 0
    ) {
      cmd.toggleAllRaptors(state);
      if (autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
      autopilot.accelerationStageCompleted = true;
    }
  } else {
    if (!autopilot.boostBackDecelerationStageinitCompleted) {
      // The 5 s setTimeout, as a dt-ticked countdown. See the file header.
      autopilot.boostBackDecelerationCheckCountdown = 5;
      autopilot.boostBackDecelerationStageinitCompleted = true;
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
        autopilot.boostbackDirection < 0
          ? C.decelerationStageHorizontalAcc
          : -C.decelerationStageHorizontalAcc,
        dt,
        toggleFin,
      );
    } else {
      prim.presisionAlignment(state, rad(-autopilot.boostbackDirection), 1);
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
  autopilot.finalXposPrediction = Infinity;
  autopilot.freeFallTimeRemainingPrediction = Infinity;
  autopilot.boostbackDirection = 0;
  autopilot.boostBackinitCompleted = false;
  autopilot.boostBackAeroDeceleration = true;
  autopilot.boostBackDecelerationStageinitCompleted = false;
  autopilot.boostBackDecelerationCheckCountdown = null;
  autopilot.accelerationStageCompleted = false;
}

/** initAutoLand() */
function resetAutoLandState(state: SimState): void {
  const { autopilot } = state;
  autopilot.autoLandOn = false;
  autopilot.initVehicleConfigCompleted = false;
  autopilot.landingSiteXpos = C.starBaseXpos;
  autopilot.dualRaptorMode = false;
  autopilot.trialRaptorMode = false;
  autopilot.aeroDesentCompleted = false;
  autopilot.fineTunePercentage = undefined;
  autopilot.bellyFlopTriggerAltitude = 0;
  autopilot.flipStageInitted = false;
  autopilot.flipCompleted = false;
  autopilot.horizontalAdjustmentStageCompleted = false;
  autopilot.horizontalAdjustmentStageInitted = false;
  autopilot.horizontalAdjustmentTimeLeft = undefined;
  autopilot.horizontalAdjustmentDesiredSpeed = undefined;
  autopilot.effectiveVerticalMaxThrust = undefined;
  autopilot.finalStagePessimisticAltitude = undefined;
  autopilot.finalDesentStageInitted = false;
  autopilot.distanceToGround = undefined;
  autopilot.finalDesentStageCompleted = false;
}

export { getFreeFallTimeRemainingPrediction, getAngularAcceleration, getTotalMaxThrust };

/** autoPilotModes.js:147 — the landing programme: four stages, in order. */
export function autoLand(state: SimState, dt: number): void {
  const { autopilot, vehicle, engines, status } = state;
  if (!autopilot.autoLandOn || autopilot.manualControlOn) return;

  if (!autopilot.initVehicleConfigCompleted) {
    if (!status.finActive) cmd.toggleFin(state);
    if (!status.rcsActive) cmd.toggleRcs(state);
    vehicle.throttle = C.throttleLowwerLimmit;
    if (vehicle.propellantMass > C.dumpLimit && !status.dumpingFuel) cmd.toggleDumpFuel(state);
    if (getWorkingEngineCount(engines.running) > 0) cmd.toggleAllRaptors(state);
    autopilot.initVehicleConfigCompleted = true;
  }

  if (!autopilot.aeroDesentCompleted) {
    updateBellyFlopTriggerAltitude(state);
    aeroDescentController(state);
  } else if (!autopilot.flipCompleted) {
    flipStageController(state);
  } else if (!autopilot.horizontalAdjustmentStageCompleted) {
    horizontalAdjustmentStageController(state);
  } else if (!autopilot.finalDesentStageCompleted) {
    finalDesentStageController(state, dt);
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
    kinematics.downRangeDistance - autopilot.landingSiteXpos + C.flipEnducedXposChange;
  const timeToSite = -distanceToSite / kinematics.speedX;

  let correctionAngle: number;
  if (Math.abs(kinematics.speedX) > 20) {
    correctionAngle = kinematics.angleOfMotion - Math.PI;
  } else if (distanceToSite > 0) {
    correctionAngle = -C.aeroDesentMaxCorrectionAngle;
    if (timeToSite < 5 && timeToSite > 0) {
      autopilot.fineTunePercentage =
        Math.abs(kinematics.speedX) > C.fineTuneMaxSpeed
          ? 1
          : Math.abs(kinematics.speedX) / C.fineTuneMaxSpeed;
      correctionAngle =
        C.aeroDesentMaxCorrectionAngle * C.fineTuneMultiplier * autopilot.fineTunePercentage;
    }
  } else {
    correctionAngle = C.aeroDesentMaxCorrectionAngle;
    if (timeToSite < 5 && timeToSite > 0) {
      autopilot.fineTunePercentage =
        Math.abs(kinematics.speedX) > C.fineTuneMaxSpeed
          ? 1
          : Math.abs(kinematics.speedX) / C.fineTuneMaxSpeed;
      correctionAngle =
        -C.aeroDesentMaxCorrectionAngle * C.fineTuneMultiplier * autopilot.fineTunePercentage;
    }
  }
  prim.presisionAlignment(state, rad(correctionAngle + Math.PI / 2), 0.7);

  if (
    (kinematics.altitude < autopilot.bellyFlopTriggerAltitude &&
      kinematics.speedY < 5 &&
      kinematics.altitude < 2500) ||
    kinematics.altitude < 300
  ) {
    autopilot.aeroDesentCompleted = true;
  }
}

/** autoPilotModes.js:266 — the flip to vertical. */
function flipStageController(state: SimState): void {
  const { autopilot, kinematics, vehicle, status } = state;

  if (!autopilot.flipStageInitted) {
    if (status.dumpingFuel) cmd.toggleDumpFuel(state);
    if (status.rcsActive) cmd.toggleRcs(state);
    cmd.toggleAllRaptors(state);
    autopilot.flipStageInitted = true;
  }

  prim.presisionAlignment(state, C.flipGoalAngle, 0.4);

  if (kinematics.pitch < 0) vehicle.throttle = C.throttleUpperLimmit;
  if (kinematics.pitch < C.flipGoalAngle) autopilot.flipCompleted = true;
}

/** autoPilotModes.js:290 — null out horizontal error before the final burn. */
function horizontalAdjustmentStageController(state: SimState): void {
  const { autopilot, kinematics, vehicle, engines, status } = state;

  if (!autopilot.horizontalAdjustmentStageInitted) {
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
    autopilot.horizontalAdjustmentStageInitted = true;
  }

  // updateParams
  let targetDifference = autopilot.landingSiteXpos - kinematics.downRangeDistance;
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
export function finalDesentStageController(
  state: SimState,
  dt: number,
  speedYShutdownThreshold = -5,
  onTouchdown?: (s: SimState) => void,
): void {
  const { autopilot, kinematics, vehicle, engines, status } = state;

  if (!autopilot.finalDesentStageInitted) autopilot.finalDesentStageInitted = true;

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
    prim.presisionAlignment(state, rad(0), 0.4);
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
    vehicle.throttle = C.throttleLowwerLimmit;
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

  finalDesentStageController(state, dt, -20, (s) => {
    cmd.toggleAllRaptors(s);
    s.autopilot.demoAutoLandOn = false;
    s.status.finLocked = false;
    s.vehicle.propellantMass = C.propellantMass;
    s.autopilot.pitchControl = 0;
    s.vehicle.throttle = 100;
  });
}

/**
 * updateBackEnd.js:184 — every mode, in the 2021 order.
 *
 * The order is load-bearing: later modes overwrite earlier ones' commands.
 */
export function runAutopilot(state: SimState, dt: number): void {
  demoAutoLand(state, dt);
  autoMaxThrust(state);
  pitchHold(state);
  autoTakeOff(state);
  autoLand(state, dt);
  autoBoostBack(state, dt);
}
