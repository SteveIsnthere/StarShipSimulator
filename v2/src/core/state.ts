/**
 * SimState — the complete simulation state, in one plain object.
 *
 * In 2021 this was 355 assignments to `globalThis`. Making it a value is what
 * lets `step(state, dt, input)` be pure, what lets golden fixtures exist, and
 * what lets the sim run in Node with no browser.
 *
 * Rules for this file:
 *   - Every field carries its unit in JSDoc. SI throughout; angles use the
 *     branded Rad type from ./units so degrees cannot be passed by mistake.
 *   - Names are the 2021 names, misspellings included (`gimbolPosition`,
 *     `presisionAlignment`, `raptorN1Fail`). Porting diffs stay line-by-line
 *     comparable until goldens lock behaviour; M1.10 renames mechanically with
 *     a mapping table at docs/RENAME-MAP.md.
 *   - No methods. State is data; behaviour lives in step.ts and physics/.
 */
import * as C from './constants';
import { createRng, type RngState } from './rng';
import { rad, type Rad } from './units';

/** Which of the three Raptors a field refers to. Indices 0..2 are N1..N3. */
export type RaptorIndex = 0 | 1 | 2;

// ---------------------------------------------------------------------------

export interface WorldState {
  /** s — simulated time since the scenario began. */
  environmentTime: number;
  /** s — simulated time the vehicle has been in this run. */
  timeSpent: number;
  /** Steps taken. Was `updatedFrameCount`, a frame counter, in 2021. */
  updatedFrameCount: number;
  /** m/s — steady horizontal wind. */
  wind: number;
  /** m/s — gust component on top of `wind`. */
  gust: number;
}

export interface AtmosphereState {
  /** kg/m^3 — at the vehicle's current altitude. */
  airDensity: number;
  /** kPa. */
  airPressure: number;
  /**
   * deg C. An implicit global in 2021 — physics.js assigned it inside
   * updateAtmosphere() and initBackEnd() never declared it, so it was undefined
   * until the first step.
   */
  airTemperature: number;
}

export interface KinematicsState {
  /** m — above ground level. */
  altitude: number;
  /** m — arc position along the planet's surface. */
  downRangeDistance: number;
  /** m — `downRangeDistance` after the pending step; 2021 kept both. */
  downRangeDistanceNextFrame: number;
  /** m — from the planet's centre. */
  distanceToPlanetCenter: number;
  /**
   * m/s — circular orbital velocity at the current altitude.
   * In 2021 this was assigned once at init (initBackEnd.js:50) and never updated,
   * so the orbital relief term used a stale denominator for the whole flight.
   * M2.6 removes the term entirely in favour of real planet-centered gravity.
   */
  orbitalVelocityAtCurrentAltitude: number;

  /** m/s — magnitude of the velocity vector. */
  trueSpeed: number;
  /** m/s — downrange component. */
  speedX: number;
  /** m/s — vertical component, positive up. */
  speedY: number;
  /** Dimensionless — trueSpeed / speedOfSound. */
  machSpeed: number;

  /** m/s^2 — downrange. */
  accelerationX: number;
  /** m/s^2 — vertical, positive up. */
  accelerationY: number;
  /** m/s^2 — magnitude. */
  totalAcceleration: number;

  /** rad — vehicle attitude. 0 is nose-up. */
  pitch: Rad;
  /**
   * rad/s — d(pitch)/dt.
   * In 2021 this was `pitchDiff / renderTimeInterval * 3600`, correct only at
   * exactly 60 fps and 4x high at 30 fps, which made the autopilot's pitchHold
   * gate device-dependent. M2.4 makes it dpitch/dt.
   */
  pitchRateOfChange: number;
  /** rad — the last two pitch samples, newest last. Seeded with Infinity. */
  pitchRecord: [number, number];

  /** rad/s. */
  angularVelocity: number;
  /** rad/s^2. */
  angularAcceleration: number;

  /** rad — direction of travel. */
  angleOfMotion: Rad;
  /** rad — between the nose and the velocity vector. */
  angleOfAttack: Rad;
  /** rad — between the nose and the relative wind. */
  angleInToTheWind: Rad;
}

