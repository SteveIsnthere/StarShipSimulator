import { describe, expect, it } from 'vitest';
import { createInitialState, cloneState } from '$core/state';
import { createScenarioState, createScenarioVehicle, PRESETS } from '$core/scenarios';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { isaAtmosphere } from '$core/physics/isa';
import { radiativeSinkKelvin } from '$core/physics/thermal';

describe('live damage state ownership and restart', () => {
  it('constructs the selected physical inventory at the actual ambient sink', () => {
    for (const model of [SHIP, SUPER_HEAVY]) {
      const s = createInitialState(123, model);
      const ambient = radiativeSinkKelvin(s.kinematics.altitude,
        isaAtmosphere(s.kinematics.altitude).airTemperature);
      expect(s.damage).toBeDefined();
      expect(s.damage!.components).toHaveLength(model.id === 'ship' ? 8 : 7);
      expect(s.damage!.hull.temperature).toBe(ambient);
      expect(s.damage!.components.every(c => c.attached)).toBe(true);
      expect(s.damage!.terminal.active).toBe(false);
    }
  });

  it('initializes each scenario at its altitude instead of inheriting pad heat', () => {
    for (const preset of PRESETS) {
      const { state: s } = createScenarioVehicle(preset, 123);
      const sink = radiativeSinkKelvin(s.kinematics.altitude,
        isaAtmosphere(s.kinematics.altitude).airTemperature);
      expect(s.damage!.hull.temperature, preset.id).toBe(sink);
      for (const c of s.damage!.components) if (c.root.temperature !== 0)
        expect(c.root.temperature, preset.id).toBe(sink);
    }
  });

  it('deep clones every mutable damage branch and restarts pristine', () => {
    const preset = PRESETS.find(p => p.id === 'landing-burn')!;
    const s = createScenarioState(preset, 123);
    const copy = cloneState(s);
    expect(copy.damage).toEqual(s.damage);
    expect(copy.damage).not.toBe(s.damage);
    copy.damage!.components[2]!.attached = false;
    copy.damage!.components[2]!.root.energy += 100;
    copy.damage!.components[2]!.tps[0].energy += 100;
    copy.damage!.debris[2]!.active = true;
    copy.damage!.terminal.active = true;
    copy.damage!.hull.energy += 100;
    expect(s).toEqual(createScenarioState(preset, 123));
    expect(s.rng).toEqual(copy.rng);
  });
});
