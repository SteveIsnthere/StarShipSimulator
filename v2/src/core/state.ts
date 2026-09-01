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
 *   - Names are the 2021 names, misspellings included (`gimbalPosition`,
 *     `precisionAlignment`, `raptorN1Fail`). Porting diffs stay line-by-line
 *     comparable until goldens lock behaviour; M1.10 renames mechanically with
 *     a mapping table at docs/RENAME-MAP.md.
 *   - No methods. State is data; behaviour lives in step.ts and physics/.
 */
import * as C from './constants';
import { updateVehicleInFlightMaxArea } from './physics/aero';
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
   * m/s — circular orbital velocity at the current altitude, sqrt(GM/r).
   *
   * In 2021 this was assigned once at init (initBackEnd.js:50) and never
   * updated, because the only thing that read it was the orbital relief term's
   * denominator. That term is gone (M2.6, M2.10) and this is now recomputed
   * every step, so the HUD reads a number that means what it says.
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
  /**
   * rad/s^2 — the ROTATION from asymmetric thrust across the three engines.
   *
   * Corrected at M9.4; this said `m/s^2`. Two call sites settle it and they
   * agree: step.ts builds it with `getAngularAcceleration(force, distance,
   * momentOfInertia)`, which is a torque divided by an inertia, and then sums it
   * into `kinematics.angularAcceleration` beside five other rad/s^2 terms;
   * `precisionAlignment` subtracts it from a commanded angular acceleration as a
   * feed-forward. A linear acceleration in either place would be a units error
   * in the arithmetic rather than in the comment.
   *
   * The name is the source of the confusion and stays, per the naming policy:
   * the quantity it describes is an off-axis thrust DIFFERENCE, and what that
   * difference produces is a torque.
   */
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

  /**
   * m^2 — presented to the airflow.
   *
   * The unit is right; the RANGE this used to claim — "between vehicleMinArea
   * and vehicleMaxArea" — was not, and M9.4's arithmetic check is what caught
   * it. `getCrossSectionalArea` is
   * `|sin(aitw)| * vehicleInFlightMaxArea + |cos(aitw)| * vehicleMinArea / 2.1`,
   * so nose-on it returns `vehicleMinArea / 2.1` = 30.3 m^2, well BELOW
   * `vehicleMinArea` at 63.6. The `/ 2.1` is an unexplained 2021 tuning
   * constant that this port keeps; whatever it is for, it puts the floor a
   * factor of two under the geometric minimum.
   */
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
   * DIMENSIONLESS — `sin(finActuationMaxAngle * extension%)`, in 0..sin(1.03).
   *
   * Corrected at M9.4. This said `m^2` and described the field as holding an
   * area, which was true of the 2021 tree and has been false here since M2.3.
   * 2021 had two disagreeing definitions: `initControlSurface()` wrote
   * `area * sin(...)` and physics.js wrote a bare `sin(...)` every step, so the
   * field was an area for exactly one frame and a fraction thereafter. M2.3
   * fixed that by deriving BOTH from `updateVehicleInFlightMaxArea`, which
   * returns the bare sine — so the surviving definition is the fraction, the
   * name is right, and the unit annotation was the last piece still describing
   * the version that was removed.
   *
   * The arithmetic settles it in one line: `getFrontFinDrag` computes
   * `getDrag(rho, v, |sin(aitw)| * frontFinSurfaceArea, Cd) * this`. The fin's
   * area is already inside the drag term. If this were an area too, the result
   * would be newtons times square metres.
   */
  frontFinEffectiveAreaFraction: number;
  /** Dimensionless — aft fin, same expression and the same correction. */
  aftFinEffectiveAreaFraction: number;

  /**
   * A STAGNATION-POINT HEAT FLUX ON AN UNRESOLVED SCALE. Compared against
   * `heatLimit`, which is expressed on the same scale and derived from it.
   *
   * M9.4 audited this one and could not name its unit honestly, so it says so
   * rather than guessing. What IS established: `getReentryHeatPower` is the
   * Sutton-Graves correlation, `k * v^3 * sqrt(rho / R_nose)`, whose dimensions
   * are those of a heat flux; the shipped coefficient is 1.83e-7, and the
   * correlation is commonly published as `1.83e-8 * v^3 * sqrt(rho / R_n)` for
   * a result in W/cm^2 with v in m/s, rho in kg/m^3 and R_n in m. Same leading
   * digits, exponent larger by one. On that reading the value here is ten times
   * a flux in W/cm^2 — the re-entry preset peaks at 245.9 of these units, which
   * would be 24.6 W/cm^2, a plausible entry heat flux.
   *
   * What is NOT established is whether the extra factor of ten is a
   * transcription slip in the 2021 source or a deliberate scaling. The source
   * cannot settle it, and settling it would change physics — which this task,
   * bounded to comments, may not do. So the field is documented as what it
   * provably is (proportional to a stagnation heat flux) rather than given a
   * unit it may not have. `heatLimit` was re-derived against THIS scale at
   * M2.9(a), so the pair is internally consistent whatever the factor is.
   */
  thermalPower: number;
  /**
   * kPa — dynamic pressure.
   *
   * NOT PSI, and this line said psi until M9.4. One wrong word here has now
   * produced two shipped bugs a milestone apart, in two different layers, both
   * of them a constant written a thousand times too large by someone who read
   * it: `AERO_FULL_Q` at M8.3, so aerodynamic noise never rose, and
   * `SHAKE_FULL_Q` at M9.3, so the camera shake never fired in three
   * milestones of ascents.
   *
   * The arithmetic settles it. `getDynamicPressure` is
   * `airDensity * trueSpeed**2 * 0.0005`, which is one half of rho v^2 — pascals
   * — with a Pa-to-kPa conversion folded into the constant. It reads 101.3 on
   * the pad against a sea-level pressure of 101.325 kPa, and it peaks at
   * 23.6 on the launch golden and 28.6 on the RTLS, which is a textbook max-Q
   * in kilopascals. In psi those peaks would be 197 kPa, six times what any
   * launch vehicle survives; in pascals they would not move a leaf.
   */
  dynamicPressure: number;

  /**
   * Multiples of standard gravity, dimensionless — total felt acceleration.
   *
   * "g" is right and is kept in the two below; spelled out once here because
   * this is an acceleration DIVIDED by `gravity` rather than an acceleration
   * measured in some unit, and the difference matters to anything that scales
   * it. Compared against `gLimit`, which is on the same scale.
   */
  perceivedG: number;
  /** g — downrange component, `accelerationX / gravity`. */
  perceivedG_X: number;
  /** g — vertical component, `(accelerationY + gravity) / gravity`. */
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

  /** % of `gimbalAngleLimit`, -100..100. Misspelled in 2021; renamed at M1.10. */
  gimbalPosition: number;
  /** rad — resulting deflection. */
  gimbalPointingDirection: Rad;

  /** % — 0..100. */
  frontFinExtension: number;
  /** % — 0..100. */
  aftFinExtension: number;

  /** s — cold gas remaining for RCS. */
  rcsRunTimeRemaining: number;
}

