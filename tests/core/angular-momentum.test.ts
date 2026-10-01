/**
 * M2.12, Bug-fix tier: the tangential term was twice what it should be.
 *
 * THE DEFECT, and it is provable on paper before any measurement. M2.6 added a
 * correction to `speedX` so that a vehicle climbing while moving downrange
 * trades tangential speed for altitude. It used
 *
 *     dv_t/dt = -2 * v_r * v_t / r
 *
 * The 2 belongs to a different equation. In polar coordinates the tangential
 * equation of motion under a central force is `r*theta_dd + 2*r_d*theta_d = 0`,
 * and that 2 is the Coriolis term in the ANGULAR acceleration. But the
 * simulation does not integrate theta_d; it integrates the tangential SPEED,
 * v_t = r * theta_d. Differentiating that:
 *
 *     dv_t/dt = r_d*theta_d + r*theta_dd
 *             = r_d*theta_d - 2*r_d*theta_d
 *             = -r_d*theta_d
 *             = -v_r * v_t / r
 *
 * One, not two. The test is angular momentum. With h = r*v_t,
 *
 *     dh/dt = r_d*v_t + r*dv_t/dt = v_r*v_t + r*(-v_r*v_t/r) = 0          correct
 *     dh/dt = v_r*v_t + r*(-2*v_r*v_t/r) = -v_r*v_t                       shipped
 *
 * So the shipped form destroys angular momentum at a rate proportional to how
 * fast the vehicle is climbing or falling. Descending (v_r < 0) it MANUFACTURES
 * angular momentum; climbing it eats it.
 *
 * WHY IT SURVIVED M2.6. The term vanishes identically when v_r = 0, and a
 * circular orbit has v_r = 0 forever — so every circular-orbit test passed, and
 * they are most of the orbit suite. The one test that did look at angular
 * momentum on an eccentric orbit measured ~0.5% drift over five minutes,
 * allowed 1%, and attributed the difference to the first-order integrator. It
 * was not the integrator. The giveaway is that it does not converge: halving dt
 * leaves the error exactly where it was.
 *
 * MEASURED, before the fix, on an ellipse entirely above the atmosphere:
 * 12.6% angular-momentum drift, and an orbit whose apogee should be 4015 km
 * reaching 1380 km instead. On a deorbit coast from 150 km, the ground track to
 * the entry interface came out 6.35% long — 313 km — against an independent
 * two-body integration.
 *
 * These tests were written before the fix and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';
import { circularOrbitalSpeed, MU, tangentialAcceleration } from '$core/physics/gravity';
import * as C from '$core/constants';

const DT = 1 / 120;

/** A vehicle in vacuum, nose-first so aerodynamics cannot muddy the question. */
function inVacuum(altitude: number, tangential: number, radial = 0): SimState {
  const s = createInitialState();
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.speedX = tangential;
  s.kinematics.speedY = radial;
  s.kinematics.trueSpeed = Math.hypot(tangential, radial);
  s.kinematics.pitch = (Math.PI / 2) as never;
  return s;
}

/**
 * Two-body propagation in polar coordinates with angular momentum held constant
 * BY CONSTRUCTION — the reference the simulation is being checked against.
 *
 * Deliberately not the same shape as `step()`: it integrates `r` and `v_r` and
 * derives `v_t` from h, so it cannot make the mistake being tested for.
 */
function referenceCoast(
  altitude: number,
  tangential: number,
  radial: number,
  targetAltitude: number,
) {
  let r = C.planetRadius + altitude;
  let vr = radial;
  const h = r * tangential;
  const rTarget = C.planetRadius + targetAltitude;
  let arc = 0;
  const dt = 0.01;
  for (let i = 0; i < 2_000_000; i++) {
    const vt = h / r;
    // Semi-implicit: radial velocity, then radius, then the swept arc.
    vr += ((vt * vt) / r - MU / (r * r)) * dt;
    r += vr * dt;
    arc += vt * dt;
    if (r <= rTarget) return { arc, seconds: i * dt };
  }
  return { arc: NaN, seconds: NaN };
}

