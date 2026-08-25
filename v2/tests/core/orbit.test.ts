/**
 * M2.6, Fidelity tier: planet-centered gravity.
 *
 * Acceptance: flat-model goldens untouched; orbit maths unit-tested — a circular
 * orbit stays circular over one lap, energy drift bounded.
 *
 * THE THING THIS FIXES. The 2021 model has a constant 9.807 m/s^2 downward and
 * an ad-hoc "relief" term for going fast. That term is linear where the truth
 * is quadratic, divides by an orbital velocity fixed at spawn, and is clamped
 * at exactly g — so net vertical acceleration can never be positive from
 * orbital motion. A vehicle at 1.2x circular velocity still falls. Orbit is not
 * approximated badly in that model; it is impossible.
 *
 * With the flag on there is no orbital special case at all. Gravity is
 * -GM/r^2, tangential motion contributes v_t^2/r outward, and at
 * v_t^2 = GM/r they cancel. An orbit is what happens when you go fast enough.
 */
import { describe, expect, it } from 'vitest';
import {
  circularOrbitalSpeed,
  gravityAt,
  legacyOrbitRelief,
  MU,
  specificAngularMomentum,
  specificOrbitalEnergy,
  verticalGravityAcceleration,
} from '$core/physics/gravity';
import * as C from '$core/constants';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';

const DT = 1 / 120;

/** A vehicle in vacuum at `altitude`, moving downrange at `speed`. */
function inOrbit(altitude: number, speed: number) {
  const s = createInitialState();
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.speedX = speed;
  s.kinematics.speedY = 0;
  s.kinematics.trueSpeed = speed;
  // Nose-first and inert, so aerodynamics cannot muddy an orbital-mechanics test.
  s.kinematics.pitch = (Math.PI / 2) as never;
  return s;
}

function run(s: SimState, steps: number): SimState {
  let cur = s;
  for (let i = 0; i < steps; i++) cur = step(cur, DT);
  return cur;
}

describe('the gravity field itself', () => {
  it('is 9.731 m/s^2 at the surface — 0.78% BELOW the constant it replaces', () => {
    // Worth stating precisely, because it is a feel change on its own.
    // The game's planet has Earth's mass but a 6400 km radius (Earth's is
    // 6371 km), so GM/R^2 is 9.7307. The 2021 constant is 9.807, which is
    // Earth's actual surface gravity - correct for Earth, 0.78% too strong for
    // this planet. Turning the flag on therefore makes everything very slightly
    // lighter, at sea level as well as in orbit.
    expect(gravityAt(C.planetRadius)).toBeCloseTo(9.7307, 4);
    expect(gravityAt(C.planetRadius) / C.gravity - 1).toBeCloseTo(-0.0078, 4);
  });

  it('falls off as one over r squared', () => {
    const surface = gravityAt(C.planetRadius);
    const doubled = gravityAt(C.planetRadius * 2);
    expect(surface / doubled).toBeCloseTo(4, 6);
  });

  it('is measurably weaker at altitude, which the constant model missed', () => {
    // 3.1% at 100 km, 6.2% at 200 km.
    expect(1 - gravityAt(C.planetRadius + 100_000) / gravityAt(C.planetRadius)).toBeCloseTo(
      0.031,
      2,
    );
    expect(1 - gravityAt(C.planetRadius + 200_000) / gravityAt(C.planetRadius)).toBeCloseTo(
      0.062,
      2,
    );
  });

  it('circular speed is sqrt(GM/r), about 7.9 km/s in low orbit', () => {
    const r = C.planetRadius + 200_000;
    expect(circularOrbitalSpeed(r)).toBeCloseTo(Math.sqrt(MU / r), 9);
    expect(circularOrbitalSpeed(r)).toBeGreaterThan(7_700);
    expect(circularOrbitalSpeed(r)).toBeLessThan(8_000);
  });
});

