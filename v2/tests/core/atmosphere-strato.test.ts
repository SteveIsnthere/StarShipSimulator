/**
 * M2.1, Bug-fix tier: the upper stratosphere.
 *
 * TWO DEFECTS, both in backend/physics.js:6-31.
 *
 * 1. `upperStrato()` is defined and never called. `updateAtmosphere` branches
 *    only on `altitude < 11000`, so everything above 11 km uses the
 *    lower-stratosphere isotherm — including the entire re-entry regime this
 *    simulator exists to model. At 80 km the isotherm gives 7.2e-6 kg/m^3 where
 *    the model's own upper-stratosphere formula gives 3.7e-5, five times more.
 *
 * 2. `upperStrato()` is itself mistranscribed. It reads
 *        airTemperature = -131.21 + 0.0299 * altitude
 *    where the NASA Earth Atmosphere Model it comes from has 0.00299 — a factor
 *    of ten. The proof is continuity: the three layers are meant to meet, and at
 *    exactly 25 km the correct coefficient gives -56.46 C, the lower
 *    stratosphere's isotherm, to the digit. The 2021 coefficient gives +616 C
 *    and a density of 1e-9 kg/m^3, which is vacuum.
 *
 *    Wiring in the branch WITHOUT this second fix would make the atmosphere far
 *    worse than leaving it unreachable, so the two are one change.
 *
 * These tests were written before the fix and observed to fail.
 *
 * SINCE M2.10 this three-layer model is no longer what the vehicle flies
 * through — `updateAtmosphere` is the full ISA — so the assertions below name
 * `legacyAtmosphere`, which is this repaired model under its own name. The fix
 * still matters: the parity suite compares against it, and the Re-entry
 * consequence at the end of this file survives, because the ISA is denser up
 * there than the 2021 isotherm too — measured at the end of the file.
 */
import { describe, expect, it } from 'vitest';
import { legacyAtmosphere, upperStrato } from '$core/physics/atmosphere';
import { isaAtmosphere } from '$core/physics/isa';

/** The three layers of the model, by its own boundaries. */
const TROPOPAUSE = 11_000;
const STRATOPAUSE = 25_000;

describe('the model has three layers, and uses all three', () => {
  it('uses the troposphere below 11 km', () => {
    expect(legacyAtmosphere(0).airTemperature).toBeCloseTo(15.04, 6);
    expect(legacyAtmosphere(10_000).airTemperature).toBeCloseTo(15.04 - 0.00649 * 10_000, 6);
  });

  it('uses the lower stratosphere isotherm from 11 km to 25 km', () => {
    for (const h of [TROPOPAUSE, 15_000, 20_000, STRATOPAUSE - 1]) {
      expect(legacyAtmosphere(h).airTemperature, `${h} m`).toBe(-56.46);
    }
  });

  it('uses the UPPER stratosphere above 25 km', () => {
    // The branch 2021 never reached.
    for (const h of [STRATOPAUSE, 30_000, 50_000, 80_000]) {
      expect(legacyAtmosphere(h).airTemperature, `${h} m`).not.toBe(-56.46);
      expect(legacyAtmosphere(h).airTemperature).toBe(upperStrato(h).airTemperature);
    }
  });
});

describe('temperature is continuous across every layer boundary', () => {
  // Continuity is not a nicety here: it is the evidence that the coefficient
  // is 0.00299 and not 0.0299. A model whose layers do not meet is misread.
  it('at the tropopause, 11 km, to within the model\'s own 0.11 C step', () => {
    // The NASA model this is transcribed from is itself slightly discontinuous
    // here: the troposphere lapse reaches -56.35 C at 11 km against the
    // stratosphere's -56.46 C. That 0.11 C step is in the source and is NOT
    // something to "fix" - inventing continuity would be a fidelity change with
    // no basis. Asserted at its real size so it stays a known quantity.
    const below = legacyAtmosphere(TROPOPAUSE - 0.001).airTemperature;
    const above = legacyAtmosphere(TROPOPAUSE).airTemperature;
    expect(Math.abs(above - below)).toBeLessThan(0.15);
    expect(Math.abs(above - below)).toBeGreaterThan(0.1);
  });

  it('at the stratopause, 25 km', () => {
    const below = legacyAtmosphere(STRATOPAUSE - 0.001).airTemperature;
    const above = legacyAtmosphere(STRATOPAUSE).airTemperature;
    expect(below).toBe(-56.46);
    expect(above).toBeCloseTo(-56.46, 9);
    expect(Math.abs(above - below)).toBeLessThan(1e-9);
  });

  it('the upper stratosphere warms with altitude, as the real one does', () => {
    // Ozone absorption. Temperature rises from -56 C at 25 km toward 0 C near
    // the stratopause. With the 2021 coefficient it would reach +616 C at 25 km.
    const t25 = legacyAtmosphere(25_000).airTemperature;
    const t50 = legacyAtmosphere(50_000).airTemperature;
    expect(t50).toBeGreaterThan(t25);
    expect(t25).toBeCloseTo(-56.46, 6);
    expect(t50).toBeCloseTo(-131.21 + 0.00299 * 50_000, 6);
    expect(t50).toBeLessThan(50);
  });
});

