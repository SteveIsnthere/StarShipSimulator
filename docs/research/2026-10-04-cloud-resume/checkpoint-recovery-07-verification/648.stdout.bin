import { describe, expect, it } from 'vitest';
import { V3_CATALOG, V3_PROPULSION, V3_SHIP, V3_SUPER_HEAVY } from '$core/vehicles/v3';
import { engineMassFlow, engineThrust, type PropulsionProfile } from '$core/physics/propulsion';

const G0 = 9.80665;
const P0_KPA = 101.325;

describe('unselected V3 physical catalogue', () => {
  it('uses the published flown envelope, capacity and engine inventory', () => {
    expect([V3_SHIP.height, V3_SUPER_HEAVY.height, V3_SHIP.diameter, V3_SUPER_HEAVY.diameter]).toEqual([52, 72, 9, 9]);
    expect([V3_SHIP.propellantCapacity, V3_SUPER_HEAVY.propellantCapacity]).toEqual([1_600_000, 3_650_000]);
    expect([V3_SHIP.dryMass, V3_SUPER_HEAVY.dryMass]).toEqual([120_000, 200_000]);
    expect(V3_SHIP.engines.map(engine => engine.kind)).toEqual(['sea-level', 'sea-level', 'sea-level', 'vacuum', 'vacuum', 'vacuum']);
    expect(V3_SUPER_HEAVY.engines).toHaveLength(33);
    expect(V3_SUPER_HEAVY.engines.every(engine => engine.kind === 'sea-level')).toBe(true);
    expect(V3_SUPER_HEAVY.engines.filter(engine => engine.gimballed)).toHaveLength(13);
    expect(V3_SHIP.engines.filter(engine => engine.gimballed)).toHaveLength(3);
    expect(V3_SUPER_HEAVY.gridFins).toEqual({ count: 3, area: 24 * 3 / 4 * 1.5 });
    expect(V3_SHIP.propulsion).toBe(V3_PROPULSION);
    expect(V3_SUPER_HEAVY.propulsion).toBe(V3_PROPULSION);
  });

  it('freezes every nested catalogue input', () => {
    const check = (value: unknown): void => {
      if (typeof value !== 'object' || value === null) return;
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) check(child);
    };
    check(V3_CATALOG);
    expect(() => Object.assign(V3_PROPULSION.seaLevel, { ispSeaLevel: 999 })).toThrow(TypeError);
    expect(() => Object.assign(V3_SUPER_HEAVY.engines[0]!, { gimballed: false })).toThrow(TypeError);
  });
});

describe('profile-dependent propulsion in SI', () => {
  it('matches nominal thrust and independently calculated flow at each anchor', () => {
    expect(engineThrust(V3_PROPULSION, 'sea-level', P0_KPA)).toBeCloseTo(250_000 * G0, 8);
    expect(engineThrust(V3_PROPULSION, 'vacuum', 0)).toBe(275_000 * G0);
    expect(engineMassFlow(V3_PROPULSION, 'sea-level')).toBeCloseTo(250_000 / 327, 10);
    expect(engineMassFlow(V3_PROPULSION, 'vacuum')).toBeCloseTo(275_000 / 380, 10);
    expect(engineThrust(V3_PROPULSION, 'sea-level', 0) / (engineMassFlow(V3_PROPULSION, 'sea-level') * G0)).toBeCloseTo(350, 10);
  });

  it('uses the derived SL pressure slope and the explicitly assumed RVac exit area', () => {
    const seaVacuum = (250_000 / 327) * G0 * 350;
    const slArea = (seaVacuum - 250_000 * G0) / 101_325;
    const rvacArea = Math.PI * (2.3 / 2) ** 2;
    expect(V3_PROPULSION.vacuum.effectiveExitArea).toBe(rvacArea);
    for (const pressure of [1, 20, 60, P0_KPA]) {
      expect(engineThrust(V3_PROPULSION, 'sea-level', pressure)).toBeCloseTo(seaVacuum - pressure * 1000 * slArea, 8);
      expect(engineThrust(V3_PROPULSION, 'vacuum', pressure)).toBeCloseTo(275_000 * G0 - pressure * 1000 * rvacArea, 8);
    }
  });

  it('dispatches a different profile rather than borrowing V3 constants', () => {
    const profile: PropulsionProfile = {
      standardGravity: G0, referencePressurePa: 100_000,
      seaLevel: { thrustSeaLevel: 1_000_000, ispSeaLevel: 300, ispVacuum: 330 },
      vacuum: { thrustVacuum: 2_000_000, ispVacuum: 400, effectiveExitArea: 2 },
    };
    expect(engineMassFlow(profile, 'sea-level')).toBe(1_000_000 / (300 * G0));
    expect(engineMassFlow(profile, 'vacuum')).toBe(2_000_000 / (400 * G0));
    expect(engineThrust(profile, 'sea-level', 100)).toBeCloseTo(1_000_000, 8);
    expect(engineThrust(profile, 'sea-level', 50)).toBeCloseTo(1_050_000, 8);
    expect(engineThrust(profile, 'vacuum', 50)).toBe(1_900_000);
  });

  it('clamps negative ambient pressure and exhausted thrust, while exposing NaN input', () => {
    for (const kind of ['sea-level', 'vacuum'] as const) {
      expect(engineThrust(V3_PROPULSION, kind, -1)).toBe(engineThrust(V3_PROPULSION, kind, 0));
      expect(engineThrust(V3_PROPULSION, kind, 1_000_000)).toBe(0);
      expect(engineThrust(V3_PROPULSION, kind, Number.NaN)).toBeNaN();
    }
  });
});
