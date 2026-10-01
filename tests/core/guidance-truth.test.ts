/**
 * Guidance truth tests: what the autopilot's laws should do, stated as
 * behaviour against the simulation's own physics, independent of any tuning.
 *
 * Phase 5 (docs/plans/modernization/modernization-phase-5.md). Each test that
 * fails on today's code is marked `it.fails` with the reason, and the task that
 * fixes the law turns it into a plain `it`.
 */
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import { controlEnginebyEffectiveVerticalTWR } from '$core/control/primitives';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import type { SimState } from '$core/state';
import { rad } from '$core/units';

/** One engine lit, upright, at rest at `altitude`, nothing else flying it. */
function hovering(altitude: number): SimState {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  const a = s.autopilot;
  a.autoLandOn = false;
  a.demoAutoLandOn = false;
  a.pitchHoldOn = false;
  a.autoMaxThrustOn = false;
  s.kinematics.altitude = altitude;
  s.kinematics.speedX = 0;
  s.kinematics.speedY = 0;
  s.kinematics.pitch = rad(0);
  s.kinematics.angularVelocity = 0;
  s.engines.running = [true, false, false];
  s.engines.ignitionCountdown = [null, null, null];
  return s;
}

/**
 * Fly the law the way the autopilot does (re-commanded every step) until the
 * throttle has settled, then measure the vertical acceleration over a second.
 */
function hoverAcceleration(altitude: number): { acceleration: number; throttle: number } {
  let s = hovering(altitude);
  const settle = Math.round(4 / DT);
  const measure = Math.round(1 / DT);
  let v0 = 0;
  for (let i = 0; i < settle + measure; i++) {
    if (i === settle) v0 = s.kinematics.speedY;
    controlEnginebyEffectiveVerticalTWR(s, 1);
    s.kinematics.pitch = rad(0);
    s.kinematics.angularVelocity = 0;
    s = step(s, DT);
  }
  return { acceleration: (s.kinematics.speedY - v0) / (measure * DT), throttle: s.vehicle.throttle };
}

describe('the vertical TWR law holds a hover at TWR 1', () => {
  for (const altitude of [0, 10_000, 80_000]) {
    // Fails today: the law sizes thrust with a flat g of 9.807 m/s², while the
    // simulation's gravity is 9.731 at the surface and less with altitude, so a
    // commanded TWR of 1 climbs. Phase 5 Task 3 puts the law on local gravity.
    it.fails(`at ${altitude / 1000} km the vertical acceleration is within 0.02 m/s² of zero`, () => {
      const { acceleration, throttle } = hoverAcceleration(altitude);
      // Precondition: the law is inside the throttle range, not clipped at a limit.
      expect(throttle).toBeGreaterThan(40);
      expect(throttle).toBeLessThan(100);
      expect(Math.abs(acceleration)).toBeLessThan(0.02);
    });
  }

  it('is not vacuous: the flat-g error is what it should be at the surface', () => {
    // The climb today is (9.807 − g_local) × TWR, about 0.076 m/s² at sea level.
    const { acceleration, throttle } = hoverAcceleration(0);
    expect(throttle).toBeGreaterThan(40);
    expect(throttle).toBeLessThan(100);
    expect(acceleration).toBeGreaterThan(0.05);
    expect(acceleration).toBeLessThan(0.1);
  });
});
