/** Phase8: import-only historical dependency routing; preserved numerical body unchanged. */
/** Shipped constructor from934d3cd. Original state.ts SHA256: 5eff1cd10eb3623899d7dd9aa94112e4a9ea9b34c214c1fc2c7dc02ba200d749
 * Constructor physics copied unchanged; imports adjusted, interfaces supplied
 * by current state.ts. Phase8 adds damage:null solely as an explicit historical
 * schema adapter; no original numeric field is changed. */
import * as C from '$core/constants';
import { updateVehicleInFlightMaxArea } from './ship-aero';
import { circularOrbitalSpeed } from '$core/physics/gravity';
import { createRng } from '$core/rng';
import { rad } from '$core/units';
import { DEFAULT_SEED, type SimState } from '$core/state';
export function createInitialState(seed = DEFAULT_SEED): SimState {
  const altitude = C.vehicleHeight / 2;
  const distanceToPlanetCenter = C.planetRadius + altitude;

  return {
    damage: null,
    rng: createRng(seed),

    world: {
      environmentTime: 0,
      timeSpent: 0,
      updatedFrameCount: 0,
      wind: 0,
      gust: 0,
      gustVertical: 0,
      turbulenceU: 0,
      turbulenceW1: 0,
      turbulenceW2: 0,
    },

    atmosphere: {
      airDensity: 0,
      airPressure: 0,
      airTemperature: 0,
    },

    kinematics: {
      altitude,
      downRangeDistance: C.starBaseXPos,
      downRangeDistanceNextFrame: C.starBaseXPos,
      distanceToPlanetCenter,
      orbitalVelocityAtCurrentAltitude: circularOrbitalSpeed(distanceToPlanetCenter),

      trueSpeed: 0,
      speedX: 0,
      speedY: 0,
      machSpeed: 0,

      accelerationX: 0,
      accelerationY: 0,
      totalAcceleration: Math.sqrt(0 ** 2 + (-C.gravity) ** 2),

      pitch: rad(0),
      pitchRateOfChange: 0,
      pitchRecord: [Infinity, Infinity],

      angularVelocity: 0,
      angularAcceleration: 0,

      angleOfMotion: rad(0),
      angleOfAttack: rad(0),
      angleInToTheWind: rad(0),
    },

    forces: {
      thrust: 0,
      thrustAcceleration: 0,
      // Schema-only paid-observation adapter; damage:null retains historical math.
      paidThrustAccelerationX: 0,
      paidThrustAccelerationY: 0,
      offAxisThrustDifferenceAcceleration: 0,
      twr: 0,

      thrustVectorForce: 0,
      thrustVectorAcceleration: 0,

      rcsThrust: 0,
      rcsThrustAngularAcceleration: 0,

      angularDragAcceleration: 0,

      crossSectionalArea: 100,
      aerodynamicDrag: 0,
      aerodynamicLift: 0,
      aerodynamicDragAcceleration: 0,
      aerodynamicLiftAcceleration: 0,

      frontFinDrag: 0,
      aftFinDrag: 0,
      frontFinDragAngularAcceleration: 0,
      aftFinDragAngularAcceleration: 0,

      // M2.3, Bug fix. initControlSurface() wrote `area * sin(...)` here - an
      // area - while physics.js writes a bare `sin(...)` every step, and
      // getFrontFinDrag multiplies by the fin's area separately. The two forms
      // disagree by the fin area itself: 24.2x front, 45.8x aft.
      //
      // Derived through the same function step() uses, so construction and
      // simulation cannot drift apart again. At spawn the fins are retracted
      // and sin(0) = 0, so both forms agreed and the defect was latent - it
      // only bites a state that starts with fins deployed, which is exactly
      // what the flight editor (M4.4) and any save/restore produce.
      frontFinEffectiveAreaFraction: updateVehicleInFlightMaxArea(0, 0)
        .frontFinEffectiveAreaFraction,
      aftFinEffectiveAreaFraction: updateVehicleInFlightMaxArea(0, 0).aftFinEffectiveAreaFraction,

      thermalPower: 0,
      surfaceTemperature: 0,
      dynamicPressure: 0,

      perceivedG: 0,
      perceivedG_X: 0,
      perceivedG_Y: 0,
    },

    vehicle: {
      vehicleMass: C.vehicleMass,
      propellantMass: C.propellantMass,
      vehicleMomentOfInertia: C.vehicleMomentOfInertia,
      vehicleInFlightMaxArea: C.vehicleInFlightMaxArea,

      throttle: 100,
      throttleCurrent: 100,

      gimbalPosition: 0,
      gimbalPointingDirection: rad(0),

      frontFinExtension: 0,
      aftFinExtension: 0,

      rcsRunTimeRemaining: C.rcsRunTimeRemaining,
    },

    engines: {
      running: C.RAPTORS.map(() => false),
      failed: C.RAPTORS.map(() => false),
      ignitionCountdown: C.RAPTORS.map(() => null),
    },

    status: {
      onTheGround: false,
      landed: false,
      rcsActive: false,
      finActive: false,
      finLocked: false,
      gearDown: false,
      dumpingFuel: false,
      forceDump: false,
      translationModeOn: true,
    },

    warnings: {
      coldGasLow: false,
      fuelLow: false,
      heatDamagedWarning: false,
      overPressureWarning: false,
      overGLoadWarning: false,
    },

    failures: {
      crashed: false,
      inFlightBreakUp: false,
      coldGasRunOut: false,
      fuelRunOut: false,
      heatDamaged: false,
      overPressure: false,
      overGLoad: false,
      flippedOver: false,
      randomFailure: false,
    },

    autopilot: {
      manualControlOn: false,
      rcsThrustCommand: 0,
      pitchControl: 0,

      holdingPitch: rad(0),
      pitchHoldOn: false,

      autoBoostBackOn: false,
      boostBackInitCompleted: false,
      boostBackAeroDeceleration: true,
      boostBackDecelerationStageInitCompleted: false,
      boostBackDecelerationCheckCountdown: null,
      accelerationStageCompleted: false,
      boostBackDirection: 0,
      decelerationStageEstDuration: 0,

      autoDeorbitOn: false,
      deorbitInitCompleted: false,
      deorbitBurnStarted: false,
      deorbitBurnCompleted: false,
      deorbitTargetSpeed: undefined,

      autoLandOn: false,
      initVehicleConfigCompleted: false,
      landingSiteXPos: C.starBaseXPos,

      aeroDescentCompleted: false,
      fineTunePercentage: undefined,

      bellyFlopTriggerAltitude: 0,
      flipStageInitialised: false,
      flipCompleted: false,

      horizontalAdjustmentStageCompleted: false,
      horizontalAdjustmentStageInitialised: false,
      horizontalAdjustmentTimeLeft: undefined,
      horizontalAdjustmentDesiredSpeed: undefined,
      effectiveVerticalMaxThrust: undefined,

      finalStagePessimisticAltitude: undefined,
      finalDescentStageInitialised: false,
      distanceToGround: undefined,
      finalDescentStageCompleted: false,

      autoMaxThrustOn: false,
      autoTakeOffOn: false,
      autoTakeOffInitialised: false,

      horizontalAdjustmentVerticalSpeedLimit: C.horizontalAdjustmentVerticalSpeedLimit,
      horizontalAdjustmentHorizontalSpeedLimit: C.horizontalAdjustmentHorizontalSpeedLimit,

      demoAutoLandOn: false,

      horizontalAccelerationByAeroBreakingCorrectionAngle: rad(0),
    },
  };
}
