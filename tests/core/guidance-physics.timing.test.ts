/**
 * The landing-burn predictor's cost, at the state it is called from: the flip
 * trigger (about 700 m, descending at about 61 m/s, three engines; measured in
 * tests/golden/landing-margins.json). It runs every step of the aero descent,
 * so it has to stay a small slice of the 1 ms sim-step budget.
 *
 * Wall clock, so it lives in the on-demand timing suite (`npm run bench`).
 */
import { describe, expect, it } from 'vitest';
import { createBurnScratch, landingBurnStartAltitude } from '$core/control/guidance-physics';

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

describe('unpoweredFallInto cost', () => {
  it('stays under 1 ms a call from just under the entry interface (the HUD asks at 10 Hz)', async () => {
    const { createFallResult, unpoweredFallInto } = await import('$core/control/guidance-physics');
    const { ALL_SCENARIOS, createScenarioState } = await import('$core/scenarios');
    const C = await import('$core/constants');
    // The long arc: 79 km, 2 km/s downrange, barely descending. The worst the
    // HUD meets below the interface, where the conic hands over to this.
    const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'reentry')!);
    s.kinematics.altitude = 79_000;
    s.kinematics.speedX = 2_000;
    s.kinematics.speedY = -50;
    const scratch = createBurnScratch();
    const out = createFallResult();
    for (let i = 0; i < 20; i++) unpoweredFallInto(s, C.vehicleHeight / 2, scratch, out); // warm
    const runs = 200;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) unpoweredFallInto(s, C.vehicleHeight / 2, scratch, out);
    const perCall = (performance.now() - t0) / runs;
    expect(out.reached).toBe(true);
    expect(perCall, `${perCall.toFixed(3)} ms per call, ${out.time.toFixed(0)} s of fall`).toBeLessThan(1);
  });
});
