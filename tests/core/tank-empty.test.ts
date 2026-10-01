/**
 * The step the tank runs dry (Phase 6 Task 1, Bug-fix tier, both from the
 * backlog). Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import * as C from '$core/constants';
import { getFuelFlowRate, getThrust } from '$core/physics/engines';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import type { SimState } from '$core/state';

function burning(propellant: number): SimState {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  s.autopilot.autoLandOn = false;
  s.autopilot.demoAutoLandOn = false;
  s.engines.running = [true, true, true, false, false, false];
  s.engines.ignitionCountdown = [null, null, null];
  s.vehicle.throttle = 100;
  s.vehicle.throttleCurrent = 100;
  s.vehicle.propellantMass = propellant;
  s.vehicle.vehicleMass = C.vehicleDryMass + propellant;
  return s;
}

describe('the step the tank empties', () => {
  it('thrusts only for the fraction of the step the propellant lasts', () => {
    const flowPerStep = getFuelFlowRate([true, true, true], 100) * DT;
    const s = step(burning(flowPerStep * 0.25), DT);
    const full = getThrust([true, true, true], 100, s.atmosphere.airPressure);
    // A quarter of a step's propellant buys a quarter of a step's thrust, not
    // a whole one (it was a whole one: up to about 0.4 m/s extra).
    expect(s.forces.thrust / full).toBeCloseTo(0.25, 6);
    expect(s.vehicle.propellantMass).toBe(0);
  });

  it('a full step of propellant still thrusts in full', () => {
    const flowPerStep = getFuelFlowRate([true, true, true], 100) * DT;
    const s = step(burning(flowPerStep * 3), DT);
    const full = getThrust([true, true, true], 100, s.atmosphere.airPressure);
    expect(s.forces.thrust / full).toBe(1);
  });

  it('an ignition counting down when the tank is empty never lights', () => {
    const s0 = burning(0);
    s0.engines.running = [false, false, false, false, false, false];
    s0.engines.ignitionCountdown = [null, null, DT / 2, null, null, null];
    const s = step(s0, DT);
    expect(s.failures.fuelRunOut).toBe(true);
    expect(s.engines.running).toEqual([false, false, false, false, false, false]);
    expect(s.engines.ignitionCountdown).toEqual([null, null, null, null, null, null]);
  });
});
