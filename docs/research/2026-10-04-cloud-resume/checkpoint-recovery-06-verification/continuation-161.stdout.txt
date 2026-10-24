import { describe, expect, it } from 'vitest';
import {
  TPS_DENSITY, TPS_CP_MIN_K, TPS_CP_MAX_K, TPS_K_MIN_K, TPS_K_MAX_K,
  TPS_PRESSURE_MAX_PA, tpsSpecificHeat, tpsSpecificEnthalpy,
  tpsTemperatureFromEnthalpy, tpsConductivity, tpsMeanConductivity,
} from '$core/physics/tps-material';

// Independently transcribed complete NASA TPSX source rows, SI units.
const cpRows = [
  [116.483, 293], [172.039, 440], [255.372, 628], [394.261, 879],
  [533.15, 1060], [672.039, 1150], [810.928, 1210], [949.817, 1240],
  [1088.71, 1260], [1199.82, 1260], [1227.59, 1270], [1366.48, 1270],
  [1533.15, 1270], [1922.04, 1270],
] as const;
const kTemperatures = [116.667, 255.556, 394.444, 533.333, 672.222, 811.111,
  950, 1088.89, 1227.78, 1366.67, 1533.33, 1644.44, 1811.11, 1922.22] as const;
const pressureRows = [
  [10.133, [.00865, .013, .0159, .0216, .0303, .0403, .0533, .072,
    .0981, .127, .167, .201, .267, .329]],
  [101.33, [.013, .0173, .0216, .0289, .0374, .0476, .0606, .0795,
    .106, .135, .177, .213, .280, .339]],
  [1013.3, [.026, .0317, .0389, .0478, .0563, .0679, .0852, .107,
    .133, .163, .201, .241, .312, .379]],
  [10133, [.0374, .0433, .0547, .0692, .0852, .104, .125, .151,
    .183, .220, .268, .310, .384, .454]],
  [101330, [.0403, .0476, .059, .075, .0924, .114, .135, .163,
    .196, .235, .289, .336, .419, .502]],
] as const;

describe('NASA LI900 complete source data and domain policy', () => {
  it('retains density and separate heat-capacity/conductivity domains', () => {
    expect(TPS_DENSITY).toBe(144);
    expect(TPS_CP_MIN_K).toBe(116.483);
    expect(TPS_CP_MAX_K).toBe(1922.04);
    expect(TPS_K_MIN_K).toBe(116.667);
    expect(TPS_K_MAX_K).toBe(1922.22);
    expect(TPS_PRESSURE_MAX_PA).toBe(101330);
  });

  it.each(cpRows)('retains the published cp at %sK', (temperature, specificHeat) => {
    expect(tpsSpecificHeat(temperature)).toBe(specificHeat);
  });

  it.each(pressureRows)('retains every published conductivity knot at %sPa', (pressure, values) => {
    for (let index = 0; index < kTemperatures.length; index++) {
      expect(tpsConductivity(kTemperatures[index]!, pressure)).toBe(values[index]);
    }
  });

  it('interpolates temperature linearly and pressure logarithmically', () => {
    expect(tpsSpecificHeat((255.372 + 394.261) / 2)).toBeCloseTo((628 + 879) / 2, 10);
    const temperature = (533.333 + 672.222) / 2;
    const pressure = Math.sqrt(101.33 * 1013.3);
    expect(tpsConductivity(temperature, pressure)).toBeCloseTo(
      (.0289 + .0374 + .0478 + .0563) / 4, 12);
  });

  it('holds the lowest measured pressure column in unresolved vacuum', () => {
    for (const pressure of [0, 0.001, 1, 10.133]) {
      expect(tpsConductivity(950, pressure)).toBe(.0533);
    }
  });

  it('rejects temperature/pressure extrapolation and nonfinite inputs', () => {
    for (const temperature of [116.482, 1922.041, NaN, Infinity]) {
      expect(() => tpsSpecificHeat(temperature)).toThrow(RangeError);
      expect(() => tpsSpecificEnthalpy(temperature)).toThrow(RangeError);
    }
    for (const temperature of [116.666, 1922.221, NaN, Infinity]) {
      expect(() => tpsConductivity(temperature, 100)).toThrow(RangeError);
    }
    for (const pressure of [-1, 101330.001, NaN, Infinity]) {
      expect(() => tpsConductivity(300, pressure)).toThrow(RangeError);
      expect(() => tpsMeanConductivity(300, 500, pressure)).toThrow(RangeError);
    }
  });
});

