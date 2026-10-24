import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { ALL_SCENARIOS, ORBIT_ALTITUDE } from '$core/scenarios';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { DT } from '$app/loop';
import { orbitalMissionHorizon, scenarioMissionHorizon } from '../support/scenario-horizon';

describe('the approved scenario mission failure deadlines', () => {
  it('retains all eighteen ID/model rows with only four orbital extensions', () => {
    const rows = [SHIP, SUPER_HEAVY].flatMap(model => ALL_SCENARIOS.map(preset => ({
      key: `${model.id}/${preset.id}`, preset, horizon: scenarioMissionHorizon(preset),
    })));
    expect(rows).toHaveLength(18);
    expect(new Set(rows.map(row => row.key)).size).toBe(18);
    expect(rows.filter(row => row.horizon.seconds !== 900).map(row => row.key)).toEqual([
      'ship/circularize', 'ship/deorbit', 'super-heavy/circularize', 'super-heavy/deorbit',
    ]);
    for (const row of rows) {
      if (row.preset.id !== 'circularize' && row.preset.id !== 'deorbit') {
        expect(row.horizon, row.key).toEqual({ seconds: 900, steps: 108_000 });
      }
    }
  });

  it('derives the cap from a ground revisit, Kepler transfer allowance and terminal time', () => {
    const horizon = orbitalMissionHorizon(ORBIT_ALTITUDE);
    // Independent circular-speed/circumference derivation of both periods.
    const radius = C.planetRadius + ORBIT_ALTITUDE;
    const inertialSpeed = Math.sqrt(C.planetGravitationalParameter / radius);
    const keplerPeriod = 2 * Math.PI * radius / inertialSpeed;
    const groundPeriod = 2 * Math.PI * radius / (inertialSpeed - C.frameRotationRate * radius);
    expect(horizon.keplerPeriod).toBeCloseTo(keplerPeriod, 9);
    expect(horizon.groundPeriod).toBeCloseTo(groundPeriod, 9);
    expect(horizon.seconds).toBe(horizon.groundPeriod + horizon.keplerPeriod + 900);
    expect(horizon.seconds).toBeCloseTo(11_381.230608843909, 9);
    expect(horizon.steps).toBe(1_365_748);
    // Round up once: every mechanical/support tick spends this same budget.
    expect(horizon.steps * DT).toBeGreaterThanOrEqual(horizon.seconds);
    expect((horizon.steps - 1) * DT).toBeLessThan(horizon.seconds);
    expect(horizon.steps * DT - horizon.seconds).toBeLessThan(DT);
  });

  it('recomputes opportunity time under rotation instead of silently reusing two Kepler periods', () => {
    const zero = orbitalMissionHorizon(ORBIT_ALTITUDE);
    const rotating = orbitalMissionHorizon(ORBIT_ALTITUDE, 7.292115e-5);
    expect(rotating.keplerPeriod).toBe(zero.keplerPeriod);
    expect(rotating.groundPeriod).toBeGreaterThan(zero.groundPeriod);
    expect(rotating.seconds).toBe(rotating.groundPeriod + rotating.keplerPeriod + 900);
    const higher = orbitalMissionHorizon(300_000);
    expect(higher.keplerPeriod).toBeGreaterThan(zero.keplerPeriod);
    expect(higher.steps).toBeGreaterThan(zero.steps);
  });

  it('rejects invalid orbit geometry and a non-prograde ground revisit', () => {
    for (const altitude of [NaN, Infinity, -Infinity, -C.planetRadius, -C.planetRadius - 1]) {
      expect(() => orbitalMissionHorizon(altitude)).toThrow(RangeError);
    }
    expect(() => orbitalMissionHorizon(Number.MAX_VALUE, -1)).toThrow(RangeError);
    expect(() => orbitalMissionHorizon(1e15)).toThrow(RangeError);
    for (const rotation of [NaN, Infinity, -Infinity, 1]) {
      expect(() => orbitalMissionHorizon(ORBIT_ALTITUDE, rotation)).toThrow(RangeError);
    }
  });
});
