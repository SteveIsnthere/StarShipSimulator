/**
 * M2.8, Fidelity tier: the full ISA lapse-rate table to 86 km.
 *
 * Checked against the published US Standard Atmosphere 1976 values, because a
 * standard atmosphere that does not reproduce the standard is just another
 * approximation with more code.
 */
import { describe, expect, it } from 'vitest';
import {
  G0,
  geopotentialAltitude,
  isaAtmosphere,
  ISA_TOP_GEOPOTENTIAL,
  P0_PASCAL,
  R,
  T0_KELVIN,
} from '$core/physics/isa';
import { updateAtmosphere } from '$core/physics/atmosphere';
import * as C from '$core/constants';
import { createInitialState } from '$core/state';
import { step } from '$core/step';

/**
 * Published US Standard Atmosphere 1976: [GEOPOTENTIAL m, T degC, p kPa, rho kg/m^3].
 *
 * Geopotential, not geometric - the standard's layer boundaries and tabulated
 * values are all indexed that way. Comparing them against geometric altitudes
 * is a real mistake and was the first thing this test got wrong: at 47 km
 * geometric the geopotential is 46.66 km, still inside the lapsing layer below
 * the stratopause, so the temperature is -3.46 C rather than the layer-top
 * -2.5 C. The model was right; the test was asking the wrong question.
 */
const PUBLISHED: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 15.0, 101.325, 1.225],
  [5_000, -17.47, 54.02, 0.7364],
  [11_000, -56.5, 22.632, 0.3639],
  [20_000, -56.5, 5.4749, 0.0880],
  [32_000, -44.5, 0.8680, 0.0132],
  [47_000, -2.5, 0.1109, 0.00143],
  [51_000, -2.5, 0.0669, 0.00086],
  [71_000, -58.5, 0.003956, 0.0000642],
];

/** Geometric altitude that yields a given geopotential altitude. */
const geometricFor = (geopotential: number) =>
  (C.planetRadius * geopotential) / (C.planetRadius - geopotential);

describe('reproduces the published standard atmosphere', () => {
  it.each(PUBLISHED)('at %d m geopotential', (geopotential, temperature, pressure, density) => {
    const a = isaAtmosphere(geometricFor(geopotential));
    expect(a.airTemperature, 'temperature').toBeCloseTo(temperature, 0);
    expect(a.airPressure / pressure, 'pressure ratio').toBeCloseTo(1, 1);
    expect(a.airDensity / density, 'density ratio').toBeCloseTo(1, 1);
  });

  it('sea level is exactly the standard reference', () => {
    const sl = isaAtmosphere(0);
    expect(sl.airTemperature).toBeCloseTo(T0_KELVIN - 273.15, 9);
    expect(sl.airPressure).toBeCloseTo(P0_PASCAL / 1000, 9);
    expect(sl.airDensity).toBeCloseTo(P0_PASCAL / (R * T0_KELVIN), 9);
    expect(G0).toBe(9.80665);
  });
});

describe('the layers join without a step', () => {
  it('temperature is continuous at every boundary', () => {
    // Straddled in GEOPOTENTIAL, since that is where the boundaries are, and by
    // 1 cm rather than 1 m: the steepest lapse is 0.0065 K/m, so a 2 m straddle
    // legitimately spans 13 mK and a tighter bound would be measuring the lapse
    // rate rather than continuity.
    for (const boundary of [11_000, 20_000, 32_000, 47_000, 51_000, 71_000]) {
      const below = isaAtmosphere(geometricFor(boundary - 0.01)).airTemperature;
      const above = isaAtmosphere(geometricFor(boundary + 0.01)).airTemperature;
      expect(Math.abs(above - below), `${boundary} m`).toBeLessThan(0.001);
    }
  });

  it('pressure is continuous at every boundary', () => {
    // Base pressures are computed by integrating upward rather than
    // transcribed, precisely so this holds tightly.
    for (const boundary of [11_000, 20_000, 32_000, 47_000, 51_000, 71_000]) {
      const below = isaAtmosphere(geometricFor(boundary - 0.01)).airPressure;
      const above = isaAtmosphere(geometricFor(boundary + 0.01)).airPressure;
      expect(Math.abs(above / below - 1), `${boundary} m`).toBeLessThan(1e-5);
    }
  });

  it('density falls monotonically all the way up', () => {
    let previous = Infinity;
    for (let h = 0; h <= 86_000; h += 250) {
      const { airDensity } = isaAtmosphere(h);
      expect(airDensity, `rose at ${h} m`).toBeLessThan(previous);
      expect(airDensity).toBeGreaterThan(0);
      previous = airDensity;
    }
  });
});

