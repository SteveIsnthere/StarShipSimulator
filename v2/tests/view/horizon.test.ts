/**
 * The horizon's pure half: one planet shape, one skyline, one limb.
 *
 * Split out of `distant-earth.test.ts` at M9.15 along with the code it covers.
 * Everything here is numbers in, numbers out — no PixiJS, no viewport — which
 * is the point of `src/view/horizon.ts` existing at all: the shape of the
 * planet is shared by two layers that draw it, and a shared thing needs one
 * home and one set of assertions rather than two copies that agree by luck.
 */
import { describe, expect, it } from 'vitest';
import {
  groundColourShare,
  horizonCurve,
  horizonDrop,
  HORIZON_EXAGGERATION,
  limbIntensity,
  RELIEF_LIMIT_ALTITUDE,
  ridgeGroundShare,
  ridgeHeight,
  RIDGE_FILL_DEPTH,
  RIDGE_LAYERS,
} from '$view/horizon';
import { mixColour, lerpColourFast, scaleColour } from '$view/colour';

/**
 * The horizon (M9.13), as the four properties that make it one.
 *
 * What this replaced: twenty-four copies of a single bezier dome, drawn
 * translucent so the sky showed THROUGH them, on a ruler-straight line, at
 * every altitude from the pad to a hundred kilometres, with no limb at all.
 * Each test below is one of the things that was wrong.
 */
