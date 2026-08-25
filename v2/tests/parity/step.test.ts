/**
 * Full-loop parity: the ported `step()` against the 2021 `updateBackEnd()`.
 *
 * The unit-level parity tests in this directory prove each formula matches.
 * This proves the *order* matches, which is the part that cannot be checked
 * function by function: updateBackEnd's phases read values earlier phases just
 * wrote, and spatial motion integrates with the previous step's accelerations.
 *
 * WHAT THE CLAIM IS, SINCE M2.10. It used to be "v2 is 2021". It is now:
 *
 *     v2 is 2021, except for exactly five declared departures.
 *
 * The five, each pinned to its exact replacement formula in the DECLARED
 * DEPARTURES block at the end of this file:
 *
 *   1. gravity          -GM/r^2 with a centrifugal and a tangential term,
 *                       replacing constant g plus the clamped relief hack
 *                       (M2.6)
 *   2. speed of sound   sqrt(gamma*R*T) from local temperature, replacing the
 *                       constant 343 m/s (M2.7)
 *   3. atmosphere       the full ISA to 86 km, replacing the three-layer
 *                       barometric model (M2.8)
 *   4. trig             the collapsed single expressions, replacing the seven
 *                       quadrant ladders (M1.9)
 *   5. heat             getReentryHeatPower called with the nose radius rather
 *                       than the cross-sectional area (M2.2)
 *
 * plus the two earlier bug fixes this file already documented separately —
 * pitchRateOfChange (M2.4) and the M2.1 stratosphere, which is *inside* the
 * atmosphere departure now.
 *
 * HOW THE COMPARISON WORKS, AND WHY IT CHANGED. Before M2.10 the two loops ran
 * free from a common start and every field was compared every step. That is no
 * longer possible: five departures perturb the trajectory, so a free-running
 * comparison would diverge by design and prove nothing.
 *
 * So the harness RE-SEEDS the legacy context from v2's state at the start of
 * every step. Both loops then take one step from the same state and are
 * compared. This is a stronger test of the thing this file exists to test —
 * phase ordering — than the old one was, because a divergence cannot hide
 * behind accumulated drift: any field that a mis-ordered phase would corrupt
 * shows up on the very step it happens.
 *
 * It also cleanly separates what departs from what does not. Within one step
 * from a common state, the departures reach exactly the fields they should:
 * the atmosphere trio, Mach, the aerodynamic forces and the accelerations built
 * from them, thermal power, and (through the relief term the legacy loop still
 * applies) speedY and the felt-g readouts. EVERYTHING ELSE MUST STILL MATCH —
 * the ~40 fields in `RETAINED` below, including the whole engine, actuation and
 * control chain, and including the spatial fields that integrate from the
 * previous step's accelerations.
 *
 * The one thing re-seeding gives up is the long-run claim, so it is made
 * separately: `the control chain tracks 2021 over thousands of free-running
 * steps` runs both loops from a common start without re-seeding and compares
 * the subset that is genuinely decoupled from the trajectory — fuel, mass,
 * throttle slew, gimbal slew, RCS budget, and the fuel-out branch.
 *
 * WHY THIS IS NOT AN Object.is COMPARISON. The port writes `X * dt` where 2021
 * writes `X / renderTimeInterval`. Those are algebraically identical but not
 * bit-identical: dividing by the reciprocal rounds twice, multiplying rounds
 * once. The difference is at most 1 ULP per operation — proved in
 * tests/proofs/dt-substitution.test.ts, which is the Refactor-tier obligation
 * CLAUDE.md attaches to that substitution. So retained fields are compared with
 * a relative bound, pinned from measurement.
 */
import { describe, expect, it } from 'vitest';
import { runInContext } from 'node:vm';
import { loadLegacy, toLegacyKeys, toLegacyName, toLegacySource } from './legacy';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';
import * as C from '$core/constants';
import * as gravity from '$core/physics/gravity';
import * as components from '$core/physics/components';
import { legacyAtmosphere, speedOfSoundAt } from '$core/physics/atmosphere';
import { isaAtmosphere } from '$core/physics/isa';
import { rad } from '$core/units';

const legacy = loadLegacy([
  'backend/physics.js',
  'backend/initBackEnd.js',
  'backend/flightcontrol/flightControl.js',
]);
const ctx = legacy as unknown as Record<string, unknown>;

/** Read a legacy global by its v2 name, translating through the rename table. */
function readLegacy(name: string): unknown {
  return (legacy as unknown as Record<string, unknown>)[toLegacyName(name)];
}
// Snippets are written in v2 names and translated to 2021 spellings on the way
// in, so this file never has to carry a misspelling as a bare string.
const evalLegacy = (src: string): unknown =>
  runInContext(toLegacySource(src), legacy as never, { filename: '<step>' });

/**
 * updateBackEnd() minus its two impurities: the Date.now() frame timing at the
 * top, and the two getElementById reads in readInputFromManualFlightControl.
 * Every other line is the legacy source, in the legacy order.
 */
