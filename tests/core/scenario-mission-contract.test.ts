/** Clock/control sequencing units only. Mocked advances are not flight evidence;
 * the acceptance matrix imports the real default step implementation.
 */
import { beforeEach, expect, it, vi } from 'vitest';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { cloneState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { circularOrbitalSpeed } from '$core/physics/gravity';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { runScenarioMission } from '../support/scenario-mission';

vi.mock('$core/step', () => ({ step: vi.fn(), NO_INPUT: {} }));
vi.mock('../support/scenario-horizon', () => ({
  scenarioMissionHorizon: () => ({ seconds: 5 * (1 / 120), steps: 5 }),
}));
beforeEach(() => vi.resetAllMocks());
const preset = (id: string) => ALL_SCENARIOS.find(value => value.id === id)!;

it('charges departure and ascent handoff to the same five-tick unit budget', () => {
  let calls = 0;
  vi.mocked(step).mockImplementation(previous => {
    const next = cloneState(previous);
    next.kinematics.altitude = 1000 + calls++;
    next.kinematics.speedY = 10;
    next.status.onTheGround = false;
    next.world.environmentTime += DT;
    return next;
  });
  const result = runScenarioMission(preset('launch-pad'), SHIP);
  expect(result.ticks).toBe(5);
  expect(result.seconds).toBe(5 * DT);
  expect(result.outcome).toBe('flying');
  expect(step).toHaveBeenCalledTimes(5);
  expect(result.events.map(event => [event.kind, event.tick])).toEqual([
    ['departed', 1], ['ascent-complete', 2], ['return-handoff', 2],
  ]);
  expect(vi.mocked(step).mock.calls[0]![0].autopilot.autoTakeOffOn).toBe(true);
  expect(vi.mocked(step).mock.calls[2]![0].autopilot.autoTakeOffOn).toBe(false);
  expect(vi.mocked(step).mock.calls[2]![0].autopilot.autoLandOn).toBe(true);
  for (const call of vi.mocked(step).mock.calls) {
    expect(call[1]).toBe(DT); expect(call[3]).toBe(SHIP);
  }
});

it('charges circularization before deorbit and preserves physical start/throttle state', () => {
  const start = createScenarioState(preset('circularize'), undefined, SUPER_HEAVY);
  vi.mocked(step).mockImplementation(previous => {
    const next = cloneState(previous);
    next.kinematics.speedX = circularOrbitalSpeed(next.kinematics.distanceToPlanetCenter) + 1;
    next.world.environmentTime += DT;
    return next;
  });
  const result = runScenarioMission(preset('circularize'), SUPER_HEAVY);
  expect(result.ticks).toBe(5);
  expect(result.circularized).toBe(true);
  expect(step).toHaveBeenCalledTimes(5);
  expect(result.events.filter(event => event.kind === 'circularized').map(event => event.tick)).toEqual([1]);
  const first = vi.mocked(step).mock.calls[0]![0];
  expect(first.kinematics).toEqual(start.kinematics);
  expect(first.vehicle.throttleCurrent).toBe(start.vehicle.throttleCurrent);
  expect(first.autopilot.autoDeorbitOn).toBe(false);
  expect(vi.mocked(step).mock.calls[1]![0].autopilot.autoDeorbitOn).toBe(true);
  expect(vi.mocked(step).mock.calls.every(call => call[1] === DT && call[3] === SUPER_HEAVY)).toBe(true);
});

it('uses Ship RTLS boostback rather than auto-land alone', () => {
  vi.mocked(step).mockImplementation(previous => cloneState(previous));
  runScenarioMission(preset('rtls'), SHIP);
  const first = vi.mocked(step).mock.calls[0]![0];
  expect(first.autopilot.autoBoostBackOn).toBe(true);
  expect(first.autopilot.autoLandOn).toBe(false);
  expect(first.kinematics).toEqual(createScenarioState(preset('rtls')).kinematics);
});

it('records incoming touchdown rather than a later integrated or reset pose', () => {
  vi.mocked(step).mockImplementation(previous => {
    const next = cloneState(previous);
    next.status.landed = true;
    next.kinematics.altitude += 1;
    next.kinematics.speedX = next.kinematics.speedY = 0;
    next.world.environmentTime += DT;
    return next;
  });
  const result = runScenarioMission({ ...preset('landing-burn'),
    altitude: SHIP.height / 2, speedX: 1, speedY: -1 }, SHIP);
  expect(result.ticks).toBe(1);
  expect(result.outcome).toBe('landed');
  expect(result.touchdown).toEqual({ altitude: SHIP.height / 2, speedX: 1, speedY: -1, pitch: 0 });
  expect(result.state.kinematics.altitude).toBe(SHIP.height / 2 + 1);
  expect(result.state.kinematics.speedY).toBe(0);
});

it('observes actual step endpoints before handoff without changing the mission or step count', () => {
  const advance = (previous: Parameters<typeof step>[0]) => {
    const next = cloneState(previous);
    next.kinematics.altitude = previous.kinematics.altitude <= 1000 ? 1001 : 1002;
    next.kinematics.speedY = 10;
    next.status.onTheGround = false;
    next.world.environmentTime += DT;
    return next;
  };
  vi.mocked(step).mockImplementation(advance);
  const baseline = runScenarioMission(preset('launch-pad'), SHIP);
  vi.mocked(step).mockClear();
  const observed: unknown[] = [];
  const result = runScenarioMission(preset('launch-pad'), SHIP, (previous, current, tick) => {
    observed.push([tick, previous.world.environmentTime, current.world.environmentTime,
      current.autopilot.autoTakeOffOn, current.autopilot.autoLandOn]);
  });
  expect(result).toEqual(baseline);
  expect(step).toHaveBeenCalledTimes(5);
  expect(observed).toHaveLength(5);
  expect(observed[0]).toEqual([1, 0, DT, true, false]);
  expect(observed[1]).toEqual([2, DT, 2 * DT, false, true]);
});
