import { describe, expect, it } from 'vitest';
import { createDamageState, cloneDamageState, type DamageThermalNode } from '$core/damage-state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { createDamageThermalModel, advanceDamageHeat, HULL_THERMAL_DOMAIN_BIT, DAMAGE_THERMAL_EMISSIVITY }
  from '$core/physics/damage-thermal';
import { steelSpecificEnthalpy, steelConductivity } from '$core/physics/damage-material';
import { tpsSpecificEnthalpy, tpsConductivity, tpsMeanConductivity, TPS_CP_MAX_K } from '$core/physics/tps-material';
import { STEFAN_BOLTZMANN } from '$core/constants';

function fixture(ship = true) {
  const partition = createVehicleComponents(ship ? SHIP : SUPER_HEAVY);
  const model = createDamageThermalModel(partition);
  const state = createDamageState(partition, 293.15);
  return { partition, model, state };
}

function setTemperature(node: DamageThermalNode, mass: number, temperature: number, silica = false) {
  node.temperature = temperature;
  node.energy = mass * (silica ? tpsSpecificEnthalpy(temperature) : steelSpecificEnthalpy(temperature));
}

function energyDifference(before: ReturnType<typeof createDamageState>, after: ReturnType<typeof createDamageState>): number {
  return after.hull.energy - before.hull.energy + after.components.reduce((sum, component, index) => {
    const old = before.components[index]!;
    return sum + (component.root.energy - old.root.energy)
      + (component.tps[0].energy - old.tps[0].energy) + (component.tps[1].energy - old.tps[1].energy);
  }, 0);
}

function isolateFirstColumn(f: ReturnType<typeof fixture>) {
  const index = f.partition.components.findIndex(component => component.rootMass > 0);
  for (let component = 0; component < f.state.components.length; component++) {
    if (component !== index) f.state.components[component]!.attached = false;
  }
  return index;
}

