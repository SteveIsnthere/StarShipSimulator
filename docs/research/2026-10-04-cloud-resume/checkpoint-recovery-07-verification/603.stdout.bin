import { describe, expect, it } from 'vitest';
import { createInitialState, cloneState } from '$core/state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { damageModelFor } from '$core/physics/damage-model';
import { steelSpecificEnthalpy } from '$core/physics/damage-material';
import { ComponentFailure } from '$core/damage-state';
import { rad } from '$core/units';
import { advanceFlightDamage } from '$core/physics/damage-flight';

function fixture() {
  const s = createInitialState(123, SUPER_HEAVY);
  s.kinematics.altitude = 35000;
  s.kinematics.downRangeDistance = 100;
  s.kinematics.pitch = rad(.4);
  s.kinematics.angularVelocity = .2;
  s.kinematics.speedX = 10;
  s.kinematics.speedY = -100;
  s.vehicle.frontFinExtension = 100;
  s.forces.dynamicPressure = 38;
  s.forces.thermalPower = 0;
  s.atmosphere.airTemperature = -36.637;
  s.atmosphere.airPressure = .56;
  return s;
}

describe('atomic endpoint damage ownership', () => {
  it('uses the updated root temperature for proof and permanently transfers only failing hardware', () => {
    const s = fixture();
    const model = damageModelFor(SUPER_HEAVY);
    const index = model.partition.components.findIndex(c => c.kind === 'grid-fin');
    const component = s.damage!.components[index]!;
    // Injected unit boundary; the separate natural-exposure witness is required.
    component.root.temperature = 973.15;
    component.root.energy = model.partition.components[index]!.rootMass * steelSpecificEnthalpy(973.15);
    const incoming = cloneState(s);
    const mask = advanceFlightDamage(s, 1 / 120, SUPER_HEAVY, 'hull');
    expect(mask).toBe(1 << index);
    expect(component.permanentFailure).toBe(ComponentFailure.ProofExceeded);
    expect(component.attached).toBe(false);
    expect(s.damage!.debris[index]!.active).toBe(true);
    expect(s.damage!.revision).toBe(1);
    // A hull reference is a fixed material point and cannot jump on loss.
    expect(s.kinematics).toEqual(incoming.kinematics);
    expect(s.vehicle.vehicleMass).toBeCloseTo(SUPER_HEAVY.dryMass + s.vehicle.propellantMass - model.partition.components[index]!.mass, 7);
    const debris = { ...s.damage!.debris[index]! };
    const energy = component.root.energy;
    expect(advanceFlightDamage(s, 1 / 120, SUPER_HEAVY, 'hull')).toBe(0);
    expect(component.root.energy).toBe(energy); // no parent conduction after loss
    expect(s.damage!.debris[index]).toEqual(debris);
    expect(s.damage!.revision).toBe(1);
  });

  it('uses a distinct domain disposition and never fabricates strength from last-valid temperature', () => {
    const s = fixture();
    const index = damageModelFor(SUPER_HEAVY).partition.components.findIndex(c => c.kind === 'grid-fin');
    s.damage!.components[index]!.root.valid = false;
    s.damage!.components[index]!.root.energy = 1e12;
    expect(advanceFlightDamage(s, 1 / 120, SUPER_HEAVY, 'hull')).toBe(1 << index);
    expect(s.damage!.components[index]!.permanentFailure).toBe(ComponentFailure.MaterialDomain);
    expect(s.damage!.components[index]!.root.energy).toBe(1e12);
  });
});
