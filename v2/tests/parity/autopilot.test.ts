/**
 * M1.6 acceptance: parity spot-checks for the autopilot, and no DOM reads.
 *
 * The control primitives are pure functions of simulation state, so they are
 * compared exactly: same state in, same command out, Object.is. That is the
 * substance of the port — every one of these ended in a getElementById write
 * in 2021 and now writes SimState instead.
 */
import { describe, expect, it } from 'vitest';
import { runInContext } from 'node:vm';
import { loadLegacy, toLegacyKeys, toLegacyName, toLegacySource } from './legacy';
import { createInitialState, type SimState } from '$core/state';
import * as prim from '$core/control/primitives';
import { rad, type Rad } from '$core/units';
import { maxThrustPerRaptor } from '$core/constants';
import { getWorkingEngineCount } from '$core/physics/engines';

const legacy = loadLegacy([
  'backend/physics.js',
  'backend/initBackEnd.js',
  'backend/flightcontrol/flightControl.js',
  'backend/flightcontrol/autoPilotLowLevelFunctions.js',
]);
const ctx = legacy as unknown as Record<string, unknown>;
const evalLegacy = (src: string): unknown =>
  runInContext(toLegacySource(src), legacy as never, { filename: '<autopilot>' });

// The low-level file calls these; they belong to switches.js, which is all DOM
// and PIXI. Stubbed as no-ops so the arithmetic under test can be reached.
evalLegacy(`
  var _toggledFin = 0, _toggledRaptors = []
  function toggleFin() { finActive = !finActive; _toggledFin++ }
  function toggleRaptor1() { raptorN1Running = !raptorN1Running; _toggledRaptors.push(1) }
  function toggleRaptor2() { raptorN2Running = !raptorN2Running; _toggledRaptors.push(2) }
  function toggleRaptor3() { raptorN3Running = !raptorN3Running; _toggledRaptors.push(3) }
  function updateYokePosition() {}
`);

/** Read a legacy global by its v2 name, translating through the rename table. */
function readLegacy(name: string): unknown {
  return (legacy as unknown as Record<string, unknown>)[toLegacyName(name)];
}

const exact = (mine: unknown, theirs: unknown, label: string) =>
  expect(Object.is(mine, theirs), `${label}: ours=${String(mine)} legacy=${String(theirs)}`).toBe(
    true,
  );

/**
 * The 2021 pitchControl value as the *browser* saw it, not as the script left it.
 *
 * autoPilotLowLevelFunctions.js declares `let yokePosition` with no initialiser,
 * and the RCS path assigns it only when the required force exceeds rcsMaxThrust.
 * Inside the limits it sets `rcsThrust` and leaves yokePosition undefined — then
 * runs `pitchControl = yokePosition` and writes that to the slider.
 *
 * In a browser that assignment does not produce undefined. `pitchControl` is an
 * `<input type="range" min="-100" max="100">`, and the HTML value sanitisation
 * algorithm replaces a non-numeric value with the default, `min + (max-min)/2`,
 * which is exactly 0. updateBackEnd.js:201 then reads 0 back out.
 *
 * So the shipped behaviour is 0, and the port initialises yokePosition to 0 to
 * produce it directly. This helper applies the same sanitisation to the legacy
 * value so the comparison is against what the game did, not against a value the
 * DOM never let escape.
 */
const asBrowserSaw = (v: unknown): unknown => (v === undefined || Number.isNaN(v) ? 0 : v);

/** A state and its legacy mirror, both set from the same sample. */
interface Sample {
  pitch: Rad;
  angularVelocity: number;
  thrust: number;
  finActive: boolean;
  rcsActive: boolean;
  airDensity: number;
  trueSpeed: number;
  speedX: number;
  speedY: number;
  vehicleMass: number;
  vehicleMomentOfInertia: number;
  offAxisThrustDifferenceAcceleration: number;
  gimbalPointingDirection: Rad;
  throttleCurrent: number;
  running: readonly [boolean, boolean, boolean];
}

