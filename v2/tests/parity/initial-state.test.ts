/**
 * The spawn state must match what initBackEnd() actually produces, not what a
 * reading of it suggests. Same VM-execution approach as the constants test.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy, toLegacyName } from './legacy';
import { createInitialState } from '$core/state';

const legacy = loadLegacy();

/** Read a legacy global by its v2 name, translating through the rename table. */
function readLegacy(name: string): unknown {
  return (legacy as unknown as Record<string, unknown>)[toLegacyName(name)];
}
const s = createInitialState();

/** SimState path -> legacy global name. */
const FIELDS: ReadonlyArray<readonly [unknown, string]> = [
  [s.world.environmentTime, toLegacyName('environmentTime')],
  [s.world.timeSpent, toLegacyName('timeSpent')],
  [s.world.updatedFrameCount, toLegacyName('updatedFrameCount')],
  [s.world.wind, toLegacyName('wind')],
  [s.world.gust, toLegacyName('gust')],

  [s.kinematics.altitude, toLegacyName('altitude')],
  [s.kinematics.downRangeDistance, toLegacyName('downRangeDistance')],
  [s.kinematics.downRangeDistanceNextFrame, toLegacyName('downRangeDistanceNextFrame')],
  [s.kinematics.distanceToPlanetCenter, toLegacyName('distanceToPlanetCenter')],
  [s.kinematics.orbitalVelocityAtCurrentAltitude, toLegacyName('orbitalVelocityAtCurrentAltitude')],
  [s.kinematics.trueSpeed, toLegacyName('trueSpeed')],
  [s.kinematics.speedX, toLegacyName('speedX')],
  [s.kinematics.speedY, toLegacyName('speedY')],
  [s.kinematics.machSpeed, toLegacyName('machSpeed')],
  [s.kinematics.accelerationX, toLegacyName('accelerationX')],
  [s.kinematics.accelerationY, toLegacyName('accelerationY')],
  [s.kinematics.totalAcceleration, toLegacyName('totalAcceleration')],
  [s.kinematics.pitch, toLegacyName('pitch')],
  [s.kinematics.pitchRateOfChange, toLegacyName('pitchRateOfChange')],
  [s.kinematics.angularVelocity, toLegacyName('angularVelocity')],
  [s.kinematics.angularAcceleration, toLegacyName('angularAcceleration')],
  [s.kinematics.angleOfMotion, toLegacyName('angleOfMotion')],
  [s.kinematics.angleOfAttack, toLegacyName('angleOfAttack')],
  [s.kinematics.angleInToTheWind, toLegacyName('angleInToTheWind')],

  [s.forces.thrust, toLegacyName('thrust')],
  [s.forces.thrustAcceleration, toLegacyName('thrustAcceleration')],
  [s.forces.offAxisThrustDifferenceAcceleration, toLegacyName('offAxisThrustDifferenceAcceleration')],
  [s.forces.twr, toLegacyName('twr')],
  [s.forces.thrustVectorForce, toLegacyName('thrustVectorForce')],
  [s.forces.thrustVectorAcceleration, toLegacyName('thrustVectorAcceleration')],
  [s.forces.rcsThrust, toLegacyName('rcsThrust')],
  [s.forces.rcsThrustAngularAcceleration, toLegacyName('rcsThrustAngularAcceleration')],
  [s.forces.angularDragAcceleration, toLegacyName('angularDragAcceleration')],
  [s.forces.crossSectionalArea, toLegacyName('crossSectionalArea')],
  [s.forces.aerodynamicDrag, toLegacyName('aerodynamicDrag')],
  [s.forces.aerodynamicLift, toLegacyName('aerodynamicLift')],
  [s.forces.aerodynamicDragAcceleration, toLegacyName('aerodynamicDragAcceleration')],
  [s.forces.frontFinDrag, toLegacyName('frontFinDrag')],
  [s.forces.aftFinDrag, toLegacyName('aftFinDrag')],
  [s.forces.frontFinDragAngularAcceleration, toLegacyName('frontFinDragAngularAcceleration')],
  [s.forces.aftFinDragAngularAcceleration, toLegacyName('aftFinDragAngularAcceleration')],
  [s.forces.frontFinEffectiveAreaFraction, toLegacyName('frontFinEffectiveAreaFraction')],
  [s.forces.aftFinEffectiveAreaFraction, toLegacyName('aftFinEffectiveAreaFraction')],
  [s.forces.thermalPower, toLegacyName('thermalPower')],
  [s.forces.dynamicPressure, toLegacyName('dynamicPressure')],
  [s.forces.perceivedG, toLegacyName('perceivedG')],
  [s.forces.perceivedG_X, toLegacyName('perceivedG_X')],
  [s.forces.perceivedG_Y, toLegacyName('perceivedG_Y')],

  [s.vehicle.vehicleMass, toLegacyName('vehicleMass')],
  [s.vehicle.propellantMass, toLegacyName('propellantMass')],
  [s.vehicle.vehicleMomentOfInertia, toLegacyName('vehicleMomentOfInertia')],
  [s.vehicle.vehicleInFlightMaxArea, toLegacyName('vehicleInFlightMaxArea')],
  [s.vehicle.throttle, toLegacyName('throttle')],
  [s.vehicle.throttleCurrent, toLegacyName('throttleCurrent')],
  [s.vehicle.gimbalPosition, toLegacyName('gimbalPosition')],
  [s.vehicle.gimbalPointingDirection, toLegacyName('gimbalPointingDirection')],
  [s.vehicle.frontFinExtension, toLegacyName('frontFinExtension')],
  [s.vehicle.aftFinExtension, toLegacyName('aftFinExtension')],
  [s.vehicle.rcsRunTimeRemaining, toLegacyName('rcsRunTimeRemaining')],

  [s.status.onTheGround, toLegacyName('onTheGround')],
  [s.status.landed, toLegacyName('landed')],
  [s.status.rcsActive, toLegacyName('rcsActive')],
  [s.status.finActive, toLegacyName('finActive')],
  [s.status.finLocked, toLegacyName('finLocked')],
  [s.status.gearDown, toLegacyName('gearDown')],
  [s.status.dumpingFuel, toLegacyName('dumpingFuel')],
  [s.status.forceDump, toLegacyName('forceDump')],
  [s.status.translationModeOn, toLegacyName('translationModeOn')],

  [s.engines.running[0], toLegacyName('raptorN1Running')],
  [s.engines.running[1], toLegacyName('raptorN2Running')],
  [s.engines.running[2], toLegacyName('raptorN3Running')],
  [s.engines.failed[0], toLegacyName('raptorN1Fail')],
  [s.engines.failed[1], toLegacyName('raptorN2Fail')],
  [s.engines.failed[2], toLegacyName('raptorN3Fail')],

  [s.warnings.coldGasLow, toLegacyName('coldGasLow')],
  [s.warnings.fuelLow, toLegacyName('fuelLow')],
  [s.warnings.heatDamagedWarning, toLegacyName('heatDamagedWarning')],
  [s.warnings.overPressureWarning, toLegacyName('overPressureWarning')],
  [s.warnings.overGLoadWarning, toLegacyName('overGLoadWarning')],

  [s.failures.crashed, toLegacyName('crashed')],
  [s.failures.inFlightBreakUp, toLegacyName('inFlightBreakUp')],
  [s.failures.coldGasRunOut, toLegacyName('coldGasRunOut')],
  [s.failures.fuelRunOut, toLegacyName('fuelRunOut')],
  [s.failures.heatDamaged, toLegacyName('heatDamaged')],
  [s.failures.overPressure, toLegacyName('overPressure')],
  [s.failures.overGLoad, toLegacyName('overGLoad')],
  [s.failures.flippedOver, toLegacyName('flippedOver')],
  [s.failures.randomFailure, toLegacyName('randomFailure')],

  [s.autopilot.manualControlOn, toLegacyName('manualControlOn')],
  [s.autopilot.pitchControl, toLegacyName('pitchControl')],
  [s.autopilot.holdingPitch, toLegacyName('holdingPitch')],
  [s.autopilot.pitchHoldOn, toLegacyName('pitchHoldOn')],
  [s.autopilot.autoBoostBackOn, toLegacyName('autoBoostBackOn')],
  [s.autopilot.boostBackInitCompleted, toLegacyName('boostBackInitCompleted')],
  [s.autopilot.boostBackAeroDeceleration, toLegacyName('boostBackAeroDeceleration')],
  [s.autopilot.boostBackDecelerationStageInitCompleted, toLegacyName('boostBackDecelerationStageInitCompleted')],
  [s.autopilot.accelerationStageCompleted, toLegacyName('accelerationStageCompleted')],
  [s.autopilot.boostBackDirection, toLegacyName('boostBackDirection')],
  [s.autopilot.decelerationStageEstDuration, toLegacyName('decelerationStageEstDuration')],
  [s.autopilot.finalXPosPrediction, toLegacyName('finalXPosPrediction')],
  [s.autopilot.freeFallTimeRemainingPrediction, toLegacyName('freeFallTimeRemainingPrediction')],
  [s.autopilot.autoLandOn, toLegacyName('autoLandOn')],
  [s.autopilot.initVehicleConfigCompleted, toLegacyName('initVehicleConfigCompleted')],
  [s.autopilot.landingSiteXPos, toLegacyName('landingSiteXPos')],
  [s.autopilot.dualRaptorMode, toLegacyName('dualRaptorMode')],
  [s.autopilot.trialRaptorMode, toLegacyName('trialRaptorMode')],
  [s.autopilot.aeroDescentCompleted, toLegacyName('aeroDescentCompleted')],
  [s.autopilot.bellyFlopTriggerAltitude, toLegacyName('bellyFlopTriggerAltitude')],
  [s.autopilot.flipStageInitialised, toLegacyName('flipStageInitialised')],
  [s.autopilot.flipCompleted, toLegacyName('flipCompleted')],
  [s.autopilot.horizontalAdjustmentStageCompleted, toLegacyName('horizontalAdjustmentStageCompleted')],
  [s.autopilot.horizontalAdjustmentStageInitialised, toLegacyName('horizontalAdjustmentStageInitialised')],
  [s.autopilot.finalDescentStageInitialised, toLegacyName('finalDescentStageInitialised')],
  [s.autopilot.finalDescentStageCompleted, toLegacyName('finalDescentStageCompleted')],
  [s.autopilot.autoMaxThrustOn, toLegacyName('autoMaxThrustOn')],
  [s.autopilot.autoTakeOffOn, toLegacyName('autoTakeOffOn')],
  [s.autopilot.autoTakeOffInitialised, toLegacyName('autoTakeOffInitialised')],
  [
    s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle,
    'horizontalAccelerationByAeroBreakingCorrectionAngle',
  ],
];

