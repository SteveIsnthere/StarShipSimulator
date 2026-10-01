/**
 * M3.5: the post pass.
 *
 * The shaders themselves need a GPU, so the e2e suite covers "it renders
 * without erroring". What is tested here is the part that decides WHEN they
 * run, which is where the cost lives: a filter attached to a container costs a
 * full-screen pass whether or not it does anything.
 */
import { describe, expect, it } from 'vitest';
import { bloomIntensity, heatIntensity, POST_THRESHOLD } from '$view/post';
import { heatLimit } from '$core/constants';

describe('bloom intensity', () => {
  it('is zero with no engines running', () => {
    expect(bloomIntensity(0, 100)).toBe(0);
  });

  it('scales with engine count', () => {
    expect(bloomIntensity(1, 100)).toBeCloseTo(1 / 3, 9);
    expect(bloomIntensity(2, 100)).toBeCloseTo(2 / 3, 9);
    expect(bloomIntensity(3, 100)).toBe(1);
  });

  it('scales with throttle', () => {
    expect(bloomIntensity(3, 40)).toBeCloseTo(0.4, 9);
    expect(bloomIntensity(3, 100)).toBe(1);
  });

  it('a single engine at minimum throttle glows faintly, not not at all', () => {
    const faint = bloomIntensity(1, 40);
    expect(faint).toBeGreaterThan(POST_THRESHOLD);
    expect(faint).toBeLessThan(0.2);
  });

  it('never exceeds one', () => {
    expect(bloomIntensity(3, 100)).toBeLessThanOrEqual(1);
  });
});

describe('heat intensity', () => {
  it('is zero when nothing is heating', () => {
    expect(heatIntensity(0, heatLimit)).toBe(0);
    expect(heatIntensity(-1, heatLimit)).toBe(0);
  });

  it('is measured against the structural limit, not against speed', () => {
    // The shimmer should tell you how close to breaking up you are.
    expect(heatIntensity(heatLimit / 2, heatLimit)).toBeCloseTo(0.5, 9);
    expect(heatIntensity(heatLimit, heatLimit)).toBe(1);
  });

  it('saturates rather than exceeding one', () => {
    expect(heatIntensity(heatLimit * 10, heatLimit)).toBe(1);
  });

  it('stays below the attach threshold while merely flying fast', () => {
    // A booster-sep ascent peaks around 0.09 thermal units; it must not
    // trigger a full-screen pass.
    expect(heatIntensity(0.09, heatLimit)).toBeLessThan(POST_THRESHOLD);
  });

  it('is above the threshold well before the vehicle is in danger', () => {
    // Visible warning, not a surprise: by 10% of the limit the shimmer is on.
    expect(heatIntensity(heatLimit * 0.1, heatLimit)).toBeGreaterThan(POST_THRESHOLD);
  });
});

describe('the cost model', () => {
  it('both effects are off in the cases the game spends most of its time in', () => {
    // On the pad: no engines, no heat.
    expect(bloomIntensity(0, 100)).toBeLessThanOrEqual(POST_THRESHOLD);
    expect(heatIntensity(0, heatLimit)).toBeLessThanOrEqual(POST_THRESHOLD);
    // Unpowered coast at altitude: thermal power is around 1e-11.
    expect(heatIntensity(2e-11, heatLimit)).toBeLessThan(POST_THRESHOLD);
  });

  it('the threshold is small enough not to clip a real effect', () => {
    expect(POST_THRESHOLD).toBeLessThan(0.05);
    expect(POST_THRESHOLD).toBeGreaterThan(0);
  });
});
