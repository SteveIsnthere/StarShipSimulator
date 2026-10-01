/**
 * M4.2: the typed control surface.
 *
 * The point of the union is that the set of things the UI can do to the
 * simulation is enumerable and checked, rather than being "whatever global an
 * onclick attribute names". So the tests check the mapping is complete and that
 * each event does the thing 2021's corresponding button did — including the
 * asymmetries, which are the parts a rewrite would quietly smooth away.
 */
import { describe, expect, it } from 'vitest';
import { applyControl, type ControlEvent } from '$ui/controls';
import { createInitialState, type SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { throttleLowerLimit, throttleUpperLimit } from '$core/constants';
import { step } from '$core/step';
import { DT } from '$app/loop';

/** One of every variant, so "every event is handled" is a real assertion. */
const EVERY_EVENT: ControlEvent[] = [
  { type: 'raptor', engine: 0 },
  { type: 'raptor', engine: 1 },
  { type: 'raptor', engine: 2 },
  { type: 'allRaptors' },
  { type: 'throttle', percent: 70 },
  { type: 'pitch', percent: 20 },
  { type: 'yokeGrab' },
  { type: 'yokeRelease' },
  { type: 'autoMaxThrust' },
  { type: 'autoTakeOff' },
  { type: 'boostBack' },
  { type: 'pitchHold' },
  { type: 'autoLand' },
  { type: 'fins' },
  { type: 'rcs' },
  { type: 'dumpFuel' },
];

describe('the union is fully handled', () => {
  it('applies every variant without falling through', () => {
    const state = createInitialState();
    for (const event of EVERY_EVENT) {
      expect(() => applyControl(state, event), event.type).not.toThrow();
    }
  });

  it('covers every type in the union exactly once', () => {
    const types = EVERY_EVENT.map((e) => e.type);
    // Duplicates are allowed only for `raptor`, which is parameterised.
    const unique = [...new Set(types)];
    expect(types.length - unique.length).toBe(2);
  });
});

describe('toggles', () => {
  const cases: Array<[ControlEvent, (s: SimState) => boolean]> = [
    [{ type: 'autoMaxThrust' }, (s) => s.autopilot.autoMaxThrustOn],
    [{ type: 'autoTakeOff' }, (s) => s.autopilot.autoTakeOffOn],
    [{ type: 'boostBack' }, (s) => s.autopilot.autoBoostBackOn],
    [{ type: 'pitchHold' }, (s) => s.autopilot.pitchHoldOn],
    [{ type: 'autoLand' }, (s) => s.autopilot.autoLandOn],
    [{ type: 'fins' }, (s) => s.status.finActive],
    [{ type: 'rcs' }, (s) => s.status.rcsActive],
    [{ type: 'dumpFuel' }, (s) => s.status.dumpingFuel],
  ];

  for (const [event, read] of cases) {
    it(`${event.type} flips its flag and flips it back`, () => {
      const state = createInitialState();
      const before = read(state);
      applyControl(state, event);
      expect(read(state)).toBe(!before);
      applyControl(state, event);
      expect(read(state)).toBe(before);
    });
  }
});

describe('throttle', () => {
  it('sets the commanded throttle, not the actual one', () => {
    // The actual throttle slews toward the command at throttleSpeed, so a
    // slider that wrote throttleCurrent would teleport the engines.
    const state = createInitialState();
    const wasCurrent = state.vehicle.throttleCurrent;

    applyControl(state, { type: 'throttle', percent: 55 });

    expect(state.vehicle.throttle).toBe(55);
    expect(state.vehicle.throttleCurrent).toBe(wasCurrent);
  });

  it('clamps to the engine limits, wherever the value came from', () => {
    // 2021 put these bounds on the slider element, so they held for the slider
    // and nothing else. Now they hold in core, for every caller.
    const state = createInitialState();

    applyControl(state, { type: 'throttle', percent: 999 });
    expect(state.vehicle.throttle).toBe(throttleUpperLimit);

    applyControl(state, { type: 'throttle', percent: -50 });
    expect(state.vehicle.throttle).toBe(throttleLowerLimit);

    applyControl(state, { type: 'throttle', percent: 0 });
    expect(state.vehicle.throttle).toBe(throttleLowerLimit);
  });
});

describe('the yoke', () => {
  it('clamps pitch to the slider range', () => {
    const state = createInitialState();

    applyControl(state, { type: 'pitch', percent: 500 });
    expect(state.autopilot.pitchControl).toBe(100);

    applyControl(state, { type: 'pitch', percent: -500 });
    expect(state.autopilot.pitchControl).toBe(-100);
  });

  it('grabbing suspends attitude hold, and only while hold is on', () => {
    const state = createInitialState();

    // Hold off: grabbing means nothing, because there is nothing to suspend.
    applyControl(state, { type: 'yokeGrab' });
    expect(state.autopilot.manualControlOn).toBe(false);

    applyControl(state, { type: 'pitchHold' });
    applyControl(state, { type: 'yokeGrab' });
    expect(state.autopilot.manualControlOn).toBe(true);
  });

  it('releasing adopts the attitude the vehicle now has', () => {
    // switches.js:8. This is the behaviour that makes the yoke feel like a
    // trim wheel rather than a spring: let go and it holds where you left it.
    let state: SimState = createScenarioState(getScenario('before-flip')!);
    applyControl(state, { type: 'pitchHold' });
    applyControl(state, { type: 'yokeGrab' });

    // Fly manually for a moment so the attitude moves away from the hold.
    applyControl(state, { type: 'pitch', percent: 100 });
    for (let i = 0; i < 240; i++) state = step(state, DT);
    expect(state.kinematics.pitch).not.toBe(state.autopilot.holdingPitch);

    applyControl(state, { type: 'yokeRelease' });

    expect(state.autopilot.holdingPitch).toBe(state.kinematics.pitch);
    expect(state.autopilot.manualControlOn).toBe(false);
  });

  it('does not touch the hold when attitude hold is off', () => {
    const state = createInitialState();
    const before = state.autopilot.holdingPitch;
    state.kinematics.pitch = (before as number) + 1 as typeof before;

    applyControl(state, { type: 'yokeRelease' });

    expect(state.autopilot.holdingPitch).toBe(before);
  });
});

describe('the raptors', () => {
  it('a press starts an ignition countdown rather than lighting instantly', () => {
    const state = createInitialState();
    applyControl(state, { type: 'raptor', engine: 0 });

    expect(state.engines.running[0]).toBe(false);
    expect(state.engines.ignitionCountdown[0]).not.toBeNull();
  });

  it('a second press cancels the ignition, as switches.js:16 does', () => {
    const state = createInitialState();
    applyControl(state, { type: 'raptor', engine: 0 });
    applyControl(state, { type: 'raptor', engine: 0 });

    expect(state.engines.ignitionCountdown[0]).toBeNull();
    expect(state.engines.running[0]).toBe(false);
  });

  it('toggle-all keeps 2021 asymmetry: shuts down only the running ones', () => {
    let state: SimState = createInitialState();
    // Light one and let it catch.
    applyControl(state, { type: 'raptor', engine: 0 });
    for (let i = 0; i < 240; i++) state = step(state, DT);
    expect(state.engines.running[0]).toBe(true);

    // With one running, toggle-all is a shutdown — it does NOT start the others.
    applyControl(state, { type: 'allRaptors' });
    expect(state.engines.running[0]).toBe(false);
    expect(state.engines.ignitionCountdown[1]).toBeNull();
    expect(state.engines.ignitionCountdown[2]).toBeNull();
  });

  it('toggle-all with nothing running starts all three', () => {
    const state = createInitialState();
    applyControl(state, { type: 'allRaptors' });

    for (const i of [0, 1, 2] as const) {
      expect(state.engines.ignitionCountdown[i], `engine ${i}`).not.toBeNull();
    }
  });
});