describe('createInitialState matches initBackEnd() exactly', () => {
  for (const [mine, name] of FIELDS) {
    it(name, () => {
      expect(Object.is(mine, legacy[name]), `ours=${String(mine)} legacy=${String(legacy[name])}`)
        .toBe(true);
    });
  }

  it('covers a meaningful share of the legacy state', () => {
    // 119 until M2.10, which deleted `orbitGravityAccCompensation` from
    // SimState along with the rest of the relief hack. One field fewer to
    // compare because there is one field fewer, not because one was dropped
    // from the comparison — the departure is asserted just below.
    expect(FIELDS.length).toBeGreaterThanOrEqual(118);
  });

  it('DECLARED DEPARTURE: orbitGravityAccCompensation is gone — M2.6/M2.10', () => {
    // 2021 initialised it to gravity * |speedX| / orbitalVelocity, which is
    // zero at spawn since speedX is. v2 has no such field: gravity is
    // -GM/r^2 and orbital motion needs no relief term.
    expect(readLegacy('orbitGravityAccCompensation')).toBe(0);
    expect('orbitGravityAccCompensation' in s.kinematics).toBe(false);
  });
});

describe('fields the port deliberately reshapes', () => {
  it('pitchRecord keeps the [Infinity, Infinity] seed', () => {
    expect(s.kinematics.pitchRecord).toEqual([Infinity, Infinity]);
    expect(readLegacy('pitchRecord')).toEqual([Infinity, Infinity]);
  });

  it('the three per-engine booleans become arrays', () => {
    // 2021 had raptorN1Running/N2/N3 as separate globals. Same values, one field.
    expect(s.engines.running).toEqual([false, false, false]);
    expect(s.engines.failed).toEqual([false, false, false]);
  });

  it('ignitionCountdown has no legacy counterpart — it replaces setTimeout', () => {
    // switches.js ran ignition on a wall-clock timer. There is nothing in the
    // legacy state to compare against; the field exists so M1.4 can tick it by dt.
    expect(s.engines.ignitionCountdown.every((c) => c === null)).toBe(true);
    expect(readLegacy('ignitionCountdown')).toBeUndefined();
  });

  it('autopilot fields left undefined in 2021 are typed undefined here', () => {
    // `globalThis.fineTunePercentage` with no assignment is a declared-undefined
    // global. Modelled as `number | undefined` rather than silently defaulted.
    for (const name of [
      'fineTunePercentage',
      'horizontalAdjustmentTimeLeft',
      'horizontalAdjustmentDesiredSpeed',
      'effectiveVerticalMaxThrust',
      'finalStagePessimisticAltitude',
      'distanceToGround',
    ] as const) {
      expect(s.autopilot[name], name).toBeUndefined();
      expect(legacy[toLegacyName(name)], name).toBeUndefined();
    }
  });
});
