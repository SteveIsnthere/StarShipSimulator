import { describe, expect, it } from 'vitest';
import {
  STEEL_DENSITY, MATERIAL_MIN_K, MATERIAL_REFERENCE_K, MATERIAL_MAX_K,
  steelSpecificHeat, steelConductivity, steelSpecificEnthalpy,
  steelTemperatureFromEnthalpy, steelElasticModulus, steelProofStrength,
  conservativeHeatTransfer,
} from '$core/physics/damage-material';

describe('declared 304 surrogate source data', () => {
  it('uses SI NIST density and temperature-dependent thermal properties', () => {
    expect(STEEL_DENSITY).toBe(7920);
    expect(MATERIAL_REFERENCE_K).toBe(293.15);
    expect(MATERIAL_MAX_K).toBe(1473.15);
    for (const temperature of [293.15, 500, 1000, 1473.15]) {
      expect(steelSpecificHeat(temperature)).toBeCloseTo(
        6.683 + 0.04906 * temperature + 80.74 * Math.log(temperature), 10);
      expect(steelConductivity(temperature)).toBeCloseTo(
        9.705 + 0.0176 * temperature - 1.60e-6 * temperature ** 2, 10);
    }
  });

  const knots = [
    [100, 187210, 223], [200, 176314, 190], [300, 169642, 180],
    [400, 159526, 172], [500, 146800, 153], [600, 137390, 136],
    [700, 125450, 112], [800, 108080, 62], [900, 67550, 35],
  ] as const;

  it.each(knots)('retains Monash Table2 at %s°C in pascals', (celsius, modulus, proof) => {
    expect(steelElasticModulus(celsius + 273.15)).toBe(modulus * 1e6);
    expect(steelProofStrength(celsius + 273.15)).toBe(proof * 1e6);
  });

  it('interpolates between measured knots without an invented weakening rate', () => {
    expect(steelElasticModulus(723.15)).toBe((159526 + 146800) / 2 * 1e6);
    expect(steelProofStrength(723.15)).toBe((172 + 153) / 2 * 1e6);
  });

  it('holds the conservative100°C baseline below100°C and has no hot extrapolation', () => {
    for (const temperature of [100, 273.15, 293.15, 350, 373.15]) {
      expect(steelElasticModulus(temperature)).toBe(187210e6);
      expect(steelProofStrength(temperature)).toBe(223e6);
    }
    expect(steelElasticModulus(1173.15)).toBe(67550e6);
    expect(steelProofStrength(1173.15)).toBe(35e6);
    expect(steelElasticModulus(1173.150001)).toBe(0);
    expect(steelProofStrength(1533)).toBe(0);
    expect(() => steelElasticModulus(NaN)).toThrow(RangeError);
  });
});

describe('finite material enthalpy', () => {
  it('has the exact ambient reference and increasing finite energy', () => {
    expect(steelSpecificEnthalpy(293.15)).toBe(0);
    let previous = 0;
    for (const temperature of [400, 600, 900, 1200, 1473.15]) {
      const enthalpy = steelSpecificEnthalpy(temperature);
      expect(enthalpy).toBeGreaterThan(previous);
      expect(steelTemperatureFromEnthalpy(enthalpy)).toBeCloseTo(temperature, 9);
      previous = enthalpy;
    }
  });

  it('differentiates to the independently evaluated specific heat', () => {
    const halfWidth = 0.01;
    for (const temperature of [350, 600, 1000, 1400]) {
      const derivative = (steelSpecificEnthalpy(temperature + halfWidth)
        - steelSpecificEnthalpy(temperature - halfWidth)) / (2 * halfWidth);
      expect(derivative).toBeCloseTo(steelSpecificHeat(temperature), 5);
    }
  });

  it('rejects out-of-domain thermal energy rather than discarding it through clamping', () => {
    for (const temperature of [3.999, 1473.151, NaN, Infinity]) {
      expect(() => steelSpecificEnthalpy(temperature)).toThrow(RangeError);
      expect(() => steelSpecificHeat(temperature)).toThrow(RangeError);
      expect(() => steelConductivity(temperature)).toThrow(RangeError);
    }
    expect(() => steelTemperatureFromEnthalpy(steelSpecificEnthalpy(MATERIAL_MIN_K) - 1))
      .toThrow(RangeError);
    expect(() => steelTemperatureFromEnthalpy(
      steelSpecificEnthalpy(MATERIAL_MAX_K) + 1)).toThrow(RangeError);
  });
});

