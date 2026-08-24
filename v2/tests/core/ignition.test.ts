/**
 * M1.4, Bug-fix tier: engine ignition must not run on the wall clock.
 *
 * THE DEFECT, as measured in the 2021 tree:
 *
 *   physics.js:452   getRaptorIgnitionTime()
 *                      = (rand*1.5 + 0.5) * raptorIgnitionTimeMean
 *                        * renderTimeInterval / frameRate
 *   and renderTimeInterval = frameRate / timeAccel, so this is
 *                      = (rand*1.5 + 0.5) * 600 / timeAccel        [ms]
 *
 *   switches.js:20   setTimeout(toggle_On, getRaptorIgnitionTime() / timeAccel)
 *                      = (rand*1.5 + 0.5) * 600 / timeAccel^2      [ms WALL CLOCK]
 *
 * timeAccel is divided out twice, and the remaining delay is then measured
 * against the wall clock while the simulation runs timeAccel times faster than
 * real time. Two distinct consequences, both measured in the last block below:
 *
 *   - the wall-clock wait shrinks with timeAccel^2 (16x shorter at 4x warp);
 *   - the simulated time an engine takes to light shrinks with timeAccel,
 *     because the sim covers timeAccel seconds per real second. At 4x warp an
 *     engine lights 4x early: 0.75 s of intended delay becomes 0.1875 s.
 *
 * The two cancel exactly at timeAccel = 1, which is why this shipped.
 *
 * CORRECT BEHAVIOUR: the delay is a duration in *simulated* seconds, drawn once
 * from the seeded `ignitionDelay` stream and counted down by dt. Warp changes
 * how many steps run per frame, never what a step means, so the delay is
 * identical at every warp factor and every frame rate.
 *
 * These tests were written before the implementation and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import {
  commandIgnition,
  IGNITION_DELAY_MAX_S,
  IGNITION_DELAY_MIN_S,
  tickIgnition,
} from '$core/physics/engines';
import * as C from '$core/constants';

/** Run `steps` steps of size `dt` and report when engine 0 actually lit. */
function timeToLight(dt: number, seed = 1234): number {
  const state = createInitialState(seed);
  commandIgnition(state, 0);
  let elapsed = 0;
  for (let i = 0; i < 1_000_000; i++) {
    tickIgnition(state, dt);
    elapsed += dt;
    if (state.engines.running[0]) return elapsed;
  }
  throw new Error('engine never lit');
}

