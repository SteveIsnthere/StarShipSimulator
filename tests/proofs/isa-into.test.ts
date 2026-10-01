/**
 * Refactor-tier proof (physics-change-policy): `isaAtmosphereInto`, and the
 * `isaAtmosphere` that now delegates to it, agree to the bit with the
 * implementation they replaced.
 *
 * The comparison is against the pre-refactor implementation itself, frozen
 * verbatim in fixtures/isa-legacy.ts and run on the same machine, at 4001
 * altitudes from 0 to ~400 km (deliberately off the round numbers); not against
 * each other, since one now calls the other. Object.is, so 0 ULP. (A first
 * version compared with values recorded on a Mac, which fails on the Linux
 * recording platform, where the last bit of exp/pow can differ.)
 */
import { describe, expect, it } from 'vitest';
import type { Atmosphere } from '$core/physics/atmosphere';
import { isaAtmosphere, isaAtmosphereInto } from '$core/physics/isa';
import { isaAtmosphere as legacyIsa } from './fixtures/isa-legacy';

describe('the allocation-free ISA is the ISA', () => {
  it('matches the pre-refactor implementation bit for bit at every altitude', () => {
    const out: Atmosphere = { airTemperature: 0, airPressure: 0, airDensity: 0 };
    const mismatches: string[] = [];
    let checked = 0;
    for (let i = 0; i <= 4000; i++) {
      const altitude = i * 100 + (i % 7) * 13.37;
      const want = legacyIsa(altitude);
      isaAtmosphereInto(altitude, out);
      const fresh = isaAtmosphere(altitude);
      for (const [name, got, expected] of [
        ['T', out.airTemperature, want.airTemperature],
        ['p', out.airPressure, want.airPressure],
        ['rho', out.airDensity, want.airDensity],
        ['T (fresh)', fresh.airTemperature, want.airTemperature],
        ['p (fresh)', fresh.airPressure, want.airPressure],
        ['rho (fresh)', fresh.airDensity, want.airDensity],
      ] as const) {
        if (!Object.is(got, expected)) mismatches.push(`${name} at ${altitude} m: ${got} vs ${expected}`);
      }
      checked += 1;
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
    expect(checked).toBe(4001);
  });
});
