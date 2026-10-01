/**
 * The rotating ground frame through step() (Phase 6, Task 9a).
 *
 * `frameRotationRate` is zero until Task 9b; here it is set to Earth's
 * sidereal rate so the integrator is exercised in a turning frame now. Each
 * check transforms back to the inertial frame, where the answer is known.
 */
import { describe, expect, it, vi } from 'vitest';

const EARTH = 7.2921159e-5;
vi.mock('$core/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$core/constants')>()),
  frameRotationRate: EARTH,
}));

const C = await import('$core/constants');
const { createInitialState } = await import('$core/state');
const { step } = await import('$core/step');
const { circularOrbitalSpeed } = await import('$core/physics/gravity');

const DT = 1 / 120;

function coasting(altitude: number, groundSpeed: number) {
  const s = createInitialState();
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.speedX = groundSpeed;
  s.kinematics.speedY = 0;
  s.kinematics.trueSpeed = Math.abs(groundSpeed);
  s.kinematics.pitch = (Math.PI / 2) as never;
  return s;
}

describe('step() in a turning frame', () => {
  it('a circular inertial orbit stays circular when flown at its ground-relative speed', () => {
    const altitude = 400_000;
    const r = C.planetRadius + altitude;
    let s = coasting(altitude, circularOrbitalSpeed(r) - EARTH * r);
    for (let i = 0; i < 120 * 600; i++) s = step(s, DT);
    expect(Math.abs(s.kinematics.altitude - altitude)).toBeLessThan(1);
    expect(Math.abs(s.kinematics.speedY)).toBeLessThan(0.01);
  });

  it('a body at the synchronous radius with no ground speed stays over the same point', () => {
    const r = (C.planetGravitationalParameter / EARTH ** 2) ** (1 / 3);
    const altitude = r - C.planetRadius;
    let s = coasting(altitude, 0);
    const x0 = s.kinematics.downRangeDistance;
    for (let i = 0; i < 120 * 600; i++) s = step(s, DT);
    expect(Math.abs(s.kinematics.altitude - altitude)).toBeLessThan(1);
    expect(Math.abs(s.kinematics.downRangeDistance - x0)).toBeLessThan(1);
  });
});