describe('density and pressure stay physical', () => {
  it('density falls monotonically with altitude', () => {
    let previous = Infinity;
    for (let h = 0; h <= 86_000; h += 500) {
      const { airDensity } = legacyAtmosphere(h);
      expect(airDensity, `density rose at ${h} m`).toBeLessThan(previous);
      expect(airDensity).toBeGreaterThan(0);
      previous = airDensity;
    }
  });

  it('pressure falls monotonically with altitude', () => {
    let previous = Infinity;
    for (let h = 0; h <= 86_000; h += 500) {
      const { airPressure } = legacyAtmosphere(h);
      expect(airPressure, `pressure rose at ${h} m`).toBeLessThan(previous);
      expect(airPressure).toBeGreaterThan(0);
      previous = airPressure;
    }
  });

  it('sea level is about 1.225 kg/m^3 and 101 kPa', () => {
    const sl = legacyAtmosphere(0);
    expect(sl.airDensity).toBeCloseTo(1.225, 2);
    expect(sl.airPressure).toBeCloseTo(101.3, 0);
  });

  it('re-entry altitudes are denser than the isotherm claimed', () => {
    // The practical consequence: the 2021 model let the vehicle fall through
    // 25-80 km almost unopposed, because it used a 25 km isotherm all the way up.
    const isotherm = (h: number) => {
      const t = -56.46;
      const p = 22.65 * Math.E ** (1.73 - 0.000157 * h);
      return p / (0.2869 * (t + 273.1));
    };
    for (const h of [40_000, 60_000, 80_000]) {
      const now = legacyAtmosphere(h).airDensity;
      expect(now, `${h} m`).toBeGreaterThan(isotherm(h));
    }
    // At 80 km it is about five times denser.
    expect(legacyAtmosphere(80_000).airDensity / isotherm(80_000)).toBeGreaterThan(4);
  });
});

describe('the consequence for the Re-entry preset', () => {
  /**
   * The part of this bug fix that needs an owner decision, asserted so it
   * cannot drift unnoticed.
   *
   * Re-entry enters at 7300 m/s at 80 km. Under the 2021 isotherm the air there
   * was 7.2e-6 kg/m^3 and the vehicle sailed through; with the upper
   * stratosphere wired in it is 3.7e-5, five times more, and thermal power
   * exceeds the 55-unit heat limit within the first second.
   *
   * The old survival was not skill — it was the model believing there was
   * almost no atmosphere. But `heatLimit = 55` was tuned against that same
   * wrong model, and M2.2 (passing a nose radius where an area is passed today)
   * makes heating larger again. The limit needs recalibrating once the M2 bug
   * fixes are in, and recalibrating a limit changes feel, which CLAUDE.md
   * reserves for the owner.
   */
  it('exceeds the heat limit within the first second', async () => {
    const { createScenarioState, getScenario } = await import('$core/scenarios');
    const { step } = await import('$core/step');
    const { heatLimit } = await import('$core/constants');

    let s = createScenarioState(getScenario('reentry')!);
    let peak = 0;
    let brokeAtStep = -1;
    for (let i = 1; i <= 240; i++) {
      s = step(s, 1 / 120);
      peak = Math.max(peak, s.forces.thermalPower);
      if (s.failures.inFlightBreakUp && brokeAtStep < 0) brokeAtStep = i;
    }
    expect(peak).toBeGreaterThan(heatLimit);
    expect(peak).toBeGreaterThan(70);
    expect(brokeAtStep).toBeGreaterThan(0);
    expect(brokeAtStep).toBeLessThan(120);
  });

  it('and it is the density, not a coding slip, that does it', () => {
    // Sanity: the vehicle is not breaking up because of some unrelated NaN.
    // Heat scales with sqrt(density), so ~5x density is ~2.2x heat.
    const isotherm = (h: number) =>
      (22.65 * Math.E ** (1.73 - 0.000157 * h)) / (0.2869 * (-56.46 + 273.1));
    const ratio = legacyAtmosphere(80_000).airDensity / isotherm(80_000);
    expect(Math.sqrt(ratio)).toBeCloseTo(2.25, 1);

    // And the consequence survived M2.10, which replaced this model with the
    // ISA. Measured at 80 km: the 2021 isotherm gives 7.2e-6 kg/m^3, this
    // repaired model 3.7e-5, the ISA 1.8e-5 — so the ISA sits between them,
    // half the repaired model but still two and a half times what the vehicle
    // used to fall through. The Re-entry preset still breaks up.
    const isa = isaAtmosphere(80_000).airDensity;
    expect(isa / isotherm(80_000)).toBeGreaterThan(2.4);
    expect(isa).toBeLessThan(legacyAtmosphere(80_000).airDensity);
  });
});
