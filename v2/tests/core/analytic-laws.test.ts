/**
 * M10.3 — the laws, checked against physics rather than against 2021.
 *
 * `tests/parity/` is gone (M10.2). What replaced it is not fewer assertions but
 * assertions whose authority is outside this repo: closed-form identities,
 * published constants, and the dimensional structure of the equations
 * themselves. Nothing here compares against another implementation. Every one
 * of these would still be true if the simulator had never existed.
 *
 * WHERE THE REST OF M10.3 LIVES. This file holds what had no home. Already
 * asserted elsewhere, and deliberately not duplicated:
 *   tests/core/isa.test.ts             the US Standard Atmosphere 1976 table,
 *                                      to the precision the table is printed at
 *   tests/core/speed-of-sound.test.ts  a = sqrt(gamma * R * T)
 *   tests/core/orbit.test.ts           circular orbits, period, conservation
 *   tests/core/angular-momentum.test.ts  r*v_t conserved; a coast against an
 *                                      independent two-body integration
 *
 * ON TOLERANCES. Every bound below is derived and says what from. Most are in
 * ULPs, because these are algebraic identities between floating-point
 * expressions: the only thing separating the two sides is rounding, so the
 * honest bound is rounding, and a bound looser than that cannot discriminate.
 * A tolerance chosen to make a test pass is worse than no test.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import {
  circularOrbitalSpeed,
  gravityAt,
  MU,
  specificAngularMomentum,
  specificOrbitalEnergy,
} from '$core/physics/gravity';
import {
  getAcceleration,
  getAngularAcceleration,
  getDrag,
  getDynamicPressure,
} from '$core/physics/aero';

/**
 * Distance between two doubles counted in representable values between them.
 *
 * 0 means bit-identical; 1 means adjacent — the closest two distinct doubles can
 * be. This is the unit every algebraic identity below is judged in.
 *
 * COUNTED FROM THE BITS, not estimated as `max(|a|,|b|) * EPSILON`. That
 * estimate is what this helper did first, and it is wrong by up to a factor of
 * two: the spacing of doubles doubles at each power of two, so within a binade
 * `|a| * EPSILON` overstates the step for values near the bottom and
 * understates it near the top. A genuine two-step difference just under a power
 * of two would have reported 1.0 and slipped through a `<= 1` bound — the exact
 * failure these tests exist to catch.
 *
 * For finite doubles of the same sign the IEEE-754 bit patterns are
 * monotonically ordered, so subtracting them as integers gives the exact count.
 */
const ULP_VIEW = new DataView(new ArrayBuffer(8));
function ulpsApart(a: number, b: number): number {
  if (a === b) return 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  // Straddling zero has no meaningful step count, and nothing here compares
  // across a sign change; treat it as a failure rather than inventing a number.
  if (a < 0 !== b < 0) return Infinity;
  ULP_VIEW.setFloat64(0, Math.abs(a));
  const bitsA = ULP_VIEW.getBigUint64(0);
  ULP_VIEW.setFloat64(0, Math.abs(b));
  const bitsB = ULP_VIEW.getBigUint64(0);
  return Number(bitsA > bitsB ? bitsA - bitsB : bitsB - bitsA);
}

describe('the ULP helper itself', () => {
  it('counts adjacent doubles as 1 and identical ones as 0', () => {
    // Without this the bounds below are unfalsifiable: a helper that always
    // returned 0 would make every identity in this file pass.
    expect(ulpsApart(1, 1)).toBe(0);
    expect(ulpsApart(1, 1 + Number.EPSILON)).toBe(1);
    expect(ulpsApart(1, 1 + 2 * Number.EPSILON)).toBe(2);
    // Near the top of a binade, where the old max*EPSILON estimate halved the
    // count: 2 - EPSILON is two steps below 2 in the [1,2) binade.
    expect(ulpsApart(2, 2 - Number.EPSILON)).toBe(1);
    expect(ulpsApart(1e300, 1e300)).toBe(0);
    expect(ulpsApart(1, -1)).toBe(Infinity);
    expect(ulpsApart(1, NaN)).toBe(Infinity);
  });
});

/** Radii spanning surface to well beyond any orbit the simulator can fly. */
const RADII = [
  C.planetRadius,
  C.planetRadius + 100_000,
  C.planetRadius + 400_000,
  C.planetRadius * 1.5,
  C.planetRadius * 2,
  C.planetRadius * 10,
  C.planetRadius * 100,
];

