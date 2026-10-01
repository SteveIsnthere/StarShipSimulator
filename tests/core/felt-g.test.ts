/**
 * Felt g is the specific force: thrust and aerodynamics, without gravity
 * (Phase 6 Task 1, Bug fix from the backlog: the g-limit read the NET
 * acceleration, gravity included, and perceived g used a flat 9.807).
 * Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import * as C from '$core/constants';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';

function coasting(altitude: number) {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  s.autopilot.autoLandOn = false;
  s.autopilot.demoAutoLandOn = false;
  s.engines.running = [false, false, false];
  s.kinematics.altitude = altitude;
  s.kinematics.speedX = 0;
  s.kinematics.speedY = 0;
  return s;
}

describe('felt g', () => {
  it('is zero in free fall, where nothing but gravity acts', () => {
    // 150 km: no air to speak of. Two steps, so the stored accelerations are the
    // simulation's own, not the scenario's starting values.
    const s = step(step(coasting(150_000), DT), DT);
    expect(s.forces.perceivedG).toBeLessThan(1e-3);
  });

  it('is the local gravity, in g0, standing on the pad', () => {
    let s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'launch-pad')!);
    for (let i = 0; i < 3; i++) s = step(s, DT);
    expect(s.status.onTheGround).toBe(true);
    expect(s.forces.perceivedG).toBeCloseTo(9.731 / C.standardGravity, 3);
  });

  it('breaks the airframe at the felt limit, not at the net acceleration', () => {
    // 12.5 g net upward is 13.5 g felt: over the 13 g limit. The old check read
    // the net figure and let it pass.
    const s0 = coasting(10_000);
    s0.kinematics.accelerationY = 12.5 * C.standardGravity;
    s0.kinematics.totalAcceleration = 12.5 * C.standardGravity;
    s0.forces.perceivedG = 13.5;
    const s = step(s0, DT);
    expect(s.failures.inFlightBreakUp).toBe(true);
  });

  it('and a free fall well past 13 g of net acceleration does not break it', () => {
    // Only reachable by hand: the point is which number is compared.
    const s0 = coasting(10_000);
    s0.kinematics.totalAcceleration = 14 * C.standardGravity;
    s0.forces.perceivedG = 0.5;
    const s = step(s0, DT);
    expect(s.failures.inFlightBreakUp).toBe(false);
  });
});
