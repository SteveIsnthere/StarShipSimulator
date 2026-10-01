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
  THERMOSPHERE_BASE,
} from '$core/physics/isa';
import { updateAtmosphere } from '$core/physics/atmosphere';
// The 2021 three-layer model, for the comparisons below. In the test tree since
// M10.9 — nothing in the simulation calls it.
import { legacyAtmosphere } from './legacy-models';
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
 *
 * Pressure and density are held as STRINGS, and that is load-bearing.
 *
 * The tolerance below is derived from how many digits the standard prints, so
 * trailing zeros carry information: `0.0880` is a four-decimal figure and
 * `0.088` is a three-decimal one, and they license bounds a factor of ten
 * apart. A JavaScript number cannot tell them apart — `(0.0880).toExponential()`
 * is `8.8e-2` — so an earlier draft of this file read the precision off the
 * parsed value and handed the 20 km and 32 km rows a bound 10x looser than the
 * derivation claimed. The printed text is the reference; keep it as text.
 */
const PUBLISHED: ReadonlyArray<readonly [number, number, string, string]> = [
  [0, 15.0, '101.325', '1.225'],
  // M10.3 corrected this row. It read [-17.47, 54.02, 0.7364], and the density
  // was wrong: the model disagreed with it by 3.9e-4, which is 5.7x the
  // quantisation of a 4-significant-figure number, so it was not rounding.
  //
  // The lapse rate settles it. T(5 km geopotential) = 288.15 - 0.0065*5000
  // = 255.650 K = -17.50 C exactly, and the 1976 standard tabulates 255.650 K
  // with p = 54019.9 Pa, whence rho = p/(R*T) = 0.73612. The model returns
  // 0.73612. The transcribed 0.7364 was the error — it is the density at 5 km
  // GEOMETRIC, the same geopotential-versus-geometric confusion this file's
  // header records getting wrong once before, at 47 km.
  //
  // It survived because the tolerance was 5%. A bound 26x looser than the
  // worst real residual cannot tell a wrong reference from a right one.
  [5_000, -17.5, '54.0199', '0.73612'],
  [11_000, -56.5, '22.632', '0.3639'],
  [20_000, -56.5, '5.4749', '0.0880'],
  [32_000, -44.5, '0.8680', '0.0132'],
  [47_000, -2.5, '0.1109', '0.00143'],
  [51_000, -2.5, '0.0669', '0.00086'],
  [71_000, -58.5, '0.003956', '0.0000642'],
];

/** Geometric altitude that yields a given geopotential altitude. */
const geometricFor = (geopotential: number) =>
  (C.planetRadius * geopotential) / (C.planetRadius - geopotential);

/**
 * Half of the last significant digit of a decimal literal, relative to itself.
 *
 * M10.3. This is the tolerance, and it is derived rather than chosen. The
 * PUBLISHED figures above are transcribed from a printed table to four or five
 * significant figures, so each carries a quantisation of half its last digit —
 * at 51 km the pressure is given as `0.0669 kPa`, and half its last digit is
 * 0.00005, which is 7.5e-4 of the value. Any comparison against that number is
 * blind below 7.5e-4 no matter how exact the model is.
 *
 * So the right question is not "does the model agree to 5%" (the tolerance
 * before M10.3, which is ~26x looser than the worst real residual and would
 * pass a badly wrong model). It is "does the model agree to the full precision
 * the table is printed at". It does, at every point: the largest measured
 * residual is 5.8e-4 on pressure at 51 km against a 7.5e-4 bound, and 1.9e-3 on
 * density at 32 km against 3.8e-3. Nothing here is slack the model is using.
 */
const quantisationOf = (printed: string): number => {
  const decimals = (printed.split('.')[1] ?? '').length;
  const halfLastDigit = 0.5 * 10 ** -decimals;
  return halfLastDigit / Math.abs(Number(printed));
};

