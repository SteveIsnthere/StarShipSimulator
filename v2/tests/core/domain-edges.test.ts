/**
 * M10.4 — every physics export at the edges of its input domain.
 *
 * The question this file asks is not "is the model accurate" (M10.3 asks that)
 * but "does it ever return a number that is quietly meaningless". A NaN is the
 * benign case: it is loud, and it poisons whatever it touches until someone
 * notices. The dangerous case is a plausible finite wrong answer, because a
 * golden fixture records it as the truth and no assertion ever disagrees.
 *
 * SCOPE is `src/core/physics/**`. The control layer's edges are M10.5's.
 *
 * WHAT COUNTS AS REACHABLE. An input the simulation can actually present, not
 * every value the type permits. `gravityAt(0)` is Infinity, and that is fine —
 * it means the vehicle is at the planet's centre, which the simulation has no
 * way to produce. A vehicle at rest, or below sea level, or at exactly the
 * deorbit delta-v, is a different matter. Each test below says which it is.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { rad } from '$core/units';
import {
  getAcceleration,
  getAngleOfMotion,
  getAngularAcceleration,
  getAttackAngles,
  getBodyDragCoefficient,
  getCrossSectionalArea,
  getDynamicPressure,
  getLiftCoefficient,
} from '$core/physics/aero';
import { getThrust } from '$core/physics/engines';
import { coastDownrangeDistance } from '$core/physics/gravity';
import { isaAtmosphere } from '$core/physics/isa';
import { speedOfSoundAt, updateAtmosphere } from '$core/physics/atmosphere';
import { getReentryHeatPower } from '$core/physics/thermal';
import { step } from '$core/step';
import { GOLDEN_SPECS } from '../golden/scenarios';

/**
 * A real flying vehicle, not a default state.
 *
 * `createInitialState` takes an RNG SEED, not a scenario name — passing it a
 * string yields a parked vehicle with its engines off, and a draft of this file
 * did exactly that. Every assertion about "a full flight" then passed because
 * nothing was flying. The golden specs build a configured, ignited vehicle, so
 * they are what these tests fly.
 */
const flyingState = (id: string) => GOLDEN_SPECS.find((spec) => spec.id === id)!.build();

describe('the atmosphere at the edges of its table', () => {
  it('clamps below sea level rather than extrapolating downward', () => {
    // REACHABLE: a vehicle sitting on the pad is at 0, and the landing logic
    // works in a band around it that can dip slightly negative. The ISA has no
    // layer below sea level, so `tableStateAt` clamps geopotential at 0 — the
    // alternative would run the troposphere's lapse rate backwards and report
    // air hotter and denser than the standard allows.
    const seaLevel = isaAtmosphere(0);
    for (const below of [-1, -100, -1_000, -100_000]) {
      const a = isaAtmosphere(below);
      expect(a.airDensity, `${below} m`).toBe(seaLevel.airDensity);
      expect(a.airTemperature, `${below} m`).toBe(seaLevel.airTemperature);
    }
  });

  it('stays finite and positive far above the table, and never goes negative', () => {
    // REACHABLE: the table's lapse rates end at 86 km and the exponential bands
    // at 1000 km, but nothing stops the vehicle climbing past either.
    for (const h of [86_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]) {
      const a = isaAtmosphere(h);
      expect(Number.isFinite(a.airDensity), `${h} m density finite`).toBe(true);
      expect(a.airDensity, `${h} m density positive`).toBeGreaterThan(0);
      expect(Number.isFinite(a.airPressure), `${h} m pressure finite`).toBe(true);
      expect(a.airPressure).toBeGreaterThan(0);
    }
  });

  it('density falls monotonically over the whole reachable range', () => {
    // A property sweep, not spot checks: density that rose anywhere would mean
    // a seam between two layers or bands is joined wrong, and a vehicle
    // descending through it would feel a step change in drag.
    let previous = Infinity;
    for (let h = 0; h <= 1_000_000; h += 500) {
      const density = isaAtmosphere(h).airDensity;
      expect(density, `at ${h} m`).toBeLessThan(previous);
      previous = density;
    }
  });

  it('updateAtmosphere is isaAtmosphere, at every altitude sampled', () => {
    // The shipped atmosphere is the ISA (M2.10). Pinned because the module
    // still exports the retired three-layer model beside it.
    for (let h = 0; h <= 200_000; h += 1_000) {
      expect(updateAtmosphere(h), `at ${h} m`).toEqual(isaAtmosphere(h));
    }
  });
});

