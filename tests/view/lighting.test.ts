/**
 * M11.4 — the hull's lighting texture, derived from a sprite by geometry.
 *
 * Synthetic sprites, so every number is known: a rectangle is a cylinder, a
 * triangle on top of it is a nose cone, and a left-to-right brightness ramp
 * is a baked light that the delighting gain has to undo.
 */
import { describe, expect, it } from 'vitest';
import {
  AMBIENT,
  DELIGHT_BINS,
  DELIGHT_MAX,
  DELIGHT_MIN,
  DIFFUSE,
  NIGHT_HULL,
  flatLighting,
  writeHullLighting,
} from '$view/lighting';

/** A W×H sprite: hull columns [left, right] per row, painted by `shade(t)`. */
function sprite(
  width: number,
  height: number,
  extent: (y: number) => [number, number] | null,
  shade: (t: number) => number = () => 160,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const e = extent(y);
    if (!e) continue;
    const [l, r] = e;
    const mid = (l + r) / 2;
    const radius = (r - l + 1) / 2;
    for (let x = l; x <= r; x++) {
      const i = (y * width + x) * 4;
      const v = shade((x - mid) / radius);
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const W = 41;
const H = 120;
const px = (out: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * W + x) * 4;
  return { r: out[i]!, g: out[i + 1]!, b: out[i + 2]!, a: out[i + 3]! };
};
const normalOf = (p: { r: number; g: number; b: number }) => ({
  x: (p.r / 255) * 2 - 1,
  y: (p.g / 255) * 2 - 1,
  z: (p.b / 255) * 2 - 1,
});

describe('a cylinder', () => {
  const rgba = sprite(W, H, () => [5, 35]);
  const out = new Uint8ClampedArray(W * H * 4);
  writeHullLighting(rgba, W, H, out);

  it('faces the viewer down the middle and sideways at the edges', () => {
    const centre = normalOf(px(out, 20, 60));
    expect(centre.x).toBeCloseTo(0, 1);
    expect(centre.z).toBeCloseTo(1, 1);
    const left = normalOf(px(out, 5, 60));
    expect(left.x).toBeLessThan(-0.9);
    const right = normalOf(px(out, 35, 60));
    expect(right.x).toBeGreaterThan(0.9);
    // No tilt along a straight hull.
    expect(centre.y).toBeCloseTo(0, 1);
    expect(left.y).toBeCloseTo(0, 1);
  });

  it('every hull normal is unit length, to the quantisation', () => {
    for (const x of [5, 9, 14, 20, 26, 31, 35]) {
      const n = normalOf(px(out, x, 60));
      expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 1);
    }
  });

  it('outside the hull the normal faces the viewer and the gain is one', () => {
    // 0.5 encodes to 128/255, so "zero" is 0.004 — the quantisation, not a tilt.
    const p = px(out, 1, 60);
    expect(normalOf(p).x).toBeCloseTo(0, 2);
    expect(normalOf(p).y).toBeCloseTo(0, 2);
    expect(normalOf(p).z).toBe(1);
    expect(p.a).toBe(128);
    const empty = normalOf(px(out, 20, 119));
    expect(empty.x).toBeCloseTo(0, 2);
    expect(empty.z).toBe(1);
  });

  it('a flat-shaded hull needs no delighting: the gain is one everywhere', () => {
    const gain = writeHullLighting(rgba, W, H, new Uint8ClampedArray(W * H * 4));
    for (const g of gain) expect(g).toBeCloseTo(1, 6);
    expect(px(out, 20, 60).a).toBe(128);
  });
});

describe('a nose cone', () => {
  // Rows 0..39 widen from one pixel to the full hull; 40..119 are the hull.
  const rgba = sprite(W, H, (y) => {
    const radius = y < 40 ? 1 + (14 * y) / 40 : 15;
    return [Math.round(20 - radius), Math.round(20 + radius)];
  });
  const out = new Uint8ClampedArray(W * H * 4);
  writeHullLighting(rgba, W, H, out);

  it('tilts the normal toward the nose where the hull narrows, and not on the straight part', () => {
    const cone = normalOf(px(out, 20, 20));
    expect(cone.y).toBeLessThan(-0.2);
    expect(cone.z).toBeGreaterThan(0.5);
    const hull = normalOf(px(out, 20, 90));
    expect(hull.y).toBeCloseTo(0, 1);
  });
});

describe('delighting a baked light', () => {
  // Bright on the right, dark on the left — the 2021 art's habit.
  const baked = (t: number) => Math.round(60 + 120 * (t + 1) * 0.5);
  const rgba = sprite(W, H, () => [5, 35], baked);
  const out = new Uint8ClampedArray(W * H * 4);
  const gain = writeHullLighting(rgba, W, H, out);

  it('the gain rises on the dark flank and falls on the bright one', () => {
    expect(gain[0]).toBeGreaterThan(1.2);
    expect(gain[DELIGHT_BINS - 1]).toBeLessThan(0.9);
    for (let b = 1; b < DELIGHT_BINS; b++) {
      expect(gain[b]).toBeLessThanOrEqual(gain[b - 1]! + 1e-6);
    }
  });

  it('applied, it flattens the flank: gain times luma is level across the hull', () => {
    const levelled: number[] = [];
    for (const x of [6, 10, 15, 20, 25, 30, 34]) {
      const t = (x - 20) / 15.5;
      levelled.push(baked(t) * (px(out, x, 60).a / 255) * 2);
    }
    const mean = levelled.reduce((a, b) => a + b, 0) / levelled.length;
    for (const v of levelled) expect(Math.abs(v / mean - 1)).toBeLessThan(0.12);
  });

  it('is clamped, so a black edge is not amplified into noise', () => {
    const harsh = sprite(W, H, () => [5, 35], (t) => (t < -0.6 ? 4 : 200));
    const g = writeHullLighting(harsh, W, H, new Uint8ClampedArray(W * H * 4));
    for (const v of g) {
      expect(v).toBeGreaterThanOrEqual(DELIGHT_MIN - 1e-6);
      expect(v).toBeLessThanOrEqual(DELIGHT_MAX + 1e-6);
    }
  });
});

describe('the flat lighting the fins take', () => {
  it('is ambient plus diffuse by the toward-viewer component, scaled by daylight', () => {
    expect(flatLighting(0, 1)).toBeCloseTo(AMBIENT, 12);
    expect(flatLighting(1, 1)).toBeCloseTo(AMBIENT + DIFFUSE, 12);
    expect(flatLighting(-0.5, 1)).toBeCloseTo(AMBIENT, 12);
    expect(flatLighting(0.4, 0)).toBeCloseTo((AMBIENT + DIFFUSE * 0.4) * NIGHT_HULL, 12);
  });
});