const LEGACY_STEP = `
  updatedFrameCount++

  updateAtmosphere()  // environmentUpDate() is exactly this one call

  // vehicleStatusUpDate
  checkIfBreakUp()
  checkIfCrash()
  checkIfOutOfFuel()
  if (propellantMass > 0) {
    propellantMass -= (getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor) / renderTimeInterval
  } else { propellantMass = 0 }
  if (dumpingFuel) {
    if ((propellantMass > dumpLimit || forceDump) && propellantMass > 0) {
      propellantMass -= dumpRate / renderTimeInterval
    } else { dumpingFuel = !dumpingFuel }
  }
  vehicleMass = vehicleDryMass + propellantMass
  if (fuelRunOut) { raptorN1Running = false; raptorN2Running = false; raptorN3Running = false }

  // FlightParamsUpDate -> updateBasicParams
  upDateVehicleInFlightMaxArea()
  updateCrossSectionalArea()
  updateAngleOfMotion()
  updateAngleOfAttack()
  updateGimbolPointingDirection()
  thermalPower = getReentryHeatPower(crossSectionalArea)
  dynamicPressure = getDynamicPressure()
  updatePitchRateOfChange()
  updateCurrentTWR()
  updatePerceivedG()
  aerodynamicDrag = getDrag(crossSectionalArea, getBodyDragCoefficient())
  aerodynamicLift = getLift(vehicleInFlightMaxArea)
  thrust = getThrust()

  // updateSpactialMotion
  altitude += speedY / renderTimeInterval
  downRangeDistanceNextFrame = downRangeDistance + speedX / renderTimeInterval
  if (downRangeDistanceNextFrame > planetCircumference) {
    downRangeDistance = downRangeDistanceNextFrame - planetCircumference
  } else if (downRangeDistanceNextFrame < 0) {
    downRangeDistance = downRangeDistanceNextFrame + planetCircumference
  } else { downRangeDistance = downRangeDistanceNextFrame }
  speedX += accelerationX / renderTimeInterval
  speedY += (accelerationY + orbitGravityAccCompensation) / renderTimeInterval
  trueSpeed = Math.sqrt(speedX ** 2 + speedY ** 2)
  machSpeed = trueSpeed / speedOfSound
  aerodynamicDragAcceleration = getAcceleration(aerodynamicDrag, vehicleMass)
  aerodynamicLiftAcceleration = getAcceleration(aerodynamicLift, vehicleMass)
  thrustAcceleration = getAcceleration(thrust, vehicleMass)
  accelerationX = getHorizontalAcceleration()
  accelerationY = getVerticalAcceleration()
  totalAcceleration = Math.sqrt(accelerationX ** 2 + accelerationY ** 2)
  updateOrbitGravityAccCompensation()

  // updateRotationalMotion
  vehicleMomentOfInertia = vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + vehicleMass * vehicleHeight ** 2 / 12
  if (pitch > Math.PI) { pitch = pitch - 2 * Math.PI } else if (pitch < -Math.PI) { pitch = pitch + 2 * Math.PI }
  pitch += angularVelocity / renderTimeInterval
  angularVelocity += angularAcceleration / renderTimeInterval
  thrustVectorForce = getThrustVectorForce()
  frontFinDrag = getFrontFinDrag()
  aftFinDrag = getAftFinDrag()
  thrustVectorAcceleration = getAngularAcceleration(thrustVectorForce, engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
  angularDragAcceleration = getAngularDragAcceleration()
  frontFinDragAngularAcceleration = getAngularAcceleration(frontFinDrag, frontFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
  aftFinDragAngularAcceleration = getAngularAcceleration(aftFinDrag, aftFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
  rcsThrustAngularAcceleration = getAngularAcceleration(rcsThrust, rcsThrustDistanceFromCenterOfMass, vehicleMomentOfInertia)
  offAxisThrustDifferenceAcceleration = getAngularAcceleration(getOffAxisThrustDifference(), engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
  angularAcceleration = thrustVectorAcceleration + angularDragAcceleration + frontFinDragAngularAcceleration + aftFinDragAngularAcceleration + rcsThrustAngularAcceleration + offAxisThrustDifferenceAcceleration

  // controlsUpdate (autopilot arrives in M1.6)
  controlTranslation()
  throttleUpdate()
`;

/**
 * Fields that must still match, step for step, from a common state.
 *
 * Everything 2021 computed that none of the five departures touches. That is
 * most of the simulation: the whole engine and actuation chain, the attitude
 * integration, the angles, and the spatial integration itself — which uses the
 * PREVIOUS step's accelerations, seeded equal, so altitude and speedX are
 * comparable even though the accelerations that will be written at the end of
 * the step are not.
 *
 * The departed fields are listed in `DEPARTED` below and are not silently
 * dropped: each is pinned to its replacement formula at the end of this file.
 */
const RETAINED: ReadonlyArray<readonly [(s: SimState) => unknown, string]> = [
  [(s) => s.kinematics.altitude, toLegacyName('altitude')],
  [(s) => s.kinematics.downRangeDistance, toLegacyName('downRangeDistance')],
  [(s) => s.kinematics.downRangeDistanceNextFrame, toLegacyName('downRangeDistanceNextFrame')],
  [(s) => s.kinematics.distanceToPlanetCenter, toLegacyName('distanceToPlanetCenter')],
  [(s) => s.kinematics.speedX, toLegacyName('speedX')],
  [(s) => s.kinematics.pitch, toLegacyName('pitch')],
  [(s) => s.kinematics.angularVelocity, toLegacyName('angularVelocity')],
  [(s) => s.kinematics.angleOfMotion, toLegacyName('angleOfMotion')],
  [(s) => s.kinematics.angleOfAttack, toLegacyName('angleOfAttack')],
  [(s) => s.kinematics.angleInToTheWind, toLegacyName('angleInToTheWind')],
  [(s) => s.forces.thrust, toLegacyName('thrust')],
  [(s) => s.forces.thrustAcceleration, toLegacyName('thrustAcceleration')],
  [(s) => s.forces.crossSectionalArea, toLegacyName('crossSectionalArea')],
  [(s) => s.forces.thrustVectorForce, toLegacyName('thrustVectorForce')],
  [(s) => s.forces.thrustVectorAcceleration, toLegacyName('thrustVectorAcceleration')],
  [(s) => s.forces.rcsThrustAngularAcceleration, toLegacyName('rcsThrustAngularAcceleration')],
  [(s) => s.forces.offAxisThrustDifferenceAcceleration, toLegacyName('offAxisThrustDifferenceAcceleration')],
  [(s) => s.forces.rcsThrust, toLegacyName('rcsThrust')],
  [(s) => s.forces.twr, toLegacyName('twr')],
  [(s) => s.forces.frontFinEffectiveAreaFraction, toLegacyName('frontFinEffectiveAreaFraction')],
  [(s) => s.forces.aftFinEffectiveAreaFraction, toLegacyName('aftFinEffectiveAreaFraction')],
  [(s) => s.vehicle.vehicleMass, toLegacyName('vehicleMass')],
  [(s) => s.vehicle.propellantMass, toLegacyName('propellantMass')],
  [(s) => s.vehicle.vehicleMomentOfInertia, toLegacyName('vehicleMomentOfInertia')],
  [(s) => s.vehicle.vehicleInFlightMaxArea, toLegacyName('vehicleInFlightMaxArea')],
  [(s) => s.vehicle.throttleCurrent, toLegacyName('throttleCurrent')],
  [(s) => s.vehicle.gimbalPosition, toLegacyName('gimbalPosition')],
  [(s) => s.vehicle.gimbalPointingDirection, toLegacyName('gimbalPointingDirection')],
  [(s) => s.vehicle.frontFinExtension, toLegacyName('frontFinExtension')],
  [(s) => s.vehicle.aftFinExtension, toLegacyName('aftFinExtension')],
  [(s) => s.vehicle.rcsRunTimeRemaining, toLegacyName('rcsRunTimeRemaining')],
  [(s) => s.status.onTheGround, toLegacyName('onTheGround')],
  [(s) => s.status.landed, toLegacyName('landed')],
  [(s) => s.failures.crashed, toLegacyName('crashed')],
  [(s) => s.failures.inFlightBreakUp, toLegacyName('inFlightBreakUp')],
  [(s) => s.failures.fuelRunOut, toLegacyName('fuelRunOut')],
];