describe('reproduces the published standard atmosphere', () => {
  it.each(PUBLISHED)('at %d m geopotential', (geopotential, temperature, pressure, density) => {
    const a = isaAtmosphere(geometricFor(geopotential));

    // Temperature is compared absolutely, not as a ratio: it passes through
    // zero Celsius inside this range, so a relative bound is meaningless there.
    // 0.05 C is the table's own rounding — every tabulated temperature here is
    // given to 0.1 C or better, and with the 5 km row corrected the model now
    // matches every tabulated temperature exactly.
    expect(a.airTemperature, 'temperature degC').toBeCloseTo(temperature, 1);

    // Bound is TWICE the quantisation, and the factor of two is not slack. The
    // printed figure is itself a rounding of the true value, so a perfectly
    // correct model sits anywhere in [0, half-a-last-digit) from it — the 5 km
    // density lands at 92% of that. Using exactly half a digit as a strict
    // bound would therefore redden a correct model on a sub-ppm change to R,
    // G0 or planetRadius. Two is the smallest factor that is not knife-edge,
    // and the bound is still ~13x tighter than the 5% it replaced.
    expect(Math.abs(a.airPressure / Number(pressure) - 1), 'pressure, relative').toBeLessThan(
      2 * quantisationOf(pressure),
    );
    expect(Math.abs(a.airDensity / Number(density) - 1), 'density, relative').toBeLessThan(
      2 * quantisationOf(density),
    );
  });

  it('and the tolerance really is the table talking, not the model', () => {
    // Guards the derivation above. If someone widens quantisationOf to make a
    // failure go away, this fails too: the bound must stay small enough to
    // discriminate. The loosest point in the table is the 2-significant-figure
    // density at 51 km; nothing may exceed 1%.
    for (const [, , pressure, density] of PUBLISHED) {
      expect(quantisationOf(pressure)).toBeLessThan(0.01);
      expect(quantisationOf(density)).toBeLessThan(0.01);
    }
    // And it is a real bound, not a vacuous one: 0.0669 kPa -> 7.5e-4.
    // Written as the arithmetic rather than as decimals, so the expectation is
    // the derivation: half the last printed digit, over the value.
    expect(quantisationOf('0.0669')).toBeCloseTo(0.00005 / 0.0669, 12);
    expect(quantisationOf('1.225')).toBeCloseTo(0.0005 / 1.225, 12);
    // Trailing zeros must count. This is the bug an earlier draft had: reading
    // the precision off the PARSED number gave '0.0880' the bound belonging to
    // '0.088' — ten times too loose, on a row that then proved nothing.
    expect(quantisationOf('0.0880')).toBeCloseTo(0.00005 / 0.088, 12);
    expect(quantisationOf('0.088')).toBeCloseTo(0.0005 / 0.088, 12);
    expect(quantisationOf('0.0880')).toBeCloseTo(quantisationOf('0.088') / 10, 12);
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
    const simple = legacyAtmosphere(80_000).airTemperature;
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

describe('the top of the table, and the thermosphere above it', () => {
  it('the lapse-rate table stops where the standard stops', () => {
    expect(ISA_TOP_GEOPOTENTIAL).toBe(84_852);
    expect(THERMOSPHERE_BASE).toBe(86_000);
  });

  it('joins the thermosphere without a step in density', () => {
    // The bands' base densities are chained from whatever the table gives at
    // the seam rather than transcribed, precisely so this holds. A jolt here
    // would be a jolt the vehicle feels.
    const below = isaAtmosphere(THERMOSPHERE_BASE - 1).airDensity;
    const at = isaAtmosphere(THERMOSPHERE_BASE).airDensity;
    const above = isaAtmosphere(THERMOSPHERE_BASE + 1).airDensity;
    expect(at).toBe(below);
    expect(Math.abs(above / at - 1), 'density step at the seam').toBeLessThan(2e-4);
  });

  it('reproduces the standard atmosphere from 86 km to 500 km', () => {
    // The point of M2.14. Published densities against the model; the residual
    // above 200 km is the coarseness of the band structure, and it is a
    // fraction rather than the five to ten orders of magnitude the isothermal
    // continuation was out by.
    const PUBLISHED: ReadonlyArray<readonly [number, number, number]> = [
      // altitude m, published kg/m^3, tolerance as a ratio
      [86_000, 6.958e-6, 0.01],
      [100_000, 5.604e-7, 0.06],
      [110_000, 9.708e-8, 0.02],
      [120_000, 2.222e-8, 0.11],
      [150_000, 2.076e-9, 0.02],
      [200_000, 2.541e-10, 0.11],
      [300_000, 1.916e-11, 0.27],
      [400_000, 3.725e-12, 0.02],
      [500_000, 6.967e-13, 0.02],
    ];
    for (const [altitude, published, tolerance] of PUBLISHED) {
      const ratio = isaAtmosphere(altitude).airDensity / published;
      expect(Math.abs(ratio - 1), `${altitude / 1000} km: ratio ${ratio.toFixed(3)}`).toBeLessThan(
        tolerance,
      );
    }
  });

  it('and the isothermal continuation it replaced was a vacuum up there', () => {
    // What M2.14 fixed, stated as the arithmetic rather than as a claim. The
    // old model held the mesopause's ~5.6 km scale height forever; the real
    // thermosphere's grows past 50 km as the air warms toward 1000 K.
    const mesopauseScaleHeight = (R * (isaAtmosphere(86_000).airTemperature + 273.15)) / G0;
    const isothermalAt = (h: number) =>
      isaAtmosphere(86_000).airDensity * Math.exp(-(h - 86_000) / mesopauseScaleHeight);

    expect(isothermalAt(150_000) / 2.076e-9, 'old model at 150 km').toBeLessThan(0.1);
    expect(isothermalAt(300_000) / 1.916e-11, 'old model at 300 km').toBeLessThan(1e-6);
  });

  it('warms toward the exosphere rather than staying at the mesopause', () => {
    // Carried because the Mach number reads it. Monotone, and bounded.
    expect(isaAtmosphere(86_000).airTemperature).toBeCloseTo(-86.2, 0);
    expect(isaAtmosphere(150_000).airTemperature).toBeGreaterThan(200);
    expect(isaAtmosphere(500_000).airTemperature).toBeGreaterThan(650);
    expect(isaAtmosphere(1_000_000).airTemperature).toBeLessThan(727);
    let previous = -Infinity;
    for (let h = 86_000; h <= 1_000_000; h += 5_000) {
      const t = isaAtmosphere(h).airTemperature;
      expect(t, `cooled at ${h} m`).toBeGreaterThan(previous);
      previous = t;
    }
  });

  it('stays positive, finite and monotone well above the model', () => {
    let previous = Infinity;
    for (let h = 86_000; h <= 2_000_000; h += 10_000) {
      const a = isaAtmosphere(h);
      expect(Number.isFinite(a.airDensity), `${h} m`).toBe(true);
      expect(a.airDensity, `${h} m`).toBeGreaterThan(0);
      expect(a.airDensity, `rose at ${h} m`).toBeLessThan(previous);
      previous = a.airDensity;
    }
  });

  it('clamps below sea level too', () => {
    expect(isaAtmosphere(-500).airDensity).toBe(isaAtmosphere(0).airDensity);
  });
});

describe('it is the atmosphere the vehicle flies through — M2.10', () => {
  it('step() reads the ISA, not the three-layer model', () => {
    const s = createInitialState();
    s.kinematics.altitude = 40_000;
    const after = step(s, 1 / 120);
    expect(after.atmosphere.airDensity).toBe(isaAtmosphere(40_000).airDensity);
    expect(after.atmosphere.airDensity).not.toBe(legacyAtmosphere(40_000).airDensity);
  });

  it('and `updateAtmosphere` — the name step() calls — IS the ISA', () => {
    // Not merely equal at one altitude: the same function, everywhere.
    for (const h of [0, 5_000, 11_000, 25_000, 47_000, 70_000, 86_000, 150_000]) {
      expect(updateAtmosphere(h), `${h} m`).toEqual(isaAtmosphere(h));
    }
  });

  it('the two models agree closely below 25 km, where the simple one is good', () => {
    for (const h of [0, 5_000, 11_000, 20_000]) {
      const simple = legacyAtmosphere(h).airDensity;
      const isa = isaAtmosphere(h).airDensity;
      expect(Math.abs(isa / simple - 1), `${h} m`).toBeLessThan(0.05);
    }
  });

  it('and diverge above it, which is why the swap is a Fidelity change', () => {
    // 18% at 70 km, and it grows fast above that.
    expect(Math.abs(isaAtmosphere(70_000).airDensity / legacyAtmosphere(70_000).airDensity - 1))
      .toBeGreaterThan(0.15);
    expect(Math.abs(isaAtmosphere(84_000).airDensity / legacyAtmosphere(84_000).airDensity - 1))
      .toBeGreaterThan(0.4);
  });

  it('a flight through the upper atmosphere stays finite', () => {
    let s = createInitialState();
    s.kinematics.altitude = 70_000;
    s.kinematics.speedX = 3000;
    s.kinematics.speedY = -300;
    for (let i = 0; i < 1200; i++) s = step(s, 1 / 120);
    expect(Number.isFinite(s.kinematics.altitude)).toBe(true);
    expect(Number.isNaN(s.atmosphere.airDensity)).toBe(false);
  });
});
