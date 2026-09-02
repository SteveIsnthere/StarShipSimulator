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
  skyTintLit,
  DARKEN_COMPLETE_ALTITUDE,
  DARKEN_FRACTION,
  DARKEN_START_ALTITUDE,
  SKY_COLOR,
  SKY_GRADIENT_STOPS,
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

/* ── M9 look pass: the sky has hue, not just value ─────────────────────── */

describe('the sky is a colour, not a brightness', () => {
  it('is bluer at the zenith than at the horizon', () => {
    /*
      THE THING THAT MADE EVERY FRAME READ AS FOG. The gradient's stops were
      greyscale — 150, 215, 255 — and a tint MULTIPLIES, so the sky could only
      ever be the same hue at different brightnesses: a grey-blue horizon under
      a darker, greyer version of itself. A real sky changes hue as well.

      Asserted as a RATIO of blue to red rather than as colours, because the
      altitude fade scales all three channels together and a test written
      against absolute values would be a test of `skyLightness` wearing a
      disguise.
    */
    const stops = SKY_GRADIENT_STOPS;
    const zenith = stops[0]!;
    const horizon = stops[stops.length - 1]!;
    const chroma = (c: { r: number; g: number; b: number }) => c.b / c.r;

    expect(chroma(zenith), 'the zenith must be bluer than the horizon').toBeGreaterThan(
      chroma(horizon) * 1.5,
    );
    // And the horizon is the anchor: nothing may be brighter than SKY_COLOR,
    // because a tint cannot multiply past it.
    expect(horizon.r).toBe(255);
    expect(horizon.g).toBe(255);
    expect(horizon.b).toBe(255);
  });

  it('gets brighter all the way down, so the gradient has one direction', () => {
    let previous = -1;
    for (const stop of SKY_GRADIENT_STOPS) {
      const luma = 0.299 * stop.r + 0.587 * stop.g + 0.114 * stop.b;
      expect(luma).toBeGreaterThan(previous);
      previous = luma;
    }
  });

  it('produces a sky that is actually blue at the top, at sea level', () => {
    // The numbers, so a future edit to either the stops or the anchor has to
    // face what it does to the picture.
    const zenith = SKY_GRADIENT_STOPS[0]!;
    const r = Math.round((zenith.r / 255) * SKY_COLOR.r);
    const g = Math.round((zenith.g / 255) * SKY_COLOR.g);
    const b = Math.round((zenith.b / 255) * SKY_COLOR.b);
    expect(b - r, `zenith is #${r.toString(16)}${g.toString(16)}${b.toString(16)}`).toBeGreaterThan(
      80,
    );
  });
});

describe('the sun on the sky — M11.4', () => {
  it('in full daylight the lit tint IS the altitude tint, bit for bit', () => {
    // The identity every existing screenshot rests on: a factor of exactly
    // (1, 1, 1) takes the same path and returns the same integer.
    for (const altitude of [0, 500, 5_000, 20_000, 35_000, 60_000, 80_000, 200_000]) {
      expect(skyTintLit(altitude, 1, 1, 1)).toBe(skyTint(altitude));
    }
  });

  it('a dusk factor warms it and a night factor darkens it, at every altitude', () => {
    for (const altitude of [0, 10_000, 50_000, 100_000]) {
      const day = skyTint(altitude);
      const dusk = skyTintLit(altitude, 0.95, 0.62, 0.42);
      const night = skyTintLit(altitude, 0.1, 0.12, 0.2);
      const r = (c: number) => (c >> 16) & 0xff;
      const b = (c: number) => c & 0xff;
      expect(r(dusk)).toBeLessThanOrEqual(r(day));
      expect(b(dusk)).toBeLessThan(b(day));
      expect(r(dusk) - b(dusk)).toBeGreaterThan(r(day) - b(day));
      expect(b(night)).toBeLessThan(b(day) * 0.3);
    }
  });
});
