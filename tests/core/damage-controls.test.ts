import { describe, expect, it } from 'vitest';
import { createDamageState, cloneDamageState } from '$core/damage-state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { steelSpecificEnthalpy } from '$core/physics/damage-material';
import { createDamageControlModel, createDamageControlForces, writeDamageControls }
  from '$core/physics/damage-controls';

describe('canonical delivered component control', () => {
  function fixture(ship = true) {
    const vehicle = ship ? SHIP : SUPER_HEAVY;
    const partition = createVehicleComponents(vehicle);
    const state = createDamageState(partition, 293.15);
    const model = createDamageControlModel(partition, vehicle);
    const out = createDamageControlForces(partition.components.length);
    return { vehicle, partition, state, model, out };
  }

  it('retains geometric plate area at zero load and never mutates forecast input', () => {
    const f = fixture();
    const before = cloneDamageState(f.state);
    writeDamageControls(f.state, f.model, 0, 1, .7, .4, f.out);
    expect(f.out.frontArea).toBeCloseTo(SHIP.frontFinArea * Math.sin(.7), 12);
    expect(f.out.aftArea).toBeCloseTo(SHIP.aftFinArea * Math.sin(.4), 12);
    expect(f.out.proofMask | f.out.domainMask).toBe(0);
    expect(f.state).toEqual(before);
  });

  it('unloads progressively as steel softens and uses incidence in root demand', () => {
    const f = fixture();
    writeDamageControls(f.state, f.model, 10000, 1, 1, 1, f.out);
    const cold = f.out.frontArea;
    for (const [i, p] of f.partition.components.entries()) if (p.rootMass > 0) {
      const node = f.state.components[i]!.root;
      node.temperature = 973.15;
      node.energy = p.rootMass * steelSpecificEnthalpy(node.temperature);
    }
    writeDamageControls(f.state, f.model, 10000, 1, 1, 1, f.out);
    expect(f.out.frontArea).toBeLessThan(cold);
    expect(f.out.frontArea).toBeGreaterThan(0);
    writeDamageControls(f.state, f.model, 10000, 0, 1, 1, f.out);
    expect(f.out.frontArea).toBeCloseTo(SHIP.frontFinArea * Math.sin(1), 12);
    expect(f.out.proofMask).toBe(0);
  });

  it('loses exactly one component contribution, separating proof and domain reasons', () => {
    const f = fixture();
    const i = f.partition.components.findIndex(p => p.id === 'ship-front-flap-left');
    f.state.components[i]!.attached = false;
    writeDamageControls(f.state, f.model, 0, 1, .7, .4, f.out);
    expect(f.out.frontArea).toBeCloseTo(SHIP.frontFinArea / 2 * Math.sin(.7), 12);
    f.state.components[i]!.attached = true;
    f.state.components[i]!.root.valid = false;
    writeDamageControls(f.state, f.model, 0, 1, .7, .4, f.out);
    expect(f.out.domainMask).toBe(1 << i);
    expect(f.out.proofMask).toBe(0);
    expect(f.out.frontArea).toBeCloseTo(SHIP.frontFinArea / 2 * Math.sin(.7), 12);
  });

  it('sums grid lift and drag by delivered angle, preserving odd/even symmetry', () => {
    const f = fixture(false);
    writeDamageControls(f.state, f.model, 0, 1, .3, 0, f.out);
    expect(f.out.gridLiftArea).toBeCloseTo(27 * Math.sin(.6), 12);
    expect(f.out.gridDragArea).toBeCloseTo(27 * 1.2 * Math.sin(.3) ** 2, 12);
    const lift = f.out.gridLiftArea, drag = f.out.gridDragArea;
    writeDamageControls(f.state, f.model, 0, 1, -.3, 0, f.out);
    expect(f.out.gridLiftArea).toBe(-lift);
    expect(f.out.gridDragArea).toBe(drag);
  });

  it('marks proof overload before contributing unavailable force, with a finite angle', () => {
    const f = fixture(false);
    writeDamageControls(f.state, f.model, 1e7, 1, Math.PI / 4, 0, f.out);
    expect(f.out.proofMask).not.toBe(0);
    expect(f.out.domainMask).toBe(0);
    expect(f.out.gridLiftArea).toBe(0);
    expect(f.out.loadedAngles.every(Number.isFinite)).toBe(true);
  });
});
