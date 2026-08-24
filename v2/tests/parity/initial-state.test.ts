/**
 * The spawn state must match what initBackEnd() actually produces, not what a
 * reading of it suggests. Same VM-execution approach as the constants test.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy } from './legacy';
import { createInitialState } from '$core/state';

const legacy = loadLegacy();
const s = createInitialState();

/** SimState path -> legacy global name. */
const FIELDS: ReadonlyArray<readonly [unknown, string]> = [
  [s.world.environmentTime, 'environmentTime'],
  [s.world.timeSpent, 'timeSpent'],
  [s.world.updatedFrameCount, 'updatedFrameCount'],
  [s.world.wind, 'wind'],
  [s.world.gust, 'gust'],

  [s.kinematics.altitude, 'altitude'],
  [s.kinematics.downRangeDistance, 'downRangeDistance'],
  [s.kinematics.downRangeDistanceNextFrame, 'downRangeDistanceNextFrame'],
  [s.kinematics.distanceToPlanetCenter, 'distanceToPlanetCenter'],
  [s.kinematics.orbitalVelocityAtCurrentAltitude, 'orbitalVelocityAtCurrentAltitude'],
  [s.kinematics.trueSpeed, 'trueSpeed'],
  [s.kinematics.speedX, 'speedX'],
  [s.kinematics.speedY, 'speedY'],
  [s.kinematics.machSpeed, 'machSpeed'],
  [s.kinematics.accelerationX, 'accelerationX'],
  [s.kinematics.accelerationY, 'accelerationY'],
  [s.kinematics.totalAcceleration, 'totalAcceleration'],
  [s.kinematics.pitch, 'pitch'],
  [s.kinematics.pitchRateOfChange, 'pitchRateOfChange'],
  [s.kinematics.angularVelocity, 'angularVelocity'],
  [s.kinematics.angularAcceleration, 'angularAcceleration'],
  [s.kinematics.angleOfMotion, 'angleOfMotion'],
  [s.kinematics.angleOfAttack, 'angleOfAttack'],
  [s.kinematics.angleInToTheWind, 'angleInToTheWind'],

  [s.forces.thrust, 'thrust'],
  [s.forces.thrustAcceleration, 'thrustAcceleration'],
  [s.forces.offAxisThrustDifferenceAcceleration, 'offAxisThrustDifferenceAcceleration'],
  [s.forces.twr, 'twr'],
  [s.forces.thrustVectorForce, 'thrustVectorForce'],
  [s.forces.thrustVectorAcceleration, 'thrustVectorAcceleration'],
  [s.forces.rcsThrust, 'rcsThrust'],
  [s.forces.rcsThrustAngularAcceleration, 'rcsThrustAngularAcceleration'],
  [s.forces.angularDragAcceleration, 'angularDragAcceleration'],
  [s.forces.crossSectionalArea, 'crossSectionalArea'],
  [s.forces.aerodynamicDrag, 'aerodynamicDrag'],
  [s.forces.aerodynamicLift, 'aerodynamicLift'],
  [s.forces.aerodynamicDragAcceleration, 'aerodynamicDragAcceleration'],
  [s.forces.frontFinDrag, 'frontFinDrag'],
  [s.forces.aftFinDrag, 'aftFinDrag'],
  [s.forces.frontFinDragAngularAcceleration, 'frontFinDragAngularAcceleration'],
  [s.forces.aftFinDragAngularAcceleration, 'aftFinDragAngularAcceleration'],
  [s.forces.frontFinEffectiveAreaFraction, 'frontFinEffectiveAreaFraction'],
  [s.forces.aftFinEffectiveAreaFraction, 'aftFinEffectiveAreaFraction'],
  [s.forces.thermalPower, 'thermalPower'],
  [s.forces.dynamicPressure, 'dynamicPressure'],
  [s.forces.perceivedG, 'perceivedG'],
  [s.forces.perceivedG_X, 'perceivedG_X'],
  [s.forces.perceivedG_Y, 'perceivedG_Y'],

  [s.vehicle.vehicleMass, 'vehicleMass'],
  [s.vehicle.propellantMass, 'propellantMass'],
  [s.vehicle.vehicleMomentOfInertia, 'vehicleMomentOfInertia'],
  [s.vehicle.vehicleInFlightMaxArea, 'vehicleInFlightMaxArea'],
  [s.vehicle.throttle, 'throttle'],
  [s.vehicle.throttleCurrent, 'throttleCurrent'],
  [s.vehicle.gimbolPosition, 'gimbolPosition'],
  [s.vehicle.gimbolPointingDirection, 'gimbolPointingDirection'],
  [s.vehicle.frontFinExtention, 'frontFinExtention'],
  [s.vehicle.aftFinExtention, 'aftFinExtention'],
  [s.vehicle.rcsRunTimeRemaining, 'rcsRunTimeRemaining'],

  [s.status.onTheGround, 'onTheGround'],
  [s.status.landed, 'landed'],
  [s.status.rcsActive, 'rcsActive'],
  [s.status.finActive, 'finActive'],
  [s.status.finLocked, 'finLocked'],
  [s.status.gearDown, 'gearDown'],
  [s.status.dumpingFuel, 'dumpingFuel'],
  [s.status.forceDump, 'forceDump'],
  [s.status.translationModeOn, 'translationModeOn'],

  [s.engines.running[0], 'raptorN1Running'],
  [s.engines.running[1], 'raptorN2Running'],
  [s.engines.running[2], 'raptorN3Running'],
  [s.engines.failed[0], 'raptorN1Fail'],
  [s.engines.failed[1], 'raptorN2Fail'],
  [s.engines.failed[2], 'raptorN3Fail'],

  [s.warnings.coldGasLow, 'coldGasLow'],
  [s.warnings.fuelLow, 'fuelLow'],
  [s.warnings.heatDamagedWarning, 'heatDamagedWarning'],
  [s.warnings.overPressureWarning, 'overPressureWarning'],
  [s.warnings.overGloadWarning, 'overGloadWarning'],

  [s.failures.crashed, 'crashed'],
  [s.failures.inFightBreakUp, 'inFightBreakUp'],
  [s.failures.coldGasRunOut, 'coldGasRunOut'],
  [s.failures.fuelRunOut, 'fuelRunOut'],
  [s.failures.heatDamaged, 'heatDamaged'],
  [s.failures.overPressure, 'overPressure'],
  [s.failures.overGload, 'overGload'],
  [s.failures.flippedOver, 'flippedOver'],
  [s.failures.randomFaliure, 'randomFaliure'],

  [s.autopilot.manualControlOn, 'manualControlOn'],
  [s.autopilot.pitchControl, 'pitchControl'],
  [s.autopilot.holdingPitch, 'holdingPitch'],
  [s.autopilot.pitchHoldOn, 'pitchHoldOn'],
  [s.autopilot.autoBoostBackOn, 'autoBoostBackOn'],
  [s.autopilot.boostBackinitCompleted, 'boostBackinitCompleted'],
  [s.autopilot.boostBackAeroDeceleration, 'boostBackAeroDeceleration'],
  [s.autopilot.boostBackDecelerationStageinitCompleted, 'boostBackDecelerationStageinitCompleted'],
  [s.autopilot.accelerationStageCompleted, 'accelerationStageCompleted'],
  [s.autopilot.boostbackDirection, 'boostbackDirection'],
  [s.autopilot.decelerationStageEstDuration, 'decelerationStageEstDuration'],
  [s.autopilot.finalXposPrediction, 'finalXposPrediction'],
  [s.autopilot.freeFallTimeRemainingPrediction, 'freeFallTimeRemainingPrediction'],
  [s.autopilot.autoLandOn, 'autoLandOn'],
  [s.autopilot.initVehicleConfigCompleted, 'initVehicleConfigCompleted'],
  [s.autopilot.landingSiteXpos, 'landingSiteXpos'],
  [s.autopilot.dualRaptorMode, 'dualRaptorMode'],
  [s.autopilot.trialRaptorMode, 'trialRaptorMode'],
  [s.autopilot.aeroDesentCompleted, 'aeroDesentCompleted'],
  [s.autopilot.bellyFlopTriggerAltitude, 'bellyFlopTriggerAltitude'],
  [s.autopilot.flipStageInitted, 'flipStageInitted'],
  [s.autopilot.flipCompleted, 'flipCompleted'],
  [s.autopilot.horizontalAdjustmentStageCompleted, 'horizontalAdjustmentStageCompleted'],
  [s.autopilot.horizontalAdjustmentStageInitted, 'horizontalAdjustmentStageInitted'],
  [s.autopilot.finalDesentStageInitted, 'finalDesentStageInitted'],
  [s.autopilot.finalDesentStageCompleted, 'finalDesentStageCompleted'],
  [s.autopilot.autoMaxThrustOn, 'autoMaxThrustOn'],
  [s.autopilot.autoTakeOffOn, 'autoTakeOffOn'],
  [s.autopilot.autoTakeOffInited, 'autoTakeOffInited'],
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
    expect(FIELDS.length).toBeGreaterThanOrEqual(118);
  });
});

describe('fields the port deliberately reshapes', () => {
  it('pitchRecord keeps the [Infinity, Infinity] seed', () => {
    expect(s.kinematics.pitchRecord).toEqual([Infinity, Infinity]);
    expect(legacy['pitchRecord']).toEqual([Infinity, Infinity]);
  });

  it('the three per-engine booleans become arrays', () => {
    // 2021 had raptorN1Running/N2/N3 as separate globals. Same values, one field.
    expect(s.engines.running).toEqual([false, false, false]);
    expect(s.engines.failed).toEqual([false, false, false]);
  });

  it('ignitionCountdown has no legacy counterpart — it replaces setTimeout', () => {
    // switches.js ran ignition on a wall-clock timer. There is nothing in the
    // legacy state to compare against; the field exists so M1.4 can tick it by dt.
    expect(s.engines.ignitionCountdown.every(Number.isNaN)).toBe(true);
    expect(legacy['ignitionCountdown']).toBeUndefined();
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
      expect(legacy[name], name).toBeUndefined();
    }
  });
});