function apply(sample: Sample): SimState {
  const s = createInitialState();
  s.kinematics.pitch = sample.pitch;
  s.kinematics.angularVelocity = sample.angularVelocity;
  s.kinematics.trueSpeed = sample.trueSpeed;
  s.kinematics.speedX = sample.speedX;
  s.kinematics.speedY = sample.speedY;
  s.forces.thrust = sample.thrust;
  s.forces.offAxisThrustDifferenceAcceleration = sample.offAxisThrustDifferenceAcceleration;
  s.forces.rcsThrust = 0;
  s.autopilot.rcsThrustCommand = 0;
  s.atmosphere.airDensity = sample.airDensity;
  s.status.finActive = sample.finActive;
  s.status.rcsActive = sample.rcsActive;
  s.vehicle.vehicleMass = sample.vehicleMass;
  s.vehicle.vehicleMomentOfInertia = sample.vehicleMomentOfInertia;
  s.vehicle.gimbalPointingDirection = sample.gimbalPointingDirection;
  s.vehicle.throttleCurrent = sample.throttleCurrent;
  s.engines.running = [...sample.running];

  Object.assign(ctx, toLegacyKeys({
    pitch: sample.pitch,
    angularVelocity: sample.angularVelocity,
    trueSpeed: sample.trueSpeed,
    speedX: sample.speedX,
    speedY: sample.speedY,
    thrust: sample.thrust,
    offAxisThrustDifferenceAcceleration: sample.offAxisThrustDifferenceAcceleration,
    rcsThrust: 0,
    airDensity: sample.airDensity,
    finActive: sample.finActive,
    rcsActive: sample.rcsActive,
    vehicleMass: sample.vehicleMass,
    vehicleMomentOfInertia: sample.vehicleMomentOfInertia,
    gimbalPointingDirection: sample.gimbalPointingDirection,
    throttleCurrent: sample.throttleCurrent,
    raptorN1Running: sample.running[0],
    raptorN2Running: sample.running[1],
    raptorN3Running: sample.running[2],
    pitchControl: 0,
    throttle: 100,
  }));
  return s;
}

/** Deterministic spread over the states the autopilot actually meets. */
function* samples(): Generator<Sample> {
  let state = 0x5f3759df;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const RUNNING: ReadonlyArray<readonly [boolean, boolean, boolean]> = [
    [false, false, false],
    [true, false, false],
    [true, true, true],
    [false, true, true],
  ];
  for (let i = 0; i < 400; i++) {
    yield {
      pitch: rad((next() * 2 - 1) * Math.PI),
      angularVelocity: (next() * 2 - 1) * 0.6,
      // Half the samples have engines off, so the fin and RCS branches are hit.
      thrust: i % 2 === 0 ? 0 : next() * 6.6e6,
      finActive: i % 3 === 0,
      rcsActive: i % 5 === 0,
      airDensity: next() * 1.3,
      trueSpeed: next() * 2000,
      speedX: (next() * 2 - 1) * 1500,
      speedY: (next() * 2 - 1) * 800,
      vehicleMass: 120_000 + next() * 350_000,
      vehicleMomentOfInertia: 1e8 + next() * 4e7,
      offAxisThrustDifferenceAcceleration: (next() * 2 - 1) * 0.02,
      gimbalPointingDirection: rad((next() * 2 - 1) * Math.PI),
      throttleCurrent: 40 + next() * 60,
      running: RUNNING[i % RUNNING.length]!,
    };
  }
}

const ALL = [...samples()];

/**
 * The proportional RCS number `precisionAlignment` produces, wherever it lives.
 *
 * 2021 wrote it to `rcsThrust`; M2.11 moved it to `autopilot.rcsThrustCommand`,
 * because writing it to `rcsThrust` was what let `controlTranslation` destroy it
 * before anything could read it. The VALUE is unchanged and this comparison
 * still proves that, bit for bit — the departure is what happens to it
 * afterwards, and that is asserted in tests/parity/actuation.test.ts.
 */
const rcsCommandOf = (s: SimState): number =>
  s.autopilot.rcsThrustCommand !== 0 ? s.autopilot.rcsThrustCommand : s.forces.rcsThrust;

