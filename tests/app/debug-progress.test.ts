import { describe, expect, it } from 'vitest';
import { createLoopState, DT, type LoopState } from '$app/loop';
import { createSimDebug, type SimDebug } from '$app/debug';
import { createIntroState, createScenarioState, getScenario } from '$core/scenarios';
import type { SimState } from '$core/state';
import { createMissionController } from '$ui/session/mission-controller';

// Local API contract lets the missing-method RED compile before implementation.
type Progress = Readonly<{ landed: boolean; crashed: boolean; inFlightBreakUp: boolean;
  altitude: number; speedY: number }>;
const progress = (debug: SimDebug): Progress =>
  (debug as SimDebug & { flightProgress(): Progress }).flightProgress();

function setup(loop: () => LoopState | undefined, onStep?: (state: SimState) => void) {
  return createSimDebug({ loop, startScenario: () => {}, setPaused: () => {},
    ...(onStep ? { onStep } : {}) });
}

describe('lightweight live flight progress', () => {
  it('agrees with full telemetry without changing state, counters or its prior snapshot', () => {
    const loop = createLoopState(createIntroState());
    const debug = setup(() => loop);
    const before = structuredClone(loop);
    const full = debug.telemetry();
    const snapshot = progress(debug);
    expect(snapshot).toEqual({ landed: full['status.landed'], crashed: full['failures.crashed'],
      inFlightBreakUp: full['failures.inFlightBreakUp'], altitude: full['kinematics.altitude'],
      speedY: full['kinematics.speedY'] });
    expect(loop).toEqual(before);
    expect(progress(debug)).not.toBe(snapshot);
    loop.state.kinematics.altitude = 321;
    expect(snapshot.altitude).toBe(before.state.kinematics.altitude);
    expect(progress(debug).altitude).toBe(321);
  });

  it('follows replaced selected state and loop, and reports a missing live simulation', () => {
    let loop: LoopState | undefined = createLoopState(createIntroState());
    const debug = setup(() => loop);
    progress(debug);
    loop.state = createScenarioState(getScenario('landing-burn')!);
    expect(progress(debug).altitude).toBe(loop.state.kinematics.altitude);
    loop = createLoopState(createScenarioState(getScenario('reentry')!));
    expect(progress(debug).altitude).toBe(loop.state.kinematics.altitude);
    expect(progress(debug).speedY).toBe(loop.state.kinematics.speedY);
    loop = undefined;
    expect(() => progress(debug)).toThrow('the simulation has not started yet');
  });

  it('never traverses unrelated future/planner trees; full telemetry is a negative control', () => {
    const loop = createLoopState(createIntroState());
    const debug = setup(() => loop);
    Object.defineProperty(loop.state.autopilot, 'unrelatedFuture', { enumerable: true,
      get: () => { throw new Error('unrelated future traversed'); } });
    expect(progress(debug).landed).toBe(false);
    expect(() => debug.telemetry()).toThrow('unrelated future traversed');
    expect(loop.totalSteps).toBe(0);
  });
});

// Scripted terminal boundaries supplement actual fixed-step mechanics here;
// they do not claim a genuine catch or other successful flight.
type Terminal = 'landed' | 'crashed' | 'inFlightBreakUp';
function flight(read: 'full' | 'progress', terminal: Terminal | null, terminalTick: number) {
  const loop = createLoopState(createIntroState());
  const observers: unknown[] = [];
  const debug = setup(() => loop, state => {
    if (loop.totalSteps === terminalTick && terminal) {
      if (terminal === 'landed') state.status.landed = true;
      else state.failures[terminal] = true;
    }
    observers.push([loop.totalSteps, loop.simulatedTime, state.kinematics.altitude,
      state.kinematics.speedY, state.status.landed, state.failures.crashed, state.failures.inFlightBreakUp]);
  });
  let steps = 0;
  for (; steps < 5; steps++) {
    debug.step(1);
    if (read === 'full') {
      const state = debug.telemetry();
      if (state['status.landed'] || state['failures.crashed'] || state['failures.inFlightBreakUp']) break;
    } else {
      const state = progress(debug);
      if (state.landed || state.crashed || state.inFlightBreakUp) break;
    }
  }
  return { steps, totalSteps: loop.totalSteps, simulatedTime: loop.simulatedTime,
    previous: loop.previous, state: loop.state, observers, full: debug.telemetry() };
}

for (const terminal of ['landed', 'crashed', 'inFlightBreakUp'] as const) {
  for (const tick of [1, 4]) {
    it(`preserves the first ${terminal} stop on tick ${tick}, physics, counters and observers`, () => {
      const full = flight('full', terminal, tick), compact = flight('progress', terminal, tick);
      expect(compact).toEqual(full);
      expect(compact.steps).toBe(tick - 1);
      expect(compact.totalSteps).toBe(tick);
      expect(compact.observers).toHaveLength(tick);
    });
  }
}
it('preserves the nonterminal tick cap and final full telemetry', () => {
  const full = flight('full', null, 6), compact = flight('progress', null, 6);
  expect(compact).toEqual(full);
  expect(compact.steps).toBe(5);
  expect(compact.totalSteps).toBe(5);
  expect(compact.observers).toHaveLength(5);
});

it('preserves canonical delegated two-body stepping, selection and observer sequences', () => {
  function mission(read: 'full' | 'progress') {
    const controller = createMissionController();
    controller.startHotStage(123);
    controller.selectVehicle('super-heavy');
    let delegated = 0;
    const observed: unknown[] = [];
    const options = { onStep: (state: SimState) => {
      expect(state).toBe(controller.loop.state);
      observed.push([controller.loop.totalSteps, controller.loop.simulatedTime,
        state.kinematics.altitude, state.kinematics.speedY]);
    } };
    const debug = createSimDebug({ loop: () => controller.loop, startScenario: () => {},
      setPaused: () => {}, advanceStep: () => { delegated++; controller.advance(DT, options); } });
    const readProgress = () => {
      if (read === 'progress') return progress(debug);
      const state = debug.telemetry();
      return { landed: state['status.landed'], crashed: state['failures.crashed'],
        inFlightBreakUp: state['failures.inFlightBreakUp'], altitude: state['kinematics.altitude'],
        speedY: state['kinematics.speedY'] };
    };
    const snapshots: unknown[] = [];
    for (let tick = 0; tick < 5; tick++) {
      const previous = controller.loop.state;
      debug.step(1);
      expect(controller.loop.state).not.toBe(previous);
      expect(controller.loop.state).toBe(controller.mission!.booster);
      snapshots.push(readProgress());
      if (tick === 1) {
        const steps = controller.loop.totalSteps;
        controller.selectVehicle('ship');
        expect(controller.loop.state).toBe(controller.mission!.ship);
        snapshots.push(readProgress());
        controller.selectVehicle('super-heavy');
        expect(controller.loop.totalSteps).toBe(steps);
      }
      const state = readProgress();
      if (state.landed || state.crashed || state.inFlightBreakUp) break;
    }
    expect(delegated).toBe(5);
    expect(controller.loop.totalSteps).toBe(5);
    expect(observed).toHaveLength(5);
    return { loop: controller.loop, mission: controller.mission, observed, snapshots,
      delegated, full: debug.telemetry() };
  }
  expect(mission('progress')).toEqual(mission('full'));
});
