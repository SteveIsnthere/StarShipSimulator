import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { createRootSection } from '$core/physics/damage-root';
import { createVehicleGeometry } from '$view/vehicle-geometry';
import { HISTORICAL_SHIP } from '../reference/historical-vehicles';

describe('positive intact component partition', () => {
  it.each([SHIP, SUPER_HEAVY, HISTORICAL_SHIP])('preserves all intact dry moments ($id, $height m)', model => {
    const partition = createVehicleComponents(model);
    const components = partition.components;
    const mass = components.reduce((sum, c) => sum + c.mass, 0);
    const first = components.reduce((sum, c) => sum + c.mass * c.station, 0);
    const lateral = components.reduce((sum, c) => sum + c.mass * c.x, 0);
    const inertia = components.reduce((sum, c) => sum + c.inertia
      + c.mass * (c.x ** 2 + (c.station - model.dryCentreOfMass) ** 2), 0);
    const expected = model.dryMass * ((model.diameter / 2) ** 2 / 4 + model.height ** 2 / 12);
    expect(Math.abs(mass - model.dryMass)).toBeLessThan(1e-8);
    expect(Math.abs(first - model.dryMass * model.dryCentreOfMass)).toBeLessThan(1e-7);
    expect(Math.abs(lateral)).toBeLessThan(1e-8);
    expect(Math.abs(inertia - expected)).toBeLessThan(16 * Number.EPSILON * expected);
    for (const c of components) {
      expect(c.mass).toBeGreaterThan(0);
      expect(c.inertia).toBeGreaterThan(0);
      expect(c.station).toBeGreaterThanOrEqual(0);
      expect(c.station).toBeLessThanOrEqual(model.height);
      expect(c.mass).toBeGreaterThanOrEqual(c.rootMass + c.tpsMass);
    }
  });

  it.each([SHIP, SUPER_HEAVY])('uses the actual renderer component identities ($id)', model => {
    const geometry = createVehicleGeometry({ ...model, ...(model.gridFins ? { gridFinStation: model.gridFins.station } : {}) });
    expect(createVehicleComponents(model).components.map(c => c.id).sort())
      .toEqual(geometry.components.map(c => c.id).sort());
    expect(geometry.components).toHaveLength(model.id === 'ship' ? 8 : 7);
  });

  it.each([SHIP, SUPER_HEAVY])('partitions root/TPS thermal mass without adding it ($id)', model => {
    const partition = createVehicleComponents(model);
    const roots = partition.components.filter(c => c.rootMass > 0);
    expect(roots).toHaveLength(model.id === 'ship' ? 4 : 3);
    const root = createRootSection(model.diameter);
    for (const c of roots) {
      expect(c.rootMass).toBe(root.mass);
      expect(c.tpsMass).toBe(model.id === 'ship' ? 144 * root.heatArea * .0254 : 0);
    }
    const hull = partition.components.filter(c => c.kind === 'hull');
    expect(partition.hullThermalMass).toBe(hull.reduce((sum, c) => sum + c.mass, 0));
    expect(partition.hullThermalMass).toBeGreaterThan(0);
    expect(partition.hullThermalMass + roots.reduce((sum, c) => sum + c.rootMass + c.tpsMass, 0))
      .toBeLessThan(model.dryMass);
  });

  it('owns a deeply immutable startup catalogue', () => {
    const check = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(check);
    };
    check(createVehicleComponents(SHIP));
  });

  it('rejects impossible residuals instead of assigning negative mass or inertia', () => {
    expect(() => createVehicleComponents({ ...SHIP, dryMass: 100 })).toThrow(RangeError);
    expect(() => createVehicleComponents({ ...SHIP, dryCentreOfMass: 0 })).toThrow(RangeError);
    expect(() => createVehicleComponents({ ...SHIP, height: Number.NaN })).toThrow(RangeError);
  });
});
