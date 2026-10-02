/**
 * The rotating ground frame (Phase 6, Task 9a, Refactor).
 *
 * The simulation integrates ground-relative speeds. A planet turning at omega
 * in the flight plane adds the Coriolis (2*omega*v) and centrifugal
 * (omega^2*r) terms to the two polar equations (physics/gravity.ts). At
 * omega = 0 the expressions are the inertial ones bit for bit — that is what
 * lets 9a land without moving a golden — and at omega != 0 they are the
 * inertial equations seen from the turning ground, which the tests below prove
 * by transforming back.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  circularOrbitalSpeed,
  coastDownrangeDistance,
  gravityAt,
  groundTangentialSpeed,
  inertialTangentialSpeed,
  MU,
  tangentialAcceleration,
  verticalGravityAcceleration,
  verticalWeight,
} from '$core/physics/gravity';

/** rad/s — Earth's sidereal rate (IERS), for scale. */
const EARTH = 7.2921159e-5;

const radius = fc.double({ min: 6.3e6, max: 5e7, noNaN: true });
const speed = fc.double({ min: -9e3, max: 9e3, noNaN: true });
const omega = fc.double({ min: -2e-4, max: 2e-4, noNaN: true });

describe('at omega = 0 the frame is inertial, bit for bit', () => {
  it('both equations are the inertial expressions on the same operands', () => {
    fc.assert(
      fc.property(radius, speed, speed, (r, vt, vr) => {
        expect(Object.is(verticalGravityAcceleration(r, vt, 0), vt ** 2 / r - gravityAt(r))).toBe(true);
        expect(Object.is(tangentialAcceleration(r, vt, vr, 0), (-vr * vt) / r)).toBe(true);
      }),
    );
  });

  it('keeps the sign of a zero speed', () => {
    // `v + 0` would make -0 into +0, and a zero speed's sign reaches atan2.
    expect(Object.is(inertialTangentialSpeed(7e6, -0, 0), -0)).toBe(true);
    expect(Object.is(tangentialAcceleration(7e6, -0, -5, 0), (5 * -0) / 7e6)).toBe(true);
  });

  it('is what step() uses today: the default rate is zero', () => {
    expect(verticalGravityAcceleration(7e6, 1234)).toBe(verticalGravityAcceleration(7e6, 1234, 0));
    expect(tangentialAcceleration(7e6, 1234, -56)).toBe(tangentialAcceleration(7e6, 1234, -56, 0));
  });
});

describe('at omega != 0 it is the inertial motion seen from the turning ground', () => {
  it('adds Coriolis and centrifugal terms: a_r += 2 omega v_t + omega^2 r, a_t -= 2 omega v_r', () => {
    fc.assert(
      fc.property(radius, speed, speed, omega, (r, vt, vr, w) => {
        const ar = verticalGravityAcceleration(r, vt, w);
        const at = tangentialAcceleration(r, vt, vr, w);
        const expectedR = vt ** 2 / r - gravityAt(r) + 2 * w * vt + w ** 2 * r;
        const expectedT = (-vr * vt) / r - 2 * w * vr;
        expect(Math.abs(ar - expectedR)).toBeLessThan(1e-9 * (1 + Math.abs(expectedR)));
        expect(Math.abs(at - expectedT)).toBeLessThan(1e-9 * (1 + Math.abs(expectedT)));
      }),
    );
  });

  it('conserves the inertial angular momentum r (v_t + omega r)', () => {
    // dh/dt = v_r (v_t + omega r) + r (a_t + omega v_r), and it must vanish.
    fc.assert(
      fc.property(radius, speed, speed, omega, (r, vt, vr, w) => {
        const dh = vr * (vt + w * r) + r * (tangentialAcceleration(r, vt, vr, w) + w * vr);
        expect(Math.abs(dh)).toBeLessThan(1e-6 * (1 + Math.abs(vr * (vt + w * r))));
      }),
    );
  });

  it('holds a body still over the ground at the synchronous radius', () => {
    // Gravity balances the centrifugal term exactly where omega^2 r^3 = GM:
    // 42,164 km for Earth's sidereal rate, the geostationary radius.
    const r = (3.986004418e14 / EARTH ** 2) ** (1 / 3);
    expect(r / 1000).toBeCloseTo(42_164, 0);
    expect(verticalGravityAcceleration(r, 0, EARTH)).toBeCloseTo(0, 12);
  });

  it("puts the pad's own eastward speed in the inertial figure", () => {
    expect(inertialTangentialSpeed(6_371_000, 0, EARTH)).toBeCloseTo(464.58, 2);
  });
});