describe('it has a mesosphere, which the three-layer model does not', () => {
  it('temperature falls again above the stratopause', () => {
    // The three-layer model warms monotonically past 47 km forever. The real
    // atmosphere cools through the mesosphere to about -86 C at the mesopause.
    expect(isaAtmosphere(60_000).airTemperature).toBeLessThan(
      isaAtmosphere(47_000).airTemperature,
    );
    expect(isaAtmosphere(84_000).airTemperature).toBeLessThan(-80);
  });

  it('and the three-layer model gets that badly wrong up there', () => {
    const simple = updateAtmosphere(80_000).airTemperature;
    const isa = isaAtmosphere(80_000).airTemperature;
    expect(simple).toBeGreaterThan(50);
    expect(isa).toBeLessThan(-70);
    expect(simple - isa).toBeGreaterThan(120);
  });
});

describe('geopotential altitude', () => {
  it('is slightly below geometric altitude, and by more the higher you go', () => {
    expect(geopotentialAltitude(0)).toBe(0);
    expect(geopotentialAltitude(11_000)).toBeLessThan(11_000);
    expect(geopotentialAltitude(11_000) / 11_000).toBeCloseTo(0.9983, 3);
    expect(geopotentialAltitude(86_000) / 86_000).toBeCloseTo(0.9867, 3);
  });

  it('is 1.3% at the top of the table, which is not negligible there', () => {
    // Density changes by a factor of e every few km at 86 km, so a 1.1 km
    // error in altitude is a double-digit error in density.
    expect(86_000 - geopotentialAltitude(86_000)).toBeGreaterThan(1_100);
  });

  it('uses the simulation planet radius, not Earth\'s', () => {
    const h = 50_000;
    expect(geopotentialAltitude(h)).toBeCloseTo((C.planetRadius * h) / (C.planetRadius + h), 9);
  });
});

describe('the top of the table', () => {
  it('holds rather than extrapolating past 84.852 km geopotential', () => {
    // The mesopause layer would keep cooling toward absolute zero, which is
    // worse than holding.
    const top = isaAtmosphere(90_000);
    const atTop = isaAtmosphere(86_000);
    expect(top.airTemperature).toBeCloseTo(atTop.airTemperature, 1);
    expect(top.airTemperature).toBeGreaterThan(-100);
    expect(ISA_TOP_GEOPOTENTIAL).toBe(84_852);
  });

  it('stays positive and finite well above the model', () => {
    for (const h of [100_000, 200_000, 400_000]) {
      const a = isaAtmosphere(h);
      expect(Number.isFinite(a.airDensity), `${h} m`).toBe(true);
      expect(a.airDensity).toBeGreaterThan(0);
    }
  });

  it('clamps below sea level too', () => {
    expect(isaAtmosphere(-500).airDensity).toBe(isaAtmosphere(0).airDensity);
  });
});

describe('behind the flag', () => {
  it('off: the three-layer model, unchanged', () => {
    const s = createInitialState(undefined, { fullISA: false });
    s.kinematics.altitude = 40_000;
    const after = step(s, 1 / 120);
    expect(after.atmosphere.airDensity).toBe(updateAtmosphere(40_000).airDensity);
  });

  it('on: the ISA', () => {
    const s = createInitialState(undefined, { fullISA: true });
    s.kinematics.altitude = 40_000;
    const after = step(s, 1 / 120);
    expect(after.atmosphere.airDensity).toBe(isaAtmosphere(40_000).airDensity);
  });

  it('the two agree closely below 25 km, where the simple model is good', () => {
    for (const h of [0, 5_000, 11_000, 20_000]) {
      const simple = updateAtmosphere(h).airDensity;
      const isa = isaAtmosphere(h).airDensity;
      expect(Math.abs(isa / simple - 1), `${h} m`).toBeLessThan(0.05);
    }
  });

  it('and diverge above it, which is the point of the flag', () => {
    // 18% at 70 km, and it grows fast above that.
    expect(Math.abs(isaAtmosphere(70_000).airDensity / updateAtmosphere(70_000).airDensity - 1))
      .toBeGreaterThan(0.15);
    expect(Math.abs(isaAtmosphere(84_000).airDensity / updateAtmosphere(84_000).airDensity - 1))
      .toBeGreaterThan(0.4);
  });

  it('a flight with the flag on stays finite', () => {
    let s = createInitialState(undefined, { fullISA: true });
    s.kinematics.altitude = 70_000;
    s.kinematics.speedX = 3000;
    s.kinematics.speedY = -300;
    for (let i = 0; i < 1200; i++) s = step(s, 1 / 120);
    expect(Number.isFinite(s.kinematics.altitude)).toBe(true);
    expect(Number.isNaN(s.atmosphere.airDensity)).toBe(false);
  });
});