describe('gravity is inverse-square, to the last bit', () => {
  it('g(r) * r^2 is the gravitational parameter, within 1 ULP', () => {
    // Newton's law of universal gravitation. The product g*r^2 is GM by
    // definition and must not drift with r — if it did, the field would not be
    // inverse-square and no orbit in this simulator would close.
    //
    // 1 ULP, not a relative epsilon: g(r) is literally `MU / r**2`, so
    // g(r)*r**2 recovers MU through one division and one multiplication. Each
    // rounds at most half an ULP, so the identity cannot be worse than ~1 ULP
    // and any excess would mean the expression is not what it claims.
    // Measured: 0 or 0.71 ULP across this sweep.
    for (const r of RADII) {
      expect(ulpsApart(gravityAt(r) * r * r, MU), `r = ${r} m`).toBeLessThanOrEqual(1);
    }
  });

  it('and halving the distance quadruples it, exactly', () => {
    // Scaling by a power of two is exact in binary floating point, so this
    // identity has no rounding to allow for at all: 0 ULP, not 1.
    for (const r of RADII) {
      expect(ulpsApart(gravityAt(r / 2), gravityAt(r) * 4), `r = ${r} m`).toBe(0);
    }
  });

  it('MU is G*M as published, not a fitted number', () => {
    // The standard gravitational parameter is the product of the two published
    // constants, exactly — this guards against someone "tuning" MU directly.
    expect(MU).toBe(C.gravitationalConstant * C.planetMass);
  });
});

describe('the vis-viva equation holds', () => {
  /**
   * v^2 = MU * (2/r - 1/a).
   *
   * The energy integral of the two-body problem, and the statement that orbital
   * speed is fixed by where you are and the size of the orbit — nothing else.
   */
  const visViva = (r: number, a: number) => MU * (2 / r - 1 / a);

  it('for a circular orbit, where a = r and it reduces to MU/r', () => {
    // circularOrbitalSpeed is sqrt(MU/r); vis-viva at a = r gives MU*(2/r - 1/r)
    // = MU/r. The two reach the same value by different arithmetic — 2/r - 1/r
    // is two divisions and a subtraction against one division — so a few ULP of
    // disagreement is expected and anything more is a real difference.
    // Bound: 4 ULP, from the four rounding operations that separate the forms.
    for (const r of RADII) {
      const v = circularOrbitalSpeed(r);
      expect(ulpsApart(v * v, visViva(r, r)), `r = ${r} m`).toBeLessThanOrEqual(4);
    }
  });

  it('specific orbital energy is -MU/2a on a circular orbit', () => {
    // E = v^2/2 - MU/r, and for a circle that is -MU/2r. This is the same law
    // seen as an energy rather than a speed, and it is what makes an orbit
    // closed: E < 0 is bound, E >= 0 escapes.
    //
    // Bound is relative, not ULP: E is a difference of two terms of similar
    // magnitude and opposite sign, so it suffers cancellation — at r = R the
    // two terms are ~3.1e7 and the result ~-3.1e7, and the subtraction discards
    // low bits of both. 1e-15 relative is a few ULP of the LARGER operand,
    // which is the right scale for a cancelling difference.
    for (const r of RADII) {
      const v = circularOrbitalSpeed(r);
      const energy = specificOrbitalEnergy(r, v);
      expect(Math.abs(energy / (-MU / (2 * r)) - 1), `r = ${r} m`).toBeLessThan(1e-15);
    }
  });

  it('and angular momentum r*v is what Kepler’s second law conserves', () => {
    // h = r * v_t. On a circle v_t is the whole speed, so h = r*sqrt(MU/r)
    // = sqrt(MU*r). Exact identity, checked to 2 ULP for the sqrt and multiply.
    for (const r of RADII) {
      const h = specificAngularMomentum(r, circularOrbitalSpeed(r));
      expect(ulpsApart(h, Math.sqrt(MU * r)), `r = ${r} m`).toBeLessThanOrEqual(2);
    }
  });
});

