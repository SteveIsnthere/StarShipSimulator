/**
 * M2.7, Fidelity tier: the speed of sound follows local temperature.
 *
 * 2021 used a constant 343 m/s at every altitude — the sea-level value on a
 * warm day. Sound is slower in colder air, and the atmosphere gets cold fast.
 * Mach number therefore ran low everywhere above the ground, and since
 * `getBodyDragCoefficient` is a function of Mach, so did drag.
 */
import { describe, expect, it } from 'vitest';
import {
  GAMMA_AIR,
  R_SPECIFIC_AIR,
  speedOfSoundAt,
  updateAtmosphere,
} from '$core/physics/atmosphere';
import { getBodyDragCoefficient } from '$core/physics/aero';
import * as C from '$core/constants';
import { createInitialState } from '$core/state';
import { step } from '$core/step';

const soundAtAltitude = (h: number) => speedOfSoundAt(updateAtmosphere(h).airTemperature);

describe('the formula', () => {
  it('is sqrt(gamma * R * T)', () => {
    expect(speedOfSoundAt(15.04)).toBeCloseTo(
      Math.sqrt(GAMMA_AIR * R_SPECIFIC_AIR * (15.04 + 273.15)),
      9,
    );
  });

  it('gives about 340 m/s at sea level, near the 2021 constant', () => {
    // Which is why a constant looked reasonable: at sea level it nearly is one.
    expect(soundAtAltitude(0)).toBeCloseTo(340.32, 1);
    expect(Math.abs(soundAtAltitude(0) - C.speedOfSound)).toBeLessThan(3);
  });

  it('is about 295 m/s in the stratosphere', () => {
    expect(soundAtAltitude(11_000)).toBeCloseTo(295.1, 1);
    expect(soundAtAltitude(20_000)).toBeCloseTo(295.1, 1);
  });

  it('falls monotonically through the troposphere, as temperature does', () => {
    let previous = Infinity;
    for (let h = 0; h < 11_000; h += 250) {
      const a = soundAtAltitude(h);
      expect(a).toBeLessThan(previous);
      previous = a;
    }
  });

  it('rises again in the upper stratosphere, where ozone warms the air', () => {
    expect(soundAtAltitude(50_000)).toBeGreaterThan(soundAtAltitude(30_000));
  });
});

describe('the size of the 2021 error', () => {
  it('the constant is 16% high in the stratosphere', () => {
    expect(C.speedOfSound / soundAtAltitude(11_000) - 1).toBeCloseTo(0.162, 2);
  });

  it('so Mach ran 14% low there', () => {
    const speed = 1000;
    const machConstant = speed / C.speedOfSound;
    const machReal = speed / soundAtAltitude(11_000);
    expect(machConstant / machReal - 1).toBeCloseTo(-0.14, 2);
  });

  it('and understated drag, because Cd is a function of Mach', () => {
    // The consequence that actually matters. Below Mach 10 the body drag
    // coefficient rises with Mach, so an understated Mach means understated Cd.
    const speed = 1000;
    const cdConstant = getBodyDragCoefficient(speed / C.speedOfSound);
    const cdReal = getBodyDragCoefficient(speed / soundAtAltitude(11_000));
    expect(cdReal).toBeGreaterThan(cdConstant);
  });

  it('but not above Mach 10, where the coefficient is capped', () => {
    // Worth knowing where the fix stops mattering: hypersonic re-entry is
    // already at the 2.5 cap under either speed of sound.
    const speed = 7000;
    expect(getBodyDragCoefficient(speed / C.speedOfSound)).toBe(2.5);
    expect(getBodyDragCoefficient(speed / soundAtAltitude(60_000))).toBe(2.5);
  });
});

describe('behind the flag', () => {
  function machAfterOneStep(altitude: number, speed: number, realSpeedOfSound: boolean) {
    const s = createInitialState(undefined, { realSpeedOfSound });
    s.kinematics.altitude = altitude;
    s.kinematics.speedX = speed;
    s.kinematics.trueSpeed = speed;
    return step(s, 1 / 120).kinematics.machSpeed;
  }

  it('off: Mach uses the constant 343, exactly as 2021 did', () => {
    const mach = machAfterOneStep(11_000, 1000, false);
    expect(mach).toBeCloseTo(1000 / C.speedOfSound, 6);
  });

  it('on: Mach uses the local speed of sound', () => {
    const mach = machAfterOneStep(11_000, 1000, true);
    expect(mach).toBeCloseTo(1000 / soundAtAltitude(11_000), 6);
    expect(mach).toBeGreaterThan(machAfterOneStep(11_000, 1000, false));
  });

  it('the two agree at sea level, within 1%', () => {
    const off = machAfterOneStep(0, 300, false);
    const on = machAfterOneStep(0, 300, true);
    expect(Math.abs(on / off - 1)).toBeLessThan(0.01);
  });

  it('a flight with the flag on stays finite and sane', () => {
    let s = createInitialState(undefined, { realSpeedOfSound: true });
    s.kinematics.altitude = 40_000;
    s.kinematics.speedX = 2000;
    s.kinematics.speedY = -200;
    for (let i = 0; i < 1200; i++) s = step(s, 1 / 120);
    expect(Number.isFinite(s.kinematics.machSpeed)).toBe(true);
    expect(s.kinematics.machSpeed).toBeGreaterThan(0);
  });
});
