import { describe, expect, it } from 'vitest';
import { createLoopState } from '$app/loop';
import { createSimDebug, flatten, installSimDebug, wantsSimDebug } from '$app/debug';
import { createIntroState, createScenarioState, getScenario } from '$core/scenarios';

function harness() {
  const loop = createLoopState(createIntroState());
  const paused: boolean[] = [];
  const started: string[] = [];
  const debug = createSimDebug({
    loop: () => loop,
    startScenario: (id, overrides) => {
      started.push(id + (overrides ? JSON.stringify(overrides) : ''));
      loop.state = createScenarioState(getScenario(id)!);
    },
    setPaused: (p) => paused.push(p),
  });
  return { loop, paused, started, debug };
}

describe('when the debug surface exists', () => {
  it('only in a dev build or with ?debug=1', () => {
    expect(wantsSimDebug(false, '')).toBe(false);
    expect(wantsSimDebug(false, '?debug=0')).toBe(false);
    expect(wantsSimDebug(false, '?x=1&debug=1')).toBe(true);
    expect(wantsSimDebug(true, '')).toBe(true);
  });

  it('a production page load attaches nothing', () => {
    const target = { location: { search: '' } } as unknown as Window;
    const { loop } = harness();
    expect(
      installSimDebug(target, false, {
        loop: () => loop,
        startScenario: () => {},
        setPaused: () => {},
      }),
    ).toBe(false);
    expect('__simDebug' in target).toBe(false);
  });
});

describe('what it does', () => {
  it('steps exactly n fixed steps', () => {
    const { loop, debug } = harness();
    debug.pause();
    const before = loop.totalSteps;
    debug.step(60);
    expect(loop.totalSteps - before).toBe(60);
  });

  it('pauses and resumes through the app', () => {
    const { paused, debug } = harness();
    debug.pause();
    expect(debug.paused).toBe(true);
    debug.resume();
    expect(paused).toEqual([true, false]);
  });

  it('sets state by flattened path and reads it back', () => {
    const { debug } = harness();
    debug.setState({ 'kinematics.altitude': 1234, 'engines.running[1]': false });
    const t = debug.telemetry();
    expect(t['kinematics.altitude']).toBe(1234);
    expect(t['engines.running[1]']).toBe(false);
  });

  it('refuses a path that does not exist, rather than inventing a field', () => {
    const { debug } = harness();
    expect(() => debug.setState({ 'kinematics.altitud': 1 })).toThrow(/no such state path/);
  });

  it('starts a scenario through the app', () => {
    const { started, debug } = harness();
    debug.setScenario('landing-burn');
    debug.setScenario('rtls', { altitude: 2000 });
    expect(started).toEqual(['landing-burn', 'rtls{"altitude":2000}']);
  });

  it('flattens arrays and nested objects', () => {
    expect(flatten({ a: { b: 1, c: [true, 2] } })).toEqual({
      'a.b': 1,
      'a.c[0]': true,
      'a.c[1]': 2,
    });
  });
});


describe('on-demand presentation controls', () => {
  it('delegates geometry and visibility without changing simulation telemetry', () => {
    const loop = harness().loop;
    const geometry = { nozzleX: 30, nozzleY: 40, width: 100, height: 200 };
    const visibility: boolean[] = [];
    const debug = createSimDebug({ loop: () => loop, startScenario: () => {}, setPaused: () => {},
      presentation: () => geometry, setParticlesVisible: (visible) => visibility.push(visible) });
    const before = debug.telemetry();
    expect(debug.presentation()).toBe(geometry);
    debug.setParticlesVisible(false); debug.setParticlesVisible(true);
    expect(visibility).toEqual([false, true]);
    expect(debug.telemetry()).toEqual(before);
  });
});


it('delegates vehicle visibility without advancing or modifying the flight', () => {
  const loop = harness().loop;
  const visibility: boolean[] = [];
  const debug = createSimDebug({ loop: () => loop, startScenario: () => {}, setPaused: () => {},
    setVehiclesVisible: (visible) => visibility.push(visible) });
  const before = debug.telemetry();
  debug.setVehiclesVisible(false); debug.setVehiclesVisible(true);
  expect(visibility).toEqual([false, true]);
  expect(debug.telemetry()).toEqual(before);
});