describe('a circular orbit stays circular over one lap', () => {
  const altitude = 200_000;
  const r = C.planetRadius + altitude;
  const v = circularOrbitalSpeed(r);
  /** One full lap, in steps. */
  const lapSteps = Math.round(((2 * Math.PI * r) / v) / DT);

  it('takes about 89 minutes, which is what low orbit takes', () => {
    expect((lapSteps * DT) / 60).toBeCloseTo(88.94, 1);
  });

  it('altitude holds within a kilometre over a full lap', () => {
    const end = run(inOrbit(altitude, v), lapSteps);
    const drift = Math.abs(end.kinematics.altitude - altitude);
    expect(drift, `drifted ${drift.toFixed(1)} m over one lap`).toBeLessThan(1_000);
  });

  it('speed holds within a metre per second over a full lap', () => {
    const end = run(inOrbit(altitude, v), lapSteps);
    expect(Math.abs(end.kinematics.speedX - v)).toBeLessThan(1);
  });

  it('never dips into the atmosphere or climbs away', () => {
    let s = inOrbit(altitude, v);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < lapSteps; i++) {
      s = step(s, DT);
      min = Math.min(min, s.kinematics.altitude);
      max = Math.max(max, s.kinematics.altitude);
    }
    expect(min).toBeGreaterThan(altitude - 1_000);
    expect(max).toBeLessThan(altitude + 1_000);
  });

  it('completes a full revolution of downrange distance', () => {
    const end = run(inOrbit(altitude, v), lapSteps);
    // downRangeDistance wraps at the circumference, so it returns near its start.
    const start = inOrbit(altitude, v).kinematics.downRangeDistance;
    const travelled = Math.abs(end.kinematics.downRangeDistance - start);
    // Within 5% of a full circumference. Not tighter: the lap count is derived
    // from the orbital period rounded to whole steps, and the vehicle orbits at
    // radius r while downRangeDistance measures ground track at radius
    // planetRadius, so the two differ by r/planetRadius - about 3% at 200 km.
    expect(Math.min(travelled, C.planetCircumference - travelled)).toBeLessThan(
      C.planetCircumference * 0.05,
    );
  });
});

describe('conserved quantities stay conserved', () => {
  const altitude = 300_000;
  const r = C.planetRadius + altitude;
  const v = circularOrbitalSpeed(r);

  it('specific orbital energy drifts by less than one part in a thousand', () => {
    const start = inOrbit(altitude, v);
    const e0 = specificOrbitalEnergy(start.kinematics.distanceToPlanetCenter, v);
    const end = run(start, 120 * 600); // ten simulated minutes
    const e1 = specificOrbitalEnergy(
      end.kinematics.distanceToPlanetCenter,
      Math.hypot(end.kinematics.speedX, end.kinematics.speedY),
    );
    expect(Math.abs((e1 - e0) / e0)).toBeLessThan(1e-3);
  });

  it('specific angular momentum is conserved as the vehicle climbs', () => {
    // The property the tangential-acceleration term exists to preserve. Launch
    // on an ellipse so the altitude genuinely changes.
    const start = inOrbit(200_000, v * 1.05);
    const h0 = specificAngularMomentum(start.kinematics.distanceToPlanetCenter, v * 1.05);
    const end = run(start, 120 * 300);
    const h1 = specificAngularMomentum(
      end.kinematics.distanceToPlanetCenter,
      end.kinematics.speedX,
    );
    expect(end.kinematics.altitude).toBeGreaterThan(210_000);
    // Within 1% over five simulated minutes on an eccentric orbit. This is an
    // integration-accuracy bound, not exact conservation: the integrator is
    // first-order semi-implicit and the tangential term is evaluated once per
    // step from the previous step's radial speed. Measured drift is ~0.5%.
    expect(Math.abs((h1 - h0) / h0)).toBeLessThan(1e-2);
  });

  it('an elliptical orbit comes back down again', () => {
    // The clearest sign it is real orbital motion and not a fudge: go up, come
    // back. The 2021 relief term could never produce this.
    let s = inOrbit(200_000, v * 1.1);
    let peak = 0;
    let peakStep = 0;
    for (let i = 0; i < 120 * 3000; i++) {
      s = step(s, DT);
      if (s.kinematics.altitude > peak) {
        peak = s.kinematics.altitude;
        peakStep = i;
      }
    }
    expect(peak).toBeGreaterThan(250_000);
    expect(peakStep).toBeGreaterThan(0);
    expect(peakStep).toBeLessThan(120 * 3000 - 1);
    expect(s.kinematics.altitude).toBeLessThan(peak);
  });
});

