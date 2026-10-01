/**
 * M11.3, Fidelity — the integrator is velocity Verlet, and here is the proof.
 *
 * The M11 survey measured the 2021-order integrator on a 600 s vacuum coast
 * and found a symplectic Euler: energy conserved to a part in 10^10, altitude
 * drifting LINEARLY in dt (95 m at 1/60, 47 at 1/120, 24 at 1/240, 12 at
 * 1/480). The plan's proof obligation is that table repeated: drift falling
 * as dt^2 and energy no worse than 1e-10. Both are asserted below against the
 * closed form — Kepler's equation — rather than against a finer run of the
 * same code, which is the M10 standard: a reference true independently of any
 * implementation.
 *
 * THE REFERENCE THE PROOF BEATS, measured on the pre-M11.3 step from the same
 * 1500 km perigee at 1.15 circular speed, 2000 s (the numbers this file's
 * assertions are calibrated against; they are recorded so the size of the
 * change is on file):
 *
 *     dt      altitude error    ratio    worst |dE/E|
 *     1/15       -795.73 m               1.6e-5
 *     1/30       -397.89 m     2.00      7.9e-6
 *     1/60       -198.95 m     2.00      3.9e-6
 *     1/120       -99.48 m     2.00      2.0e-6
 *     1/240       -49.74 m     2.00      9.8e-7
 *
 * First order in position AND, on an eccentric orbit, first order in energy:
 * the survey's "part in 10^10" was a circular orbit, which is a fixed point of
 * the polar scheme and hides the error. Velocity Verlet:
 *
 *     1/15         0.0038 m               1.2e-10
 *     1/30         0.0009 m     4.02      3.0e-11
 *     1/60         0.0002 m     4.07      6.5e-12
 *     1/120        0.0001 m              7.4e-13
 *
 * Two hundred thousand times more accurate at 1/15, and the ratio is 4.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import {
  MU,
  circularOrbitalSpeed,
  specificAngularMomentum,
  specificOrbitalEnergy,
} from '$core/physics/gravity';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';

/** A vehicle in vacuum at `altitude`, moving downrange at `speed`, nose first. */
function inOrbit(altitude: number, speed: number): SimState {
  const s = createInitialState();
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.speedX = speed;
  s.kinematics.speedY = 0;
  s.kinematics.trueSpeed = speed;
  s.kinematics.pitch = (Math.PI / 2) as never;
  return s;
}

/**
 * Steps for `seconds` at `hz`, tracking the worst relative energy error seen.
 * Memoised on the arguments: the same coast serves the position, energy and
 * angular-momentum assertions rather than being flown once per test.
 */
const coasts = new Map<string, { state: SimState; worstEnergy: number }>();
function coast(s0: SimState, hz: number, seconds: number) {
  const key = `${s0.kinematics.altitude}/${s0.kinematics.speedX}/${s0.kinematics.speedY}/${hz}/${seconds}`;
  const cached = coasts.get(key);
  if (cached) return cached;
  const result = flyCoast(s0, hz, seconds);
  coasts.set(key, result);
  return result;
}
function flyCoast(s0: SimState, hz: number, seconds: number) {
  const dt = 1 / hz;
  const e0 = specificOrbitalEnergy(s0.kinematics.distanceToPlanetCenter, s0.kinematics.trueSpeed);
  let s = s0;
  let worstEnergy = 0;
  for (let i = 0; i < seconds * hz; i++) {
    s = step(s, dt);
    const k = s.kinematics;
    const e = specificOrbitalEnergy(k.distanceToPlanetCenter, k.trueSpeed);
    worstEnergy = Math.max(worstEnergy, Math.abs((e - e0) / e0));
  }
  return { state: s, worstEnergy };
}

/**
 * Kepler's equation: the radius at time `t` after perigee, for a perigee at
 * `r0` with tangential speed `v0`. The closed form the simulation is measured
 * against. Newton on E - e*sin(E) = M converges in a handful of iterations for
 * these eccentricities.
 */