export interface EngineState {
  /** Whether each Raptor is commanded on. */
  running: [boolean, boolean, boolean];
  /** Whether each Raptor has failed. */
  failed: [boolean, boolean, boolean];
  /**
   * s — time remaining before each commanded engine actually lights, or null
   * when that engine is not igniting.
   *
   * `null` rather than NaN as the sentinel: golden fixtures are JSON, and
   * JSON.stringify turns NaN into null anyway, so a NaN sentinel would not
   * survive a round trip through a fixture. Chosen here rather than discovered
   * in M1.8.
   *
   * This replaces the 2021 wall-clock setTimeout in switches.js, which divided
   * by timeAccel twice and so lit engines timeAccel times early in simulated
   * terms. Ticked by dt in step(), so warp is exact by construction.
   */
  ignitionCountdown: [number | null, number | null, number | null];
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
  overGLoadWarning: boolean;
}

export interface FailureState {
  crashed: boolean;
  inFlightBreakUp: boolean;
  coldGasRunOut: boolean;
  fuelRunOut: boolean;
  heatDamaged: boolean;
  overPressure: boolean;
  overGLoad: boolean;
  flippedOver: boolean;
  randomFailure: boolean;
}

export interface AutopilotState {
  manualControlOn: boolean;
  /** % — pitch command, -100..100. In 2021 this was read from a DOM slider
   * every frame (updateBackEnd.js:201); in v2 it arrives through the input arg. */
  pitchControl: number;