describe('the term itself', () => {
  it('is -v_r * v_t / r, which is what conserves r*v_t', () => {
    const r = C.planetRadius + 150_000;
    const vt = 7_650;
    const vr = -120;
    expect(tangentialAcceleration(r, vt, vr)).toBeCloseTo((-vr * vt) / r, 12);

    // The identity the choice rests on, checked rather than asserted in prose:
    // d(r*v_t)/dt = v_r*v_t + r*(dv_t/dt) must be zero.
    const dh = vr * vt + r * tangentialAcceleration(r, vt, vr);
    expect(Math.abs(dh) / (r * vt), 'angular momentum is not conserved').toBeLessThan(1e-15);
  });

  it('vanishes when the vehicle is neither climbing nor falling', () => {
    // Which is why every circular-orbit test in the suite passed regardless.
    const r = C.planetRadius + 200_000;
    expect(tangentialAcceleration(r, circularOrbitalSpeed(r), 0)).toBe(-0);
  });
});

describe('angular momentum is conserved on an eccentric orbit', () => {
  // 400 km perigee, apogee far above it: entirely in vacuum, and v_r spends the
  // whole orbit nowhere near zero, which is exactly where the defect lived.
  const altitude = 400_000;
  const r0 = C.planetRadius + altitude;
  const v0 = circularOrbitalSpeed(r0) * 1.1;

  it('to better than a part in ten thousand over a hundred minutes', () => {
    let s = inVacuum(altitude, v0);
    const h0 = r0 * v0;
    let worst = 0;
    for (let i = 0; i < 120 * 6_000; i++) {
      s = step(s, DT);
      const h = s.kinematics.distanceToPlanetCenter * s.kinematics.speedX;
      worst = Math.max(worst, Math.abs(h / h0 - 1));
    }
    // Measured 1.2e-6 after the fix; 0.126 before it.
    expect(worst, `drifted ${(worst * 100).toFixed(4)}%`).toBeLessThan(1e-4);
  });

  it('and the orbit reaches the apogee the energy says it should', () => {
    // Vis-viva: a = 1 / (2/r - v^2/mu), apogee = 2a - r for a burn at perigee.
    const a = 1 / (2 / r0 - (v0 * v0) / MU);
    const apogee = 2 * a - r0 - C.planetRadius;

    let s = inVacuum(altitude, v0);
    let peak = 0;
    for (let i = 0; i < 120 * 6_000; i++) {
      s = step(s, DT);
      peak = Math.max(peak, s.kinematics.altitude);
    }
    // ~4015 km. The shipped term reached 1380 km — the orbit was not merely
    // imprecise, it was a different orbit.
    expect(peak / apogee, `apogee ${(peak / 1000).toFixed(0)} km vs ${(apogee / 1000).toFixed(0)} km`)
      .toBeCloseTo(1, 2);
  });
});

describe('a ballistic coast matches an independent two-body integration', () => {
  // The check that matters for the deorbit autopilot, which has to predict
  // exactly this arc. 150 km down to the 80 km entry interface, no thrust.
  const altitude = 150_020;
  const tangential = 7_650.6;
  const radial = 0.069;

  function simCoast(dt: number) {
    let s = inVacuum(altitude, tangential, radial);
    const x0 = s.kinematics.downRangeDistance;
    for (let i = 0; i < 120 * 4_000; i++) {
      s = step(s, dt);
      if (s.kinematics.altitude <= 80_000) {
        return { arc: s.kinematics.downRangeDistance - x0, seconds: i * dt };
      }
    }
    return { arc: NaN, seconds: NaN };
  }

  const reference = referenceCoast(altitude, tangential, radial, 80_000);

  it('the reference itself is a sane 4939 km in 643 s', () => {
    expect(reference.arc / 1000).toBeCloseTo(4938.6, 0);
    expect(reference.seconds).toBeCloseTo(643, -1);
  });

  it('the simulation agrees to within a kilometre in five thousand', () => {
    const sim = simCoast(DT);
    const error = Math.abs(sim.arc - reference.arc);
    expect(error / reference.arc, `${(error / 1000).toFixed(1)} km out`).toBeLessThan(1e-3);
  });

  it('and CONVERGES — which is how a model error tells itself from an integrator one', () => {
    // The diagnostic that identified this defect. A first-order integrator's
    // error falls with dt; a wrong equation's does not. Before the fix, 1/120
    // and 1/480 both gave 6.35% and 6.37%.
    const coarse = Math.abs(simCoast(DT).arc - reference.arc);
    const fine = Math.abs(simCoast(DT / 4).arc - reference.arc);
    expect(fine, `1/480 was no better than 1/120 (${(coarse / 1000).toFixed(1)} km)`)
      .toBeLessThan(coarse);
  });
});