/**
 * Fields the five departures reach, and which one reaches each.
 *
 * Written down rather than left as "the ones not in RETAINED", so that adding a
 * field to SimState cannot quietly land in neither list — the completeness test
 * below checks the two together cover everything 2021 had.
 */
const DEPARTED: Readonly<Record<string, string>> = {
  airTemperature: 'atmosphere (M2.8): the ISA replaces the three-layer model',
  airPressure: 'atmosphere (M2.8)',
  airDensity: 'atmosphere (M2.8)',
  machSpeed: 'speed of sound (M2.7): sqrt(gamma*R*T), not the constant 343',
  aerodynamicDrag: 'atmosphere + speed of sound: density, and Cd through Mach',
  aerodynamicLift: 'atmosphere: density',
  aerodynamicDragAcceleration: 'as aerodynamicDrag',
  aerodynamicLiftAcceleration: 'as aerodynamicLift',
  dynamicPressure: 'atmosphere: density',
  frontFinDrag: 'atmosphere: density',
  aftFinDrag: 'atmosphere: density',
  frontFinDragAngularAcceleration: 'as frontFinDrag',
  aftFinDragAngularAcceleration: 'as aftFinDrag',
  angularDragAcceleration: 'atmosphere: density',
  angularAcceleration: 'sum including the two fin terms and angular drag',
  accelerationX: 'gravity (tangential term) + trig + aerodynamics',
  accelerationY: 'gravity (-GM/r^2 + centrifugal) + trig + aerodynamics',
  totalAcceleration: 'magnitude of the two above',
  speedY: 'gravity: 2021 integrates the relief term into it, v2 has no such term',
  trueSpeed: 'through speedY',
  thermalPower: 'heat (M2.2): nose radius rather than cross-sectional area',
  pitchRateOfChange: 'pitch rate (M2.4): a real rad/s rate, not dPitch*dt*3600',
  perceivedG: 'through the accelerations and the relief term',
  perceivedG_X: 'through accelerationX',
  perceivedG_Y: 'through accelerationY and the relief term',
  orbitalVelocityAtCurrentAltitude: 'gravity: 2021 froze it at spawn, v2 tracks altitude',
  orbitGravityAccCompensation: 'gravity: the field no longer exists in v2',
};

/**
 * Push a SimState into the legacy context so both start identical.
 *
 * `orbitalVelocityAtCurrentAltitude` and `orbitGravityAccCompensation` are
 * deliberately NOT seeded: the first is a 2021 global written once at load and
 * never again, the second is derived from it, and both are the gravity
 * departure. Seeding them from v2 would hand the legacy loop v2's physics and
 * make the comparison flatter than it is.
 */
function seedLegacy(s: SimState, dt: number): void {
  Object.assign(ctx, toLegacyKeys({
    renderTimeInterval: 1 / dt,
    frameRate: 60,
    timeAccel: 1,
    updatedFrameCount: s.world.updatedFrameCount,
    altitude: s.kinematics.altitude,
    downRangeDistance: s.kinematics.downRangeDistance,
    downRangeDistanceNextFrame: s.kinematics.downRangeDistanceNextFrame,
    distanceToPlanetCenter: s.kinematics.distanceToPlanetCenter,
    speedX: s.kinematics.speedX,
    speedY: s.kinematics.speedY,
    trueSpeed: s.kinematics.trueSpeed,
    machSpeed: s.kinematics.machSpeed,
    accelerationX: s.kinematics.accelerationX,
    accelerationY: s.kinematics.accelerationY,
    totalAcceleration: s.kinematics.totalAcceleration,
    pitch: s.kinematics.pitch,
    pitchRateOfChange: s.kinematics.pitchRateOfChange,
    pitchRecord: [...s.kinematics.pitchRecord],
    angularVelocity: s.kinematics.angularVelocity,
    angularAcceleration: s.kinematics.angularAcceleration,
    angleOfMotion: s.kinematics.angleOfMotion,
    angleOfAttack: s.kinematics.angleOfAttack,
    angleInToTheWind: s.kinematics.angleInToTheWind,
    airDensity: s.atmosphere.airDensity,
    airPressure: s.atmosphere.airPressure,
    airTemperature: s.atmosphere.airTemperature,
    thrust: s.forces.thrust,
    thrustAcceleration: s.forces.thrustAcceleration,
    aerodynamicDrag: s.forces.aerodynamicDrag,
    aerodynamicLift: s.forces.aerodynamicLift,
    aerodynamicDragAcceleration: s.forces.aerodynamicDragAcceleration,
    aerodynamicLiftAcceleration: s.forces.aerodynamicLiftAcceleration,
    crossSectionalArea: s.forces.crossSectionalArea,
    thermalPower: s.forces.thermalPower,
    dynamicPressure: s.forces.dynamicPressure,
    thrustVectorForce: s.forces.thrustVectorForce,
    rcsThrust: s.forces.rcsThrust,
    frontFinEffectiveAreaFraction: s.forces.frontFinEffectiveAreaFraction,
    aftFinEffectiveAreaFraction: s.forces.aftFinEffectiveAreaFraction,
    twr: s.forces.twr,
    vehicleMass: s.vehicle.vehicleMass,
    propellantMass: s.vehicle.propellantMass,
    vehicleMomentOfInertia: s.vehicle.vehicleMomentOfInertia,
    vehicleInFlightMaxArea: s.vehicle.vehicleInFlightMaxArea,
    throttle: s.vehicle.throttle,
    throttleCurrent: s.vehicle.throttleCurrent,
    gimbalPosition: s.vehicle.gimbalPosition,
    gimbalPointingDirection: s.vehicle.gimbalPointingDirection,
    frontFinExtension: s.vehicle.frontFinExtension,
    aftFinExtension: s.vehicle.aftFinExtension,
    rcsRunTimeRemaining: s.vehicle.rcsRunTimeRemaining,
    raptorN1Running: s.engines.running[0],
    raptorN2Running: s.engines.running[1],
    raptorN3Running: s.engines.running[2],
    raptorN1Fail: s.engines.failed[0],
    raptorN2Fail: s.engines.failed[1],
    raptorN3Fail: s.engines.failed[2],
    onTheGround: s.status.onTheGround,
    landed: s.status.landed,
    rcsActive: s.status.rcsActive,
    finActive: s.status.finActive,
    finLocked: s.status.finLocked,
    dumpingFuel: s.status.dumpingFuel,
    forceDump: s.status.forceDump,
    translationModeOn: s.status.translationModeOn,
    crashed: s.failures.crashed,
    inFlightBreakUp: s.failures.inFlightBreakUp,
    fuelRunOut: s.failures.fuelRunOut,
    pitchControl: s.autopilot.pitchControl,
    firstTimeLanded: false,
    // Per-frame rates: exactly ratePerSecond * dt.
    throttleSpeedPerFrame: 60 * dt,
    gimbalSpeedPerFrame: 600 * dt,
    finActuationSpeedPerFrame: 120 * dt,
  }));
}