  /**
   * N — the RCS thrust the autopilot is asking for THIS step, signed; 0 when it
   * is not asking. M2.11.
   *
   * `precisionAlignment` writes it, `controlTranslation` consumes and clears it
   * in the same step. It exists so the proportional command has somewhere to
   * live that the yoke's bang-bang path cannot silently overwrite — which is
   * exactly what used to happen, and left the vehicle with no attitude control
   * below saturation. See tests/core/rcs-dead-zone.test.ts.
   */
  rcsThrustCommand: number;

  /** rad — attitude pitchHold is holding. */
  holdingPitch: Rad;
  pitchHoldOn: boolean;

  autoBoostBackOn: boolean;
  boostBackInitCompleted: boolean;
  boostBackAeroDeceleration: boolean;
  boostBackDecelerationStageInitCompleted: boolean;
  /**
   * s — countdown replacing autoPilotModes.js:118's
   * `setTimeout(..., 5000 / timeAccel)`, which checked whether aerodynamic
   * deceleration was actually working. null when not armed.
   *
   * Not a bug fix: 5000/timeAccel ms of real time at timeAccel speed-up is
   * exactly 5 s of simulated time, so this fires at the same simulated instant.
   * What changes is that it survives pause, is exact under warp, and replays.
   */
  boostBackDecelerationCheckCountdown: number | null;
  accelerationStageCompleted: boolean;
  /** -1, 0 or 1. */
  boostBackDirection: number;
  /** s. */
  decelerationStageEstDuration: number;
  /** m — predicted touchdown position; Infinity until predicted. */
  finalXPosPrediction: number;
  /** s — Infinity until predicted. */
  freeFallTimeRemainingPrediction: number;

  /**
   * M2.9(c) — the deorbit-targeting mode. New in v2; 2021 had nothing like it,
   * because orbit was structurally impossible under its gravity model.
   */
  autoDeorbitOn: boolean;
  deorbitInitCompleted: boolean;
  deorbitBurnStarted: boolean;
  deorbitBurnCompleted: boolean;
  /** m/s — downrange speed the retrograde burn is aiming for; undefined until it starts. */
  deorbitTargetSpeed: number | undefined;

  autoLandOn: boolean;
  initVehicleConfigCompleted: boolean;
  /** m. */
  landingSiteXPos: number;
  dualRaptorMode: boolean;
  trialRaptorMode: boolean;

  aeroDescentCompleted: boolean;
  /** Fraction, max 1. Undefined until the aero-descent stage runs. */
  fineTunePercentage: number | undefined;

  /** m. */
  bellyFlopTriggerAltitude: number;
  flipStageInitialised: boolean;
  flipCompleted: boolean;

  horizontalAdjustmentStageCompleted: boolean;
  horizontalAdjustmentStageInitialised: boolean;
  /** s — undefined until the stage is initialised. */
  horizontalAdjustmentTimeLeft: number | undefined;
  /** m/s — undefined until computed. */
  horizontalAdjustmentDesiredSpeed: number | undefined;
  /** N — undefined until computed. */
  effectiveVerticalMaxThrust: number | undefined;

  /** m — undefined until computed. */
  finalStagePessimisticAltitude: number | undefined;
  finalDescentStageInitialised: boolean;
  /** m — undefined until computed. */
  distanceToGround: number | undefined;
  finalDescentStageCompleted: boolean;

  autoMaxThrustOn: boolean;
  autoTakeOffOn: boolean;
  autoTakeOffInitialised: boolean;