describe('precisionAlignment', () => {
  it.each([0.4, 0.5, 0.7, 1, 1.5, 3])('matches at T=%f across 400 states', (T) => {
    for (const sample of ALL) {
      const s = apply(sample);
      prim.precisionAlignment(s, rad(0.3), T);
      evalLegacy(`precisionAlignment(0.3, ${T})`);
      exact(s.autopilot.pitchControl, asBrowserSaw(readLegacy('pitchControl')), `pitchControl T=${T}`);
      exact(rcsCommandOf(s), readLegacy('rcsThrust'), `rcsThrust T=${T}`);
    }
  });

  it('matches for goals across the full angle range', () => {
    for (const goal of [-3, -1.57, -0.5, 0, 0.5, 1.57, 3, Math.PI, -Math.PI]) {
      for (const sample of ALL.slice(0, 80)) {
        const s = apply(sample);
        prim.precisionAlignment(s, rad(goal), 0.7);
        evalLegacy(`precisionAlignment(${goal}, 0.7)`);
        exact(s.autopilot.pitchControl, asBrowserSaw(readLegacy('pitchControl')), `goal=${goal}`);
        exact(rcsCommandOf(s), readLegacy('rcsThrust'), `rcsThrust goal=${goal}`);
      }
    }
  });

  it('getPitchDifference matches, including both wrap branches', () => {
    for (const pitch of [-3.1, -1, 0, 1, 3.1, Math.PI, -Math.PI]) {
      for (const goal of [-3, -1, 0, 1, 3]) {
        Object.assign(ctx, toLegacyKeys({ pitch }));
        const theirs = evalLegacy(`
          (function(){ let d = pitch - ${goal}
            if (d < -Math.PI) { d = Math.PI * 2 + d } else if (d > Math.PI) { d = -(Math.PI * 2 - d) }
            return d })()`);
        exact(prim.getPitchDifference(rad(pitch), rad(goal)), theirs, `pd(${pitch},${goal})`);
      }
    }
  });
});

describe('engine control primitives', () => {
  it('controlEnginebyTWR matches, including both clamps', () => {
    for (const goalTWR of [0, 0.5, 1, 1.6, 3, 4, 10]) {
      for (const sample of ALL.slice(0, 120)) {
        const s = apply(sample);
        prim.controlEnginebyTWR(s, goalTWR);
        evalLegacy(`controlEnginebyTWR(${goalTWR})`);
        exact(s.vehicle.throttle, readLegacy('throttle'), `twr=${goalTWR}`);
      }
    }
  });

  it('controlEnginebyEffectiveVerticalTWR matches', () => {
    for (const goalTWR of [0, 1, 2, 3]) {
      for (const sample of ALL.slice(0, 120)) {
        const s = apply(sample);
        prim.controlEnginebyEffectiveVerticalTWR(s, goalTWR);
        evalLegacy(`controlEnginebyEffectiveVerticalTWR(${goalTWR})`);
        exact(s.vehicle.throttle, readLegacy('throttle'), `vtwr=${goalTWR}`);
      }
    }
  });

  it('getEffectiveVerticalMaxThrust matches across all four quadrants', () => {
    // The preserved 2021 ladder, which is what the parity claim is about. The
    // shipped function collapsed to `cos` at M2.10; the departure is asserted
    // immediately below rather than left implicit.
    for (const sample of ALL) {
      const s = apply(sample);
      exact(
        prim.legacyEffectiveVerticalMaxThrust(s.engines.running, s.vehicle.gimbalPointingDirection),
        evalLegacy('getEffectiveVerticalMaxThrust()'),
        `evmt(${sample.gimbalPointingDirection})`,
      );
    }
  });

  it('DECLARED DEPARTURE: the shipped one is the collapsed form — M1.9/M2.10', () => {
    let differing = 0;
    let worstUlps = 0;
    for (const sample of ALL) {
      const s = apply(sample);
      const shipped = prim.getEffectiveVerticalMaxThrust(
        s.engines.running,
        s.vehicle.gimbalPointingDirection,
      );
      const ladder = prim.legacyEffectiveVerticalMaxThrust(
        s.engines.running,
        s.vehicle.gimbalPointingDirection,
      );
      // Pinned to the exact replacement expression, not merely to "close".
      expect(shipped).toBe(
        getWorkingEngineCount(s.engines.running) *
          maxThrustPerRaptor *
          Math.cos(s.vehicle.gimbalPointingDirection),
      );
      if (!Object.is(shipped, ladder)) differing += 1;
      // Measured at COEFFICIENT scale, by dividing the force difference back
      // out by the max thrust. Measuring it relative to the force itself would
      // be meaningless near the quadrant boundaries, where cos is ~1e-17 and
      // any last-bit difference is enormous relative to it while being
      // sub-newton in absolute terms.
      const maxThrust = getWorkingEngineCount(s.engines.running) * maxThrustPerRaptor;
      if (maxThrust > 0) {
        worstUlps = Math.max(worstUlps, Math.abs(shipped - ladder) / maxThrust / Number.EPSILON);
      }
    }
    expect(differing, 'nothing differed — is the collapse actually shipped?').toBeGreaterThan(0);
    expect(worstUlps, `worst ${worstUlps.toFixed(2)} ULP`).toBeLessThanOrEqual(2);
  });

  it('getMaxSpeedWithSafeDynamicPressure matches', () => {
    for (const airDensity of [1.225, 0.5, 0.01, 1e-5]) {
      Object.assign(ctx, toLegacyKeys({ airDensity }));
      exact(
        prim.getMaxSpeedWithSafeDynamicPressure(airDensity),
        evalLegacy('getMaxSpeedWithSafeDynamicPressure()'),
        `maxSpeed rho=${airDensity}`,
      );
    }
  });
});

