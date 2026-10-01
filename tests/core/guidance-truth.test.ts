/**
 * Guidance truth tests: what the autopilot's laws should do, stated as
 * behaviour against the simulation's own physics, independent of any tuning.
 *
 * Phase 5 (docs/plans/modernization/modernization-phase-5.md). A test that
 * fails on the code of its day is marked `it.fails` with the reason, and the
 * task that fixes the law turns it into a plain `it`.
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
function hoverAcceleration(altitude: number, twr = 1): { acceleration: number; throttle: number } {
  let s = hovering(altitude);
  const settle = Math.round(4 / DT);
  const measure = Math.round(1 / DT);
  let v0 = 0;
  for (let i = 0; i < settle + measure; i++) {
    if (i === settle) v0 = s.kinematics.speedY;
    controlEnginebyEffectiveVerticalTWR(s, twr);
    s.kinematics.pitch = rad(0);
    s.kinematics.angularVelocity = 0;
    s = step(s, DT);
  }
  return { acceleration: (s.kinematics.speedY - v0) / (measure * DT), throttle: s.vehicle.throttle };
}

describe('the vertical TWR law holds a hover at TWR 1', () => {
  for (const altitude of [0, 10_000, 80_000]) {
    // Until Phase 5 Task 3 the law sized thrust with a flat g of 9.807 m/s²
    // against the simulation's 9.731 at the surface (less with altitude), so a
    // commanded TWR of 1 climbed at 0.076, 0.107 and 0.316 m/s² at 0, 10 and 80 km.
    it(`at ${altitude / 1000} km the vertical acceleration is within 0.02 m/s² of zero`, () => {
      const { acceleration, throttle } = hoverAcceleration(altitude);
      // Precondition: the law is inside the throttle range, not clipped at a limit.
      expect(throttle).toBeGreaterThan(40);
      expect(throttle).toBeLessThan(100);
      expect(Math.abs(acceleration)).toBeLessThan(0.02);
    });
  }

  it('is not vacuous: TWR 1.1 climbs at a tenth of local gravity', () => {
    // A law that did nothing would leave a hover test passing on whatever the
    // throttle happened to be. This one has to reach a commanded acceleration.
    const { acceleration, throttle } = hoverAcceleration(0, 1.1);
    expect(throttle).toBeGreaterThan(40);
    expect(throttle).toBeLessThan(100);
    expect(acceleration).toBeGreaterThan(0.1 * 9.731 - 0.02);
    expect(acceleration).toBeLessThan(0.1 * 9.731 + 0.02);
  });
});
