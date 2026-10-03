/** Completed forecast messages can propose work, never manufacture live
 * cutoff authority. Test the retained endpoints, immutable source and caps. */
import { describe, expect, it } from 'vitest';
import { cloneState, type SimState } from '$core/state';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { createBoosterForecast, createBoosterHandoffWork } from '$core/control/booster-forecast';
import { advanceMechanics } from '$core/step';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import ready from '../fixtures/booster-terminal-ready.json';
const DT = 1 / 120;
const advance = (s: SimState) => advanceBoosterPrediction(s, DT, advanceMechanics, runBoosterPolicy, SUPER_HEAVY);
function job() {
  const s = createScenarioVehicle(getScenario('rtls')!, 123).state;
  s.autopilot.autoLandOn = true; s.autopilot.boosterPhase = 'boostback';
  advance(s);
  const j = s.autopilot.boosterPrediction!;
  j.stage = 'validate'; j.rollout.done = true; j.rollout.state.failures.crashed = true;
  return s;
}
function candidate(duration: number, error: number) {
  const forecast = createBoosterForecast();
  forecast.reached = true; forecast.fuel = 100_000; forecast.rangeError = error;
  forecast.handoff = { x: 0, height: 100, vx: 0, vy: -20, time: 10, lateralFeasible: true };
  return { originTime: 0, burnDuration: duration, shutdownAt: duration, coastPitch: rad(0), forecast };
}
function noAuthority(s: SimState, before: SimState) {
  expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  expect(s.autopilot.boosterPrediction!.published).toBeUndefined();
  expect(s.vehicle).toEqual(before.vehicle); expect(s.engines).toEqual(before.engines);
  expect(s.rng).toEqual(before.rng);
}
describe('retained physical scheduling boundaries', () => {
  it('ends a failed validation at the sixteen-trial cap without another trial or authority', () => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.iterations = 16; j.selected = candidate(2, 10);
    const before = cloneState(s);
    advance(s);
    expect(s.autopilot.boosterPrediction!.done).toBe(true);
    expect(s.autopilot.boosterPrediction!.iterations).toBe(16);
    expect(s.autopilot.boosterPrediction!.attemptedTicks).toEqual(j.attemptedTicks);
    noAuthority(s, before);
  });
  it('fine-validates an actual retained ready endpoint when the interior paid tick is exhausted', () => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.low = candidate(2, 10); j.high = candidate(2 + 2 * DT, -10); j.selected = j.low;
    j.lowReady = cloneState(ready.rtls as unknown as SimState);
    j.highReady = cloneState(j.lowReady); j.attemptedTicks = [241];
    const before = cloneState(s), paidReady = cloneState(j.lowReady);
    advance(s);
    const next = s.autopilot.boosterPrediction!;
    expect(next.stage).toBe('validate'); expect(next.done).toBe(false);
    expect(next.selected).toEqual(j.low); expect(next.rollout.step).toBe(DT);
    expect(next.rollout.state).toEqual(paidReady); expect(next.rollout.state).not.toBe(j.lowReady);
    expect(next.iterations).toBe(j.iterations); noAuthority(s, before);
  });
  it('does not validate either retained endpoint twice when interior ticks and endpoints are exhausted', () => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.low = candidate(2, 10); j.high = candidate(2 + 2 * DT, -10); j.selected = j.low;
    j.lowReady = cloneState(ready.rtls as unknown as SimState); j.highReady = cloneState(j.lowReady);
    j.attemptedTicks = [241]; j.validatedTicks = [240, 242];
    const before = cloneState(s); advance(s);
    expect(s.autopilot.boosterPrediction!.done).toBe(true);
    expect(s.autopilot.boosterPrediction!.validatedTicks).toEqual([240, 242]);
    noAuthority(s, before);
  });
  it('uses a measured recent response for interior work without transporting it into a cutoff', () => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.low = candidate(2, 1000); j.high = candidate(3, -100); j.selected = j.high;
    j.previousCandidate = candidate(4, -400); j.lastCandidate = j.high;
    const before = cloneState(s); advance(s);
    const next = s.autopilot.boosterPrediction!;
    expect(next.stage).toBe('root'); expect(next.duration).toBe(8 / 3);
    expect(next.low).toEqual(j.low); expect(next.high).toEqual(j.high);
    expect(next.attemptedTicks).toContain(320); noAuthority(s, before);
    expect(before.autopilot.boosterPrediction!.duration).toBe(j.duration);
  });
  it.each(['failed', 'unsupported'] as const)('pays for interior work after a %s zero-burn diagnostic', reason => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.origin.autopilot.boosterPhase = 'entry'; j.stage = 'low'; j.duration = 0;
    j.rollout.result = candidate(0, 10).forecast;
    if (reason === 'failed') j.rollout.state.failures.crashed = true;
    else {
      j.rollout.state = cloneState(ready.rtls as unknown as SimState);
      j.rollout.result.handoff!.lateralFeasible = false;
    }
    const before = cloneState(s); advance(s);
    const next = s.autopilot.boosterPrediction!;
    expect(next.stage).toBe('upper'); expect(next.done).toBe(false);
    expect(next.duration).toBeGreaterThan(0);
    expect(next.duration).toBeLessThan(next.upperDuration);
    expect(next.iterations).toBe(j.iterations + 1);
    if (reason === 'failed') expect(next.low).toBeUndefined();
    else expect(next.low!.forecast.handoff!.lateralFeasible).toBe(false);
    noAuthority(s, before);
  });
  it('continues a valid low diagnostic through fine mechanics before any paid command is published', () => {
    const s = job(), j = s.autopilot.boosterPrediction!;
    j.origin.autopilot.boosterPhase = 'coast'; j.stage = 'low'; j.duration = 0;
    j.rollout.result = candidate(0, 10).forecast;
    j.rollout.state = cloneState(ready.rtls as unknown as SimState);
    const before = cloneState(s); advance(s);
    const next = s.autopilot.boosterPrediction!;
    expect(next.stage).toBe('validate'); expect(next.selected!.burnDuration).toBe(0);
    expect(next.rollout.step).toBe(DT); expect(next.rollout.state).toEqual(j.rollout.state);
    noAuthority(s, before);
  });
});
describe('paid handoff inputs', () => {
  it('starts an unphased command with real alignment and a zero-burn boostback with engines shut', () => {
    const s = cloneState(ready.rtls as unknown as SimState); delete s.autopilot.boosterPhase;
    const before = cloneState(s), aligned = createBoosterHandoffWork(s, rad(.1), 2, DT);
    expect(aligned.state.autopilot.boosterPhase).toBe('align-boost');
    expect(aligned.step).toBe(DT); expect(aligned.burnRemaining).toBe(2);
    expect(s).toEqual(before);
    s.autopilot.boosterPhase = 'boostback'; s.engines.running.fill(true);
    const coast = createBoosterHandoffWork(s, rad(0), 0);
    expect(coast.state.autopilot.boosterPhase).toBe('coast');
    expect(coast.state.engines.running.some(Boolean)).toBe(false);
    expect(coast.shutdownAt).toBe(s.world.environmentTime);
    expect(s.engines.running.every(Boolean)).toBe(true);
  });
});