describe('speed-holding primitives', () => {
  it('horizontalSteering matches, including the double-call fine-tune path', () => {
    for (const target of [-5, -0.8, 0, 0.72, 5, 50]) {
      for (const sample of ALL.slice(0, 100)) {
        const s = apply(sample);
        prim.horizontalSteering(s, target, rad(0.34), 5, 0.7);
        evalLegacy(`horizontalSteering(${target}, 0.34, 5, 0.7)`);
        exact(s.autopilot.pitchControl, asBrowserSaw(readLegacy('pitchControl')), `hSteer target=${target}`);
        exact(rcsCommandOf(s), readLegacy('rcsThrust'), `hSteer rcs target=${target}`);
      }
    }
  });

  it('verticalSpeedAdjustment matches', () => {
    for (const target of [-30, -20, -5, -0.1, 0]) {
      for (const sample of ALL.slice(0, 100)) {
        const s = apply(sample);
        prim.verticalSpeedAdjustment(s, target, 10, 3);
        evalLegacy(`verticalSpeedAdjustment(${target}, 10, 3)`);
        exact(s.vehicle.throttle, readLegacy('throttle'), `vsa target=${target}`);
      }
    }
  });

  it('horizontalSpeedAdjustment matches', () => {
    for (const target of [0, 10, 200]) {
      for (const sample of ALL.slice(0, 100)) {
        const s = apply(sample);
        prim.horizontalSpeedAdjustment(s, target, 10, 4);
        evalLegacy(`horizontalSpeedAdjustment(${target}, 10, 4)`);
        exact(s.vehicle.throttle, readLegacy('throttle'), `hsa target=${target}`);
      }
    }
  });

  it('speedAdjustment matches', () => {
    for (const target of [0, 100, 2000]) {
      for (const sample of ALL.slice(0, 100)) {
        const s = apply(sample);
        prim.speedAdjustment(s, target, 10, 4);
        evalLegacy(`speedAdjustment(${target}, 10, 4)`);
        exact(s.vehicle.throttle, readLegacy('throttle'), `sa target=${target}`);
      }
    }
  });
});

describe('aero braking and engine shutdown', () => {
  it.each([1 / 30, 1 / 60, 1 / 120])('aero-braking correction angle matches at dt=%f', (dt) => {
    const s = apply(ALL[7]!);
    Object.assign(ctx, toLegacyKeys({
      renderTimeInterval: 1 / dt,
      horizontalAccelerationByAeroBreakingCorrectionAngle: 0,
      accelerationX: 2.5,
    }));
    s.kinematics.accelerationX = 2.5;

    for (let i = 0; i < 300; i++) {
      // Alternate the goal so both ramp directions and both clamps are hit.
      const goal = i % 60 < 30 ? 1.0 : -1.0;
      prim.controlHorizontalAccelerationByAeroBreaking(s, goal, dt, (st) => {
        st.status.finActive = !st.status.finActive;
      });
      evalLegacy(`controlHorizontalAccelerationByAeroBreaking(${goal})`);
      exact(
        s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle,
        readLegacy('horizontalAccelerationByAeroBreakingCorrectionAngle'),
        `correction angle step ${i} dt=${dt}`,
      );
      exact(s.autopilot.pitchControl, asBrowserSaw(readLegacy('pitchControl')), `aero pitchControl step ${i}`);
    }
  });

  it('raptorAutoShutDown picks the same engine as 2021, in every configuration', () => {
    const CONFIGS: ReadonlyArray<readonly [boolean, boolean, boolean]> = [
      [true, true, true],
      [true, true, false],
      [false, true, true],
      [true, false, true],
      [true, false, false],
      [false, true, false],
      [false, false, true],
    ];
    for (const running of CONFIGS) {
      for (const vehicleMass of [130_000, 250_000, 470_000]) {
        const s = createInitialState();
        s.engines.running = [...running];
        s.vehicle.vehicleMass = vehicleMass;
        Object.assign(ctx, toLegacyKeys({
          raptorN1Running: running[0],
          raptorN2Running: running[1],
          raptorN3Running: running[2],
          vehicleMass,
        }));
        evalLegacy('_toggledRaptors = []');

        prim.raptorAutoShutDown_KeepMinTWRBelow1(s, (st, i) => {
          st.engines.running[i] = !st.engines.running[i];
        });
        evalLegacy('raptorAutoShutDown_KeepMinTWRBelow1()');

        expect(s.engines.running, `${running} at ${vehicleMass} kg`).toEqual([
          readLegacy('raptorN1Running'),
          readLegacy('raptorN2Running'),
          readLegacy('raptorN3Running'),
        ]);
      }
    }
  });
});