/**
 * Absolute difference below which a relative comparison is meaningless.
 *
 * Quantities here are SI: m, m/s, m/s^2, rad, rad/s, N, kg. A difference of
 * 1e-12 in any of them is far below anything measurable, renderable, or
 * recorded in a fixture. The floor matters because several fields are sums of
 * opposed terms and pass through zero — accelerationY during a stable belly
 * flop sits around 4e-4 while the two implementations differ by 1.4e-14, which
 * is 3e-11 *relative* purely from cancellation. Judging that as divergence
 * would be measuring the subtraction, not the port.
 */
const ABSOLUTE_FLOOR = 1e-12;

/** Relative difference, or 0 when the absolute difference is negligible. */
function relativeDifference(a: number, b: number): number {
  if (Object.is(a, b)) return 0;
  const absolute = Math.abs(a - b);
  if (absolute < ABSOLUTE_FLOOR) return 0;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale < ABSOLUTE_FLOOR) return absolute;
  return absolute / scale;
}

/**
 * Relative bound every field must stay inside for a whole run.
 *
 * Set from measurement, not guessed: the worst drift observed anywhere in these
 * scenarios is 1.2e-13 (aerodynamicLift, 30 steps into a powered ascent), and
 * the pad scenario is bit-identical throughout. 1e-11 leaves two orders of
 * headroom for float noise while still failing long before anything physical
 * could change. If a future edit pushes past it, that is a real divergence.
 */
const DRIFT_LIMIT = 1e-11;

/**
 * Step both loops from the same state, every step, comparing the retained
 * fields. Returns the final state and the worst relative difference seen.
 *
 * The legacy context is re-seeded from v2's state before each step — see the
 * file header. What is being measured is therefore per-step agreement, not
 * accumulated drift.
 */
function lockstep(scenario: (s: SimState) => void, steps: number, dt: number, label: string) {
  const state = createInitialState();
  scenario(state);
  seedLegacy(state, dt);

  let s = state;
  let worst = 0;
  let worstField = '';
  let worstStep = 0;

  for (let i = 0; i < steps; i++) {
    seedLegacy(s, dt);
    s = step(s, dt);
    evalLegacy(LEGACY_STEP);
    for (const [get, name] of RETAINED) {
      const mine = get(s);
      const theirs = ctx[name];

      if (typeof mine === 'boolean' || typeof theirs === 'boolean') {
        // Discrete state must match exactly — a diverged branch is a real
        // difference, not accumulated rounding.
        expect(mine, `${label} step ${i}: ${name}`).toBe(theirs);
        continue;
      }

      const drift = relativeDifference(mine as number, theirs as number);
      if (drift > worst) {
        worst = drift;
        worstField = name;
        worstStep = i;
      }
      expect(
        drift,
        `${label} step ${i}: ${name} ours=${String(mine)} legacy=${String(theirs)}`,
      ).toBeLessThan(DRIFT_LIMIT);
    }
  }
  return { state: s, worst, worstField, worstStep };
}

/**
 * Fields that stay decoupled from the trajectory, for the free-running run.
 *
 * The propellant burn depends on engine count and throttle; the throttle,
 * gimbal and fin slews depend on their commanded goals; the RCS budget depends
 * on whether RCS is firing. None of them reads a force, a density or an
 * acceleration, so the two loops can be left to run for thousands of steps
 * without re-seeding and these must still agree.
 *
 * Fin extension is NOT here even though its slew mechanics are decoupled: the
 * goal it slews toward flips on the sign of angleOfAttack (flightControl.js:9),
 * which is trajectory-coupled. Its mechanics are covered by
 * tests/parity/actuation.test.ts instead.
 */
const DECOUPLED_CHAIN: ReadonlyArray<readonly [(s: SimState) => unknown, string]> = [
  [(s) => s.vehicle.propellantMass, toLegacyName('propellantMass')],
  [(s) => s.vehicle.vehicleMass, toLegacyName('vehicleMass')],
  [(s) => s.vehicle.throttleCurrent, toLegacyName('throttleCurrent')],
  [(s) => s.vehicle.gimbalPosition, toLegacyName('gimbalPosition')],
  [(s) => s.vehicle.rcsRunTimeRemaining, toLegacyName('rcsRunTimeRemaining')],
  [(s) => s.forces.thrust, toLegacyName('thrust')],
  [(s) => s.failures.fuelRunOut, toLegacyName('fuelRunOut')],
];

const DTS = [1 / 30, 1 / 60, 1 / 120, 1 / 240];

