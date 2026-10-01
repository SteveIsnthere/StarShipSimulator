/**
 * M4.4, Bug fix: the random-failure toggle did nothing.
 *
 * switches.js:247 flipped `raptorIgnitionFaliureRate` between 0 and 0.1, and
 * the menu button that did it is one of the six things in the 2021 menu. The
 * port carried the `randomFailure` field into SimState (state.ts:271) but
 * `rollIgnitionFailure` never read it — it compared the draw against the module
 * constant, which is 0, so the toggle was inert and no engine ever failed to
 * light.
 *
 * These tests fail before the fix and pass after it.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { toggleRandomFailure, toggleRaptor } from '$core/control/commands';
import { RANDOM_IGNITION_FAILURE_RATE, raptorIgnitionFailureRate } from '$core/constants';
import { step } from '$core/step';
import { DT } from '$app/loop';

/** Light one engine on a fresh state and report whether it failed. */
function attempt(seed: number, randomFailure: boolean): boolean {
  const state = createInitialState(seed);
  if (randomFailure) toggleRandomFailure(state);
  toggleRaptor(state, 0);
  return state.engines.failed[0];
}

describe('the toggle', () => {
  it('is off by default, matching the 0 rate the constant carries', () => {
    expect(raptorIgnitionFailureRate).toBe(0);
    expect(createInitialState().failures.randomFailure).toBe(false);
  });

  it('switches the rate to 0.1, as switches.js:254 did', () => {
    expect(RANDOM_IGNITION_FAILURE_RATE).toBe(0.1);
  });

  it('flips and flips back', () => {
    const state = createInitialState();
    toggleRandomFailure(state);
    expect(state.failures.randomFailure).toBe(true);
    toggleRandomFailure(state);
    expect(state.failures.randomFailure).toBe(false);
  });
});

describe('with the toggle off, no engine ever fails', () => {
  it('holds across a thousand seeds', () => {
    for (let seed = 0; seed < 1_000; seed++) {
      expect(attempt(seed, false), `seed ${seed}`).toBe(false);
    }
  });
});

describe('with the toggle on, engines fail at about the 2021 rate', () => {
  it('fails roughly one ignition in ten', () => {
    let failures = 0;
    const trials = 5_000;
    for (let seed = 0; seed < trials; seed++) if (attempt(seed, true)) failures += 1;

    const rate = failures / trials;
    // 0.1 nominal. The band is wide enough not to be flaky and narrow enough
    // that "always fails" or "never fails" cannot pass.
    expect(rate, `observed ${rate}`).toBeGreaterThan(0.07);
    expect(rate, `observed ${rate}`).toBeLessThan(0.13);
  });

  it('a failed engine stays failed and does not light', () => {
    // Find a seed that fails, then prove the engine is really dead.
    let seed = 0;
    while (seed < 5_000 && !attempt(seed, true)) seed += 1;
    expect(seed, 'no failing seed found in 5000').toBeLessThan(5_000);

    let state = createInitialState(seed);
    toggleRandomFailure(state);
    toggleRaptor(state, 0);
    expect(state.engines.failed[0]).toBe(true);

    for (let i = 0; i < 600; i++) state = step(state, DT);
    expect(state.engines.running[0]).toBe(false);
  });
});

describe('determinism is preserved', () => {
  it('the same seed gives the same failures, every time', () => {
    for (const seed of [1, 7, 42, 999]) {
      expect(attempt(seed, true)).toBe(attempt(seed, true));
    }
  });

  it('the draw happens either way, so the stream does not shift', () => {
    // physics.js:456 draws from the ignitionFailure stream whether or not the
    // rate is non-zero. That is why turning the toggle on cannot change the
    // ignition DELAYS of a flight — only whether an engine catches.
    const off = createInitialState(123);
    const on = createInitialState(123);
    toggleRandomFailure(on);

    toggleRaptor(off, 0);
    toggleRaptor(on, 0);

    expect(on.rng.counters).toEqual(off.rng.counters);
  });
});
