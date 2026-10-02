/**
 * Above 86 km the temperature follows the US Standard Atmosphere 1976 (Phase 6
 * Task 1, Bug fix from the backlog: a single exponential from the mesopause
 * read 293 K at 100 km, where the standard has 195 K). Only Mach reads it;
 * density above 86 km is chained from the table's 86 km value and does not.
 *
 * Values: U.S. Standard Atmosphere 1976, Table I (kinetic temperature at
 * geometric altitude). Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { isaAtmosphere } from '$core/physics/isa';

const USSA76: ReadonlyArray<readonly [number, number]> = [
  [91_000, 186.87],
  [100_000, 195.08],
  [110_000, 240.0],
  [120_000, 360.0],
  [150_000, 634.39],
  [200_000, 854.56],
  [300_000, 976.01],
  [500_000, 999.24],
  [1_000_000, 1000.0],
];

describe('the thermosphere temperature is the standard', () => {
  it.each(USSA76)('at %d m: %f K', (altitude, kelvin) => {
    expect(isaAtmosphere(altitude).airTemperature + 273.15).toBeCloseTo(kelvin, 1);
  });

  it('leaves the density above 86 km exactly as it was', () => {
    // Density is chained from the 86 km table value through the bands' scale
    // heights; no temperature enters it. Pinned at three altitudes to the
    // values before this change.
    // Relative 1e-12: exact here, and robust to another platform's last bit.
    expect(isaAtmosphere(100_000).airDensity / DENSITY_100KM).toBeCloseTo(1, 12);
    expect(isaAtmosphere(150_000).airDensity / DENSITY_150KM).toBeCloseTo(1, 12);
    expect(isaAtmosphere(400_000).airDensity / DENSITY_400KM).toBeCloseTo(1, 12);
  });
});

// Recorded from the code before this change (2026-10-01). Exact on this
// machine's platform; the density chain does not involve temperature, so a
// change that reached it would show here.
const DENSITY_100KM = 5.306473178799468e-7;
const DENSITY_150KM = 2.073945467826629e-9;
const DENSITY_400KM = 3.732030915136411e-12;