describe('no DOM reads', () => {
  it('every primitive runs with no document in scope', () => {
    expect(typeof globalThis.document).toBe('undefined');
    const s = apply(ALL[0]!);
    expect(() => {
      prim.precisionAlignment(s, rad(0.2), 0.5);
      prim.controlEnginebyTWR(s, 1);
      prim.horizontalSteering(s, 0, rad(0.3), 5, 0.7);
      prim.verticalSpeedAdjustment(s, -10, 10, 2);
      prim.speedAdjustment(s, 500, 10, 4);
    }).not.toThrow();
  });

  it('commands arrive through SimState, not a slider', () => {
    const s = apply(ALL[1]!);
    s.autopilot.pitchControl = 0;
    prim.precisionAlignment(s, rad(1.4), 0.5);
    // The 2021 version's last act was writing this number to an <input>.
    expect(typeof s.autopilot.pitchControl).toBe('number');
  });
});

describe('the undefined-yokePosition bug, made explicit', () => {
  /**
   * Documenting the one place the port deviates from the literal 2021 value,
   * and proving the deviation is what the game actually did.
   */
  it('legacy really does leave pitchControl undefined on the in-limits RCS path', () => {
    Object.assign(ctx, toLegacyKeys({
      pitch: 0.684316824908255,
      angularVelocity: -0.41094991844147444,
      thrust: 0,
      finActive: false,
      rcsActive: true,
      vehicleMomentOfInertia: 100591862.31344938,
      offAxisThrustDifferenceAcceleration: -0.000939986752346158,
      pitchControl: 12345,
      rcsThrust: 0,
    }));
    evalLegacy('precisionAlignment(0.3, 0.5)');

    // Not 12345, and not a number: the script wrote undefined.
    expect(readLegacy('pitchControl')).toBeUndefined();
    // And it did set rcsThrust, which is the branch that skips yokePosition.
    expect(readLegacy('rcsThrust')).not.toBe(0);
    expect(Math.abs(readLegacy('rcsThrust') as number)).toBeLessThan(800000);
  });

  it('the port writes 0 there, which is what the range input produced', () => {
    // min=-100, max=100 => default value 0. See asBrowserSaw above.
    const s = createInitialState();
    s.kinematics.pitch = rad(0.684316824908255);
    s.kinematics.angularVelocity = -0.41094991844147444;
    s.forces.thrust = 0;
    s.status.finActive = false;
    s.status.rcsActive = true;
    s.vehicle.vehicleMomentOfInertia = 100591862.31344938;
    s.forces.offAxisThrustDifferenceAcceleration = -0.000939986752346158;
    s.autopilot.pitchControl = 12345;

    prim.precisionAlignment(s, rad(0.3), 0.5);
    expect(s.autopilot.pitchControl).toBe(0);
    expect(rcsCommandOf(s)).toBe(readLegacy('rcsThrust'));
  });

  it('rcsThrust matches exactly on that path, which is what SHOULD have steered', () => {
    // The RCS force is the real output of this branch. pitchControl being
    // undefined was inert; this number was not — except that in 2021 it was,
    // because controlTranslation wiped it moments later (M2.11). The value is
    // still computed identically, which is what this asserts.
    for (const sample of ALL.filter((x) => x.thrust === 0 && !x.finActive && x.rcsActive)) {
      const s = apply(sample);
      prim.precisionAlignment(s, rad(0.3), 0.5);
      evalLegacy('precisionAlignment(0.3, 0.5)');
      exact(rcsCommandOf(s), readLegacy('rcsThrust'), 'rcsThrust on the undefined path');
    }
  });
});