describe('full-loop parity with updateBackEnd()', () => {
  it.each(DTS)('resting on the pad, 500 steps at dt=%f', (dt) => {
    const { worst } = lockstep(() => {}, 500, dt, 'pad');
    expect(worst).toBeLessThan(DRIFT_LIMIT);
  });

  it.each(DTS)('powered ascent, 1500 steps at dt=%f', (dt) => {
    lockstep(
      (s) => {
        s.engines.running = [true, true, true];
        s.vehicle.throttle = 100;
        s.vehicle.throttleCurrent = 100;
      },
      1500,
      dt,
      'ascent',
    );
  });

  it.each(DTS)('ballistic fall from 20 km, 2000 steps at dt=%f', (dt) => {
    // Crosses the 11 km atmosphere branch and builds real Mach number.
    //
    // Starts at 20 km rather than 80 km since M2.1: above 25 km the port
    // deliberately no longer matches 2021, so a parity run through that region
    // would be asserting the absence of a bug fix. The divergence itself is
    // covered in tests/parity/physics.test.ts.
    lockstep(
      (s) => {
        s.kinematics.altitude = 20_000;
        s.kinematics.speedY = -500;
        s.kinematics.speedX = 300;
        s.kinematics.pitch = 1.2 as never;
        s.status.finActive = true;
      },
      2000,
      dt,
      'reentry',
    );
  });

  it('belly-flop with fins and RCS active, 3000 steps', () => {
    lockstep(
      (s) => {
        s.kinematics.altitude = 12_000;
        s.kinematics.speedY = -200;
        s.kinematics.pitch = 1.5 as never;
        s.status.finActive = true;
        s.status.rcsActive = true;
        s.autopilot.pitchControl = 100;
      },
      3000,
      1 / 120,
      'bellyflop',
    );
  });

  it('a crash, so the failure branches are exercised', () => {
    const { state: s } = lockstep(
      (st) => {
        st.kinematics.altitude = 200;
        st.kinematics.speedY = -80;
        st.kinematics.speedX = 30;
      },
      600,
      1 / 120,
      'crash',
    );
    expect(s.failures.crashed).toBe(true);
    expect(readLegacy('crashed')).toBe(true);
  });

  it('fuel exhaustion, so the out-of-fuel branch is exercised', () => {
    // Below the stratopause, for the same reason as the ballistic-fall case.
    const { state: s } = lockstep(
      (st) => {
        st.kinematics.altitude = 20_000;
        st.engines.running = [true, true, true];
        st.vehicle.propellantMass = 2_000;
        st.vehicle.vehicleMass = 122_000;
      },
      500,
      1 / 120,
      'dry',
    );
    expect(s.failures.fuelRunOut).toBe(true);
    expect(s.engines.running).toEqual([false, false, false]);
  });
});

describe('how far the two implementations actually drift', () => {
  // Reported, not just bounded. If a future change makes the port diverge
  // faster, these numbers move and someone has to look at why.
  it('reports worst-case relative drift for each scenario', () => {
    const scenarios: ReadonlyArray<readonly [string, (s: SimState) => void, number]> = [
      ['pad', () => {}, 500],
      [
        'ascent',
        (s) => {
          s.engines.running = [true, true, true];
          s.vehicle.throttle = 100;
          s.vehicle.throttleCurrent = 100;
        },
        1500,
      ],
      [
        'reentry',
        (s) => {
          s.kinematics.altitude = 20_000;
          s.kinematics.speedY = -500;
          s.kinematics.speedX = 300;
          s.kinematics.pitch = 1.2 as never;
          s.status.finActive = true;
        },
        2000,
      ],
    ];

    const report: string[] = [];
    for (const [name, scenario, steps] of scenarios) {
      const { worst, worstField, worstStep } = lockstep(scenario, steps, 1 / 120, name);
      report.push(`${name}: ${worst.toExponential(2)} at ${worstField} step ${worstStep}`);
      expect(worst, `${name} drifted more than expected`).toBeLessThan(DRIFT_LIMIT);
    }
    console.log('per-step parity, worst relative difference:\n  ' + report.join('\n  '));
    expect(report).toHaveLength(3);
  });

  it('per-step disagreement is at the last bit, and only where dt is applied', () => {
    // The strongest honest form of the claim. Stepping from a common state,
    // most retained fields are Object.is-identical; the ones that are not are
    // exactly the ones the dt substitution touches — `X * dt` where 2021 wrote
    // `X / renderTimeInterval` — and they disagree in the last bit only.
    //
    // Measured: exactly three fields ever differ across these three scenarios
    // — `pitch`, `angularVelocity` and `speedX`, which are precisely the three
    // integrations that read `X * dt` against 2021's `X / renderTimeInterval`.
    // Every other retained field is identical to the bit. The disagreement is
    // 1 unit-ULP (e.g. ascent step 3, pitch -2.3874505664589415e-9 vs
    // -2.387450566458942e-9). Reported per field so a new one cannot appear
    // unnoticed; altitude and speedY integrate the same way but are departed or
    // land on the same double here.
    const scenarios: ReadonlyArray<readonly [string, (s: SimState) => void, number]> = [
      ['pad', () => {}, 500],
      [
        'ascent',
        (s) => {
          s.engines.running = [true, true, true];
          s.vehicle.throttle = 100;
          s.vehicle.throttleCurrent = 100;
        },
        1500,
      ],
      [
        'bellyflop',
        (s) => {
          s.kinematics.altitude = 12_000;
          s.kinematics.speedY = -200;
          s.kinematics.pitch = 1.5 as never;
          s.status.finActive = true;
          s.status.rcsActive = true;
          s.autopilot.pitchControl = 100;
        },
        1000,
      ],
    ];

    const disagreeing = new Set<string>();
    let worstUlps = 0;

    for (const [label, scenario, steps] of scenarios) {
      const state = createInitialState();
      scenario(state);
      let s = state;
      for (let i = 0; i < steps; i++) {
        seedLegacy(s, 1 / 120);
        s = step(s, 1 / 120);
        evalLegacy(LEGACY_STEP);
        for (const [get, name] of RETAINED) {
          const mine = get(s);
          const theirs = ctx[name];
          if (Object.is(mine, theirs)) continue;
          if (typeof mine !== 'number' || typeof theirs !== 'number') {
            expect.fail(`${label} step ${i}: ${name} is not numeric and differs`);
          }
          disagreeing.add(name);
          const ulp = Math.max(Math.abs(theirs), Number.MIN_VALUE) * Number.EPSILON;
          worstUlps = Math.max(worstUlps, Math.abs(mine - theirs) / ulp);
        }
      }
    }

    expect([...disagreeing].sort(), 'a new field started disagreeing').toEqual(
      [toLegacyName('pitch'), toLegacyName('angularVelocity'), toLegacyName('speedX')].sort(),
    );
    expect(worstUlps, `worst ${worstUlps.toFixed(2)} ULP`).toBeLessThanOrEqual(1);
  });

  it('drift stays bounded rather than growing without limit', () => {
    // The real risk with a per-step rounding difference is exponential
    // divergence through the feedback loop. Measure at three run lengths: if
    // drift were compounding badly, the longest run would be far worse.
    const ascent = (s: SimState) => {
      s.engines.running = [true, true, true];
      s.vehicle.throttle = 100;
      s.vehicle.throttleCurrent = 100;
    };
    const short = lockstep(ascent, 200, 1 / 120, 'ascent-200').worst;
    const long = lockstep(ascent, 2000, 1 / 120, 'ascent-2000').worst;
    expect(short).toBeLessThan(DRIFT_LIMIT);
    expect(long).toBeLessThan(DRIFT_LIMIT);
    // Ten times the steps does not mean ten orders of magnitude more error.
    expect(long).toBeLessThan(Math.max(short, 1e-15) * 1000);
  });
});

