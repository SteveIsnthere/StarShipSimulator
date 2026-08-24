/**
 * Every constant from backend/initBackEnd.js, values verbatim.
 *
 * Verbatim includes the misspellings — `raptorIgnitionFailureRate`,
 * `throttleLowerLimit`, `frontFinSurfaceArea`, `gimbalAngleLimit`,
 * `integralOfRCubedTimesDx`. Porting diffs stay line-by-line comparable against
 * the 2021 tree until goldens lock behaviour; the mechanical rename is M1.10,
 * with its mapping table at docs/RENAME-MAP.md.
 *
 * tests/parity/constants.test.ts executes the legacy file in a VM and asserts
 * every value here matches it exactly, so "verbatim" is checked, not claimed.
 *
 * Derived values are written as the same expressions the legacy file uses, in
 * the same order, rather than as pre-computed literals: floating point is not
 * associative and the goldens will see any reordering.
 */
import { deg, rad, toRad, type Rad } from './units';

// ---------------------------------------------------------------------------
// World — initWorld()
// ---------------------------------------------------------------------------

/** m */
export const planetRadius = 6400000;
/** m */
export const planetCircumference = 2 * planetRadius * Math.PI;
/** kg */
export const planetMass = 5.972e24;
/** s */
export const planetTimeToRotate = 24 * (60 * 60);
/** m/s */
export const planetLinearVelocity = planetCircumference / planetTimeToRotate;

/** m^3 kg^-1 s^-2 */
export const gravitationalConstant = 6.674e-11;

/**
 * m/s^2. Constant everywhere in the 2021 model — 4.0% high at 100 km, 7.2% at
 * 200 km. M2.6 replaces this with -GM*r_hat/r^2 behind a fidelity flag.
 */
export const gravity = 9.807;
/** Lumped drag coefficient, dimensionless. */
export const airResistance_k = 250;

/**
 * m/s. Constant in the 2021 model. The real value at 11 km is ~295 m/s, so Mach
 * runs ~14% low through the whole upper atmosphere. M2.7 makes it sqrt(gamma*R*T).
 */
export const speedOfSound = 343;

/** m — the launch and landing site, at half a circumference. */
export const starBaseXPos = planetCircumference / 2;

// ---------------------------------------------------------------------------
// Vehicle size and mass — initSize_Weight()
// ---------------------------------------------------------------------------

/** m */
export const vehicleHeight = 50;
/** m */
export const vehicleDiameter = 9;

/** m^2 — broadside. */
export const vehicleMaxArea = vehicleDiameter * vehicleHeight;
/** m^2 — nose-on. */
export const vehicleMinArea = Math.PI * (vehicleDiameter / 2) ** 2;
/** m^2 */
export const vehicleInFlightMaxArea = vehicleMaxArea;

/** kg */
export const vehicleDryMass = 120000;
/** kg */
export const propellantMass = 350000;
/** kg — wet mass at spawn. */
export const vehicleMass = vehicleDryMass + propellantMass;

/** kg/s */
export const dumpRate = 3500;
/** kg */
export const dumpLimit = 12000;

/** kg*m^2 — solid cylinder about its centre, computed at wet mass. */
export const vehicleMomentOfInertia =
  (vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + (vehicleMass * vehicleHeight ** 2) / 12);

/** m^4 — precomputed integral used by the angular drag term. */
export const integralOfRCubedTimesDx = 97656;

// ---------------------------------------------------------------------------
// Engines — initEngine()
// ---------------------------------------------------------------------------

/**
 * ms. Mean Raptor ignition delay. In 2021 this drove a wall-clock setTimeout in
 * switches.js and was divided by timeAccel twice: the real wait shrank with
 * timeAccel^2, and since the sim ran timeAccel times faster, engines lit
 * timeAccel times early in simulated terms — 0.75 s becoming 0.1875 s at 4x
 * warp. M1.4 makes it a dt-ticked field in SimState.
 */
export const raptorIgnitionTimeMean = 600;
/** Fraction, 0..1. */
export const raptorIgnitionFailureRate = 0;

/** % */
export const throttleUpperLimit = 100;
/** % */
export const throttleLowerLimit = 40;
/** %/s */
export const throttleSpeed = 60;

/** m — lateral engine offsets from the vehicle centreline. */
export const raptorOffsetFromCenter = 1;
export const raptorN1offAxis = -raptorOffsetFromCenter;
export const raptorN2offAxis = raptorOffsetFromCenter / 2;
export const raptorN3offAxis = raptorOffsetFromCenter / 2;

/** Dimensionless — fraction of each engine's thrust acting off-axis. */
export const raptorN1offAxisForceFraction =
  -raptorN1offAxis / Math.sqrt(raptorN1offAxis ** 2 + (vehicleHeight / 2) ** 2);
export const raptorN2offAxisForceFraction =
  -raptorN2offAxis / Math.sqrt(raptorN2offAxis ** 2 + (vehicleHeight / 2) ** 2);
export const raptorN3offAxisForceFraction =
  -raptorN3offAxis / Math.sqrt(raptorN3offAxis ** 2 + (vehicleHeight / 2) ** 2);

/** m */
export const engineDistanceFromCenterOfMass = 21.8;

/** %/s */
export const gimbalSpeed = 600;
/** rad */
export const gimbalAngleLimit: Rad = toRad(deg(15));