export interface ForcesState {
  /** N — total from running engines at current throttle. */
  thrust: number;
  /** m/s^2. */
  thrustAcceleration: number;
  /** m/s^2 — from asymmetric thrust across the three engines. */
  offAxisThrustDifferenceAcceleration: number;
  /** Dimensionless — thrust-to-weight ratio. */
  twr: number;

  /** N — component from gimbal deflection. */
  thrustVectorForce: number;
  /** rad/s^2. */
  thrustVectorAcceleration: number;

  /** N. */
  rcsThrust: number;
  /** rad/s^2. */
  rcsThrustAngularAcceleration: number;

  /** rad/s^2 — aerodynamic damping of rotation. */
  angularDragAcceleration: number;

  /** m^2 — presented to the airflow, between vehicleMinArea and vehicleMaxArea. */
  crossSectionalArea: number;
  /** N. */
  aerodynamicDrag: number;
  /** N. */
  aerodynamicLift: number;
  /** m/s^2. */
  aerodynamicDragAcceleration: number;
  /**
   * m/s^2. Also an implicit global in 2021: first assigned at
   * updateBackEnd.js:119, never initialised. The lift ladders read it, so on
   * frame one they multiplied by undefined and produced NaN.
   */
  aerodynamicLiftAcceleration: number;

  /** N — front fin. */
  frontFinDrag: number;
  /** N — aft fin. */
  aftFinDrag: number;
  /** rad/s^2. */
  frontFinDragAngularAcceleration: number;
  /** rad/s^2. */
  aftFinDragAngularAcceleration: number;

  /**
   * m^2 — front fin area actually presented, = area * sin(maxAngle * extension%).
   * Named "Fraction" but holds an area. In 2021 it was *initialised* as an area
   * and then recomputed as one, so the name is simply wrong rather than the
   * value; M2.3 addresses the related init-order defect.
   */
  frontFinEffectiveAreaFraction: number;
  /** m^2 — aft fin, same story. */
  aftFinEffectiveAreaFraction: number;

  /** Arbitrary thermal units, compared against `heatLimit`. */
  thermalPower: number;
  /** psi. */
  dynamicPressure: number;

  /** g — total felt acceleration. */
  perceivedG: number;
  /** g — downrange component. */
  perceivedG_X: number;
  /** g — vertical component. */
  perceivedG_Y: number;
}

export interface VehicleState {
  /** kg — dry mass plus remaining propellant. */
  vehicleMass: number;
  /** kg — propellant remaining. */
  propellantMass: number;
  /** kg*m^2 — recomputed as mass changes. */
  vehicleMomentOfInertia: number;
  /** m^2 — max area presented in the current configuration. */
  vehicleInFlightMaxArea: number;

  /** % — commanded throttle, 0..100. */
  throttle: number;
  /** % — actual throttle, slews toward `throttle` at `throttleSpeed`. */
  throttleCurrent: number;

  /** % of `gimbolAngleLimit`, -100..100. Misspelled in 2021; renamed at M1.10. */
  gimbolPosition: number;
  /** rad — resulting deflection. */
  gimbolPointingDirection: Rad;

  /** % — 0..100. */
  frontFinExtention: number;
  /** % — 0..100. */
  aftFinExtention: number;

  /** s — cold gas remaining for RCS. */
  rcsRunTimeRemaining: number;
}

export interface EngineState {
  /** Whether each Raptor is commanded on. */
  running: [boolean, boolean, boolean];
  /** Whether each Raptor has failed. */
  failed: [boolean, boolean, boolean];
  /**
   * s — time remaining before each commanded engine actually lights.
   * NaN means "not igniting". This replaces the 2021 wall-clock setTimeout in
   * switches.js, which was divided by timeAccel twice and so lit engines 16x
   * early at 4x warp. Ticked by dt in step(), so warp is exact by construction.
   */
  ignitionCountdown: [number, number, number];
}