  /**
   * m/s — vertical speed target during the horizontal-adjustment stage.
   *
   * A *mutable* copy of the constant. autoPilotModes.js:317 divides it by 1.5
   * (and doubles the horizontal limit) when fewer than three engines are lit.
   * In 2021 these were globals, so the adjustment persisted across flights
   * until the page was reloaded; here they live in SimState and reset with the
   * scenario. That is a behaviour difference, and a deliberate one — the old
   * behaviour was a leak between runs, not a design.
   */
  horizontalAdjustmentVerticalSpeedLimit: number;
  /** m/s — the horizontal counterpart, same story. */
  horizontalAdjustmentHorizontalSpeedLimit: number;

  /** utilities/welcome.js — the intro auto-landing demo is running. */
  demoAutoLandOn: boolean;

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
 * `distanceToPlanetCenter` derives from it, and `orbitalVelocityAtCurrentAltitude`
 * from that. 2021 started `accelerationY` at -gravity; since M11.3 a vehicle held
 * on the pad stores a net acceleration of zero (the ground cancels gravity, and
 * the HUD reads 1 g), so the spawn state starts there too rather than logging a
 * free-fall reading for one row.
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
      downRangeDistance: C.starBaseXPos,
      downRangeDistanceNextFrame: C.starBaseXPos,
      distanceToPlanetCenter,
      orbitalVelocityAtCurrentAltitude: Math.sqrt(
        (C.gravitationalConstant * C.planetMass) / distanceToPlanetCenter,
      ),

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
      running: [false, false, false],
      failed: [false, false, false],
      ignitionCountdown: [null, null, null],
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
      finalXPosPrediction: Infinity,
      freeFallTimeRemainingPrediction: Infinity,

      autoDeorbitOn: false,
      deorbitInitCompleted: false,
      deorbitBurnStarted: false,
      deorbitBurnCompleted: false,
      deorbitTargetSpeed: undefined,

      autoLandOn: false,
      initVehicleConfigCompleted: false,
      landingSiteXPos: C.starBaseXPos,
      dualRaptorMode: false,
      trialRaptorMode: false,

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

/**
 * Deep copy of a SimState.
 *
 * `step()` clones its input and mutates the copy. That is what makes the
 * function pure without forcing every line of ported physics to be rewritten in
 * an immutable style — the 2021 code assigns to fields, and keeping that shape
 * is what makes the port reviewable line by line against the original.
 *
 * Written out by hand rather than via structuredClone or a spread walk: this
 * runs once per step at up to 240 Hz, it is on the zero-allocation-sensitive
 * path, and an explicit copy is the only version a reader can verify covers
 * every field. A missed field would silently alias between states and corrupt
 * replay; tests/core/step.test.ts checks the copy is total.
 */
export function cloneState(s: SimState): SimState {
  return {
    rng: { seed: s.rng.seed, counters: { ...s.rng.counters } },
    world: { ...s.world },
    atmosphere: { ...s.atmosphere },
    kinematics: {
      ...s.kinematics,
      pitchRecord: [s.kinematics.pitchRecord[0], s.kinematics.pitchRecord[1]],
    },
    forces: { ...s.forces },
    vehicle: { ...s.vehicle },
    engines: {
      running: [...s.engines.running],
      failed: [...s.engines.failed],
      ignitionCountdown: [...s.engines.ignitionCountdown],
    },
    status: { ...s.status },
    warnings: { ...s.warnings },
    failures: { ...s.failures },
    autopilot: { ...s.autopilot },
  };
}

/**
 * Recompute the fields derived from fin extension.
 *
 * Anything that sets `frontFinExtension` or `aftFinExtension` on a state it did
 * not step - the flight editor, a save/restore, a test fixture - must call this,
 * or the fin areas describe the previous configuration. `step()` does it every
 * frame; this is the same computation for callers who build a state by hand.
 *
 * Exists because M2.3 was precisely the failure of construction and simulation
 * to agree on what these fields mean.
 */
export function syncDerivedFields(s: SimState): void {
  const fins = updateVehicleInFlightMaxArea(
    s.vehicle.frontFinExtension,
    s.vehicle.aftFinExtension,
  );
  s.forces.frontFinEffectiveAreaFraction = fins.frontFinEffectiveAreaFraction;
  s.forces.aftFinEffectiveAreaFraction = fins.aftFinEffectiveAreaFraction;
  s.vehicle.vehicleInFlightMaxArea = fins.vehicleInFlightMaxArea;
}