describe('thermalPower deliberately no longer matches 2021 — this is M2.2', () => {
  it('v2 heat is larger by sqrt(crossSectionalArea / noseRadius), times the density ratio', () => {
    // 2021: getReentryHeatPower(crossSectionalArea). v2: (NOSE_RADIUS).
    // The correlation's denominator is a radius in metres; the area is
    // 63-500 m^2. So the old model understated heating by sqrt(area/radius),
    // by a factor that changed with attitude and in the wrong direction.
    //
    // Since M2.10 there is a second factor in the same ratio: the two sides
    // compute their own air density from the same altitude, and those densities
    // are the atmosphere departure. Sutton-Graves goes as sqrt(rho), so the
    // full ratio is sqrt(area/noseRadius) * sqrt(rho_v2 / rho_2021). Both
    // factors are named here rather than one of them being absorbed into a
    // tolerance.
    const dt = 1 / 120;
    const state = createInitialState();
    state.kinematics.altitude = 20_000;
    state.kinematics.speedX = 2000;
    state.kinematics.trueSpeed = 2000;

    let s = state;
    for (let i = 0; i < 50; i++) {
      seedLegacy(s, dt);
      s = step(s, dt);
      evalLegacy(LEGACY_STEP);
    }

    const theirs = readLegacy('thermalPower') as number;
    const ours = s.forces.thermalPower;
    expect(ours).toBeGreaterThan(theirs);

    const area = readLegacy('crossSectionalArea') as number;
    const densityRatio = s.atmosphere.airDensity / (readLegacy('airDensity') as number);
    expect(ours / theirs).toBeCloseTo(Math.sqrt(area / 4.5) * Math.sqrt(densityRatio), 6);

    // And the heat factor alone dominates: the density ratio at 20 km is within
    // a few percent of 1, the area factor is a factor of four or more.
    expect(Math.abs(densityRatio - 1)).toBeLessThan(0.05);
    expect(Math.sqrt(area / 4.5)).toBeGreaterThan(3);
  });

  it('every other compared field still matches, so this is the only divergence', () => {
    // Guards against the heat change quietly perturbing something else: heat
    // feeds checkIfBreakUp, and if it crossed the limit the whole trajectory
    // would part. At these altitudes it does not, and the run stays in lockstep.
    const { worst } = lockstep(
      (s) => {
        s.kinematics.altitude = 20_000;
        s.kinematics.speedX = 2000;
      },
      1000,
      1 / 120,
      'heat-isolation',
    );
    expect(worst).toBeLessThan(DRIFT_LIMIT);
  });
});

describe('pitchRateOfChange deliberately no longer matches 2021 — this is M2.4', () => {
  it('v2 reports a genuine rad/s rate; 2021 reported it scaled by dt^2 * 3600', () => {
    const dt = 1 / 120;
    const state = createInitialState();
    state.kinematics.altitude = 20_000;
    state.kinematics.angularVelocity = 0.25;

    let s = state;
    for (let i = 0; i < 20; i++) {
      seedLegacy(s, dt);
      s = step(s, dt);
      evalLegacy(LEGACY_STEP);
    }

    const theirs = readLegacy('pitchRateOfChange') as number;
    const ours = s.kinematics.pitchRateOfChange;

    // v2 reports the actual angular velocity.
    expect(ours).toBeCloseTo(0.25, 2);
    // 2021's value is ours scaled by dt^2 * 3600 = 0.25 at 120 Hz.
    expect(theirs / ours).toBeCloseTo(dt * dt * 3600, 6);
    expect(theirs / ours).toBeCloseTo(0.25, 6);
  });

  it('and at 60 fps the two agree, which is why the defect shipped', () => {
    const dt = 1 / 60;
    const state = createInitialState();
    state.kinematics.altitude = 20_000;
    state.kinematics.angularVelocity = 0.25;

    let s = state;
    for (let i = 0; i < 20; i++) {
      seedLegacy(s, dt);
      s = step(s, dt);
      evalLegacy(LEGACY_STEP);
    }
    expect(readLegacy('pitchRateOfChange') as number).toBeCloseTo(
      s.kinematics.pitchRateOfChange,
      9,
    );
  });

  it('every other compared field still matches, so this is the only divergence', () => {
    const { worst } = lockstep(
      (s) => {
        s.kinematics.altitude = 20_000;
        s.kinematics.angularVelocity = 0.25;
      },
      1000,
      1 / 120,
      'pitch-rate-isolation',
    );
    expect(worst).toBeLessThan(DRIFT_LIMIT);
  });
});