describe('the frame conversions and the guidance that reads them', () => {
  it('ground and inertial tangential speeds are inverses: v_inertial = v_ground + omega r', () => {
    fc.assert(
      fc.property(radius, speed, omega, (r, v, w) => {
        expect(groundTangentialSpeed(r, v, w)).toBeCloseTo(v - w * r, 9);
        expect(inertialTangentialSpeed(r, groundTangentialSpeed(r, v, w), w)).toBeCloseTo(v, 9);
      }),
    );
  });

  it("a vehicle with no ground speed weighs gravity less the ground's centrifugal term", () => {
    const r = 6_371_000;
    expect(verticalWeight(r, EARTH)).toBeCloseTo(gravityAt(r) - EARTH ** 2 * r, 12);
    expect(verticalWeight(r, 0)).toBe(gravityAt(r));
  });

  it("the coast conic's ground arc is the inertial arc less what the ground turned under it", () => {
    // An independent reference: two-body motion integrated in the INERTIAL
    // frame by small steps, accumulating the ground arc r (dtheta/dt - omega)
    // directly. The conic takes the ground speed and must give the same arc.
    const r0 = 6_371_000 + 150_000;
    const inertial = circularOrbitalSpeed(r0) - 120;
    const target = 6_371_000 + 80_000;
    let r = r0;
    let vr = 0;
    const h = r0 * inertial;
    let ground = 0;
    const dt = 0.01;
    for (let i = 0; i < 2_000_000 && r > target; i++) {
      const vt = h / r;
      vr += ((vt * vt) / r - MU / (r * r)) * dt;
      r += vr * dt;
      ground += (vt - EARTH * r) * dt;
    }
    const conic = coastDownrangeDistance(r0, groundTangentialSpeed(r0, inertial, EARTH), 0, target, EARTH);
    expect(Math.abs(conic / ground - 1)).toBeLessThan(1e-4);
    // And it is shorter than the inertial arc by the ground's turn, hundreds of km.
    const inertialArc = coastDownrangeDistance(r0, inertial, 0, target, 0);
    expect(inertialArc - conic).toBeGreaterThan(100_000);
  });

  it('a fall that is radial in the inertial frame still covers ground: -omega times the integral of r dt', () => {
    // Ground speed -omega r is zero inertial angular momentum: the conic is a
    // line. The reference integrates the same radial fall in its own steps.
    const r0 = 6_371_000 + 150_000;
    const target = 6_371_000 + 80_000;
    let r = r0;
    let vr = 0;
    let integral = 0;
    const dt = 0.001;
    while (r > target) {
      vr -= (MU / (r * r)) * dt;
      integral += r * dt;
      r += vr * dt;
    }
    const conic = coastDownrangeDistance(r0, groundTangentialSpeed(r0, 0, EARTH), 0, target, EARTH);
    expect(conic).toBeLessThan(0);
    expect(Math.abs(conic / (-EARTH * integral) - 1)).toBeLessThan(1e-3);
    expect(coastDownrangeDistance(r0, 0, 0, target, 0)).toBe(0);
  });

  it('a radial climb that never comes back is +Infinity, the no-intercept answer, at either sign of omega', () => {
    const r0 = 6_371_000 + 150_000;
    const target = 6_371_000 + 80_000;
    for (const w of [EARTH, -EARTH]) {
      expect(coastDownrangeDistance(r0, groundTangentialSpeed(r0, 0, w), 12_000, target, w)).toBe(Infinity);
    }
  });

  it('a radial fall too slow to finish within the step cap is +Infinity, not a guess', () => {
    // From rest at a hundred million kilometres the fall takes years; the cap
    // is about 28 hours.
    const far = 1e11;
    expect(coastDownrangeDistance(far, groundTangentialSpeed(far, 0, EARTH), 0, 6_451_000, EARTH)).toBe(Infinity);
  });
});

