/** Active defaults are a Fidelity selection, separately witnessed from the
 * preserved historical refactor cohort. No R2 expected values are replaced. */
import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { createInitialState } from '$core/state';
import { createMassProperties, writeMassProperties } from '$core/physics/mass';
import { getTotalMaxThrust, getFuelFlowRate } from '$core/physics/engines';

describe('active V3 default dispatch', () => {
  it('constructs the selected52m Ship and owns its new damage state', () => {
    const implicit = createInitialState(123);
    const explicit = createInitialState(123, SHIP);
    expect(implicit).toEqual(explicit);
    expect(implicit.kinematics.altitude).toBe(26);
    expect(implicit.damage).not.toBeNull();
    expect(implicit.damage).not.toBe(explicit.damage);
    expect(implicit.vehicle.vehicleMass).toBe(SHIP.dryMass + SHIP.initialPropellant);
  });

  it('routes allocator and in-place default mass queries to V3 geometry', () => {
    for (const fuel of [0, 350000, 1600000]) {
      const actual = createMassProperties(fuel);
      expect(actual).toEqual(createMassProperties(fuel, SHIP));
      const written = createMassProperties();
      writeMassProperties(fuel, written);
      expect(written).toEqual(actual);
    }
    const independentEmptyInertia = 120000 * ((9/2)**2/4 + 52**2/12);
    expect(createMassProperties(0).momentOfInertia).toBe(independentEmptyInertia);
  });

  it('routes default sea-level thrust and paid flow to the250tf source anchor', () => {
    const running = [true, false, false, false, false, false];
    expect(getTotalMaxThrust(running,101.325)).toBe(250000*9.80665);
    const sourceFlow=250000/327;
    // Cancelling g0 analytically changes multiplication/division rounding by
    // one local-value ULP; this is a source-unit conversion bound.
    const oneUlp=2**(Math.floor(Math.log2(sourceFlow))-52);
    expect(Math.abs(getFuelFlowRate(running,100)-sourceFlow)).toBeLessThanOrEqual(oneUlp);
    expect(getTotalMaxThrust(running,101.325)).toBe(getTotalMaxThrust(running,101.325,SHIP));
    expect(getFuelFlowRate(running,100)).toBe(getFuelFlowRate(running,100,SHIP));
  });
});