describe('the 2021 model could not do this, and here is why', () => {
  it('its relief term is clamped at g, so orbit is impossible', () => {
    // At any speed above circular, the true vertical acceleration is positive.
    // The 2021 term is capped at exactly g, so the net is at best zero.
    const r = C.planetRadius + 200_000;
    const v = circularOrbitalSpeed(r);

    const truth = verticalGravityAcceleration(r, v * 1.2);
    expect(truth, 'above circular speed the vehicle should be pushed outward').toBeGreaterThan(0);

    const legacy = -C.gravity + legacyOrbitRelief(v * 1.2, v);
    expect(legacy, '2021 could at best cancel gravity, never exceed it').toBe(0);
  });

  it('and at circular speed it still fell', () => {
    const r = C.planetRadius + 200_000;
    const v = circularOrbitalSpeed(r);
    expect(verticalGravityAcceleration(r, v)).toBeCloseTo(0, 9);
    // The 2021 model, using its spawn-time denominator, relieved only a fraction.
    const spawnOrbital = circularOrbitalSpeed(C.planetRadius + 25);
    const legacy = -C.gravity + legacyOrbitRelief(v, spawnOrbital);
    expect(legacy).toBeLessThan(-0.1);
  });

  it('a vehicle at orbital speed holds altitude now, and could not have then', () => {
    const altitude = 200_000;
    const v = circularOrbitalSpeed(C.planetRadius + altitude);

    // What ships: two simulated minutes at circular speed, altitude unmoved.
    const round = run(inOrbit(altitude, v), 120 * 120);
    expect(Math.abs(round.kinematics.altitude - altitude), 'round model: holds').toBeLessThan(100);

    // What 2021 would have done with the same state, integrated by hand from
    // its own two terms. There is no flag to flip any more, so the comparison
    // is arithmetic rather than a second simulation: constant -g relieved by a
    // term clamped at g, over the same 120 s.
    let flatAltitude = altitude;
    let flatSpeedY = 0;
    const spawnOrbital = circularOrbitalSpeed(C.planetRadius + 25);
    for (let i = 0; i < 120 * 120; i++) {
      flatAltitude += flatSpeedY * DT;
      flatSpeedY += (-C.gravity + legacyOrbitRelief(v, spawnOrbital)) * DT;
    }
    expect(flatAltitude, 'flat model: falls').toBeLessThan(altitude - 1_000);
  });
});

describe('the relief hack is gone from the state, not merely bypassed — M2.10', () => {
  it('SimState has no orbitGravityAccCompensation field at all', () => {
    const end = run(inOrbit(200_000, 7_000), 10);
    expect('orbitGravityAccCompensation' in end.kinematics).toBe(false);
  });

  it('and the stale orbital-velocity field is kept honest', () => {
    // 2021 wrote it once at spawn, because the only thing reading it was the
    // relief term's denominator. It tracks altitude now: the HUD reads it, and
    // there is no reason to leave a stale number lying there.
    const end = run(inOrbit(200_000, 7_000), 10);
    expect(end.kinematics.orbitalVelocityAtCurrentAltitude).toBeCloseTo(
      circularOrbitalSpeed(end.kinematics.distanceToPlanetCenter),
      6,
    );
  });

  it('the 2021 expression survives only as documentation', () => {
    // legacyOrbitRelief is still exported and still exactly what 2021 computed
    // — nothing calls it but the tests that describe the departure.
    expect(legacyOrbitRelief(1_000, 7_900)).toBeCloseTo((C.gravity * 1_000) / 7_900, 12);
    expect(legacyOrbitRelief(20_000, 7_900), 'clamped at g').toBe(C.gravity);
  });
});