describe('matched cryogenic finite energy', () => {
  // Independent direct polynomial summation, not the production Horner/table path.
  function publishedColdCp(temperature: number): number {
    const coefficients = [22.0061, -127.5528, 303.647, -381.0098,
      274.0328, -112.9212, 24.7593, -2.239153];
    const x = Math.log10(temperature);
    return 10 ** coefficients.reduce((sum, coefficient, power) => sum + coefficient * x ** power, 0);
  }

  it('keeps source cold knots and bounds interpolation below source fit uncertainty', () => {
    expect(MATERIAL_MIN_K).toBe(4);
    for (const temperature of [4, 40, 186, 273]) {
      expect(steelSpecificHeat(temperature)).toBeCloseTo(publishedColdCp(temperature), 6);
    }
    // The first coarse-grid failure: source curvature here requires refinement.
    expect(Math.abs(steelSpecificHeat(4.137) / publishedColdCp(4.137) - 1)).toBeLessThan(0.001);
    for (let temperature = 4; temperature < 273.15; temperature += 0.137) {
      const source = publishedColdCp(temperature);
      expect(steelSpecificHeat(temperature)).toBeGreaterThan(0);
      expect(Math.abs(steelSpecificHeat(temperature) / source - 1)).toBeLessThan(0.001);
    }
  });

  it('matches cold/bridge/hot heat capacity and enthalpy continuously', () => {
    for (const junction of [273.15, 293.15]) {
      expect(steelSpecificHeat(junction - 1e-7)).toBeCloseTo(steelSpecificHeat(junction + 1e-7), 5);
      expect(steelSpecificEnthalpy(junction - 1e-7))
        .toBeCloseTo(steelSpecificEnthalpy(junction + 1e-7), 3);
      expect(steelConductivity(junction - 1e-7)).toBeCloseTo(steelConductivity(junction + 1e-7), 6);
    }
    expect(steelSpecificEnthalpy(293.15)).toBe(0);
    expect(steelSpecificEnthalpy(186)).toBeLessThan(0);
  });

  it('bounds startup enthalpy approximation against independent composite Simpson integration', () => {
    // Integrate the original source fit independently: no production enthalpy/table.
    const intervals = 10000;
    const width = (273.15 - 4) / intervals;
    let sum = publishedColdCp(4) + publishedColdCp(273.15);
    for (let index = 1; index < intervals; index++) {
      sum += (index % 2 === 0 ? 2 : 4) * publishedColdCp(4 + index * width);
    }
    const sourceIntegral = sum * width / 3;
    expect(Math.abs(steelSpecificEnthalpy(273.15) - steelSpecificEnthalpy(4) - sourceIntegral))
      .toBeLessThan(0.5);
  });

  it('has positive derivative and monotone invertible energy throughout the cold and bridge branches', () => {
    let previous = steelSpecificEnthalpy(4);
    for (const temperature of [4.5, 100, 186, 273, 273.15, 280, 288.15, 293.15, 310]) {
      const enthalpy = steelSpecificEnthalpy(temperature);
      expect(enthalpy).toBeGreaterThan(previous);
      expect(steelTemperatureFromEnthalpy(enthalpy)).toBeCloseTo(temperature, 8);
      const delta = 1e-4;
      const derivative = (steelSpecificEnthalpy(temperature + delta)
        - steelSpecificEnthalpy(temperature - delta)) / (2 * delta);
      expect(derivative).toBeCloseTo(steelSpecificHeat(temperature), 4);
      previous = enthalpy;
    }
  });

  it('conserves cold/hot energy across the bridge without ambient clipping', () => {
    const hA = steelSpecificEnthalpy(500);
    const hB = steelSpecificEnthalpy(186);
    const transferred = conservativeHeatTransfer(500, 1, 186, 20, 1e9, 1);
    const temperatureA = steelTemperatureFromEnthalpy(hA - transferred);
    const temperatureB = steelTemperatureFromEnthalpy(hB + transferred / 20);
    expect(temperatureA).toBeCloseTo(temperatureB, 8);
    expect(temperatureA).toBeLessThan(273.15);
    expect(steelSpecificEnthalpy(temperatureA) + 20 * steelSpecificEnthalpy(temperatureB))
      .toBeCloseTo(hA + 20 * hB, 5);
  });
});

describe('conservative two-node heat transfer', () => {
  it('returns signed conduction energy and exactly conserves stored energy', () => {
    const massA = 3;
    const massB = 7;
    const temperatureA = 900;
    const temperatureB = 400;
    const initialA = massA * steelSpecificEnthalpy(temperatureA);
    const initialB = massB * steelSpecificEnthalpy(temperatureB);
    const transferred = conservativeHeatTransfer(temperatureA, massA, temperatureB, massB, 10, 0.1);
    expect(transferred).toBe(500);
    const afterA = steelTemperatureFromEnthalpy((initialA - transferred) / massA);
    const afterB = steelTemperatureFromEnthalpy((initialB + transferred) / massB);
    expect(afterA).toBeLessThan(temperatureA);
    expect(afterB).toBeGreaterThan(temperatureB);
    expect(massA * steelSpecificEnthalpy(afterA) + massB * steelSpecificEnthalpy(afterB))
      .toBeCloseTo(initialA + initialB, 6);
    expect(conservativeHeatTransfer(temperatureB, massB, temperatureA, massA, 10, 0.1))
      .toBe(-transferred);
  });

  it('bounds a stiff transfer at nonlinear enthalpy equilibrium without overshoot', () => {
    const massA = 2;
    const massB = 5;
    const hA = steelSpecificEnthalpy(1400);
    const hB = steelSpecificEnthalpy(300);
    const equilibrium = (massA * hA + massB * hB) / (massA + massB);
    const transferred = conservativeHeatTransfer(1400, massA, 300, massB, 1e9, 1);
    expect(transferred).toBeCloseTo(massA * (hA - equilibrium), 7);
    const afterA = steelTemperatureFromEnthalpy(hA - transferred / massA);
    const afterB = steelTemperatureFromEnthalpy(hB + transferred / massB);
    expect(afterA).toBeCloseTo(afterB, 9);
    expect(afterA).toBeCloseTo(steelTemperatureFromEnthalpy(equilibrium), 9);
    expect(conservativeHeatTransfer(afterA, massA, afterA, massB, 1e9, 1)).toBe(0);
  });

  it('requires finite positive masses and nonnegative physical transport inputs', () => {
    for (const badMass of [0, -1, NaN, Infinity]) {
      expect(() => conservativeHeatTransfer(500, badMass, 400, 1, 10, 1)).toThrow(RangeError);
    }
    expect(() => conservativeHeatTransfer(500, 1, 400, 1, -1, 1)).toThrow(RangeError);
    expect(() => conservativeHeatTransfer(500, 1, 400, 1, 1, -1)).toThrow(RangeError);
    expect(conservativeHeatTransfer(500, 1, 400, 1, 0, 1)).toBe(0);
    expect(conservativeHeatTransfer(500, 1, 400, 1, 1, 0)).toBe(0);
  });
});