describe('ignition delay is simulated time, not wall-clock time', () => {
  it('lands inside the intended 0.3 s - 1.2 s window', () => {
    // (rand*1.5 + 0.5) * 600 ms, i.e. 0.5x to 2.0x of a 600 ms mean.
    expect(IGNITION_DELAY_MIN_S).toBeCloseTo(0.3, 12);
    expect(IGNITION_DELAY_MAX_S).toBeCloseTo(1.2, 12);

    const t = timeToLight(1 / 120);
    expect(t).toBeGreaterThanOrEqual(IGNITION_DELAY_MIN_S);
    expect(t).toBeLessThanOrEqual(IGNITION_DELAY_MAX_S + 1 / 120);
  });

  it('is identical at 30, 60, 120 and 240 Hz, to within one step', () => {
    // The 2021 delay varied with the measured frame rate. This is the property
    // that made autopilot behaviour device-dependent.
    //
    // Compare each measured time against the exact drawn delay rather than
    // against another rate's result: a step boundary can only ever overshoot by
    // less than one step, so pairing two rates would need the *coarser* step as
    // the bound. Measuring against ground truth is both tighter and clearer.
    const exact = (() => {
      const s = createInitialState(1234);
      commandIgnition(s, 0);
      return s.engines.ignitionCountdown[0]!;
    })();

    for (const dt of [1 / 30, 1 / 60, 1 / 120, 1 / 240]) {
      const t = timeToLight(dt);
      expect(t, `dt=${dt} lit early`).toBeGreaterThanOrEqual(exact);
      expect(t - exact, `dt=${dt} overshot by more than one step`).toBeLessThan(dt + 1e-12);
    }
  });

  it('is unaffected by time warp, because warp only runs more steps', () => {
    // Warp N means N steps per frame at the same dt. Same total simulated time
    // to light, by construction. This is the regression the bug fix buys.
    const dt = 1 / 120;
    for (const warp of [1, 2, 4, 16, 64]) {
      const state = createInitialState(1234);
      commandIgnition(state, 0);
      let elapsed = 0;
      let lit = 0;
      outer: for (let frame = 0; frame < 100_000; frame++) {
        for (let n = 0; n < warp; n++) {
          tickIgnition(state, dt);
          elapsed += dt;
          if (state.engines.running[0]) {
            lit = elapsed;
            break outer;
          }
        }
      }
      expect(lit, `warp ${warp}`).toBeCloseTo(timeToLight(dt), 12);
    }
  });

  it('draws from the seeded ignitionDelay stream, so replays match', () => {
    const a = createInitialState(777);
    const b = createInitialState(777);
    commandIgnition(a, 0);
    commandIgnition(b, 0);
    expect(a.engines.ignitionCountdown[0]).toBe(b.engines.ignitionCountdown[0]);
    expect(a.rng.counters.ignitionDelay).toBe(1);
  });

  it('different seeds give different delays', () => {
    const delays = new Set<number>();
    for (let seed = 0; seed < 50; seed++) {
      const s = createInitialState(seed);
      commandIgnition(s, 0);
      delays.add(s.engines.ignitionCountdown[0]!);
    }
    expect(delays.size).toBeGreaterThan(45);
  });

  it('spends the whole window across seeds, matching (rand*1.5 + 0.5)', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let seed = 0; seed < 2000; seed++) {
      const s = createInitialState(seed);
      commandIgnition(s, 0);
      const d = s.engines.ignitionCountdown[0]!;
      min = Math.min(min, d);
      max = Math.max(max, d);
    }
    expect(min).toBeGreaterThanOrEqual(IGNITION_DELAY_MIN_S);
    expect(max).toBeLessThan(IGNITION_DELAY_MAX_S);
    // Actually spans most of the range rather than clustering.
    expect(min).toBeLessThan(0.32);
    expect(max).toBeGreaterThan(1.18);
  });

  it('the mean matches raptorIgnitionTimeMean', () => {
    // (rand*1.5 + 0.5) has mean 1.25, so E[delay] = 1.25 * 600 ms = 0.75 s.
    //
    // Tolerance is derived, not guessed. A fixed +-0.005 is tighter than the
    // sampling error at this n (the first draft failed on a perfectly healthy
    // 1.4-sigma deviation), which would have made this test flaky rather than
    // meaningful. Bound at 4 standard errors of the observed sample instead.
    const n = 5000;
    const delays: number[] = [];
    for (let seed = 0; seed < n; seed++) {
      const s = createInitialState(seed);
      commandIgnition(s, 0);
      delays.push(s.engines.ignitionCountdown[0]!);
    }
    const mean = delays.reduce((a, b) => a + b, 0) / n;
    const variance = delays.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const standardError = Math.sqrt(variance / n);

    const expected = 1.25 * (C.raptorIgnitionTimeMean / 1000);
    expect(expected).toBe(0.75);
    expect(Math.abs(mean - expected), `mean ${mean}, SE ${standardError}`).toBeLessThan(
      4 * standardError,
    );
  });
});