export interface StatusState {
  onTheGround: boolean;
  landed: boolean;
  rcsActive: boolean;
  finActive: boolean;
  finLocked: boolean;
  gearDown: boolean;
  dumpingFuel: boolean;
  forceDump: boolean;
  translationModeOn: boolean;
}

export interface WarningState {
  coldGasLow: boolean;
  fuelLow: boolean;
  heatDamagedWarning: boolean;
  overPressureWarning: boolean;
  overGloadWarning: boolean;
}

export interface FailureState {
  crashed: boolean;
  inFightBreakUp: boolean;
  coldGasRunOut: boolean;
  fuelRunOut: boolean;
  heatDamaged: boolean;
  overPressure: boolean;
  overGload: boolean;
  flippedOver: boolean;
  randomFaliure: boolean;
}

export interface AutopilotState {
  manualControlOn: boolean;
  /** % — pitch command, -100..100. In 2021 this was read from a DOM slider
   * every frame (updateBackEnd.js:201); in v2 it arrives through the input arg. */
  pitchControl: number;

  /** rad — attitude pitchHold is holding. */
  holdingPitch: Rad;
  pitchHoldOn: boolean;

  autoBoostBackOn: boolean;
  boostBackinitCompleted: boolean;
  boostBackAeroDeceleration: boolean;
  boostBackDecelerationStageinitCompleted: boolean;
  accelerationStageCompleted: boolean;
  /** -1, 0 or 1. */
  boostbackDirection: number;
  /** s. */
  decelerationStageEstDuration: number;
  /** m — predicted touchdown position; Infinity until predicted. */
  finalXposPrediction: number;
  /** s — Infinity until predicted. */
  freeFallTimeRemainingPrediction: number;

  autoLandOn: boolean;
  initVehicleConfigCompleted: boolean;
  /** m. */
  landingSiteXpos: number;
  dualRaptorMode: boolean;
  trialRaptorMode: boolean;

  aeroDesentCompleted: boolean;
  /** Fraction, max 1. Undefined until the aero-descent stage runs. */
  fineTunePercentage: number | undefined;

  /** m. */
  bellyFlopTriggerAltitude: number;
  flipStageInitted: boolean;
  flipCompleted: boolean;

  horizontalAdjustmentStageCompleted: boolean;
  horizontalAdjustmentStageInitted: boolean;
  /** s — undefined until the stage is initialised. */
  horizontalAdjustmentTimeLeft: number | undefined;
  /** m/s — undefined until computed. */
  horizontalAdjustmentDesiredSpeed: number | undefined;
  /** N — undefined until computed. */
  effectiveVerticalMaxThrust: number | undefined;

  /** m — undefined until computed. */
  finalStagePessimisticAltitude: number | undefined;
  finalDesentStageInitted: boolean;
  /** m — undefined until computed. */
  distanceToGround: number | undefined;
  finalDesentStageCompleted: boolean;

  autoMaxThrustOn: boolean;
  autoTakeOffOn: boolean;
  autoTakeOffInited: boolean;

  /** rad — running aero-braking steering correction. */
  horizontalAccelerationByAeroBreakingCorrectionAngle: Rad;
}

/** The whole simulation, as one value. */
export interface SimState {
  /**
   * Seeded randomness. Counters live here rather than inside the generator so
   * that a SimState determines every future draw — that is what makes step()
   * pure and golden fixtures possible. See core/rng.ts.
   */
  rng: RngState;
  world: WorldState;
  atmosphere: AtmosphereState;
  kinematics: KinematicsState;
  forces: ForcesState;
  vehicle: VehicleState;
  engines: EngineState;
  status: StatusState;
  warnings: WarningState;
  failures: FailureState;
  autopilot: AutopilotState;
}

// ---------------------------------------------------------------------------

/**
 * Default RNG seed. Scenarios override it; goldens pin it. Arbitrary but fixed —
 * changing it changes every fixture, so it is a Bug-fix/Fidelity-tier decision.
 */
export const DEFAULT_SEED = 0x5741_4c4b;

