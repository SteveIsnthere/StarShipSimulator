/**
 * M4.3: zoom.
 *
 * tools.js:152. The steps are asymmetric — 1.5 in, 0.75 out — so zooming in and
 * back out does not return to where it started. That is 2021 behaviour and it is
 * kept, because "restore the previous zoom" is a different feature from what the
 * buttons actually did.
 */
import { describe, expect, it } from 'vitest';
import {
  computeViewport,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  zoomStep,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
} from '$view/camera';
import { vehicleHeight } from '$core/constants';

describe('zoom steps', () => {
  it('multiplies by 1.5 in and 0.75 out', () => {
    expect(zoomStep(3, ZOOM_IN_FACTOR)).toBe(4.5);
    expect(zoomStep(3, ZOOM_OUT_FACTOR)).toBe(2.25);
  });

  it('in then out does not return to the start', () => {
    // 3 -> 4.5 -> 3.375. Kept deliberately: it is what the buttons did.
    expect(zoomStep(zoomStep(3, ZOOM_IN_FACTOR), ZOOM_OUT_FACTOR)).toBeCloseTo(3.375, 10);
  });

  it('refuses a step that would leave the range', () => {
    let scale = 3;
    for (let i = 0; i < 30; i++) scale = zoomStep(scale, ZOOM_IN_FACTOR);
    // The guard tests `scale * 0.85` against the limit, so the last accepted
    // step is allowed to land above it. Bounded, not exactly at the limit.
    expect(scale).toBeGreaterThan(MAX_ZOOM_SCALE);
    expect(scale).toBeLessThan(MAX_ZOOM_SCALE / 0.85 * ZOOM_IN_FACTOR);

    for (let i = 0; i < 30; i++) scale = zoomStep(scale, ZOOM_OUT_FACTOR);
    expect(scale).toBeLessThan(MIN_ZOOM_SCALE);
    expect(scale).toBeGreaterThan((MIN_ZOOM_SCALE / 0.85) * ZOOM_OUT_FACTOR);
  });

  it('converges rather than oscillating at the limits', () => {
    // Twenty presses of the same button must reach a fixed point, not flap.
    let scale = MAX_ZOOM_SCALE;
    for (let i = 0; i < 20; i++) scale = zoomStep(scale, ZOOM_IN_FACTOR);
    const settled = scale;
    expect(zoomStep(settled, ZOOM_IN_FACTOR)).toBe(settled);
  });
});

describe('the zoomed viewport', () => {
  it('shows less world at more pixels per metre', () => {
    const base = computeViewport(1200, 800, vehicleHeight);
    const zoomed = computeViewport(1200, 800, vehicleHeight, 1.5);

    expect(zoomed.scale).toBeCloseTo(base.scale * 1.5, 10);
    expect(zoomed.physicalHeight).toBeCloseTo(base.physicalHeight / 1.5, 10);
    expect(zoomed.physicalWidth).toBeCloseTo(base.physicalWidth / 1.5, 10);
  });

  it('keeps the aspect ratio and the pixel size', () => {
    const zoomed = computeViewport(1200, 800, vehicleHeight, 2);
    expect(zoomed.width).toBe(1200);
    expect(zoomed.height).toBe(800);
    expect(zoomed.physicalWidth / zoomed.physicalHeight).toBeCloseTo(1200 / 800, 10);
  });

  it('is identity at zoom 1, so nothing before M4.3 moved', () => {
    const a = computeViewport(1440, 900, vehicleHeight);
    const b = computeViewport(1440, 900, vehicleHeight, 1);
    expect(b).toEqual(a);
  });
});
