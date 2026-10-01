/**
 * The landing-burn predictor's cost, at the state it is called from: the flip
 * trigger (about 700 m, descending at about 61 m/s, three engines; measured in
 * tests/golden/landing-margins.json). It runs every step of the aero descent,
 * so it has to stay a small slice of the 1 ms sim-step budget.
 *
 * Wall clock, so it lives in the on-demand timing suite (`npm run bench`).
 */
import { describe, expect, it } from 'vitest';
import { createBurnScratch, landingBurnStartAltitude } from '$core/autopilot/guidance-physics';

describe('landingBurnStartAltitude cost', () => {
  it('stays under 0.2 ms a call at the flip trigger', () => {
    const scratch = createBurnScratch();
    for (let i = 0; i < 200; i++) landingBurnStartAltitude(3, 140_000, 61, 25, scratch); // warm
    const runs = 2_000;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) landingBurnStartAltitude(3, 140_000, 61 + (i % 10) * 0.1, 25, scratch);
    const perCall = (performance.now() - t0) / runs;
    expect(perCall, `${perCall.toFixed(4)} ms per call`).toBeLessThan(0.2);
  });
});