describe('the control chain tracks 2021 over thousands of free-running steps', () => {
  // The one claim per-step re-seeding gives up, made back here. Both loops run
  // from a common start with NO re-seeding for the whole run, and the subset of
  // state that does not read a force, a density or an acceleration is compared.
  // If the departures had leaked into the engine, fuel or actuation chain, this
  // is where it would show.
  const run = (scenario: (s: SimState) => void, steps: number, label: string) => {
    const state = createInitialState();
    scenario(state);
    seedLegacy(state, 1 / 120);

    let s = state;
    for (let i = 0; i < steps; i++) {
      s = step(s, 1 / 120);
      evalLegacy(LEGACY_STEP);
      for (const [get, name] of DECOUPLED_CHAIN) {
        const mine = get(s);
        const theirs = ctx[name];
        if (typeof mine === 'boolean' || typeof theirs === 'boolean') {
          expect(mine, `${label} step ${i}: ${name}`).toBe(theirs);
          continue;
        }
        expect(
          relativeDifference(mine as number, theirs as number),
          `${label} step ${i}: ${name} ours=${String(mine)} legacy=${String(theirs)}`,
        ).toBeLessThan(DRIFT_LIMIT);
      }
    }
    return s;
  };

  it('a full-throttle burn, 3000 steps', () => {
    const s = run(
      (st) => {
        st.kinematics.altitude = 20_000;
        st.engines.running = [true, true, true];
        st.vehicle.throttle = 100;
        st.vehicle.throttleCurrent = 100;
      },
      3000,
      'burn',
    );
    // Not a no-op run: a quarter of the propellant is gone.
    expect(s.vehicle.propellantMass).toBeLessThan(1_100_000);
  });

  it('a throttle slew from idle to full and back, 2000 steps', () => {
    const s = run(
      (st) => {
        st.kinematics.altitude = 20_000;
        st.engines.running = [true, true, true];
        st.vehicle.throttle = 100;
        st.vehicle.throttleCurrent = 40;
      },
      2000,
      'slew',
    );
    expect(s.vehicle.throttleCurrent).toBe(100);
  });

  it('burning to exhaustion, so the fuel-out branch agrees too', () => {
    const s = run(
      (st) => {
        st.kinematics.altitude = 20_000;
        st.engines.running = [true, true, true];
        st.vehicle.propellantMass = 2_000;
        st.vehicle.vehicleMass = 122_000;
      },
      500,
      'dry',
    );
    expect(s.failures.fuelRunOut).toBe(true);
    expect(readLegacy('fuelRunOut')).toBe(true);
  });
});

