/**
 * Refactor-tier proof (physics-change-policy): `isaAtmosphereInto`, and the
 * `isaAtmosphere` that now delegates to it, agree to the bit with the
 * implementation they replaced.
 *
 * The comparison is against values recorded from `main` before the refactor
 * (fixtures/isa-main.json, 4001 altitudes from 0 to ~400 km, deliberately off
 * the round numbers), not against each other: one now calls the other, so
 * comparing them would prove nothing. Object.is, so 0 ULP, not a tolerance.
 */
import { describe, expect, it } from 'vitest';
import type { Atmosphere } from '$core/physics/atmosphere';
import { isaAtmosphere, isaAtmosphereInto } from '$core/physics/isa';
import recorded from './fixtures/isa-main.json';

describe('the allocation-free ISA is the ISA', () => {
  it('matches main bit for bit at every recorded altitude', () => {
    const out: Atmosphere = { airTemperature: 0, airPressure: 0, airDensity: 0 };
    const mismatches: string[] = [];
    for (const [h, t, p, d] of recorded.rows) {
      const altitude = Number(h);
      isaAtmosphereInto(altitude, out);
      const fresh = isaAtmosphere(altitude);
      for (const [name, got, want] of [
        ['T', out.airTemperature, Number(t)],
        ['p', out.airPressure, Number(p)],
        ['rho', out.airDensity, Number(d)],
        ['T (fresh)', fresh.airTemperature, Number(t)],
        ['p (fresh)', fresh.airPressure, Number(p)],
        ['rho (fresh)', fresh.airDensity, Number(d)],
      ] as const) {
        if (!Object.is(got, want)) mismatches.push(`${name} at ${altitude} m: ${got} vs ${want}`);
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
    expect(recorded.rows.length).toBe(4001);
  });
});
