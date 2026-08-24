/**
 * Full-loop parity: the ported `step()` against the 2021 `updateBackEnd()`.
 *
 * The unit-level parity tests in this directory prove each formula matches. This
 * proves the *order* matches, which is the part that cannot be checked function
 * by function: updateBackEnd's phases read values earlier phases just wrote, and
 * spatial motion integrates with the previous step's accelerations.
 *
 * The legacy loop is driven directly rather than through updateBackEnd(), because
 * that function reads Date.now() for its frame timing and the DOM for its
 * controls. Everything else — every phase, in order — is executed verbatim from
 * the legacy source in the VM, with renderTimeInterval pinned to 1/dt so both
 * sides see the same timestep.
 *
 * WHY THIS IS NOT AN Object.is COMPARISON, unlike every other parity test here.
 *
 * The port writes `X * dt` where 2021 writes `X / renderTimeInterval`. Those are
 * algebraically identical but not bit-identical: dividing by the reciprocal
 * rounds twice, multiplying rounds once. The difference is at most 1 ULP per
 * operation — proved in tests/proofs/dt-substitution.test.ts, which is the
 * Refactor-tier obligation CLAUDE.md attaches to that substitution.
 *
 * One ULP per step, compounded over thousands of steps through a feedback loop,
 * is not one ULP at the end. So this test asserts a RELATIVE bound and pins the
 * worst drift actually observed, rather than pretending to an exactness the
 * substitution does not have. Every unit-level parity test in this directory
 * still uses Object.is; it is only accumulation that is loosened here.
 */
import { describe, expect, it } from 'vitest';
import { runInContext } from 'node:vm';
import { loadLegacy, toLegacyKeys, toLegacyName, toLegacySource } from './legacy';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';

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

/** Fields compared every step. SimState path -> legacy global. */
const COMPARED: ReadonlyArray<readonly [(s: SimState) => unknown, string]> = [
  [(s) => s.kinematics.altitude, toLegacyName('altitude')],
  [(s) => s.kinematics.downRangeDistance, toLegacyName('downRangeDistance')],
  [(s) => s.kinematics.downRangeDistanceNextFrame, toLegacyName('downRangeDistanceNextFrame')],
  [(s) => s.kinematics.distanceToPlanetCenter, toLegacyName('distanceToPlanetCenter')],
  [(s) => s.kinematics.orbitGravityAccCompensation, toLegacyName('orbitGravityAccCompensation')],
  [(s) => s.kinematics.speedX, toLegacyName('speedX')],
  [(s) => s.kinematics.speedY, toLegacyName('speedY')],
  [(s) => s.kinematics.trueSpeed, toLegacyName('trueSpeed')],
  [(s) => s.kinematics.machSpeed, toLegacyName('machSpeed')],
  [(s) => s.kinematics.accelerationX, toLegacyName('accelerationX')],
  [(s) => s.kinematics.accelerationY, toLegacyName('accelerationY')],
  [(s) => s.kinematics.totalAcceleration, toLegacyName('totalAcceleration')],
  [(s) => s.kinematics.pitch, toLegacyName('pitch')],
  [(s) => s.kinematics.pitchRateOfChange, toLegacyName('pitchRateOfChange')],
  [(s) => s.kinematics.angularVelocity, toLegacyName('angularVelocity')],
  [(s) => s.kinematics.angularAcceleration, toLegacyName('angularAcceleration')],
  [(s) => s.kinematics.angleOfMotion, toLegacyName('angleOfMotion')],
  [(s) => s.kinematics.angleOfAttack, toLegacyName('angleOfAttack')],
  [(s) => s.kinematics.angleInToTheWind, toLegacyName('angleInToTheWind')],
  [(s) => s.atmosphere.airTemperature, toLegacyName('airTemperature')],
  [(s) => s.atmosphere.airPressure, toLegacyName('airPressure')],
  [(s) => s.atmosphere.airDensity, toLegacyName('airDensity')],
  [(s) => s.forces.thrust, toLegacyName('thrust')],
  [(s) => s.forces.thrustAcceleration, toLegacyName('thrustAcceleration')],
  [(s) => s.forces.aerodynamicDrag, toLegacyName('aerodynamicDrag')],
  [(s) => s.forces.aerodynamicLift, toLegacyName('aerodynamicLift')],
  [(s) => s.forces.aerodynamicDragAcceleration, toLegacyName('aerodynamicDragAcceleration')],
  [(s) => s.forces.aerodynamicLiftAcceleration, toLegacyName('aerodynamicLiftAcceleration')],
  [(s) => s.forces.crossSectionalArea, toLegacyName('crossSectionalArea')],
  [(s) => s.forces.thermalPower, toLegacyName('thermalPower')],
  [(s) => s.forces.dynamicPressure, toLegacyName('dynamicPressure')],
  [(s) => s.forces.thrustVectorForce, toLegacyName('thrustVectorForce')],
  [(s) => s.forces.thrustVectorAcceleration, toLegacyName('thrustVectorAcceleration')],
  [(s) => s.forces.frontFinDrag, toLegacyName('frontFinDrag')],
  [(s) => s.forces.aftFinDrag, toLegacyName('aftFinDrag')],
  [(s) => s.forces.angularDragAcceleration, toLegacyName('angularDragAcceleration')],
  [(s) => s.forces.frontFinDragAngularAcceleration, toLegacyName('frontFinDragAngularAcceleration')],
  [(s) => s.forces.aftFinDragAngularAcceleration, toLegacyName('aftFinDragAngularAcceleration')],
  [(s) => s.forces.rcsThrustAngularAcceleration, toLegacyName('rcsThrustAngularAcceleration')],
  [(s) => s.forces.offAxisThrustDifferenceAcceleration, toLegacyName('offAxisThrustDifferenceAcceleration')],
  [(s) => s.forces.rcsThrust, toLegacyName('rcsThrust')],
  [(s) => s.forces.twr, toLegacyName('twr')],
  [(s) => s.forces.perceivedG, toLegacyName('perceivedG')],
  [(s) => s.forces.perceivedG_X, toLegacyName('perceivedG_X')],
  [(s) => s.forces.perceivedG_Y, toLegacyName('perceivedG_Y')],
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

/** Push a SimState into the legacy context so both start identical. */
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
    orbitalVelocityAtCurrentAltitude: s.kinematics.orbitalVelocityAtCurrentAltitude,
    orbitGravityAccCompensation: s.kinematics.orbitGravityAccCompensation,
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
 * Run both loops in lockstep, checking every compared field every step.
 * Returns the final state and the worst relative drift seen, by field.
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
    s = step(s, dt);
    evalLegacy(LEGACY_STEP);
    for (const [get, name] of COMPARED) {
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

  it.each(DTS)('ballistic fall from 80 km, 2000 steps at dt=%f', (dt) => {
    // Crosses the 11 km atmosphere branch and builds real Mach number.
    lockstep(
      (s) => {
        s.kinematics.altitude = 80_000;
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
    const { state: s } = lockstep(
      (st) => {
        st.kinematics.altitude = 50_000;
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
          s.kinematics.altitude = 80_000;
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
    expect(report).toHaveLength(3);
  });

  it('the pad scenario is bit-identical, with no drift at all', () => {
    // Worth isolating: where nothing is being scaled by dt in a feedback loop,
    // the port and the 2021 code agree exactly. The drift above is entirely the
    // dt substitution compounding through the integrator, not a formula
    // difference.
    const { worst } = lockstep(() => {}, 500, 1 / 120, 'pad-exact');
    expect(worst).toBe(0);
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