function keplerRadius(r0: number, v0: number, t: number): number {
  const a = 1 / (2 / r0 - (v0 * v0) / MU);
  const e = 1 - r0 / a;
  const n = Math.sqrt(MU / a ** 3);
  const M = n * t;
  let E = M;
  for (let i = 0; i < 50; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return a * (1 - e * Math.cos(E));
}

// 1500 km perigee: the thermosphere model is 1e-14 kg/m^3 or less up here, so
// the only force is gravity and the closed form applies.
const PERIGEE = 1_500_000;
const R0 = C.planetRadius + PERIGEE;
const V0 = 1.15 * circularOrbitalSpeed(R0);
const SECONDS = 2000;

describe('the position error is second order in dt, against Kepler', () => {
  const errorAt = (hz: number) =>
    coast(inOrbit(PERIGEE, V0), hz, SECONDS).state.kinematics.distanceToPlanetCenter -
    keplerRadius(R0, V0, SECONDS);

  it('the reference itself: an ellipse that climbs 2800 km in 2000 s', () => {
    // Sanity on the closed form before trusting it as a reference.
    expect((keplerRadius(R0, V0, SECONDS) - C.planetRadius) / 1000).toBeCloseTo(4308.2, 0);
    expect(keplerRadius(R0, V0, 0)).toBeCloseTo(R0, 6);
  });

  it('halving dt quarters the error — the ratio is 4, where Euler gave 2', () => {
    const e15 = errorAt(15);
    const e30 = errorAt(30);
    const e60 = errorAt(60);
    // The ratios, with a margin for the rounding floor that is a few tenths
    // of a millimetre by 1/60. Anything near 2 is the first-order scheme.
    expect(e15 / e30, `1/15 -> 1/30: ${e15} / ${e30}`).toBeGreaterThan(3.5);
    expect(e15 / e30).toBeLessThan(4.5);
    expect(e30 / e60, `1/30 -> 1/60: ${e30} / ${e60}`).toBeGreaterThan(3.5);
    expect(e30 / e60).toBeLessThan(4.5);
  });

  it('and is millimetres at 15 Hz, where Euler was 796 metres', () => {
    expect(Math.abs(errorAt(15))).toBeLessThan(0.01);
    expect(Math.abs(errorAt(120))).toBeLessThan(0.001);
  });
});

describe('energy is conserved on an eccentric orbit', () => {
  it('to a part in 10^10 or better at every rate the simulation runs at', () => {
    // The plan's bound. At 1/120 — the rate the loop steps — it is 7e-13.
    // Euler was 2e-6 at that rate, and 1.6e-5 at 1/15.
    for (const hz of [30, 60, 120, 240]) {
      const { worstEnergy } = coast(inOrbit(PERIGEE, V0), hz, SECONDS);
      expect(worstEnergy, `1/${hz}`).toBeLessThan(1e-10);
    }
  });

  it('and angular momentum with it, on the same orbit', () => {
    const s0 = inOrbit(PERIGEE, V0);
    const h0 = specificAngularMomentum(s0.kinematics.distanceToPlanetCenter, s0.kinematics.speedX);
    const { state } = coast(s0, 120, SECONDS);
    const h1 = specificAngularMomentum(state.kinematics.distanceToPlanetCenter, state.kinematics.speedX);
    expect(Math.abs((h1 - h0) / h0)).toBeLessThan(1e-10);
  });
});

describe('the M11 survey coast table, repeated: 600 s at 300 km circular', () => {
  // The survey's table showed 95 / 47 / 24 / 12 m of altitude drift at 1/60,
  // 1/120, 1/240, 1/480 — halving with dt. It is now a centimetre at every
  // rate, and what remains is not the integrator: at 300 km the thermosphere
  // model still has 1e-11 kg/m^3 of air, and the same run at 800 km shows
  // nothing at all. A circular orbit is a fixed point of the scheme.
  const ALT = 300_000;
  const V = circularOrbitalSpeed(C.planetRadius + ALT);
  const RATES = [60, 120, 240, 480];

  it('altitude drift is a centimetre, and does not depend on dt', () => {
    const drifts = RATES.map((hz) => coast(inOrbit(ALT, V), hz, 600).state.kinematics.altitude - ALT);
    for (const [i, drift] of drifts.entries()) {
      expect(Math.abs(drift), `1/${RATES[i]}: ${drift} m`).toBeLessThan(0.05);
    }
    // dt-independent: the survey's 95 -> 47 -> 24 -> 12 halving is gone. What
    // is left is the same at every rate, to a percent, which is the signature
    // of a physical effect (drag) rather than an integrator one.
    const [a, b, c, d] = drifts as [number, number, number, number];
    expect(Math.abs(b / a - 1)).toBeLessThan(0.01);
    expect(Math.abs(c / a - 1)).toBeLessThan(0.01);
    expect(Math.abs(d / a - 1)).toBeLessThan(0.01);
  });

  it('and in true vacuum, at 800 km, energy and altitude do not move at all', () => {
    const alt = 800_000;
    const v = circularOrbitalSpeed(C.planetRadius + alt);
    for (const hz of [60, 120]) {
      const { state, worstEnergy } = coast(inOrbit(alt, v), hz, 600);
      expect(worstEnergy, `1/${hz}`).toBeLessThan(1e-10);
      expect(Math.abs(state.kinematics.altitude - alt), `1/${hz}`).toBeLessThan(1e-3);
    }
  });
});

describe('the scheme is exact for constant acceleration', () => {
  it('x = x0 + v0 t + a t^2 / 2 to rounding, whatever dt', () => {
    // Velocity Verlet reproduces a quadratic exactly; Euler is off by
    // a*t*dt/2. The ground clamp and the atmosphere are both out of the way at
    // 800 km, and over 10 s at orbital-scale radii gravity is constant to a
    // part in 1e-5 — so the check is on the residual after removing the
    // closed-form displacement under the START acceleration, which must be
    // the tiny gravity-gradient term and not a dt-proportional one.
    const alt = 800_000;
    const s0 = inOrbit(alt, 0);
    s0.kinematics.speedY = 50;
    const a0 = -MU / (C.planetRadius + alt) ** 2;
    const closed = (t: number) => alt + 50 * t + 0.5 * a0 * t * t;
    const at = (hz: number) => coast(s0, hz, 10).state.kinematics.altitude - closed(10);
    // Both residuals are the gravity gradient over 10 s (about a centimetre),
    // and they agree with each other to a micrometre: no term proportional to
    // dt. Euler's a*t*dt/2 would be 39 mm at 1/10 and 3 mm at 1/120.
    expect(Math.abs(at(10) - at(120))).toBeLessThan(1e-5);
    expect(Math.abs(at(10))).toBeLessThan(0.05);
  });
});
