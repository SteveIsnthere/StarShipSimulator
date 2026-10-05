import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { steelSpecificEnthalpy, MATERIAL_MIN_K, MATERIAL_MAX_K } from '$core/physics/damage-material';
import { tpsSpecificEnthalpy, TPS_K_MIN_K } from '$core/physics/tps-material';
import { createDamageState, cloneDamageState, ComponentFailure, MAX_DAMAGE_COMPONENTS } from '$core/damage-state';

describe('bounded standalone damage state', () => {
  it.each([SHIP, SUPER_HEAVY])('starts attached at actual ambient energy ($id)', model => {
    const partition = createVehicleComponents(model), ambient = 220;
    const state = createDamageState(partition, ambient);
    expect('partition' in state).toBe(false);
    expect(state.components).toHaveLength(partition.components.length);
    expect(state.debris).toHaveLength(partition.components.length);
    expect(state.components.length).toBeLessThanOrEqual(MAX_DAMAGE_COMPONENTS);
    expect(state.revision).toBe(0);
    expect(state.eventCount).toBe(0);
    expect(state.hull.temperature).toBe(ambient);
    expect(state.hull.valid).toBe(true);
    expect(state.hull.energy).toBe(partition.hullThermalMass * steelSpecificEnthalpy(ambient));
    state.components.forEach((c, index) => {
      const definition = partition.components[index]!;
      expect(c.componentIndex).toBe(index);
      expect(c.attached).toBe(true);
      expect(c.permanentFailure).toBe(ComponentFailure.None);
      expect(c.loadedAngle).toBe(0);
      expect(c.root.valid).toBe(true);
      expect(c.root.temperature).toBe(definition.rootMass > 0 ? ambient : 0);
      expect(c.root.energy).toBe(definition.rootMass > 0 ? definition.rootMass * steelSpecificEnthalpy(ambient) : 0);
      expect(c.tps).toHaveLength(2);
      for (const cell of c.tps) {
        expect(cell.valid).toBe(true);
        expect(cell.temperature).toBe(definition.tpsMass > 0 ? ambient : 0);
        expect(cell.energy).toBe(definition.tpsMass > 0 ? definition.tpsMass / 2 * tpsSpecificEnthalpy(ambient) : 0);
      }
    });
    state.debris.forEach((slot, index) => {
      expect(slot.componentIndex).toBe(index);
      expect(slot.active).toBe(false);
      for (const [key, value] of Object.entries(slot)) {
        if (key !== 'componentIndex' && key !== 'active') expect(value).toBe(0);
      }
      expect('mass' in slot).toBe(false);
    });
    expect(state.terminal.active).toBe(false);
    for (const [key, value] of Object.entries(state.terminal)) if (key !== 'active') expect(value).toBe(0);
  });

  it('clones every mutable descendant without embedding the immutable catalogue', () => {
    const state = createDamageState(createVehicleComponents(SHIP), 250);
    const copy = cloneDamageState(state);
    expect(copy).toEqual(state);
    expect('partition' in copy).toBe(false);
    const before = structuredClone(state);
    const mutate = (source: unknown, cloned: unknown): void => {
      if (source === null || typeof source !== 'object') return;
      expect(cloned).not.toBe(source);
      const original = source as Record<string, unknown>;
      const target = cloned as Record<string, unknown>;
      for (const key of Object.keys(original)) {
        const value = original[key];
        if (typeof value === 'number') target[key] = value + 1;
        else if (typeof value === 'boolean') target[key] = !value;
        else mutate(value, target[key]);
      }
    };
    mutate(state, copy);
    expect(state).toEqual(before);
    expect(copy).not.toEqual(state);
  });

  it('accepts cold steel without a room-temperature floor and checks TPS separately', () => {
    const booster = createVehicleComponents(SUPER_HEAVY);
    expect(createDamageState(booster, MATERIAL_MIN_K).hull.temperature).toBe(MATERIAL_MIN_K);
    expect(createDamageState(booster, MATERIAL_MAX_K).hull.temperature).toBe(MATERIAL_MAX_K);
    const ship = createVehicleComponents(SHIP);
    expect(() => createDamageState(ship, TPS_K_MIN_K - .01)).toThrow(RangeError);
    expect(createDamageState(ship, TPS_K_MIN_K).hull.temperature).toBe(TPS_K_MIN_K);
  });

  it('clones an invalid thermal node without clipping its retained energy or inventing temperature', () => {
    const state = createDamageState(createVehicleComponents(SHIP), 250);
    state.hull.valid = false;
    state.hull.energy = 1e15;
    const copy = cloneDamageState(state);
    expect(copy.hull).toEqual({ valid: false, temperature: 250, energy: 1e15 });
    expect(copy.hull).not.toBe(state.hull);
  });

  it('rejects invalid ambient temperatures and oversized component inventories', () => {
    const partition = createVehicleComponents(SUPER_HEAVY);
    for (const ambient of [Number.NaN, Infinity, MATERIAL_MIN_K - .01, MATERIAL_MAX_K + .01])
      expect(() => createDamageState(partition, ambient)).toThrow(RangeError);
    const oversized = { ...partition, components: Array.from({ length: 13 }, () => partition.components[0]!) };
    expect(() => createDamageState(oversized, 250)).toThrow(RangeError);
    expect(() => createDamageState({ ...partition, components: [] }, 250)).toThrow(RangeError);
  });
});