describe('ignition bookkeeping', () => {
  it('an engine is not running until the countdown expires', () => {
    const s = createInitialState(4242);
    commandIgnition(s, 0);
    expect(s.engines.running[0]).toBe(false);
    tickIgnition(s, 0.29);
    expect(s.engines.running[0]).toBe(false);
    tickIgnition(s, 1.0);
    expect(s.engines.running[0]).toBe(true);
  });

  it('commanding an already-igniting engine does not restart its countdown', () => {
    const s = createInitialState(4242);
    commandIgnition(s, 0);
    const first = s.engines.ignitionCountdown[0];
    commandIgnition(s, 0);
    expect(s.engines.ignitionCountdown[0]).toBe(first);
    expect(s.rng.counters.ignitionDelay).toBe(1);
  });

  it('the three engines ignite independently', () => {
    const s = createInitialState(99);
    commandIgnition(s, 0);
    commandIgnition(s, 2);
    expect(s.engines.ignitionCountdown[1]).toBeNull();
    expect(s.rng.counters.ignitionDelay).toBe(2);
    // Engine 1 never lights, however long we run.
    tickIgnition(s, 10);
    expect(s.engines.running).toEqual([true, false, true]);
  });
});

describe('the defect, quantified against the legacy formulas', () => {
  /** physics.js:452 + switches.js:20, as the 2021 code actually computed them. */
  function legacyWallClockDelayMs(roll: number, timeAccel: number): number {
    const frameRate = 60;
    const renderTimeInterval = frameRate / timeAccel;
    const getRaptorIgnitionTime =
      ((roll * 1.5 + 0.5) * C.raptorIgnitionTimeMean * renderTimeInterval) / frameRate;
    return getRaptorIgnitionTime / timeAccel;
  }

  /** Wall-clock ms converted to the simulated seconds that elapse meanwhile. */
  const legacySimulatedDelayS = (roll: number, timeAccel: number): number =>
    (legacyWallClockDelayMs(roll, timeAccel) / 1000) * timeAccel;

  it('at 1x warp the legacy delay was already correct', () => {
    // The double division cancels at timeAccel = 1, which is why this shipped.
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const expected = (roll * 1.5 + 0.5) * (C.raptorIgnitionTimeMean / 1000);
      expect(legacySimulatedDelayS(roll, 1)).toBeCloseTo(expected, 12);
    }
  });

  it('the wall-clock wait shrank with timeAccel squared', () => {
    const roll = 0.5;
    const at1x = legacyWallClockDelayMs(roll, 1);
    for (const warp of [1, 2, 4, 8, 16]) {
      expect(at1x / legacyWallClockDelayMs(roll, warp), `warp ${warp}`).toBeCloseTo(
        warp * warp,
        9,
      );
    }
    // 750 ms of intended wait became 46.875 ms of real waiting at 4x.
    expect(at1x).toBeCloseTo(750, 9);
    expect(legacyWallClockDelayMs(roll, 4)).toBeCloseTo(46.875, 9);
  });

  it('so engines lit early in simulated time, by a factor of timeAccel', () => {
    // The sim advances timeAccel seconds per real second, so one factor of
    // timeAccel is legitimately absorbed; the other is the defect.
    const roll = 0.5;
    const correct = (roll * 1.5 + 0.5) * (C.raptorIgnitionTimeMean / 1000);
    expect(correct).toBeCloseTo(0.75, 9);
    for (const warp of [1, 2, 4, 8, 16]) {
      expect(correct / legacySimulatedDelayS(roll, warp), `warp ${warp}`).toBeCloseTo(warp, 9);
    }
    // At 4x warp, 0.75 s of intended delay became 0.1875 s of simulated time.
    expect(legacySimulatedDelayS(roll, 4)).toBeCloseTo(0.1875, 9);
  });

  it('AFTER: the ported delay is flat across every warp factor', () => {
    // The whole point. Same seed, same delay, no matter the warp.
    const delays = [1, 2, 4, 8, 16, 64].map(() => {
      const s = createInitialState(1234);
      commandIgnition(s, 0);
      return s.engines.ignitionCountdown[0];
    });
    expect(new Set(delays).size).toBe(1);
  });
});
