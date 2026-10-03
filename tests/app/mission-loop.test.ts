import { describe, expect, it } from 'vitest';
import { createMissionLoop, advanceMission } from '$app/mission-loop';
import { createHotStageMission, stepMission } from '$core/mission';
import { createInitialState } from '$core/state';
import { createLoopState, advance, DT, MAX_FRAME_TIME, MAX_STEPS_PER_FRAME } from '$app/loop';

const input = { stage: true };

describe('one shared mission accumulator', () => {
  it('matches direct120Hz mission steps at30/60/144Hz with both trajectories and engine draws exact', () => {
    let expected = createHotStageMission(123);
    for (let i = 0; i < 240; i++) expected = stepMission(expected, DT, input);
    expect(expected.phase).toBe('separated');
    for (const hz of [30, 60, 144]) {
      const loop = createMissionLoop(createHotStageMission(123));
      for (let i = 0; i < 300 && loop.totalSteps < 240; i++) advanceMission(loop, 1 / hz, { input });
      expect(loop.totalSteps, String(hz)).toBe(240);
      expect(loop.state).toEqual(expected);
      expect(loop.state.ship.world.environmentTime).toBe(loop.state.booster.world.environmentTime);
    }
  });

  it('retains both states and remainder on pause; slow motion/warp keep the same fixed-step mission', () => {
    const loop = createMissionLoop(createHotStageMission(123));
    advanceMission(loop, DT / 2);
    const before = structuredClone(loop);
    expect(advanceMission(loop, 1, { paused: true, input }).steps).toBe(0);
    expect(loop).toEqual(before);
    const plain = createMissionLoop(createHotStageMission(123));
    const slow = createMissionLoop(createHotStageMission(123));
    const warp = createMissionLoop(createHotStageMission(123));
    for (let i = 0; i < 240; i++) advanceMission(plain, DT, { input });
    for (let i = 0; i < 480; i++) advanceMission(slow, DT, { input, slowMotion: 2 });
    for (let i = 0; i < 60; i++) advanceMission(warp, DT, { input, timeWarp: 4 });
    expect(slow.totalSteps).toBe(240);
    expect(warp.totalSteps).toBe(240);
    expect(slow.state).toEqual(plain.state);
    expect(warp.state).toEqual(plain.state);
    expect(warp.simulatedTime).toBe(plain.simulatedTime);
  });

  it('reuses the shipped clamp/pathological-time/work-cap policy and calls the recorder at every real step', () => {
    const mission = createMissionLoop(createHotStageMission(123));
    const ship = createLoopState(createInitialState(123));
    let calls = 0;
    for (const frame of [-1, NaN, 0, DT / 2, 2]) {
      const a = advanceMission(mission, frame, { onStep: state => {
        calls++;
        expect(state.elapsedTime).toBe(state.ship.world.environmentTime);
        expect(state.elapsedTime).toBe(state.booster.world.environmentTime);
      } });
      const b = advance(ship, frame);
      expect(a).toEqual(b);
      expect(mission.accumulator).toBe(ship.accumulator);
      expect(mission.totalSteps).toBe(ship.totalSteps);
    }
    expect(calls).toBe(mission.totalSteps);
    const result = advanceMission(mission, MAX_FRAME_TIME, { timeWarp: 100_000 });
    expect(result.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(result.clamped).toBe(true);
    expect(result.simulatedDt).toBe(MAX_STEPS_PER_FRAME * DT);
    expect(mission.accumulator).toBe(0);
  });

  it('restarting from the same seed restores attachment, tanks, independent engine RNG and zero loop counters', () => {
    const initial = createHotStageMission(123);
    const played = createMissionLoop(initial);
    advanceMission(played, MAX_FRAME_TIME, { timeWarp: 8, input });
    expect(played.state.phase).toBe('separated');
    const restart = createMissionLoop(createHotStageMission(123));
    expect(restart.state).toEqual(initial);
    expect(restart.state.phase).toBe('attached');
    expect(restart.totalSteps).toBe(0);
    expect(restart.accumulator).toBe(0);
    expect(restart.state.ship.rng).not.toBe(restart.state.booster.rng);
    expect(restart.state.ship.rng.seed).not.toBe(restart.state.booster.rng.seed);
  });
});