describe('finite thermal network numerical contract', () => {
  it('derives the frozen bound from the whole simultaneous network', () => {
    const ship = fixture();
    const booster = fixture(false);
    expect(ship.model.safeStep).toBeCloseTo(.40351634762469524, 10);
    expect(booster.model.safeStep).toBeCloseTo(.556057375011685, 10);
    expect(DAMAGE_THERMAL_EMISSIVITY).toBe(.8);
    expect(ship.model.safeStep).toBeGreaterThan(48 / 120);
    expect(ship.model.hullMass).toBe(ship.partition.hullThermalMass);
  });

  it('keeps an unforced equilibrium unchanged and skips absent subparts', () => {
    const { state, model } = fixture();
    const before = cloneDamageState(state);
    expect(advanceDamageHeat(state, model, 1 / 120, 0, 293.15, 101325)).toBe(0);
    expect(state).toEqual(before);
  });

  it('conserves summed energy minus independently calculated radiation plus absorbed energy', () => {
    const f = fixture();
    const index = isolateFirstColumn(f);
    const component = f.state.components[index]!;
    const physical = f.partition.components[index]!;
    setTemperature(component.tps[0], physical.tpsMass / 2, 700, true);
    setTemperature(component.tps[1], physical.tpsMass / 2, 500, true);
    setTemperature(component.root, physical.rootMass, 600);
    // Keep the massive hull at its enthalpy reference. Subtract node energies
    // before summing: a30-billion-J hot hull baseline obscured a30J transfer.
    const before = cloneDamageState(f.state);
    const dt = 1 / 120, flux = 20000, sink = 293.15;
    const expected = dt * f.partition.rootSection.heatArea
      * (flux - .8 * STEFAN_BOLTZMANN * (700 ** 4 - sink ** 4));
    // Positive absorbed flux adds a radiative-equilibrium boundary above the
    // initial maximum; an unforced maximum-principle bound does not apply.
    const radiativeEquilibrium = (flux / (.8 * STEFAN_BOLTZMANN) + sink ** 4) ** .25;
    const maximum = Math.max(700, radiativeEquilibrium);
    expect(advanceDamageHeat(f.state, f.model, dt, flux, sink, 1000)).toBe(0);
    expect(energyDifference(before, f.state)).toBeCloseTo(expected, 6);
    for (const node of [component.root, ...component.tps, f.state.hull]) {
      expect(node.temperature).toBeGreaterThanOrEqual(293.15);
      expect(node.temperature).toBeLessThanOrEqual(maximum);
    }
  });

  it('transfers to a finite hull using its old temperature and equal opposite joules', () => {
    const f = fixture(false);
    const index = isolateFirstColumn(f);
    const component = f.state.components[index]!;
    const section = f.partition.rootSection;
    setTemperature(component.root, section.mass, 600);
    const dt = 1 / 120, sink = 293.15;
    const flux = .8 * STEFAN_BOLTZMANN * (600 ** 4 - sink ** 4);
    const expectedHull = dt * (steelConductivity(600) + steelConductivity(sink)) / 2
      * section.area / (section.length / 2) * (600 - sink);
    const initialRoot = component.root.energy;
    expect(advanceDamageHeat(f.state, f.model, dt, flux, sink, 1000)).toBe(0);
    expect(f.state.hull.energy).toBeCloseTo(expectedHull, 10);
    expect(initialRoot - component.root.energy).toBeCloseTo(expectedHull, 7);
    expect(f.state.hull.temperature).toBeGreaterThan(sink);
    expect(component.root.temperature).toBeLessThan(600);
  });

  it('uses separate cell-centre half paths in the authored collector topology', () => {
    const f = fixture();
    const index = isolateFirstColumn(f);
    const component = f.state.components[index]!;
    const physical = f.partition.components[index]!;
    const section = f.partition.rootSection;
    setTemperature(component.tps[0], physical.tpsMass / 2, 600, true);
    setTemperature(component.tps[1], physical.tpsMass / 2, 600, true);
    setTemperature(component.root, physical.rootMass, 800);
    const before = cloneDamageState(f.state);
    const dt = 1 / 120, sink = 293.15, pressure = 1000;
    // Beam facesx0 andxL; its single thermal cellcentrexL/2. Different
    // material interface uses OWNnode conductivity, not the other nodeT.
    const rootCentre = section.length / 2;
    const innerTPSCentreToFace = .0254 / 4;
    const interfaceQ = dt * (600 - 800)
      / (innerTPSCentreToFace / (tpsConductivity(600, pressure) * section.heatArea)
        + (section.length - rootCentre) / (steelConductivity(800) * section.area));
    const hullQ = dt * (steelConductivity(800) + steelConductivity(sink)) / 2
      * section.area / rootCentre * (800 - sink);
    const flux = .8 * STEFAN_BOLTZMANN * (600 ** 4 - sink ** 4);
    expect(advanceDamageHeat(f.state, f.model, dt, flux, sink, pressure)).toBe(0);
    expect(component.tps[1].energy - before.components[index]!.tps[1].energy)
      .toBeCloseTo(-interfaceQ, 8);
    expect(component.root.energy - before.components[index]!.root.energy)
      .toBeCloseTo(interfaceQ - hullQ, 7);
    expect(f.state.hull.energy - before.hull.energy).toBeCloseTo(hullQ, 10);
    expect(energyDifference(before, f.state)).toBeCloseTo(0, 6);
  });

  it('leaves detached columns and their parent-hull links inactive', () => {
    const f = fixture();
    for (const component of f.state.components) component.attached = false;
    const before = cloneDamageState(f.state);
    expect(advanceDamageHeat(f.state, f.model, 1 / 120, 200000, 186.95, 1000)).toBe(0);
    expect(f.state).toEqual(before);
  });

  it('finite silica storage insulates the root under the same exposure', () => {
    const ship = fixture(), booster = fixture(false);
    const shipIndex = isolateFirstColumn(ship), boosterIndex = isolateFirstColumn(booster);
    for (let step = 0; step < 120; step++) {
      expect(advanceDamageHeat(ship.state, ship.model, 1 / 120, 50000, 293.15, 1000)).toBe(0);
      expect(advanceDamageHeat(booster.state, booster.model, 1 / 120, 50000, 293.15, 1000)).toBe(0);
    }
    const protectedRise = ship.state.components[shipIndex]!.root.temperature - 293.15;
    const exposedRise = booster.state.components[boosterIndex]!.root.temperature - 293.15;
    expect(protectedRise).toBeGreaterThan(0);
    expect(exposedRise).toBeGreaterThan(protectedRise * 10);
    expect(ship.state.components[shipIndex]!.tps[0].temperature)
      .toBeGreaterThan(ship.state.components[shipIndex]!.tps[1].temperature);
  });

  it('shows first-order temperature convergence without fitting a heating rate', () => {
    function run(dt: number): number {
      const f = fixture();
      const index = isolateFirstColumn(f);
      for (let step = 0; step < Math.round(1 / dt); step++) {
        expect(advanceDamageHeat(f.state, f.model, dt, 50000, 293.15, 1000)).toBe(0);
      }
      return f.state.components[index]!.tps[0].temperature;
    }
    const coarse = run(1 / 15), medium = run(1 / 30), fine = run(1 / 60);
    const ratio = Math.abs(coarse - medium) / Math.abs(medium - fine);
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });

  it('subdivides a supported larger call equivalently to explicit caller steps', () => {
    const f = fixture();
    isolateFirstColumn(f);
    const direct = cloneDamageState(f.state);
    const dt = f.model.safeStep * 2.5;
    expect(advanceDamageHeat(f.state, f.model, dt, 1000, 293.15, 1000)).toBe(0);
    for (let step = 0; step < 3; step++) {
      expect(advanceDamageHeat(direct, f.model, dt / 3, 1000, 293.15, 1000)).toBe(0);
    }
    expect(f.state).toEqual(direct);
  });

  it('retains candidate joules and last valid temperature on a per-material domain exit', () => {
    const f = fixture();
    const index = isolateFirstColumn(f);
    const component = f.state.components[index]!;
    const cellMass = f.partition.components[index]!.tpsMass / 2;
    setTemperature(component.tps[0], cellMass, 1900, true);
    const before = component.tps[0].energy;
    const dt = 1 / 120, flux = 1e8, sink = 293.15, pressure = 1000;
    const section = f.partition.rootSection;
    const interiorQ = dt * tpsMeanConductivity(1900, 293.15, pressure)
      * section.heatArea / .0127 * (1900 - 293.15);
    const externalQ = dt * section.heatArea
      * (flux - .8 * STEFAN_BOLTZMANN * (1900 ** 4 - sink ** 4));
    expect(advanceDamageHeat(f.state, f.model, dt, flux, sink, pressure)).toBe(1 << index);
    expect(component.tps[0].valid).toBe(false);
    expect(component.tps[0].temperature).toBe(1900);
    expect(component.tps[0].energy).toBeCloseTo(before + externalQ - interiorQ, 7);
    expect(component.tps[0].energy).toBeGreaterThan(cellMass * tpsSpecificEnthalpy(TPS_CP_MAX_K));
    const after = cloneDamageState(f.state);
    expect(advanceDamageHeat(f.state, f.model, dt, flux, sink, pressure)).toBe(1 << index);
    expect(f.state).toEqual(after);
  });

  it('reports invalid hull state without inventing a temperature or advancing', () => {
    const f = fixture();
    f.state.hull.valid = false;
    const before = cloneDamageState(f.state);
    expect(advanceDamageHeat(f.state, f.model, 1 / 120, 0, 293.15, 1000))
      .toBe(HULL_THERMAL_DOMAIN_BIT);
    expect(f.state).toEqual(before);
  });

  it('rejects unsupported numerical steps and bad forcing before mutation', () => {
    const f = fixture();
    const before = cloneDamageState(f.state);
    expect(() => advanceDamageHeat(f.state, f.model, f.model.safeStep * 8.01, 0, 293.15, 1000))
      .toThrow(RangeError);
    expect(() => advanceDamageHeat(f.state, f.model, 1 / 120, -1, 293.15, 1000)).toThrow(RangeError);
    expect(() => advanceDamageHeat(f.state, f.model, 1 / 120, 0, NaN, 1000)).toThrow(RangeError);
    expect(() => advanceDamageHeat(f.state, f.model, 1 / 120, 0, 293.15, 101331)).toThrow(RangeError);
    expect(f.state).toEqual(before);
  });
});
