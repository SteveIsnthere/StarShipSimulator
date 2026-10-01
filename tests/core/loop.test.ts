/**
 * M1.11 acceptance: loop test with fake frame times.
 *
 * Fake frame times are the whole point. The 2021 loop read Date.now() and
 * integrated by whatever it found, so its behaviour under load could only be
 * observed by putting it under load. Here frame time is an argument, so every
 * pathological case — a 2-second stall, a clock that runs backwards, a display
 * whose refresh rate is not a multiple of the step rate — is a unit test.
 */
import { describe, expect, it } from 'vitest';
import {
  advance,
  createLoopState,
  DT,
  interpolate,
  MAX_FRAME_TIME,
  MAX_STEPS_PER_FRAME,
} from '$app/loop';
import { createInitialState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';

const frames = (loop: ReturnType<typeof createLoopState>, times: number[], opts = {}) =>
  times.map((t) => advance(loop, t, opts));

describe('fixed timestep', () => {
  it('runs exactly one step per 1/120 s frame', () => {
    const loop = createLoopState(createInitialState());
    const results = frames(loop, Array(10).fill(DT));
    expect(results.every((r) => r.steps === 1)).toBe(true);
    expect(loop.totalSteps).toBe(10);
  });

  it('runs four steps per 30 fps frame', () => {
    const loop = createLoopState(createInitialState());
    const results = frames(loop, Array(10).fill(1 / 30));
    expect(results.every((r) => r.steps === 4)).toBe(true);
    expect(loop.totalSteps).toBe(40);
  });

  it('runs 0 or 1 steps per 144 fps frame, averaging 120 Hz', () => {
    // 144 Hz against a 120 Hz sim: the accumulator makes up the difference.
    const loop = createLoopState(createInitialState());
    const n = 1440; // ten seconds
    const results = frames(loop, Array(n).fill(1 / 144));
    expect(results.every((r) => r.steps === 0 || r.steps === 1)).toBe(true);
    expect(results.some((r) => r.steps === 0)).toBe(true);
    // 10 s of simulated time at 120 Hz is 1200 steps, +-1 for the remainder.
    expect(Math.abs(loop.totalSteps - 1200)).toBeLessThanOrEqual(1);
  });

  it('keeps simulated time locked to real time across ragged frames', () => {
    const loop = createLoopState(createInitialState());
    // A deliberately awful frame budget: 60 fps with stutters.
    const pattern = [1 / 60, 1 / 60, 1 / 20, 1 / 240, 1 / 60, 1 / 90, 1 / 45];
    let realTime = 0;
    for (let i = 0; i < 700; i++) {
      const ft = pattern[i % pattern.length]!;
      realTime += ft;
      advance(loop, ft);
    }
    // Simulated time tracks real time to within one unconsumed step.
    expect(Math.abs(loop.simulatedTime - realTime)).toBeLessThan(DT);
  });

  it('never leaves a whole step unconsumed', () => {
    const loop = createLoopState(createInitialState());
    for (const ft of [0.001, 0.05, 0.0083, 0.02, 1 / 144]) {
      advance(loop, ft);
      expect(loop.accumulator).toBeGreaterThanOrEqual(0);
      expect(loop.accumulator).toBeLessThan(DT);
    }
  });
});

describe('the trajectory does not depend on the frame rate', () => {
  it('60 fps and 30 fps reach the identical state after the same simulated time', () => {
    // The property the 2021 loop did not have, and the reason it ran slow.
    const build = () => {
      const s = createScenarioState(getScenario('before-flip')!);
      cmd.toggleAutoLand(s);
      return s;
    };

    const fast = createLoopState(build());
    const slow = createLoopState(build());
    for (let i = 0; i < 600; i++) advance(fast, 1 / 60);
    for (let i = 0; i < 300; i++) advance(slow, 1 / 30);

    expect(fast.totalSteps).toBe(slow.totalSteps);
    expect(fast.state.kinematics.altitude).toBe(slow.state.kinematics.altitude);
    expect(fast.state.kinematics.speedY).toBe(slow.state.kinematics.speedY);
    expect(fast.state.kinematics.pitch).toBe(slow.state.kinematics.pitch);
    expect(fast.state.vehicle.propellantMass).toBe(slow.state.vehicle.propellantMass);
  });

  it('matches stepping the core directly, step for step', () => {
    const loop = createLoopState(createInitialState());
    let direct = createInitialState();
    for (let i = 0; i < 240; i++) advance(loop, DT);
    for (let i = 0; i < 240; i++) direct = step(direct, DT);
    expect(loop.state.kinematics.altitude).toBe(direct.kinematics.altitude);
    expect(loop.state.world.updatedFrameCount).toBe(direct.world.updatedFrameCount);
  });
});

describe('time warp', () => {
  it('warp N runs N times the steps for the same real time', () => {
    for (const warp of [1, 2, 4, 16]) {
      const loop = createLoopState(createInitialState());
      for (let i = 0; i < 120; i++) advance(loop, DT, { timeWarp: warp });
      expect(loop.totalSteps, `warp ${warp}`).toBe(120 * warp);
    }
  });

  it('warp never scales dt — a step always means 1/120 s', () => {
    // Scaling dt would be the easy implementation and would break every golden.
    const warped = createLoopState(createInitialState());
    for (let i = 0; i < 30; i++) advance(warped, DT, { timeWarp: 4 });

    const plain = createLoopState(createInitialState());
    for (let i = 0; i < 120; i++) advance(plain, DT);

    // 30 frames at warp 4 and 120 frames at warp 1 are the same 120 steps.
    expect(warped.totalSteps).toBe(plain.totalSteps);
    expect(warped.state.kinematics.altitude).toBe(plain.state.kinematics.altitude);
    expect(warped.state.kinematics.speedY).toBe(plain.state.kinematics.speedY);
    expect(warped.simulatedTime).toBeCloseTo(plain.simulatedTime, 12);
  });

  it('a flight under warp is identical to the same flight in real time', () => {
    const build = () => {
      const s = createScenarioState(getScenario('landing-burn')!);
      cmd.toggleAutoLand(s);
      return s;
    };
    const real = createLoopState(build());
    const warped = createLoopState(build());
    for (let i = 0; i < 1200; i++) advance(real, DT);
    for (let i = 0; i < 150; i++) advance(warped, DT, { timeWarp: 8 });

    expect(warped.totalSteps).toBe(real.totalSteps);
    expect(warped.state.kinematics.altitude).toBe(real.state.kinematics.altitude);
    expect(warped.state.status.landed).toBe(real.state.status.landed);
  });
});

describe('pathological frame times', () => {
  it('clamps a long stall instead of spiralling', () => {
    const loop = createLoopState(createInitialState());
    const result = advance(loop, 2.0);
    expect(result.clamped).toBe(true);
    // 0.25 s of simulated time, not 2 s.
    expect(result.steps).toBe(Math.floor(MAX_FRAME_TIME / DT));
    expect(loop.simulatedTime).toBeCloseTo(result.steps * DT, 12);
  });

  it('drops simulated time on the floor rather than locking up', () => {
    // The trade the clamp makes, stated as a test: after a stall the world is
    // behind real time, and that is deliberate.
    const loop = createLoopState(createInitialState());
    advance(loop, 5.0);
    expect(loop.simulatedTime).toBeLessThan(0.26);
  });

  it('survives a zero frame time', () => {
    const loop = createLoopState(createInitialState());
    expect(advance(loop, 0).steps).toBe(0);
    expect(loop.totalSteps).toBe(0);
  });

  it('survives a clock that runs backwards', () => {
    // Happens with some timer sources and after a system clock adjustment.
    const loop = createLoopState(createInitialState());
    expect(advance(loop, -1).steps).toBe(0);
    expect(loop.accumulator).toBe(0);
    // And recovers cleanly on the next good frame.
    expect(advance(loop, DT).steps).toBe(1);
  });

  it('survives NaN', () => {
    const loop = createLoopState(createInitialState());
    expect(advance(loop, NaN).steps).toBe(0);
    expect(Number.isFinite(loop.accumulator)).toBe(true);
    expect(advance(loop, DT).steps).toBe(1);
  });

  it('bounds work per frame even at an absurd warp factor', () => {
    const loop = createLoopState(createInitialState());
    const result = advance(loop, MAX_FRAME_TIME, { timeWarp: 100_000 });
    expect(result.steps).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    expect(result.clamped).toBe(true);
  });
});

describe('pause', () => {
  it('stops the simulation without losing the accumulator', () => {
    const loop = createLoopState(createInitialState());
    advance(loop, DT * 0.5);
    const before = loop.accumulator;
    const result = advance(loop, 1.0, { paused: true });
    expect(result.steps).toBe(0);
    expect(loop.totalSteps).toBe(0);
    expect(loop.accumulator).toBe(before);
  });

  it('resumes exactly where it left off', () => {
    const build = () => createScenarioState(getScenario('landing-burn')!);
    const paused = createLoopState(build());
    const straight = createLoopState(build());

    for (let i = 0; i < 60; i++) advance(paused, DT);
    for (let i = 0; i < 100; i++) advance(paused, 0.5, { paused: true });
    for (let i = 0; i < 60; i++) advance(paused, DT);
    for (let i = 0; i < 120; i++) advance(straight, DT);

    expect(paused.totalSteps).toBe(straight.totalSteps);
    expect(paused.state.kinematics.altitude).toBe(straight.state.kinematics.altitude);
  });
});

describe('interpolation', () => {
  it('reports how far between the two states to draw', () => {
    const loop = createLoopState(createInitialState());
    // Half a step of time: nothing has run, alpha is 0.5.
    const r = advance(loop, DT * 0.5);
    expect(r.steps).toBe(0);
    expect(r.alpha).toBeCloseTo(0.5, 12);
  });

  it('alpha is always in [0, 1)', () => {
    const loop = createLoopState(createInitialState());
    for (const ft of [0, 0.001, DT, DT * 1.5, 0.05, 1 / 144, 2.0]) {
      const r = advance(loop, ft);
      expect(r.alpha, `frameTime ${ft}`).toBeGreaterThanOrEqual(0);
      expect(r.alpha, `frameTime ${ft}`).toBeLessThan(1);
    }
  });

  it('keeps the previous state so the view can interpolate', () => {
    // Falling, not on the pad: a vehicle resting on the ground has the same
    // altitude before and after a step, which would make this vacuous.
    const start = createInitialState();
    start.kinematics.altitude = 5000;
    start.kinematics.speedY = -100;
    const loop = createLoopState(start);
    advance(loop, DT);

    expect(loop.previous).not.toBe(loop.state);
    expect(loop.previous.kinematics.altitude).toBe(5000);
    expect(loop.state.kinematics.altitude).toBeLessThan(5000);

    // And the renderer can draw between them.
    const mid = interpolate(
      loop.previous.kinematics.altitude,
      loop.state.kinematics.altitude,
      0.5,
    );
    expect(mid).toBeLessThan(loop.previous.kinematics.altitude);
    expect(mid).toBeGreaterThan(loop.state.kinematics.altitude);
  });

  it('interpolate blends two values', () => {
    expect(interpolate(0, 10, 0)).toBe(0);
    expect(interpolate(0, 10, 1)).toBe(10);
    expect(interpolate(0, 10, 0.25)).toBe(2.5);
    expect(interpolate(-5, 5, 0.5)).toBe(0);
  });
});

describe('the 2021 defect this replaces', () => {
  it('a slow frame no longer runs the world in slow motion', () => {
    // updateBackEnd clamped frameTime to 30 ms and integrated by that, so a
    // 45 ms frame advanced the world by 30 ms — a third of the elapsed time
    // silently vanished, every frame, whenever the renderer was struggling.
    // Here a 45 ms frame runs the steps 45 ms deserves.
    const loop = createLoopState(createInitialState());
    advance(loop, 0.045);
    expect(loop.totalSteps).toBe(Math.floor(0.045 / DT));
    expect(loop.simulatedTime).toBeCloseTo(Math.floor(0.045 / DT) * DT, 12);
    // The remainder is carried, not discarded.
    expect(loop.accumulator).toBeGreaterThan(0);
  });

  it('sustained slow frames stay locked to real time', () => {
    // 33 fps sustained: the 2021 loop lost ~19% of elapsed time here.
    const loop = createLoopState(createInitialState());
    const frameTime = 1 / 33;
    let real = 0;
    for (let i = 0; i < 330; i++) {
      real += frameTime;
      advance(loop, frameTime);
    }
    const ratio = loop.simulatedTime / real;
    // The 2021 loop sat around 0.81 here. This one tracks real time to within
    // the unconsumed remainder. The upper bound carries a float-noise tolerance:
    // summing 330 frame times and 330 multiples of DT do not agree to the last
    // bit, and the ratio lands a couple of ULP either side of 1.
    expect(ratio).toBeGreaterThan(0.999);
    expect(ratio).toBeLessThan(1 + 1e-9);
  });
});