/** N per engine. */
export const maxThrustPerRaptor = 2200 * 1000;
/** kg/s per engine, scaled off the reference 2.2 MN Raptor. */
export const maxFuelFlowPerRaptor = 650 * (maxThrustPerRaptor / 2200000);

// ---------------------------------------------------------------------------
// Control surfaces — initControlSurface()
// ---------------------------------------------------------------------------

/** N */
export const rcsMaxThrust = 800000;
/** m */
export const rcsThrustDistanceFromCenterOfMass = 20;
/** s */
export const rcsRunTimeRemaining = 25;

/** rad — full fin deflection. Stored as a bare number in 2021, not via getRad. */
export const finActuationMaxAngle: Rad = rad(1.03);

/** %/s */
export const finActuationSpeed = 120;

/** m^2 */
export const frontFinSurfaceArea = 24.2;
/** m */
export const frontFinDistanceFromCenterOfMass = 23.3;
/** m^2 */
export const aftFinSurfaceArea = 45.8;
/** m */
export const aftFinDistanceFromCenterOfMass = 12.6;
/** m^2 */
export const totalFinSurfaceArea = frontFinSurfaceArea + aftFinSurfaceArea;

/** Dimensionless. */
export const finDragCoefficient = 2;

// ---------------------------------------------------------------------------
// Vehicle limits — initVehicleLimit()
// ---------------------------------------------------------------------------

/** g */
export const gLimit = 13;
/** Arbitrary thermal units, compared against thermalPower. */
export const heatLimit = 55;
/** psi */
export const dynamicPressureLimit = 50;
/** rad */
export const touchDownPitchLimit = 0.09;
/** m/s */
export const touchDownSpeedLimit = 10;

// ---------------------------------------------------------------------------
// Autopilot tuning — initAutoPilotParams() and friends
// ---------------------------------------------------------------------------

/** m */
export const initAutoLandXPosDiffThreshold = 500;
/** m */
export const propulsiveCorrectionMinHeight = 5000;
/** m */
export const propulsiveCorrectionAccuracyRequired = propulsiveCorrectionMinHeight * 0.05;
/** m/s^2 */
export const decelerationStageHorizontalAcc = gravity * 1.6;

/** Engine count used for the pessimistic final-descent thrust estimate. */
export const autoLandFinalStageEngineCount = 1;
/** N */
export const finalStagePessimisticAvailableThrust =
  autoLandFinalStageEngineCount * maxThrustPerRaptor;
/** N */
export const finalStagePessimisticAvailableThrustDualRaptorMode =
  finalStagePessimisticAvailableThrust * 2;
/** N */
export const finalStagePessimisticAvailableThrustTrialRaptorMode =
  finalStagePessimisticAvailableThrust * 3;

export const flipStageEngineCount = 1;
/** N — at the lower throttle limit. */
export const flipStagePessimisticAvailableThrust =
  flipStageEngineCount * maxThrustPerRaptor * throttleLowerLimit * 0.01;

/** rad */
export const aeroDescentMaxCorrectionAngle: Rad = toRad(deg(3));
/** Dimensionless. */
export const fineTuneMultiplier = 2;
/** m/s */
export const fineTuneMaxSpeed = 5;

/** rad */
export const flipGoalAngle: Rad = toRad(deg(10));
/** m */
export const flipInducedXPosChange = 100;

/** rad */
export const adjustmentMaxAngle: Rad = toRad(deg(20));
/** s */
export const horizontalAdjustmentDurationEstimateSingleEngine = 5.5;
/** s */
export const horizontalAdjustmentDurationEstimate =
  horizontalAdjustmentDurationEstimateSingleEngine;
/** s */
export const horizontalAdjustmentDurationEstimateDualRaptorMode =
  horizontalAdjustmentDurationEstimate * 1.5;
/** s */
export const horizontalAdjustmentDurationEstimateTrialRaptorMode =
  horizontalAdjustmentDurationEstimate * 2;
/** m/s */
export const horizontalAdjustmentHorizontalSpeedLimit = 5;
/** m/s */
export const horizontalAdjustmentVerticalSpeedLimit = -30;

/** m */
export const noSteeringHeight = 5;

/** rad — angle of motion targets during ascent. */
export const aomAt_25km: Rad = toRad(deg(55));
/** rad */
export const aomAt_80km: Rad = toRad(deg(85));

/** rad */
export const aeroBreakingMaxCorrectionAngle: Rad = rad(Math.PI * 0.5);
/** m/s^2 */
export const aeroBreakingFineTuneThreshold = 0.5;
/** rad/s */
export const aeroBreakingAdjDegreePerSec: Rad = toRad(deg(30));

// ---------------------------------------------------------------------------
// Data recorder — initDataRecorder()
// ---------------------------------------------------------------------------

/** Frames between black-box samples. */
export const recordTimeInterval = 5;

// ---------------------------------------------------------------------------
// Reference frame rate
// ---------------------------------------------------------------------------

/**
 * Hz. The 2021 model's reference frame rate. Several per-frame rates were derived
 * by dividing a per-second rate by this, which is why the sim ran at a different
 * speed on a different device. The v2 loop is fixed-dt (M1.11); this constant
 * survives only where a ported formula still references it, and M2.4 removes the
 * last frame-rate dependency from the physics.
 */
export const frameRate = 60;
