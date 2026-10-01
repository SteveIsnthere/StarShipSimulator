/**
 * The recorder's cost, timed. Not part of the gate; run with `npm run bench`.
 */
/**
 * M4.5: the flight recorder.
 *
 * The interesting properties are not "does it store numbers". They are:
 * when it samples (2021's rule, keyed off SimState so warp cannot change it),
 * that it stays outside SimState, and that every plot's channels exist.
 */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '$app/recorder';
import { DT } from '$app/loop';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import type { SimState } from '$core/state';

describe('the recorder stays out of the simulation, timed', () => {
  it('a long recording does not slow the step down', () => {
    // The reason the recorder is not in SimState: cloning a growing array on
    // every step would make each step O(flight length). This shows it is not.
    const recorder = createRecorder();
    let s: SimState = createScenarioState(getScenario('booster-sep')!);

    const time = (frames: number) => {
      const t0 = performance.now();
      for (let i = 0; i < frames; i++) {
        s = step(s, DT);
        recorder.sample(s);
      }
      return performance.now() - t0;
    };

    time(2_000);
    const early = Math.min(time(2_000), time(2_000));
    for (let i = 0; i < 20_000; i++) {
      s = step(s, DT);
      recorder.sample(s);
    }
    const late = Math.min(time(2_000), time(2_000));

    expect(recorder.length).toBeGreaterThan(4_000);
    // Generous: this catches O(n), not a 30% drift from cache effects.
    expect(late, `${early.toFixed(1)} ms then ${late.toFixed(1)} ms`).toBeLessThan(early * 3 + 5);
  });
});
