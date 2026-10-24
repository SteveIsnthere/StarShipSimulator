import { describe, expect, it } from 'vitest';
import { SHIP, OXIDISER_SHARE } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { createDamageState, ComponentFailure } from '$core/damage-state';
import { centreOfMass, momentOfInertia } from '$core/physics/mass';
import { createDamageMassProperties, writeDamageMass } from '$core/physics/damage-mass';

describe('retained component mass and capability', () => {
  it.each([SHIP, SUPER_HEAVY])('preserves intact analytic mass properties exactly ($id)', model => {
    const partition = createVehicleComponents(model), state = createDamageState(partition, 250);
    const out = createDamageMassProperties();
    for (const fraction of [0, .01, .25, .5, 1]) {
      const propellant = fraction * model.propellantCapacity;
      writeDamageMass(state, partition, propellant, model, out);
      expect(out.hasMass).toBe(true);
      expect(out.retainedDryMass).toBe(model.dryMass);
      expect(out.totalMass).toBe(model.dryMass + propellant);
      expect(out.centreOfMassX).toBe(0);
      expect(out.centreOfMass).toBe(centreOfMass(propellant, model));
      expect(out.momentOfInertia).toBe(momentOfInertia(propellant, model));
    }
  });

  it.each([SHIP, SUPER_HEAVY])('accounts for asymmetric loss using both centroid coordinates ($id)', model => {
    const partition = createVehicleComponents(model), state = createDamageState(partition, 250);
    const lost = partition.components.findIndex(c => c.rootMass > 0 && c.x > 0);
    expect(lost).toBeGreaterThanOrEqual(0);
    state.components[lost]!.attached = false;
    state.debris[lost]!.active = true;
    const before = structuredClone(state);
    const fuel = .25 * model.propellantCapacity;
    const fraction = fuel / model.propellantCapacity;
    const lox = fuel * OXIDISER_SHARE, methane = fuel * (1 - OXIDISER_SHARE);
    const columns = [
      { mass: lox, x: 0, station: model.tankBottom + fraction * model.loxTankHeight / 2,
        inertia: lox * ((model.diameter / 2) ** 2 / 4 + (fraction * model.loxTankHeight) ** 2 / 12) },
      { mass: methane, x: 0, station: model.ch4TankBottom + fraction * model.ch4TankHeight / 2,
        inertia: methane * ((model.diameter / 2) ** 2 / 4 + (fraction * model.ch4TankHeight) ** 2 / 12) },
    ];
    const retained = partition.components.filter((_, i) => i !== lost);
    const bodies = [...retained, ...columns];
    const total = bodies.reduce((sum, c) => sum + c.mass, 0);
    const x = bodies.reduce((sum, c) => sum + c.mass * c.x, 0) / total;
    const station = bodies.reduce((sum, c) => sum + c.mass * c.station, 0) / total;
    const inertia = bodies.reduce((sum, c) => sum + c.inertia
      + c.mass * ((c.x - x) ** 2 + (c.station - station) ** 2), 0);
    const out = createDamageMassProperties();
    writeDamageMass(state, partition, fuel, model, out);
    expect(out.totalMass).toBeCloseTo(total, 8);
    expect(out.centreOfMassX).toBeLessThan(0);
    expect(out.centreOfMassX).toBeCloseTo(x, 12);
    expect(out.centreOfMass).toBeCloseTo(station, 12);
    expect(Math.abs(out.momentOfInertia - inertia)).toBeLessThan(16 * Number.EPSILON * inertia);
    expect(out.retainedDryMass + partition.components[lost]!.mass).toBeCloseTo(model.dryMass, 8);
    expect(state).toEqual(before);
    state.debris[lost]!.active = false;
    writeDamageMass(state, partition, fuel, model, out);
    expect(out.totalMass).toBeCloseTo(total, 8);
  });

  it.each([SHIP, SUPER_HEAVY])('removes only the lost reference area and support availability ($id)', model => {
    const partition = createVehicleComponents(model), state = createDamageState(partition, 250);
    const out = createDamageMassProperties();
    writeDamageMass(state, partition, 0, model, out);
    expect(out.engineSupportAvailable).toBe(true);
    expect(out.frontFinArea).toBe(model.frontFinArea);
    expect(out.aftFinArea).toBe(model.aftFinArea);
    expect(out.gridFinArea).toBe(model.gridFins?.area ?? 0);
    const appendage = partition.components.findIndex(c => c.kind === (model.id === 'ship' ? 'flap' : 'grid-fin'));
    state.components[appendage]!.attached = false;
    const support = partition.components.findIndex(c => c.kind === 'engine-support');
    state.components[support]!.permanentFailure = ComponentFailure.ProofExceeded;
    writeDamageMass(state, partition, 0, model, out);
    expect(out.engineSupportAvailable).toBe(false);
    if (model.id === 'ship') {
      expect(out.frontFinCount).toBe(1);
      expect(out.frontFinArea).toBe(model.frontFinArea / 2);
      expect(out.aftFinCount).toBe(2);
    } else {
      expect(out.gridFinCount).toBe(2);
      expect(out.gridFinArea).toBe(model.gridFins!.area * 2 / 3);
    }
    // Support failure alone does not fabricate a detached mass owner.
    expect(out.retainedDryMass).toBeCloseTo(model.dryMass - partition.components[appendage]!.mass, 8);
  });

  it('handles empty ownership without stale scratch or NaN and retains unreleased fuel', () => {
    const partition = createVehicleComponents(SHIP), state = createDamageState(partition, 250);
    const out = createDamageMassProperties();
    writeDamageMass(state, partition, 500, SHIP, out);
    state.components.forEach(c => { c.attached = false; });
    writeDamageMass(state, partition, 500, SHIP, out);
    expect(out.retainedDryMass).toBe(0);
    expect(out.totalMass).toBe(500);
    expect(out.hasMass).toBe(true);
    writeDamageMass(state, partition, 0, SHIP, out);
    expect(out.hasMass).toBe(false);
    for (const value of Object.values(out)) if (typeof value === 'number') expect(value).toBe(0);
    expect(out.engineSupportAvailable).toBe(false);
  });

  it('rejects mismatched inventories and invalid propellant', () => {
    const partition = createVehicleComponents(SHIP), state = createDamageState(partition, 250);
    const out = createDamageMassProperties();
    expect(() => writeDamageMass(state, partition, Number.NaN, SHIP, out)).toThrow(RangeError);
    expect(() => writeDamageMass(state, partition, 0, SUPER_HEAVY, out)).toThrow(RangeError);
    state.components.pop();
    expect(() => writeDamageMass(state, partition, 0, SHIP, out)).toThrow(RangeError);
  });
});
