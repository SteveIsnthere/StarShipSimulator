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
 * 200 km. M2.6 replaced it with -GM*r_hat/r^2, shipped unconditionally at
 * M2.10; the constant survives only where 2021 used it as a unit — TWR, felt
 * g, and the add-back in getVerticalAcceleration.
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

/**
 * m — the nose radius used by the Sutton-Graves heating correlation.
 *
 * Added in M2.2. `getReentryHeatPower(vehicleNoseRadius)` has always wanted a
 * radius; every 2021 call site passed `crossSectionalArea` instead, an area in
 * m^2. Starship is 9 m across, so the radius is 4.5 m.
 */
export const NOSE_RADIUS = vehicleDiameter / 2;
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
/** Fraction, 0..1. The rate with random failures off. */
export const raptorIgnitionFailureRate = 0;

/**
 * Fraction, 0..1 — the rate the menu's RandomFailure toggle selects.
 *
 * switches.js:254 assigned `raptorIgnitionFaliureRate = 0.1` when the toggle
 * went on and 0 when it went off. In v2 the rate is not reassignable — it is
 * chosen per draw from `status.randomFailure`, so `step()` stays pure and a
 * fixture cannot be ambiguous about which rate produced it.
 */
export const RANDOM_IGNITION_FAILURE_RATE = 0.1;

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
/**
 * Arbitrary thermal units, compared against thermalPower. M2.9(a), Bug-fix tier.
 *
 * WHY THIS IS NOT 55. The 2021 value was tuned against a model that was wrong
 * in two ways this rebuild fixed. M2.1 wired in the upper stratosphere, making
 * the air above 40 km several times denser than the isotherm claimed. M2.2
 * passed a nose radius to the Sutton-Graves correlation where 2021 passed a
 * cross-sectional area — the correlation divides by a radius in metres, and an
 * area of 63-500 m^2 is not one, so the old numbers were smaller by
 * sqrt(area / radius) and in units that meant nothing. `thermalPower` after
 * those fixes is a different quantity expressed on a different scale; keeping
 * the number that indexed the old one would be keeping a coincidence.
 *
 * THE RULE, chosen by the owner: preserve the 2021 MARGIN. Not the number, and
 * not a hand-picked difficulty — the ratio of peak heating to the limit that
 * the 2021 build actually flew the Re-entry preset with.
 *
 * THE MEASUREMENT, re-derived on every test run by
 * tests/parity/heat-margin.test.ts, which flies the preset on BOTH
 * implementations — the frozen 2021 tree executing in a VM, and v2:
 *
 *     2021 peak on Re-entry     34.7414 units      (against its limit of 55)
 *     2021 margin               34.7414 / 55  =  0.6317
 *     v2 peak on Re-entry      245.9079 units
 *     limit preserving it      245.9079 / 0.6317  =  389.30
 *
 * Rounded DOWN to 389, so the recalibration can never grant more headroom than
 * 2021 had: v2 flies the preset at 0.6321 of its limit where 2021 flew it at
 * 0.6317 of its own. The preset is as survivable as it was, and no more.
 *
 * IT HAS MOVED ONCE, and the movement is the point of deriving it rather than
 * picking it. M2.9(a) measured 391.80 and shipped 390; M2.11 (the dead RCS
 * command) took the measurement to 391.47, which rounding absorbed; M2.12 (the
 * doubled tangential term) took it to 389.30, which rounding did not. Each time
 * the rule — preserve 2021's margin — decided, rather than anyone's taste.
 */
export const heatLimit = 389;

// ---------------------------------------------------------------------------
// Deorbit targeting — M2.9(c). New in v2; 2021 had no orbital autopilot.
// ---------------------------------------------------------------------------

/**
 * m/s — how much downrange speed the deorbit burn removes.
 *
 * The single knob that sets how steep the entry is, and therefore how hot.
 * Sutton-Graves heating goes as sqrt(density) * v^3, so a bigger burn does not
 * simply trade fuel for accuracy: it drops the perigee further, the vehicle
 * meets thick air while still fast, and the peak climbs. Measured from 150 km
 * circular, flown open-loop to touchdown:
 *
 *      dV     peak heat    range from burn to touchdown
 *      50        271           13 220 km
 *     100        287            7 807 km
 *     150        308            6 195 km
 *     200        324            5 314 km
 *     300        346            4 319 km
 *
 * 150 m/s is the compromise: 308 units is 79% of `heatLimit`, leaving real
 * margin for a hotter-than-nominal entry, and 6195 km of lead is short enough
 * that a coasting orbit reaches the firing point without a long wait.
 */
export const DEORBIT_DELTA_V = 150;

/**
 * m — ground-track distance to the landing site at which the burn starts.
 *
 * CALIBRATED, not derived. Predicting this analytically would mean solving the
 * transfer ellipse and then the entire atmospheric descent, including whatever
 * autoLand's aero-descent steering decides to do on the way down. The
 * simulation is deterministic, so it is cheaper and far more honest to fly it
 * and measure — which is what `tests/core/orbit-demo.test.ts` does on every
 * run, flying the closed loop from the Deorbit preset and asserting where it
 * touches down.
 *
 * THE CALIBRATION. The response is not slope-1: measured dMiss/dLead is about
 * -1.53, because autoLand amplifies whatever offset it is handed. A secant
 * search over the closed loop converges in a handful of flights.
 *
 * AND IT IS A FITTED CONSTANT, which is a real limitation worth stating rather
 * than burying. It is right for the flight it was fitted to. Measured: flown
 * from the Deorbit preset it lands within metres; flown from a hand-circularised
 * Circularize preset — same orbit, but 318 t at ignition instead of 420 t — the
 * vacuum arc is ~200 km longer, because a lighter vehicle finishes its burn
 * sooner and starts its fall from a different point on a slightly different
 * ellipse. A constant cannot know that.
 */
export const DEORBIT_LEAD_DISTANCE = 5_891_000;
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

/**
 * rad/s — the angular rate below which pitchHold re-latches its target attitude.
 *
 * Added in M2.4. autoPilotModes.js:8 gates on
 * `Math.abs(pitchRateOfChange) < 0.4`, but that quantity was
 * `dPitch * dt * 3600` — correct only at exactly 60 fps. At the 60 fps
 * reference the gate fired at 0.4 rad/s, so the NUMBER is unchanged; what
 * changed is that it now means 0.4 rad/s at every frame rate, rather than
 * 0.1 rad/s at 30 fps and 1.6 rad/s at 120 fps.
 */
export const PITCH_HOLD_RATE_THRESHOLD = 0.4;

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
