/**
 * M3.4: the sky.
 *
 * The darkening curve is 2021's and must stay: the moment the blue drains out
 * of a hard ascent is one of the better things about the game. The gradient,
 * the stars and the parallax are additions, tested for the properties that make
 * them feel like depth rather than like decoration.
 */
import { describe, expect, it } from 'vitest';
import {
  DARKEN_COMPLETE_ALTITUDE,
  DARKEN_FRACTION,
  DARKEN_START_ALTITUDE,
  SKY_COLOR,
  skyLightness,
  skyTint,
  starVisibility,
} from '$view/sky';

const channels = (tint: number) => ({
  r: (tint >> 16) & 0xff,
  g: (tint >> 8) & 0xff,
  b: tint & 0xff,
});

describe('the 2021 darkening curve, preserved', () => {
  it('is fully lit below 20 km', () => {
    for (const h of [0, 1_000, 10_000, DARKEN_START_ALTITUDE - 1]) {
      expect(skyLightness(h), `${h} m`).toBe(1);
    }
  });

  it('at ground level the sky is exactly the 2021 colour', () => {
    const { r, g, b } = channels(skyTint(0));
    expect(r).toBe(SKY_COLOR.r);
    expect(g).toBe(SKY_COLOR.g);
    expect(b).toBe(SKY_COLOR.b);
  });

  it('fades linearly between 20 km and 80 km', () => {
    const midpoint = (DARKEN_START_ALTITUDE + DARKEN_COMPLETE_ALTITUDE) / 2;
    expect(skyLightness(midpoint)).toBeCloseTo(1 - DARKEN_FRACTION / 2, 9);
  });

  it('bottoms out at 1 - 0.6 above 80 km and stays there', () => {
    for (const h of [DARKEN_COMPLETE_ALTITUDE, 100_000, 400_000]) {
      expect(skyLightness(h), `${h} m`).toBeCloseTo(1 - DARKEN_FRACTION, 9);
    }
  });

  it('squares the lightness per channel, as 2021 did', () => {
    // `skyColorR * skyLighteness ** 2`. The squaring is what makes it read as
    // dusk rather than as a dimmer switch.
    const h = 50_000;
    const factor = skyLightness(h) ** 2;
    const { r, g, b } = channels(skyTint(h));
    expect(r).toBe(Math.round(SKY_COLOR.r * factor));
    expect(g).toBe(Math.round(SKY_COLOR.g * factor));
    expect(b).toBe(Math.round(SKY_COLOR.b * factor));
  });

  it('darkens monotonically all the way up', () => {
    let previous = Infinity;
    for (let h = 0; h <= 120_000; h += 500) {
      const { r, g, b } = channels(skyTint(h));
      const sum = r + g + b;
      expect(sum, `brightened at ${h} m`).toBeLessThanOrEqual(previous);
      previous = sum;
    }
  });

  it('never goes fully black — space still has a colour', () => {
    const { r, g, b } = channels(skyTint(400_000));
    expect(r + g + b).toBeGreaterThan(0);
    // 16% of the original, which is 0.4 squared.
    expect(r / SKY_COLOR.r).toBeCloseTo(0.16, 2);
  });
});

describe('stars', () => {
  it('are invisible in the lower atmosphere', () => {
    for (const h of [0, 5_000, DARKEN_START_ALTITUDE]) {
      expect(starVisibility(h), `${h} m`).toBe(0);
    }
  });

  it('fade in exactly as the sky fades out', () => {
    const midpoint = (DARKEN_START_ALTITUDE + DARKEN_COMPLETE_ALTITUDE) / 2;
    expect(starVisibility(midpoint)).toBeCloseTo(0.5, 9);
  });

  it('are fully out by the time the sky is fully dark', () => {
    for (const h of [DARKEN_COMPLETE_ALTITUDE, 200_000]) {
      expect(starVisibility(h), `${h} m`).toBe(1);
    }
  });

  it('never exceed full', () => {
    for (let h = 0; h <= 500_000; h += 1_000) {
      expect(starVisibility(h)).toBeLessThanOrEqual(1);
      expect(starVisibility(h)).toBeGreaterThanOrEqual(0);
    }
  });

  it('appear over the same range the sky darkens over', () => {
    // Not an accident: they are the payoff for the climb, so they must be tied
    // to the same altitudes rather than to a second set of magic numbers.
    for (const h of [25_000, 40_000, 60_000, 75_000]) {
      const expected =
        (h - DARKEN_START_ALTITUDE) / (DARKEN_COMPLETE_ALTITUDE - DARKEN_START_ALTITUDE);
      expect(starVisibility(h), `${h} m`).toBeCloseTo(expected, 9);
    }
  });
});
