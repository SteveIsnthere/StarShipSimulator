/**
 * M6.7: the four curves the world is drawn with.
 *
 * These are the reason `view/atmosphere-look.ts` exists as a module rather than
 * as arithmetic inlined in a render loop. Every one of them is a judgement
 * call about how something should look, and a judgement call that no test can
 * reach is one nobody can revisit — "it looked right at the time" is how a
 * renderer accumulates numbers nobody dares change.
 *
 * So each is pinned at the altitudes and pressures the seven scenarios actually
 * visit, and by the property that makes it defensible rather than by the exact
 * output, which would just be a screenshot in numeric form.
 */
import { describe, expect, it } from 'vitest';
import {
  groundTint,
  hazeIntensity,
  HAZE_SCALE_HEIGHT,
  horizonDistance,
  horizonSagittaFraction,
  padLightIntensity,
  plasmaIntensity,
  plumeScaleFactor,
  plumeSpreadFactor,
  SEA_LEVEL_PRESSURE,
} from '$view/atmosphere-look';
import { planetRadius, heatLimit } from '$core/constants';
import { skyLightness } from '$view/sky';
import { GROUND_COLOR } from '$view/world';

describe('the horizon bends, by geometry rather than by feel', () => {
  it('is flat on the ground', () => {
    expect(horizonDistance(0)).toBe(0);
    expect(horizonSagittaFraction(0)).toBe(0);
  });

  it('matches the tangent-line distance to the horizon', () => {
    // The textbook result, sqrt(2Rh). At 10 km that is about 357 km, which is
    // the number an aviation table gives for a cruising airliner.
    const at10km = horizonDistance(10_000);
    expect(at10km / 1000).toBeGreaterThan(350);
    expect(at10km / 1000).toBeLessThan(365);
  });

  it('keeps the h-squared term, which is not negligible up here', () => {
    // At 150 km the small-angle form is out by about 1%. The game goes there.
    const exact = horizonDistance(150_000);
    const approximate = Math.sqrt(2 * planetRadius * 150_000);
    expect(exact).toBeGreaterThan(approximate);
    expect((exact - approximate) / exact).toBeGreaterThan(0.005);
  });

  it('is imperceptible low and pronounced high', () => {
    // Under 1% of the screen at a kilometre — correctly invisible.
    expect(horizonSagittaFraction(1_000)).toBeLessThan(0.01);
    // Around a tenth of the screen at 100 km, which is roughly what an onboard
    // camera shows at stage separation.
    expect(horizonSagittaFraction(100_000)).toBeGreaterThan(0.06);
    expect(horizonSagittaFraction(100_000)).toBeLessThan(0.12);
  });

  it('rises monotonically and is capped', () => {
    let last = -1;
    for (let h = 0; h <= 400_000; h += 5_000) {
      const value = horizonSagittaFraction(h);
      expect(value).toBeGreaterThanOrEqual(last);
      expect(value).toBeLessThanOrEqual(0.25);
      last = value;
    }
  });
});