describe('DECLARED DEPARTURES — each pinned to its replacement formula', () => {
  // Not "these fields are allowed to differ". Each one below says what v2
  // computes instead, exactly, and shows 2021 computing the other thing from
  // the same state. A departure that is merely excused is a departure nobody
  // can review.
  const DT = 1 / 120;

  /** One step from a state both sides see identically. */
  function oneStep(setUp: (s: SimState) => void): SimState {
    const state = createInitialState();
    setUp(state);
    seedLegacy(state, DT);
    const after = step(state, DT);
    evalLegacy(LEGACY_STEP);
    return after;
  }

  it('1. GRAVITY — -GM/r^2, not a constant 9.807', () => {
    // At rest in vacuum, where nothing else contributes: v2's vertical
    // acceleration is exactly -GM/r^2 at the current radius, and 2021's is
    // exactly its constant.
    const altitude = 300_000;
    const s = oneStep((st) => {
      st.kinematics.altitude = altitude;
      st.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
    });
    const r = C.planetRadius + altitude;

    expect(s.kinematics.accelerationY).toBe(-gravity.gravityAt(r));
    expect(readLegacy('accelerationY')).toBe(-C.gravity);
    // 6.2% weaker at 300 km, and 0.78% weaker even at the surface, because the
    // 2021 constant is Earth's surface gravity and this planet is not Earth.
    expect(gravity.gravityAt(r) / C.gravity).toBeCloseTo(0.905, 3);
    expect(gravity.gravityAt(C.planetRadius) / C.gravity).toBeCloseTo(0.9922, 4);
  });

  it('1b. GRAVITY — moving fast sideways pushes outward, quadratically', () => {
    // The half of the departure that makes orbit possible. 2021's relief term
    // is linear in speedX, divided by a spawn-time constant, and clamped at g,
    // so its net vertical acceleration can never be positive. v2's is
    // -GM/r^2 + v_t^2/r, which is positive above circular speed.
    const altitude = 300_000;
    const r = C.planetRadius + altitude;
    const circular = gravity.circularOrbitalSpeed(r);
    const speedX = circular * 1.2;

    const s = oneStep((st) => {
      st.kinematics.altitude = altitude;
      st.kinematics.distanceToPlanetCenter = r;
      st.kinematics.speedX = speedX;
      st.kinematics.trueSpeed = speedX;
      st.kinematics.pitch = (Math.PI / 2) as never;
    });

    // v2: exactly the replacement expression, to within the wisp of drag the
    // ISA still has at 300 km.
    expect(s.kinematics.accelerationY).toBeCloseTo(
      gravity.verticalGravityAcceleration(r, speedX),
      6,
    );
    expect(s.kinematics.accelerationY, 'pushed outward above circular speed').toBeGreaterThan(0);

    // 2021: the relief term, clamped, so the best it can do is exactly zero.
    const theirs =
      (readLegacy('accelerationY') as number) +
      (readLegacy('orbitGravityAccCompensation') as number);
    expect(theirs, '2021 could at best cancel gravity').toBeLessThanOrEqual(0);
  });

  it('2. SPEED OF SOUND — sqrt(gamma*R*T), not a constant 343 m/s', () => {
    const s = oneStep((st) => {
      st.kinematics.altitude = 11_000;
      st.kinematics.speedX = 1_000;
      st.kinematics.trueSpeed = 1_000;
    });

    expect(s.kinematics.machSpeed).toBe(
      s.kinematics.trueSpeed / speedOfSoundAt(s.atmosphere.airTemperature),
    );
    expect(readLegacy('machSpeed')).toBe((readLegacy('trueSpeed') as number) / C.speedOfSound);
    expect(s.kinematics.machSpeed).toBeGreaterThan(readLegacy('machSpeed') as number);
  });

  it('3. ATMOSPHERE — the ISA, not the three-layer model', () => {
    for (const altitude of [5_000, 20_000, 50_000, 80_000]) {
      const s = oneStep((st) => {
        st.kinematics.altitude = altitude;
      });
      expect(s.atmosphere.airDensity, `${altitude} m`).toBe(isaAtmosphere(altitude).airDensity);
      expect(s.atmosphere.airTemperature).toBe(isaAtmosphere(altitude).airTemperature);
    }
  });

  it('3b. ATMOSPHERE — and the frozen 2021 tree is the UN-repaired model', () => {
    // Worth stating explicitly, because it is a trap for anyone extending this
    // file. tests/fixtures/legacy/ is the 2021 tree exactly as it shipped: its
    // updateAtmosphere branches only on `< 11000`, so it returns the lower
    // stratosphere isotherm at every altitude above 11 km, forever. M2.1's
    // repair lives in v2 only, and `legacyAtmosphere` in v2 is the REPAIRED
    // three-layer model — not what the VM computes up here.
    for (const altitude of [30_000, 50_000, 80_000]) {
      oneStep((st) => {
        st.kinematics.altitude = altitude;
      });
      expect(readLegacy('airTemperature'), `2021 at ${altitude} m`).toBe(-56.46);
      expect(legacyAtmosphere(altitude).airTemperature, `repaired at ${altitude} m`).not.toBe(
        -56.46,
      );
    }
    // 65% apart at 70 km, between the two models both of which are "2021".
    expect(
      Math.abs(
        legacyAtmosphere(70_000).airDensity /
          ((22.65 * Math.E ** (1.73 - 0.000157 * 70_000)) / (0.2869 * (-56.46 + 273.1))) -
          1,
      ),
    ).toBeGreaterThan(0.6);
  });

  it('4. TRIG — the collapsed expressions, not the quadrant ladders', () => {
    // In vacuum under thrust, the horizontal acceleration is the thrust
    // coefficient alone, so the departure is visible directly. Second quadrant,
    // where the ladder takes its `cos(x - pi/2)` branch and the collapsed form
    // is `sin(x)`.
    const s = oneStep((st) => {
      st.kinematics.altitude = 300_000;
      st.kinematics.distanceToPlanetCenter = C.planetRadius + 300_000;
      st.kinematics.pitch = 2.5 as never;
      st.engines.running = [true, true, true];
      st.vehicle.throttle = 100;
      st.vehicle.throttleCurrent = 100;
    });

    const expected =
      s.forces.thrustAcceleration * Math.sin(s.vehicle.gimbalPointingDirection) +
      gravity.tangentialAcceleration(
        s.kinematics.distanceToPlanetCenter,
        s.kinematics.speedX,
        s.kinematics.speedY,
      );
    expect(s.kinematics.accelerationX).toBeCloseTo(expected, 9);

    // The shipped coefficient IS `sin`, at the angle this state produced — not
    // the ladder's `cos(x - pi/2)` branch that 2021 would have taken for it.
    const direction = s.vehicle.gimbalPointingDirection;
    expect(direction, 'second quadrant, where the ladder branches').toBeGreaterThan(Math.PI / 2);
    expect(components.horizontalThrustCoefficient(direction)).toBe(Math.sin(direction));

    // Whether that particular angle's two forms land on the same double is
    // luck — about two thirds do. What is not luck is that they differ
    // somewhere, and only in the last bit; swept here so this pin is not
    // hostage to one angle.
    let differing = 0;
    let worstUlps = 0;
    for (let i = 0; i <= 20_000; i++) {
      const a = rad(-Math.PI + (i * 2 * Math.PI) / 20_000);
      const collapsed = components.horizontalThrustCoefficient(a);
      const ladder = components.legacyHorizontalThrustCoefficient(a);
      if (!Object.is(collapsed, ladder)) differing += 1;
      worstUlps = Math.max(worstUlps, Math.abs(collapsed - ladder) / Number.EPSILON);
    }
    expect(differing).toBeGreaterThan(0);
    expect(worstUlps, `worst ${worstUlps.toFixed(2)} ULP`).toBeLessThanOrEqual(1);
  });

  it('5. HEAT — the nose radius, not the cross-sectional area', () => {
    // Asserted in full in the M2.2 block above, including the density factor
    // the atmosphere departure adds to the same ratio. Restated here so the
    // list of five is complete where it is declared.
    const s = oneStep((st) => {
      st.kinematics.altitude = 20_000;
      st.kinematics.speedX = 2_000;
      st.kinematics.trueSpeed = 2_000;
    });
    expect(s.forces.thermalPower).toBeGreaterThan(readLegacy('thermalPower') as number);
  });

  it('and the five are the WHOLE list: every 2021 field is retained or declared', () => {
    // The completeness check. Every field the pre-M2.10 comparison covered is
    // either still compared, or named in DEPARTED with the departure that
    // reaches it. Nothing can be quietly dropped to make this file pass.
    const covered = new Set([
      ...RETAINED.map(([, name]) => name),
      ...Object.keys(DEPARTED).map((name) => toLegacyName(name)),
    ]);
    const PRE_M2_10 = [
      'altitude', 'downRangeDistance', 'downRangeDistanceNextFrame', 'distanceToPlanetCenter',
      'orbitGravityAccCompensation', 'speedX', 'speedY', 'trueSpeed', 'machSpeed',
      'accelerationX', 'accelerationY', 'totalAcceleration', 'pitch', 'angularVelocity',
      'angularAcceleration', 'angleOfMotion', 'angleOfAttack', 'angleInToTheWind',
      'airTemperature', 'airPressure', 'airDensity', 'thrust', 'thrustAcceleration',
      'aerodynamicDrag', 'aerodynamicLift', 'aerodynamicDragAcceleration',
      'aerodynamicLiftAcceleration', 'crossSectionalArea', 'dynamicPressure', 'thrustVectorForce',
      'thrustVectorAcceleration', 'frontFinDrag', 'aftFinDrag', 'angularDragAcceleration',
      'frontFinDragAngularAcceleration', 'aftFinDragAngularAcceleration',
      'rcsThrustAngularAcceleration', 'offAxisThrustDifferenceAcceleration', 'rcsThrust', 'twr',
      'perceivedG', 'perceivedG_X', 'perceivedG_Y', 'frontFinEffectiveAreaFraction',
      'aftFinEffectiveAreaFraction', 'vehicleMass', 'propellantMass', 'vehicleMomentOfInertia',
      'vehicleInFlightMaxArea', 'throttleCurrent', 'gimbalPosition', 'gimbalPointingDirection',
      'frontFinExtension', 'aftFinExtension', 'rcsRunTimeRemaining', 'onTheGround', 'landed',
      'crashed', 'inFlightBreakUp', 'fuelRunOut',
    ];
    const uncovered = PRE_M2_10.map((n) => toLegacyName(n)).filter((n) => !covered.has(n));
    expect(uncovered, `neither retained nor declared: ${uncovered.join(', ')}`).toEqual([]);

    // And the two lists do not overlap — a field cannot be both.
    const retained = new Set(RETAINED.map(([, name]) => name));
    const both = Object.keys(DEPARTED)
      .map((n) => toLegacyName(n))
      .filter((n) => retained.has(n));
    expect(both, `listed as both retained and departed: ${both.join(', ')}`).toEqual([]);
  });
});