describe('the horizon is a horizon (M9.13)', () => {
  it('has a skyline that joins itself at the wrap', () => {
    /*
      The profile is built once across three screen widths and then SCROLLED by
      moving the whole Graphics, so a profile that did not close would put a
      cliff in the skyline once per screen. Periodicity is not a nicety here,
      it is what makes the cheap version of scrolling legal.
    */
    for (let layer = 0; layer < RIDGE_LAYERS; layer++) {
      expect(ridgeHeight(0, layer)).toBeCloseTo(ridgeHeight(1, layer), 10);
      expect(ridgeHeight(0.25, layer)).toBeCloseTo(ridgeHeight(1.25, layer), 10);
      expect(ridgeHeight(0.5, layer)).toBeCloseTo(ridgeHeight(-0.5, layer), 10);
    }
  });

  it('gives every layer a different skyline, in range', () => {
    const sampled = (layer: number) =>
      Array.from({ length: 64 }, (_, k) => ridgeHeight(k / 64, layer));
    for (let layer = 0; layer < RIDGE_LAYERS; layer++) {
      const xs = sampled(layer);
      for (const x of xs) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
      // Not a flat line, and not the same line as its neighbour.
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.15);
      if (layer > 0) {
        const prev = sampled(layer - 1);
        const same = xs.filter((x, i) => Math.abs(x - prev[i]!) < 1e-9).length;
        expect(same).toBeLessThan(xs.length / 2);
      }
    }
  });

  it('mixes a ridge toward the sky by distance, never past it', () => {
    /*
      Aerial perspective as a COLOUR mix rather than an alpha, so a ridge can
      approach the sky's value without passing it. The share is what is kept of
      the ground's own colour, so it must stay inside (0, 1] at every layer and
      every haze — a share above one would over-saturate a ridge past the ground
      it is made of, and a share of zero would erase it into the sky.

      Not the thing that made the old marks read as fog: see `ridgeGroundShare`
      for the measurement that refuted that, and `ridgeHeight` for what did.
    */
    for (let layer = 0; layer < RIDGE_LAYERS; layer++) {
      for (const haze of [0, 0.25, 0.5, 0.9, 1]) {
        const share = ridgeGroundShare(layer, haze);
        expect(share).toBeGreaterThan(0);
        expect(share).toBeLessThanOrEqual(1);
      }
      // Thicker air mixes a ridge further toward the sky, never less far.
      expect(ridgeGroundShare(layer, 1)).toBeLessThan(ridgeGroundShare(layer, 0));
    }
    // And a farther layer keeps less of its own colour than a nearer one.
    for (let layer = 1; layer < RIDGE_LAYERS; layer++) {
      expect(ridgeGroundShare(layer - 1, 0.3)).toBeLessThan(ridgeGroundShare(layer, 0.3));
    }
  });

  it('stops drawing relief before it stops being resolvable', () => {
    // At 100 km the horizon is 1130 km off and a 300 m ridge subtends 0.015
    // degrees — a fifth of a pixel. Hills up there are decoration.
    expect(RELIEF_LIMIT_ALTITUDE).toBeLessThan(100_000);
    expect(RELIEF_LIMIT_ALTITUDE).toBeGreaterThan(10_000);
  });

  it('lights the limb where haze has given up, and not before', () => {
    /*
      The two curves are opposite by construction: haze is looking THROUGH the
      aerosol from inside it and peaks a kilometre or two up; the limb is
      looking ALONG the whole atmosphere from outside and only starts there.
    */
    expect(limbIntensity(0)).toBe(0);
    expect(limbIntensity(100)).toBeLessThan(0.01);
    expect(limbIntensity(100_000)).toBeGreaterThan(0.6);
    for (const [lo, hi] of [
      [0, 1_000],
      [1_000, 20_000],
      [20_000, 100_000],
      [100_000, 400_000],
    ] as const) {
      expect(limbIntensity(hi)).toBeGreaterThan(limbIntensity(lo));
    }
    // Saturating: the atmosphere does not get thicker with more altitude.
    expect(limbIntensity(400_000)).toBeLessThan(1);
  });

  it('washes the ground out with the same air that lights the limb', () => {
    // One curve for both, so a change to how much atmosphere the view has
    // cannot brighten the limb while leaving the ground crisp.
    expect(groundColourShare(0)).toBeCloseTo(1, 3);
    expect(groundColourShare(100_000)).toBeLessThan(groundColourShare(4_000));
    // But land stays land: from orbit it is dim and blue, not sky.
    expect(groundColourShare(400_000)).toBeGreaterThanOrEqual(0.25);
  });

  it('drops the rectangles to exactly the depth the bow reaches', () => {
    /*
      The rule `world.ts` had and `distant-earth.ts` did not until M9.13:
      anything drawn as a rectangle over a bowed band starts at the bow's LOWEST
      point, not at the ground line, or it stands proud of the curve at the
      frame's edges and puts the straight horizon back.
    */
    for (const sagitta of [0, 3, 40, 113]) {
      expect(horizonDrop(sagitta)).toBeCloseTo(horizonCurve(0, sagitta), 10);
      expect(horizonDrop(sagitta)).toBeCloseTo(horizonCurve(1, sagitta), 10);
      expect(horizonDrop(sagitta)).toBe(sagitta * HORIZON_EXAGGERATION);
    }
  });

  it('bends the horizon symmetrically, and not at all on the ground', () => {
    expect(horizonCurve(0.5, 40)).toBe(0);
    expect(horizonCurve(0, 40)).toBeCloseTo(horizonCurve(1, 40), 10);
    expect(horizonCurve(0, 40)).toBeGreaterThan(0);
    expect(horizonCurve(0.25, 40)).toBeLessThan(horizonCurve(0, 40));
    // Zero sagitta is a straight line, which is what sea level gets.
    for (const u of [0, 0.3, 0.5, 0.8, 1]) expect(horizonCurve(u, 0)).toBe(0);
  });

  it('mixes colours toward the sky without leaving the channel', () => {
    expect(mixColour(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColour(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColour(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    // Out-of-range shares clamp rather than wrapping a channel.
    expect(mixColour(0x102030, 0x405060, -5)).toBe(0x102030);
    expect(mixColour(0x102030, 0x405060, 5)).toBe(0x405060);
  });

  it('keeps the particle system\'s truncating mix bit-for-bit', () => {
    /*
      `lerpColourFast` and `mixColour` are deliberately NOT the same function.
      The particle version truncates and does not clamp, because it runs per
      particle per frame with a t the emitter already bounds — and because it
      has always truncated, so unifying the rounding would shift every particle
      tint by up to one level. Invisible, but still a change to what is drawn,
      and M9.15 was a move rather than a retune. This pins the difference so
      that a later tidy-up has to be a deliberate one.
    */
    expect(lerpColourFast(0x000000, 0xffffff, 0.5)).toBe(0x7f7f7f);
    expect(mixColour(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(lerpColourFast(0x102030, 0x405060, 0)).toBe(0x102030);
    expect(lerpColourFast(0x102030, 0x405060, 1)).toBe(0x405060);
  });

  it('scales a colour without leaving the channel', () => {
    expect(scaleColour(0x804020, 1)).toBe(0x804020);
    expect(scaleColour(0x804020, 0)).toBe(0x000000);
    expect(scaleColour(0xffffff, 0.5)).toBe(0x808080);
    // Over-bright scaling clamps instead of wrapping to black.
    expect(scaleColour(0xffffff, 4)).toBe(0xffffff);
  });
});

describe('a silhouette is drawn, not a filled screen', () => {
  it('fills the ridges to the horizon rather than to the bottom of the frame', () => {
    /*
      THE INSTINCT THAT COST NINETEEN MILLION PIXELS A FRAME. A silhouette is a
      solid shape, so the first version closed each ridge polygon at
      `viewport.height` — three polygons, each three screen widths wide and a
      full frame tall, redrawn behind a band that covers everything below the
      ground line anyway. On a 2265 x 945 landscape phone that is 19.3 million
      pixels of fill per frame for a skyline, and under the software rasteriser
      the browser projects use it slowed the page enough that
      `shake.spec.ts`'s four-minute budget ran out on all four phone projects.

      The band starts exactly at the ground line, so the ridges only have to
      reach it. This asserts the constant stays a hairline rather than drifting
      back toward a frame height — it is the difference between filling 40x the
      viewport and filling a strip of it.
    */
    expect(RIDGE_FILL_DEPTH).toBeGreaterThan(0);
    expect(RIDGE_FILL_DEPTH).toBeLessThan(8);

    // The whole drawn strip is the tallest ridge plus that overlap. Against a
    // 945 px frame it has to stay a few percent, not a multiple.
    const tallest = (5 + (RIDGE_LAYERS - 1) * 9) * 1 + RIDGE_FILL_DEPTH;
    expect(tallest / 945).toBeLessThan(0.05);
  });
});
