/** An ignition-risk preference cannot disqualify a genuine fine capture.
 * Realized failures still prohibit publication, with no resource/RNG bypass. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cloneState, type SimState } from '$core/state';
import { rad } from '$core/units';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { advanceMechanics } from '$core/step';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { advanceBoosterForecast, createBoosterForecast, createBoosterForecastWork } from '$core/control/booster-forecast';

const ready = JSON.parse(readFileSync(new URL('../fixtures/booster-terminal-ready.json', import.meta.url), 'utf8')) as Record<string, SimState>;
function fineCapture(preference: boolean) {
  const s = cloneState(ready['rtls']!); s.failures.randomFailure = preference;
  const before = structuredClone(s);
  const work = createBoosterForecastWork(s, rad(0)); work.step = 1 / 120;
  advanceBoosterForecast(work, 4000, advanceMechanics, runBoosterPolicy, SUPER_HEAVY);
  expect(work.done).toBe(true); expect(work.result.steps).toBeLessThanOrEqual(4000);
  expect(work.state.status.landed).toBe(true); expect(work.state.status.onTheGround).toBe(false);
  expect(work.state.vehicle.propellantMass).toBeGreaterThan(0);
  expect(work.state.vehicle.propellantMass).toBeLessThan(s.vehicle.propellantMass);
  expect(work.state.failures.randomFailure).toBe(preference);
  for (const [key, failure] of Object.entries(work.state.failures))
    if (key !== 'randomFailure') expect(failure, key).toBe(false);
  expect(s).toEqual(before);
  advanceBoosterPrediction(s, 1 / 120, advanceMechanics, runBoosterPolicy, SUPER_HEAVY);
  const job = s.autopilot.boosterPrediction!, forecast = createBoosterForecast();
  forecast.reached = true; forecast.fuel = work.state.vehicle.propellantMass;
  forecast.handoff = { x: 0, height: 100, vx: 0, vy: -20, time: 10, lateralFeasible: true };
  job.stage = 'validate';
  job.selected = { originTime: s.world.environmentTime, burnDuration: 10,
    shutdownAt: s.world.environmentTime + 10, coastPitch: rad(0), forecast };
  job.rollout = work;
  return s;
}
describe('capture publication with random failures enabled', () => {
  it.each([false, true])('publishes a real fine capture when the preference is %s', preference => {
    const s = fineCapture(preference), before = cloneState(s);
    advanceBoosterPrediction(s, 1 / 120, advanceMechanics, runBoosterPolicy, SUPER_HEAVY);
    expect(s.autopilot.boosterReturnPlan).toBeDefined();
    expect(s.autopilot.boosterPrediction!.published!.forecast.reached).toBe(true);
    expect(s.vehicle).toEqual(before.vehicle); expect(s.rng).toEqual(before.rng);
  });
  it.each(['crashed', 'inFlightBreakUp', 'coldGasRunOut', 'fuelRunOut', 'heatDamaged',
    'overPressure', 'overGLoad', 'flippedOver'] as const)('rejects realized %s even with the preference enabled', failure => {
    const s = fineCapture(true);
    s.autopilot.boosterPrediction!.rollout.state.failures[failure] = true;
    advanceBoosterPrediction(s, 1 / 120, advanceMechanics, runBoosterPolicy, SUPER_HEAVY);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(s.autopilot.boosterPrediction!.published).toBeUndefined();
  });
});