describe('the haze band peaks a few kilometres up', () => {
  it('is present at the surface and gone above the aerosol', () => {
    expect(hazeIntensity(0)).toBe(0);
    expect(hazeIntensity(60_000)).toBeLessThan(0.001);
  });

  it('peaks in the low kilometres, where a horizon actually looks hazy', () => {
    let peakAltitude = 0;
    let peak = 0;
    for (let h = 0; h <= 40_000; h += 50) {
      const value = hazeIntensity(h);
      if (value > peak) {
        peak = value;
        peakAltitude = h;
      }
    }
    // Two effects pulling opposite ways: more air to look through as you climb,
    // less of it left above you. The peak is where they cross.
    expect(peakAltitude).toBeGreaterThan(HAZE_SCALE_HEIGHT * 0.5);
    expect(peakAltitude).toBeLessThan(HAZE_SCALE_HEIGHT * 4);
    expect(peak).toBeGreaterThan(0.3);
  });

  it('never exceeds one, whatever it is asked', () => {
    for (let h = -1000; h <= 200_000; h += 137) {
      expect(hazeIntensity(h)).toBeLessThanOrEqual(1);
      expect(hazeIntensity(h)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the plume expands as the air thins', () => {
  it('is unexpanded at sea level and widest in vacuum', () => {
    expect(plumeSpreadFactor(SEA_LEVEL_PRESSURE)).toBeCloseTo(1, 6);
    expect(plumeScaleFactor(SEA_LEVEL_PRESSURE)).toBeCloseTo(1, 6);
    expect(plumeSpreadFactor(0)).toBeGreaterThan(3);
    expect(plumeScaleFactor(0)).toBeGreaterThan(2);
  });

  it('does most of its expanding low, where the air actually goes', () => {
    // Half of sea-level pressure is about 5.5 km. By 30 km the air is down to
    // 1% and the plume should already be near its vacuum shape — a linear ramp
    // would still be at 99% of sea-level width there, which is the whole reason
    // the exponent is below 1.
    const at30km = plumeSpreadFactor(SEA_LEVEL_PRESSURE * 0.01);
    const inVacuum = plumeSpreadFactor(0);
    expect(at30km / inVacuum).toBeGreaterThan(0.9);
  });

  it('spreads more than it grows — a bell, not a starburst', () => {
    expect(plumeSpreadFactor(0)).toBeGreaterThan(plumeScaleFactor(0));
  });

  it('clamps rather than inverting on a pressure outside the model', () => {
    // A configured scenario can sit below sea level in principle; a negative
    // factor would fire particles backwards through the vehicle.
    expect(plumeSpreadFactor(SEA_LEVEL_PRESSURE * 2)).toBe(1);
    expect(plumeSpreadFactor(-5)).toBe(plumeSpreadFactor(0));
    for (let p = -10; p < 200; p += 0.5) {
      expect(plumeSpreadFactor(p)).toBeGreaterThanOrEqual(1);
      expect(plumeScaleFactor(p)).toBeGreaterThanOrEqual(1);
    }
  });

  it('never emits nothing — the plume exists at every pressure', () => {
    expect(plumeScaleFactor(SEA_LEVEL_PRESSURE)).toBeGreaterThan(0);
  });
});

describe('the plasma trail shares its scale with the heat readout', () => {
  it('is dark in an ordinary landing burn', () => {
    expect(plasmaIntensity(0, heatLimit)).toBe(0);
    expect(plasmaIntensity(5, heatLimit)).toBe(0);
  });

  it('saturates at the same fraction the HEAT readout turns amber', () => {
    // hud/metrics.ts uses 0.8 of the limit for caution. The trail is full
    // brightness there, so the picture and the number agree about when the
    // vehicle is in trouble.
    expect(plasmaIntensity(heatLimit * 0.8, heatLimit)).toBeCloseTo(1, 6);
    expect(plasmaIntensity(heatLimit, heatLimit)).toBe(1);
  });

  it('rises monotonically between the two', () => {
    let last = -1;
    for (let q = 0; q <= heatLimit; q += 1) {
      const value = plasmaIntensity(q, heatLimit);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
  });
});

describe('the ground dims with the sky', () => {
  it('is untouched at low altitude and darkened high', () => {
    expect(groundTint(GROUND_COLOR, skyLightness(0))).toBe(GROUND_COLOR);
    const high = groundTint(GROUND_COLOR, skyLightness(80_000));
    expect(high).toBeLessThan(GROUND_COLOR);
  });

  it('keeps more of its own value than the sky does', () => {
    /*
      The sky squares its lightness; the ground does not. Squaring both made
      the horizon disappear into one flat tone at 60 km — the ground and the
      sky arriving at the same colour is exactly the seam this was added to
      remove.
    */
    const lightness = skyLightness(60_000);
    const groundFactor = ((groundTint(0xffffff, lightness) >> 16) & 0xff) / 255;
    const skyFactor = lightness * lightness;
    expect(groundFactor).toBeGreaterThan(skyFactor);
  });

  it('stays a valid colour at every altitude', () => {
    for (let h = 0; h <= 200_000; h += 1_000) {
      const tint = groundTint(GROUND_COLOR, skyLightness(h));
      expect(tint).toBeGreaterThanOrEqual(0);
      expect(tint).toBeLessThanOrEqual(0xffffff);
      for (const shift of [16, 8, 0]) {
        const channel = (tint >> shift) & 0xff;
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('the pad lights come up as the sky goes down', () => {
  it('is dark at noon and full once the sky has finished draining', () => {
    expect(padLightIntensity(skyLightness(0))).toBe(0);
    expect(padLightIntensity(skyLightness(80_000))).toBeCloseTo(1, 6);
  });

  it('tracks the sky rather than a second altitude curve of its own', () => {
    // It takes a lightness, not an altitude, so the two cannot drift apart —
    // which is the failure the whole feature exists to fix.
    expect(padLightIntensity(1)).toBe(0);
    expect(padLightIntensity(0.4)).toBeCloseTo(1, 6);
    expect(padLightIntensity(0.7)).toBeCloseTo(0.5, 6);
  });

  it('clamps outside the sky range', () => {
    expect(padLightIntensity(2)).toBe(0);
    expect(padLightIntensity(-1)).toBe(1);
  });
});
