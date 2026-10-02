/**
 * Felt g is the specific force: thrust and aerodynamics, without gravity
 * (Phase 6 Task 1, Bug fix from the backlog: the g-limit read the NET
 * acceleration, gravity included, and perceived g used a flat 9.807).
 * Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import * as C from '$core/constants';
import { gravityAt } from '$core/physics/gravity';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import { rad } from '$core/units';

function coasting(altitude: number) {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  s.autopilot.autoLandOn = false;
  s.autopilot.demoAutoLandOn = false;
  s.engines.running = [false, false, false, false, false, false];
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
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
    // Gravity less the turning ground's centrifugal term, written out (zero
    // until the frame turns, Phase 6 Task 9).
    const r = C.planetRadius + s.kinematics.altitude;
    expect(s.forces.perceivedG).toBeCloseTo((gravityAt(r) - C.frameRotationRate ** 2 * r) / C.standardGravity, 12);
  });

  it('breaks the airframe at the felt limit, not at the net acceleration', () => {
    // Six lit engines on near-dry tanks plus tail-first drag exceed 13 g
    // felt; gravity leaves net acceleration below 13 g. No stale reading.
    const s0 = coasting(20_000);
    s0.kinematics.speedY = -850;
    s0.kinematics.pitch = rad(0);
    s0.vehicle.propellantMass = 1_000;
    s0.vehicle.vehicleMass = C.vehicleDryMass + 1_000;
    s0.vehicle.throttle = s0.vehicle.throttleCurrent = 100;
    s0.engines.running.fill(true);
    const s = step(s0, DT);
    expect(s.kinematics.totalAcceleration / C.standardGravity).toBeLessThan(C.gLimit);
    expect(s.forces.perceivedG).toBeGreaterThan(C.gLimit);
    expect(s.forces.dynamicPressure).toBeLessThan(C.dynamicPressureLimit);
    expect(s.forces.surfaceTemperature).toBeLessThan(C.TILE_LIMIT_KELVIN);
    expect(s.failures.inFlightBreakUp).toBe(true);
  });

  it('and a free fall well past 13 g of net acceleration does not break it', () => {
    // A fast vacuum trajectory has a large radial coordinate acceleration
    // from v_t²/r, although gravity is its only inertial force. Generate the
    // >13 g net reading physically instead of injecting an old stored value.
    const s0 = coasting(1_500_000);
    s0.kinematics.speedX = 34_000;
    const s = step(s0, DT);
    expect(s.kinematics.totalAcceleration / C.standardGravity).toBeGreaterThan(C.gLimit);
    expect(s.forces.perceivedG).toBeLessThan(1e-3);
    expect(s.failures.inFlightBreakUp).toBe(false);
  });
});
