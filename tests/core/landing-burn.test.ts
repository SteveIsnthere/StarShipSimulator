/**
 * The landing-burn sizing (Phase 5 Task 4): the engine ladder it plans on, and
 * what it answers when no burn can stop the vehicle.
 */
import { describe, expect, it } from 'vitest';
import { finalDescentStartAltitude, plannedEngineCount, triggerBurnAltitude } from '$core/autopilot/landing-burn';
import { createBurnScratch, landingBurnStartAltitude } from '$core/control/guidance-physics';
import * as C from '$core/constants';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import type { SimState } from '$core/state';

function descending(propellant: number, speed: number, altitude = 700): SimState {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  s.vehicle.propellantMass = propellant;
  s.vehicle.vehicleMass = C.vehicleDryMass + propellant;
  s.kinematics.altitude = altitude;
  s.kinematics.speedY = -speed;
  return s;
}

describe('plannedEngineCount: 2021\'s one-engine ladder', () => {
  it('plans on one engine when one can hold 1/0.8 of the weight', () => {
    expect(plannedEngineCount(descending(12_000, 60))).toBe(1);
  });

  it('two, then three, as the vehicle gets heavier', () => {
    expect(plannedEngineCount(descending(150_000, 60))).toBe(2);
    expect(plannedEngineCount(descending(400_000, 60))).toBe(3);
  });

  it('never more than are working', () => {
    const s = descending(400_000, 60);
    s.engines.failed = [true, true, false, false, false, false];
    expect(plannedEngineCount(s)).toBe(1);
  });
});

describe('the sizings', () => {
  it('the trigger asks the predictor on the planned engines, touchdown at zero', () => {
    const s = descending(12_000, 61);
    expect(triggerBurnAltitude(s)).toBe(
      landingBurnStartAltitude(1, s.vehicle.vehicleMass, 61, 0, createBurnScratch()),
    );
  });

  it('a burn that cannot stop the vehicle means start now', () => {
    const s = descending(1_000_000, 100, 3_000);
    s.engines.failed = [false, true, true, false, false, false]; // one engine, a full ship: cannot hold it
    expect(triggerBurnAltitude(s)).toBe(3_000);
    s.engines.running = [true, false, false, false, false, false];
    expect(finalDescentStartAltitude(s)).toBe(3_000);
  });

  it('the final descent starts above the predicted burn by its one-second margin', () => {
    const s = descending(12_000, 20, 300);
    s.engines.running = [true, false, false, false, false, false];
    const burn = landingBurnStartAltitude(1, s.vehicle.vehicleMass, 20, C.vehicleHeight * 0.5, createBurnScratch())!;
    expect(finalDescentStartAltitude(s)).toBeCloseTo(burn + 20 * 0.5, 9);
  });
});