describe("Kepler's third law", () => {
  it('T^2 = 4*pi^2*a^3/MU — the period follows from the radius alone', () => {
    // The orbital period computed two independent ways: geometrically, as the
    // circumference over the speed, and from Kepler's third law, which knows
    // nothing about speed. They agree because both follow from the same
    // inverse-square field.
    //
    // 8 ULP: the two routes differ by a sqrt, a cube, several divisions and a
    // pi, so ~8 roundings separate them. Measured well inside this.
    for (const r of RADII) {
      const fromSpeed = (2 * Math.PI * r) / circularOrbitalSpeed(r);
      const fromKepler = 2 * Math.PI * Math.sqrt(r ** 3 / MU);
      expect(ulpsApart(fromSpeed, fromKepler), `r = ${r} m`).toBeLessThanOrEqual(8);
    }
  });

  it('and low orbit takes about 89 minutes, which is a fact about Earth', () => {
    // A sanity anchor with an external referent: anything in low Earth orbit
    // takes roughly an hour and a half. If this simulator's planet drifted from
    // Earth-like, every orbital number above would still be self-consistent and
    // all of them would be wrong.
    const r = C.planetRadius + 200_000;
    const minutes = (2 * Math.PI * r) / circularOrbitalSpeed(r) / 60;
    expect(minutes).toBeGreaterThan(80);
    expect(minutes).toBeLessThan(95);
  });
});

describe('the aerodynamic terms are dimensionally what they claim', () => {
  it('dynamic pressure goes as rho and as v squared', () => {
    // q = 1/2 rho v^2. Doubling density doubles it; doubling speed quadruples
    // it. Both scalings are by powers of two and therefore exact — 0 ULP, no
    // tolerance to justify.
    const rho = 0.4;
    const v = 320;
    expect(ulpsApart(getDynamicPressure(rho * 2, v), getDynamicPressure(rho, v) * 2)).toBe(0);
    expect(ulpsApart(getDynamicPressure(rho, v * 2), getDynamicPressure(rho, v) * 4)).toBe(0);
  });

  it('and it is in kPa, while drag is in newtons — the one unit trap here', () => {
    // getDynamicPressure returns `rho * v^2 * 0.0005`, which is 1/2 rho v^2
    // divided by a thousand: kPa, matching the atmosphere model's pressure
    // units. getDrag returns `1/2 rho v^2 Cd A` undivided: newtons.
    //
    // So drag is q * 1000 * Cd * A, and asserting that pins BOTH the shared
    // 1/2-rho-v-squared core and the factor of a thousand between them. Anyone
    // "tidying" one of the two constants breaks this.
    //
    // 2 ULP: 0.0005 * 1000 is not exactly 0.5 in binary, so the two routes to
    // the same physical quantity differ by rounding, not by structure.
    const rho = 0.6;
    const v = 250;
    const area = 62;
    const cd = 1.4;
    const fromQ = getDynamicPressure(rho, v) * 1000 * cd * area;
    expect(ulpsApart(getDrag(rho, v, area, cd), fromQ)).toBeLessThanOrEqual(2);
  });

  it('drag is linear in area and in the coefficient', () => {
    // Both appear to the first power in 1/2 rho v^2 Cd A. Exact under doubling.
    const rho = 0.9;
    const v = 180;
    expect(ulpsApart(getDrag(rho, v, 40 * 2, 1.2), getDrag(rho, v, 40, 1.2) * 2)).toBe(0);
    expect(ulpsApart(getDrag(rho, v, 40, 1.2 * 2), getDrag(rho, v, 40, 1.2) * 2)).toBe(0);
  });

  it("Newton's second law: acceleration is force over mass", () => {
    // F = ma, rearranged. Doubling the force doubles the acceleration and
    // doubling the mass halves it — exactly, both being powers of two.
    expect(ulpsApart(getAcceleration(1000 * 2, 500), getAcceleration(1000, 500) * 2)).toBe(0);
    expect(ulpsApart(getAcceleration(1000, 500 * 2), getAcceleration(1000, 500) / 2)).toBe(0);
  });

  it('and its rotational twin: angular acceleration is torque over inertia', () => {
    // alpha = F*r/I. Linear in the force and in the moment arm, inverse in the
    // moment of inertia. A sign convention that flipped here would flip every
    // attitude response in the vehicle.
    const f = 2_000;
    const r = 12;
    const inertia = 4.5e7;
    expect(ulpsApart(getAngularAcceleration(f * 2, r, inertia), getAngularAcceleration(f, r, inertia) * 2)).toBe(0);
    expect(ulpsApart(getAngularAcceleration(f, r * 2, inertia), getAngularAcceleration(f, r, inertia) * 2)).toBe(0);
    expect(getAngularAcceleration(-f, r, inertia)).toBe(-getAngularAcceleration(f, r, inertia));
  });
});
