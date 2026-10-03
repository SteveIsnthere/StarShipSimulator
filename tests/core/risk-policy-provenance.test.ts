/** Changing ignition policy invalidates paid future commands, not any paid
 * engine, fuel or RNG state. Unchanged policy may retain its immutable work. */
import { describe, expect, it } from 'vitest';
import { cloneState } from '$core/state';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { toggleRandomFailure } from '$core/control/commands';
import { step } from '$core/step';
import { rad } from '$core/units';
const DT = 1 / 120;
describe('risk policy forecast provenance', () => {
  it.each([false, true])('drops old work and cutoff when initial ignition risk is %s', initial => {
    const flight = createScenarioVehicle(getScenario('rtls')!, 123);
    flight.state.failures.randomFailure = initial;
    flight.state.autopilot.autoLandOn = true;
    const s = step(flight.state, DT, {}, flight.vehicle);
    const job = s.autopilot.boosterPrediction!;
    expect(job.origin.failures.randomFailure).toBe(initial);
    // A retained accepted plan is data at this command boundary. The command
    // must clear it even without starting another numerical flight here.
    s.autopilot.boosterReturnPlan = { originTime: 0, shutdownAt: 20, coastPitch: rad(0),
      handoff: { x: 0, height: 100, vx: 0, vy: -20, time: 10, lateralFeasible: true } };
    const before = cloneState(s);
    toggleRandomFailure(s);
    expect(s.failures.randomFailure).toBe(!initial);
    expect(s.autopilot.boosterPrediction).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    for (const key of ['vehicle', 'engines', 'kinematics', 'forces', 'status', 'rng'] as const)
      expect(s[key], key).toEqual(before[key]);
    expect(job.origin.failures.randomFailure).toBe(initial);
    const next = step(s, DT, {}, flight.vehicle);
    expect(next.autopilot.boosterPrediction!.origin.failures.randomFailure).toBe(!initial);
  });
  it('preserves the existing immutable origin when risk is unchanged', () => {
    const flight = createScenarioVehicle(getScenario('rtls')!, 123);
    flight.state.autopilot.autoLandOn = true;
    const s = step(flight.state, DT, {}, flight.vehicle), origin = s.autopilot.boosterPrediction!.origin;
    const next = step(s, DT, {}, flight.vehicle);
    expect(next.autopilot.boosterPrediction!.origin).toBe(origin);
    expect(next.failures.randomFailure).toBe(origin.failures.randomFailure);
  });
});