describe('the speed of sound at the edge of its physical domain', () => {
  it('is zero at absolute zero and NaN below it', () => {
    // NOT REACHABLE from the model: the coldest the ISA gets is about -90 C at
    // the mesopause, so `sqrt` never sees a negative. Asserted anyway because
    // the export is public and the failure is silent — a NaN Mach number feeds
    // getBodyDragCoefficient, and NaN drag would quietly stop the vehicle
    // decelerating rather than announcing itself.
    expect(speedOfSoundAt(-273.15)).toBe(0);
    expect(Number.isNaN(speedOfSoundAt(-273.16))).toBe(true);
    expect(Number.isNaN(speedOfSoundAt(-300))).toBe(true);
  });

  it('never returns NaN for any temperature the atmosphere can produce', () => {
    // The claim above, checked rather than asserted: sweep the model's own
    // output range and confirm the composition is safe.
    for (let h = 0; h <= 1_000_000; h += 1_000) {
      const a = speedOfSoundAt(isaAtmosphere(h).airTemperature);
      expect(Number.isFinite(a), `at ${h} m`).toBe(true);
      expect(a, `at ${h} m`).toBeGreaterThan(0);
    }
  });
});

describe('the aerodynamic coefficients over their whole reachable domain', () => {
  it('the lift curve is bounded — but only because its input is wrapped', () => {
    // The top segment is `-1.1 * |aoa| + 1.728`, which is UNBOUNDED BELOW. It
    // is safe solely because getAttackAngles wraps into [-pi, pi]: at pi the
    // coefficient is -1.7278, and at 2pi it would be -5.18.
    //
    // So this asserts the two halves together. If someone ever removes the
    // wrap, or feeds this an unwrapped angle, lift silently triples rather
    // than failing — and a golden would record the result as correct.
    for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 2000) {
      const cl = getLiftCoefficient(rad(a));
      expect(Number.isFinite(cl), `aoa ${a}`).toBe(true);
      expect(Math.abs(cl), `aoa ${a}`).toBeLessThanOrEqual(1.728);
    }
    // The bound is tight, not generous: it is attained at the wrap limit.
    expect(getLiftCoefficient(rad(Math.PI))).toBeCloseTo(-1.727752, 6);
    // And this is what the wrap is protecting against.
    expect(getLiftCoefficient(rad(2 * Math.PI))).toBeLessThan(-5);
  });

  it('and getAttackAngles really does wrap into [-pi, pi]', () => {
    // The other half of the pair above. Signature is (pitch, angleOfMotion) —
    // spelt out because an earlier draft passed them the other way round, and a
    // symmetric sweep hides that: the assertions still pass while the failure
    // labels are backwards and an argument-order regression goes undetected.
    // The grids below are deliberately DIFFERENT sizes so order matters.
    for (let pitch = -Math.PI; pitch <= Math.PI; pitch += Math.PI / 60) {
      for (let motion = -Math.PI; motion <= Math.PI; motion += Math.PI / 47) {
        const angles = getAttackAngles(rad(pitch), rad(motion));
        for (const [name, value] of Object.entries(angles)) {
          expect(Number.isFinite(value), `${name} at pitch=${pitch}, motion=${motion}`).toBe(true);
          expect(Math.abs(value), `${name} at pitch=${pitch}, motion=${motion}`).toBeLessThanOrEqual(Math.PI + 1e-12);
        }
      }
    }
  });

  it('body drag is capped at Mach 10 and never runs away', () => {
    // Mach 30 is beyond anything this vehicle reaches, but the cap is what
    // stops a re-entry from acquiring unbounded drag, so it is worth pinning
    // well past the reachable range.
    expect(getBodyDragCoefficient(0)).toBeCloseTo(1.153, 6);
    for (const mach of [10, 11, 30, 100, 1e6]) {
      expect(getBodyDragCoefficient(mach), `Mach ${mach}`).toBe(2.5);
    }
    // Monotone non-decreasing up to the cap: drag must not fall as it goes
    // faster anywhere in between.
    let previous = -Infinity;
    for (let mach = 0; mach <= 12; mach += 0.01) {
      const cd = getBodyDragCoefficient(mach);
      expect(cd, `Mach ${mach}`).toBeGreaterThanOrEqual(previous);
      previous = cd;
    }
  });

  it('cross-sectional area is positive at every attitude', () => {
    // It is a sum of two absolute values, so it cannot be negative; what
    // matters is that it is never ZERO, because drag and lift multiply by it
    // and a zero would make the vehicle briefly frictionless.
    for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 500) {
      expect(getCrossSectionalArea(rad(a), 300), `aoa ${a}`).toBeGreaterThan(0);
    }
  });

  it('angle of motion is defined even when the vehicle is not moving', () => {
    // REACHABLE and ordinary: a vehicle on the pad has both components zero.
    // atan2(0, 0) is 0 by definition rather than NaN, which is what makes the
    // pre-launch state safe.
    expect(getAngleOfMotion(0, 0)).toBe(0);
    expect(Number.isFinite(getAngleOfMotion(0, -1))).toBe(true);
  });

  it('dynamic pressure is zero in vacuum and never negative for real air', () => {
    for (const v of [0, 1, 1_000, 11_000]) {
      expect(getDynamicPressure(0, v), `v=${v}`).toBe(0);
    }
    for (let h = 0; h <= 500_000; h += 2_500) {
      expect(getDynamicPressure(isaAtmosphere(h).airDensity, 7_800), `${h} m`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Newton's second law at zero and negative mass", () => {
  it('is Infinity at zero mass, which is a loud failure rather than a quiet one', () => {
    // NOT REACHABLE: vehicleMass is dry mass plus propellant, and dry mass is a
    // positive constant, so it cannot reach zero even with tanks empty. Pinned
    // because Infinity is the RIGHT behaviour here — it propagates visibly,
    // where a clamp would invent a finite acceleration nobody asked for.
    expect(getAcceleration(1000, 0)).toBe(Infinity);
    expect(Number.isNaN(getAcceleration(0, 0))).toBe(true);
    expect(getAngularAcceleration(1, 1, 0)).toBe(Infinity);
  });

  it('and mass stays positive across a full flight, so none of that is reached', () => {
    // The claim that it is unreachable, checked rather than assumed.
    let s = flyingState('launch-pad-takeoff');
    const startMass = s.vehicle.vehicleMass;
    for (let i = 0; i < 2_000; i++) {
      s = step(s, 1 / 60);
      expect(s.vehicle.vehicleMass, `step ${i}`).toBeGreaterThan(0);
      expect(Number.isFinite(s.vehicle.vehicleMass), `step ${i}`).toBe(true);
    }
    // And it really flew — burning propellant, so the sweep above covered a
    // changing mass rather than a constant one.
    expect(s.vehicle.vehicleMass).toBeLessThan(startMass);
    expect(s.kinematics.altitude).toBeGreaterThan(1_000);
  });
});

describe('the step function at the edges of dt', () => {
  it('a dt of zero advances nothing and produces no NaN', () => {
    // REACHABLE: a paused or backgrounded tab can deliver a zero-length frame,
    // and the accumulator can hand the sim a zero remainder.
    const before = flyingState('launch-pad-takeoff');
    const after = step(before, 0);
    expect(after.kinematics.altitude).toBe(before.kinematics.altitude);
    expect(after.kinematics.speedY).toBe(before.kinematics.speedY);
    expect(Number.isFinite(after.vehicle.vehicleMass)).toBe(true);
  });

  it('a dt of a whole second stays finite in every field it integrates', () => {
    // REACHABLE at the other extreme: a long frame after a stall. The result
    // will be less accurate — a fixed step exists precisely so this is rare —
    // but it must not be nonsense.
    let s = flyingState('launch-pad-takeoff');
    for (let i = 0; i < 60; i++) s = step(s, 1);
    for (const [name, value] of Object.entries(s.kinematics)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), `kinematics.${name}`).toBe(true);
      }
    }
  });
});