/**
 * The spawn state, mirroring initBackEnd() field for field and in its order.
 *
 * The 2021 init order matters and is preserved: `altitude` is `vehicleHeight / 2`,
 * `distanceToPlanetCenter` derives from it, `orbitalVelocityAtCurrentAltitude`
 * from that, and `accelerationY` starts at -gravity rather than 0.
 */
export function createInitialState(seed = DEFAULT_SEED): SimState {
  const altitude = C.vehicleHeight / 2;
  const distanceToPlanetCenter = C.planetRadius + altitude;

  return {
    rng: createRng(seed),

    world: {
      environmentTime: 0,
      timeSpent: 0,
      updatedFrameCount: 0,
      wind: 0,
      gust: 0,
    },

    atmosphere: {
      airDensity: 0,
      airPressure: 0,
      airTemperature: 0,
    },

    kinematics: {
      altitude,
      downRangeDistance: C.starBaseXpos,
      downRangeDistanceNextFrame: C.starBaseXpos,
      distanceToPlanetCenter,
      orbitalVelocityAtCurrentAltitude: Math.sqrt(
        (C.gravitationalConstant * C.planetMass) / distanceToPlanetCenter,
      ),

      trueSpeed: 0,
      speedX: 0,
      speedY: 0,
      machSpeed: 0,

      accelerationX: 0,
      accelerationY: -C.gravity,
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

      // Verbatim from initControlSurface(): area * sin(maxAngle * extension * 0.01)
      // with extension 0, so both are 0 at spawn. See M2.3.
      frontFinEffectiveAreaFraction: C.frontFinSurfaceAera * Math.sin(C.finAcuationMaxAngle * 0 * 0.01),
      aftFinEffectiveAreaFraction: C.aftFinSurfaceAera * Math.sin(C.finAcuationMaxAngle * 0 * 0.01),

      thermalPower: 0,
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

      gimbolPosition: 0,
      gimbolPointingDirection: rad(0),

      frontFinExtention: 0,
      aftFinExtention: 0,

      rcsRunTimeRemaining: C.rcsRunTimeRemaining,
    },

    engines: {
      running: [false, false, false],
      failed: [false, false, false],
      ignitionCountdown: [NaN, NaN, NaN],
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
      overGloadWarning: false,
    },

    failures: {
      crashed: false,
      inFightBreakUp: false,
      coldGasRunOut: false,
      fuelRunOut: false,
      heatDamaged: false,
      overPressure: false,
      overGload: false,
      flippedOver: false,
      randomFaliure: false,
    },

    autopilot: {
      manualControlOn: false,
      pitchControl: 0,

      holdingPitch: rad(0),
      pitchHoldOn: false,

      autoBoostBackOn: false,
      boostBackinitCompleted: false,
      boostBackAeroDeceleration: true,
      boostBackDecelerationStageinitCompleted: false,
      accelerationStageCompleted: false,
      boostbackDirection: 0,
      decelerationStageEstDuration: 0,
      finalXposPrediction: Infinity,
      freeFallTimeRemainingPrediction: Infinity,

      autoLandOn: false,
      initVehicleConfigCompleted: false,
      landingSiteXpos: C.starBaseXpos,
      dualRaptorMode: false,
      trialRaptorMode: false,

      aeroDesentCompleted: false,
      fineTunePercentage: undefined,

      bellyFlopTriggerAltitude: 0,
      flipStageInitted: false,
      flipCompleted: false,

      horizontalAdjustmentStageCompleted: false,
      horizontalAdjustmentStageInitted: false,
      horizontalAdjustmentTimeLeft: undefined,
      horizontalAdjustmentDesiredSpeed: undefined,
      effectiveVerticalMaxThrust: undefined,

      finalStagePessimisticAltitude: undefined,
      finalDesentStageInitted: false,
      distanceToGround: undefined,
      finalDesentStageCompleted: false,

      autoMaxThrustOn: false,
      autoTakeOffOn: false,
      autoTakeOffInited: false,

      horizontalAccelerationByAeroBreakingCorrectionAngle: rad(0),
    },
  };
}