describe('finite LI900 enthalpy and conductivity integral', () => {
  it('uses zero energy at293.15K and exact trapezoidal source-cell integrals', () => {
    expect(tpsSpecificEnthalpy(293.15)).toBe(0);
    for (let index = 1; index < cpRows.length; index++) {
      const [start, cpStart] = cpRows[index - 1]!;
      const [end, cpEnd] = cpRows[index]!;
      expect(tpsSpecificEnthalpy(end) - tpsSpecificEnthalpy(start))
        .toBeCloseTo((end - start) * (cpStart + cpEnd) / 2, 7);
    }
    expect(tpsSpecificEnthalpy(186.95)).toBeLessThan(0);
  });

  it('has the implemented cp as its energy derivative and a bounded monotone inverse', () => {
    let previous = tpsSpecificEnthalpy(TPS_CP_MIN_K);
    for (const temperature of [117, 186.95, 293.15, 400, 900, 1200, 1473.15, 1900, TPS_CP_MAX_K]) {
      const energy = tpsSpecificEnthalpy(temperature);
      expect(energy).toBeGreaterThan(previous);
      expect(tpsTemperatureFromEnthalpy(energy)).toBeCloseTo(temperature, 9);
      if (temperature < TPS_CP_MAX_K) {
        const delta = .001;
        expect((tpsSpecificEnthalpy(temperature + delta) - tpsSpecificEnthalpy(temperature - delta))
          / (2 * delta)).toBeCloseTo(tpsSpecificHeat(temperature), 5);
      }
      previous = energy;
    }
    expect(tpsTemperatureFromEnthalpy(tpsSpecificEnthalpy(TPS_CP_MIN_K))).toBe(TPS_CP_MIN_K);
    expect(() => tpsTemperatureFromEnthalpy(tpsSpecificEnthalpy(TPS_CP_MIN_K) - 1)).toThrow(RangeError);
    expect(() => tpsTemperatureFromEnthalpy(tpsSpecificEnthalpy(TPS_CP_MAX_K) + 1)).toThrow(RangeError);
    expect(() => tpsTemperatureFromEnthalpy(NaN)).toThrow(RangeError);
  });

  it('integrates conductivity over all crossed cells, independently of endpoint order', () => {
    const pressure = Math.sqrt(10.133 * 101.33);
    let integral = 0;
    const lowPressure = pressureRows[0][1];
    const highPressure = pressureRows[1][1];
    for (let index = 1; index < kTemperatures.length; index++) {
      const startK = (lowPressure[index - 1]! + highPressure[index - 1]!) / 2;
      const endK = (lowPressure[index]! + highPressure[index]!) / 2;
      integral += (kTemperatures[index]! - kTemperatures[index - 1]!) * (startK + endK) / 2;
    }
    const expectedMean = integral / (TPS_K_MAX_K - TPS_K_MIN_K);
    expect(tpsMeanConductivity(TPS_K_MIN_K, TPS_K_MAX_K, pressure)).toBeCloseTo(expectedMean, 12);
    expect(tpsMeanConductivity(TPS_K_MAX_K, TPS_K_MIN_K, pressure)).toBeCloseTo(expectedMean, 12);
    expect(tpsMeanConductivity(533.333, 533.333, 1013.3)).toBe(.0478);
  });

  it('uses the exact linear mean within a partial source cell', () => {
    expect(tpsMeanConductivity(600, 650, 101330)).toBeCloseTo(
      (tpsConductivity(600, 101330) + tpsConductivity(650, 101330)) / 2, 12);
  });
});
