import { describe, expect, it } from 'vitest';
import { interfaceHeatTransfer } from '$core/physics/heat-transfer';
import { steelSpecificEnthalpy, steelTemperatureFromEnthalpy } from '$core/physics/damage-material';
import { tpsSpecificEnthalpy, tpsTemperatureFromEnthalpy } from '$core/physics/tps-material';

const steel = { minKelvin: 4, maxKelvin: 1473.15, enthalpy: steelSpecificEnthalpy };
const tps = { minKelvin: 116.483, maxKelvin: 1922.04, enthalpy: tpsSpecificEnthalpy };

describe('finite unlike-material interface energy', () => {
  it('reconstructs the analytic two-capacity equilibrium without a shared-material assumption', () => {
    const first = { minKelvin: 1, maxKelvin: 2000, enthalpy: (t: number) => 200 * (t - 293.15) };
    const second = { minKelvin: 1, maxKelvin: 2000, enthalpy: (t: number) => 800 * (t - 293.15) };
    const equilibrium = (2 * 200 * 900 + 3 * 800 * 300) / (2 * 200 + 3 * 800);
    const heat = interfaceHeatTransfer(900, 2, first, 300, 3, second, 1e9, 1);
    expect(heat).toBeCloseTo(2 * 200 * (900 - equilibrium), 7);
    expect(900 - heat / 400).toBeCloseTo(300 + heat / 2400, 9);
  });

  it('transfers identical joules across real silica and steel without overshoot', () => {
    const initialSilica = .7 * tpsSpecificEnthalpy(1400);
    const initialSteel = 64 * steelSpecificEnthalpy(288);
    const heat = interfaceHeatTransfer(1400, .7, tps,
      288, 64, steel, 1e9, 1);
    const silica = tpsTemperatureFromEnthalpy((initialSilica - heat) / .7);
    const steelTemperature = steelTemperatureFromEnthalpy((initialSteel + heat) / 64);
    expect(silica).toBeCloseTo(steelTemperature, 8);
    expect(silica).toBeGreaterThan(288);
    expect(silica).toBeLessThan(1400);
    expect(initialSilica - heat + initialSteel + heat).toBeCloseTo(initialSilica + initialSteel, 8);
    expect(interfaceHeatTransfer(288, 64, steel,
      1400, .7, tps, 1e9, 1)).toBeCloseTo(-heat, 7);
  });

  it('keeps the actual Fourier rate for a resolved short interval', () => {
    expect(interfaceHeatTransfer(700, .7, tps,
      288, 64, steel, 2, 1 / 120)).toBe(2 * (700 - 288) / 120);
    expect(interfaceHeatTransfer(288, .7, tps,
      288, 64, steel, 2, 1)).toBe(0);
  });

  it('permits a hot silica surface above the steel domain when equilibrium remains valid', () => {
    const heat = interfaceHeatTransfer(1533, .7, tps, 288, 64, steel, 1e9, 1);
    const afterTps = tpsTemperatureFromEnthalpy(tpsSpecificEnthalpy(1533) - heat / .7);
    const afterSteel = steelTemperatureFromEnthalpy(steelSpecificEnthalpy(288) + heat / 64);
    expect(afterTps).toBeCloseTo(afterSteel, 8);
    expect(afterSteel).toBeLessThan(1473.15);
  });

  it('rejects invalid energy-transfer inputs', () => {
    expect(() => interfaceHeatTransfer(700, 0, tps,
      288, 64, steel, 2, 1)).toThrow(RangeError);
    expect(() => interfaceHeatTransfer(700, .7, tps,
      288, 64, steel, -2, 1)).toThrow(RangeError);
  });
});