describe('engines and thrust at the edges', () => {
  it('no engines is zero thrust, not a division or a NaN', () => {
    expect(getThrust([false, false, false], 100)).toBe(0);
    expect(getThrust([], 100)).toBe(0);
    expect(getThrust([true, true, true], 0)).toBe(0);
  });
});

describe('re-entry heating at the edges', () => {
  it('is zero at rest and in vacuum, and finite through a whole descent', () => {
    // The Sutton-Graves form goes as v^3 * sqrt(rho / R_nose), so v = 0 or
    // rho = 0 must give exactly zero heating rather than a NaN.
    // Argument order is (trueSpeed, airDensity, noseRadius) — easy to transpose,
    // and transposing it makes this test assert nothing, so it is spelt out.
    expect(getReentryHeatPower(0, 0, C.NOSE_RADIUS)).toBe(0);
    expect(getReentryHeatPower(0, 1.225, C.NOSE_RADIUS), 'at rest in thick air').toBe(0);
    expect(getReentryHeatPower(7_800, 0, C.NOSE_RADIUS), 'fast in vacuum').toBe(0);
    for (let h = 0; h <= 200_000; h += 2_000) {
      const q = getReentryHeatPower(7_800, isaAtmosphere(h).airDensity, C.NOSE_RADIUS);
      expect(Number.isFinite(q), `${h} m`).toBe(true);
      expect(q, `${h} m`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the ballistic coast predictor', () => {
  /**
   * M10.4, Bug-fix tier. This case returned NaN before the fix in
   * `coastDownrangeDistance`, and the NaN reached the deorbit autopilot.
   */
  it('a purely radial fall covers no downrange distance — it does not return NaN', () => {
    const rTarget = C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE;
    const result = coastDownrangeDistance(C.planetRadius + 200_000, 0, 0, rTarget);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBe(0);
  });

  it('and the whole neighbourhood of zero is finite, not just the exact point', () => {
    // THIS IS THE TEST THAT MATTERS, and an earlier draft of this file did not
    // have it. In its place was `expect(DEORBIT_DELTA_V - DEORBIT_DELTA_V)
    // .toBe(0)` — a tautology that called nothing under test, passed with the
    // fix reverted, and taught nothing. It let a first attempt at the guard
    // (`semiLatusRectum === 0`, an exact float comparison) look correct while
    // it repaired precisely one input: the NaN band actually ran out to
    // |tangentialSpeed| <= 4.09e-5 m/s, about three billion doubles.
    //
    // A sweep across the band is what discriminates, so the band is swept.
    const rTarget = C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE;
    const r = C.planetRadius + 200_000;
    for (const magnitude of [0, 1e-12, 1e-9, 1e-6, 1e-5, 4.09e-5, 1e-4, 1e-3, 0.1, 1]) {
      for (const vt of [magnitude, -magnitude]) {
        const out = coastDownrangeDistance(r, vt, 0, rTarget);
        expect(Number.isNaN(out), `tangential speed ${vt}`).toBe(false);
      }
    }
  });

  it('and the reachability claim is about a real caller, checked by arithmetic', () => {
    // `predictedDeorbitRange` passes `speedX - DEORBIT_DELTA_V` as the
    // tangential speed, so the degenerate input is presented by any vehicle
    // moving downrange at close to the deorbit delta-v. Asserted against the
    // function, not against itself.
    const rTarget = C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE;
    const r = C.planetRadius + 200_000;
    for (const speedX of [C.DEORBIT_DELTA_V, C.DEORBIT_DELTA_V + 1e-9, C.DEORBIT_DELTA_V - 1e-9]) {
      const out = coastDownrangeDistance(r, speedX - C.DEORBIT_DELTA_V, 0, rTarget);
      expect(Number.isNaN(out), `speedX ${speedX}`).toBe(false);
    }
  });

  it('a real orbit still predicts a sensible arc', () => {
    // Guards against "fixing" the degenerate case by short-circuiting the
    // whole function: the ordinary path must keep working.
    const rTarget = C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE;
    const arc = coastDownrangeDistance(C.planetRadius + 200_000, 7_650, 0, rTarget);
    expect(Number.isFinite(arc)).toBe(true);
    expect(arc).toBeGreaterThan(1_000_000);
    expect(arc).toBeLessThan(20_000_000);
  });

  it('a circular orbit never descends, and says so', () => {
    const r = C.planetRadius + 200_000;
    const circular = Math.sqrt((C.gravitationalConstant * C.planetMass) / r);
    expect(coastDownrangeDistance(r, circular, 0, C.planetRadius)).toBe(Infinity);
  });
});
