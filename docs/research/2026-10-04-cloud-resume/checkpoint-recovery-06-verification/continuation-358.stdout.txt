/** Fixed source-flow material exposure, not an integrated vehicle trajectory.
 * Predeclared35km,3000m/s,nose-on,45°grid command; no sweep, changed geometry,
 * initial hot/damaged hardware, arbitrary wear rate or outcome-selected time.
 */
import { describe, expect, it } from 'vitest';
import { createDamageState, cloneDamageState } from '$core/damage-state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import { isaAtmosphere } from '$core/physics/isa';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import { getDynamicPressure, getCrossSectionalArea, getBodyDragCoefficient, getDrag } from '$core/physics/aero';
import { getReentryHeatPower, surfaceTemperature, radiativeSinkKelvin } from '$core/physics/thermal';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { createDamageThermalModel, advanceDamageHeat, DAMAGE_THERMAL_EMISSIVITY } from '$core/physics/damage-thermal';
import { createDamageControlModel, createDamageControlForces, writeDamageControls } from '$core/physics/damage-controls';
import { loadedRootAngle, rootLoadCoefficient, rootUtilization } from '$core/physics/damage-root';
import { steelConductivity, steelSpecificEnthalpy, MATERIAL_MAX_K } from '$core/physics/damage-material';
import { dynamicPressureLimit, gLimit, standardGravity, STEFAN_BOLTZMANN, TILE_LIMIT_KELVIN } from '$core/constants';

const ALTITUDE = 35000;
const SPEED = 3000;
const ALPHA = 0;
const COMMAND = Math.PI / 4;
const DT = 1 / 120;
// First published100°C-spaced source knot with proof112MPa below this
// predeclared flow's loaded demand(~114.6MPa). Not a thermal failure threshold.
const PROOF_WITNESS_K = 973.15;

function fixture() {
  const atmosphere = isaAtmosphere(ALTITUDE);
  const sink = radiativeSinkKelvin(ALTITUDE, atmosphere.airTemperature);
  const q = getDynamicPressure(atmosphere.airDensity, SPEED) * 1000; // canonical kPa→Pa
  const flux = getReentryHeatPower(SPEED, atmosphere.airDensity, SUPER_HEAVY.diameter / 2, ALPHA);
  const partition = createVehicleComponents(SUPER_HEAVY);
  const state = createDamageState(partition, sink);
  const thermal = createDamageThermalModel(partition);
  const control = createDamageControlModel(partition, SUPER_HEAVY);
  const forces = createDamageControlForces(partition.components.length);
  const gridIndices = partition.components.flatMap((component, index) => component.kind === 'grid-fin' ? [index] : []);
  return { atmosphere, sink, q, flux, partition, state, thermal, control, forces, gridIndices };
}

describe('natural source-flow thermal weakening', () => {
  it('starts inside every original flow/load guard with cold finite authority', () => {
    const f = fixture();
    expect(f.q).toBeCloseTo(.5 * f.atmosphere.airDensity * SPEED ** 2, 8);
    expect(f.q).toBeLessThan(dynamicPressureLimit * 1000);
    expect(surfaceTemperature(f.flux, f.sink)).toBeLessThan(TILE_LIMIT_KELVIN);
    const damageEquilibrium = (f.flux / (DAMAGE_THERMAL_EMISSIVITY * STEFAN_BOLTZMANN) + f.sink ** 4) ** .25;
    expect(damageEquilibrium).toBeLessThan(MATERIAL_MAX_K);
    const grid = SUPER_HEAVY.gridFins!;
    expect(grid.maxAngle).toBe(COMMAND);
    const bodyArea = getCrossSectionalArea(rad(ALPHA), SUPER_HEAVY.maxArea, SUPER_HEAVY);
    const bodyDrag = getDrag(f.atmosphere.airDensity, SPEED, bodyArea,
      getBodyDragCoefficient(SPEED / speedOfSoundAt(f.atmosphere.airTemperature)));
    // Coldloaded grid forces cannot exceed these45°source-law forces. Empty
    // dry mass is a conservative force/mass control, not a changed preset.
    const lift = f.q * grid.area * Math.sin(2 * COMMAND);
    const drag = f.q * grid.area * 1.2 * Math.sin(COMMAND) ** 2;
    expect(Math.hypot(lift, drag + bodyDrag) / (SUPER_HEAVY.dryMass * standardGravity)).toBeLessThan(gLimit);
    const before = cloneDamageState(f.state);
    writeDamageControls(f.state, f.control, f.q, 0, COMMAND, 0, f.forces);
    expect(f.forces.proofMask | f.forces.domainMask).toBe(0);
    expect(f.forces.gridLiftArea).toBeGreaterThan(0);
    expect(f.forces.gridDragArea).toBeGreaterThan(0);
    for (const index of f.gridIndices) {
      expect(f.state.components[index]!.root.temperature).toBe(f.sink);
      expect(f.forces.loadedAngles[index]).toBeLessThan(COMMAND);
      expect(f.forces.loadedAngles[index]).toBeGreaterThan(0);
    }
    expect(f.state).toEqual(before);
  });

  it('naturally reduces delivered control then crosses in-domain proof capacity within an energy-derived cap', () => {
    const f = fixture();
    const section = f.partition.rootSection;
    const grid = SUPER_HEAVY.gridFins!;
    const areaPerRoot = grid.area / grid.count;
    expect(areaPerRoot).toBe(9); //27m² aggregate must not become27m² per root.
    const lever = SUPER_HEAVY.diameter * .46 / 2;
    const targetAngle = loadedRootAngle(COMMAND, f.q * areaPerRoot, lever,
      PROOF_WITNESS_K, section, 'grid');
    const targetMoment = f.q * areaPerRoot * rootLoadCoefficient(targetAngle, 'grid') * lever;
    expect(rootUtilization(targetMoment, PROOF_WITNESS_K, section)).toBeGreaterThan(1);
    // Until targetT, root-hull loss≤Gmax(targetT-sink), radiation≤rad(targetT),
    // and cp energy is finite. Thus requiredE/minimumNetPower is a sufficient
    // heating-duration bound, independent of an observed passing duration.
    const maximumHullG = steelConductivity(MATERIAL_MAX_K) * section.area / (section.length / 2);
    const minimumNetPower = section.heatArea
      * (f.flux - DAMAGE_THERMAL_EMISSIVITY * STEFAN_BOLTZMANN * (PROOF_WITNESS_K ** 4 - f.sink ** 4))
      - maximumHullG * (PROOF_WITNESS_K - f.sink);
    expect(minimumNetPower).toBeGreaterThan(0);
    const requiredEnergy = section.mass
      * (steelSpecificEnthalpy(PROOF_WITNESS_K) - steelSpecificEnthalpy(f.sink));
    const advanceCap = Math.ceil(requiredEnergy / minimumNetPower / DT) + 1;
    const firstIndex = f.gridIndices[0]!;
    const initialRootEnergy = f.state.components[firstIndex]!.root.energy;
    const initialHullEnergy = f.state.hull.energy;
    writeDamageControls(f.state, f.control, f.q, 0, COMMAND, 0, f.forces);
    const initialAngle = f.forces.loadedAngles[firstIndex]!;
    const initialLiftArea = f.forces.gridLiftArea, initialDragArea = f.forces.gridDragArea;
    let previousAngle = initialAngle, previousTemperature = f.sink;
    let lastHealthyAngle = initialAngle, lastHealthyLift = initialLiftArea, lastHealthyDrag = initialDragArea;
    let maximumAngleIncrease = 0, maximumCooling = 0;
    let domainMask = 0, advances = 0, allFinite = true;
    for (; advances < advanceCap; advances++) {
      domainMask |= advanceDamageHeat(f.state, f.thermal, DT, f.flux, f.sink, f.atmosphere.airPressure * 1000);
      writeDamageControls(f.state, f.control, f.q, 0, COMMAND, 0, f.forces);
      domainMask |= f.forces.domainMask;
      const angle = f.forces.loadedAngles[firstIndex]!;
      const temperature = f.state.components[firstIndex]!.root.temperature;
      maximumAngleIncrease = Math.max(maximumAngleIncrease, angle - previousAngle);
      maximumCooling = Math.max(maximumCooling, previousTemperature - temperature);
      allFinite &&= Number.isFinite(angle) && Number.isFinite(temperature)
        && Number.isFinite(f.forces.gridLiftArea * f.q) && Number.isFinite(f.forces.gridDragArea * f.q);
      previousAngle = angle;
      previousTemperature = temperature;
      if (domainMask !== 0 || f.forces.proofMask !== 0) {
        advances++;
        break;
      }
      lastHealthyAngle = angle;
      lastHealthyLift = f.forces.gridLiftArea;
      lastHealthyDrag = f.forces.gridDragArea;
    }
    const gridMask = f.gridIndices.reduce((mask, index) => mask | (1 << index), 0);
    expect(domainMask).toBe(0);
    expect(f.forces.proofMask).toBe(gridMask);
    expect(advances).toBeLessThanOrEqual(advanceCap);
    expect(advances * DT).toBeGreaterThan(0);
    expect(allFinite).toBe(true);
    expect(maximumCooling).toBe(0);
    expect(maximumAngleIncrease).toBe(0);
    expect(lastHealthyAngle).toBeLessThan(initialAngle);
    expect(lastHealthyLift).toBeLessThan(initialLiftArea);
    expect(lastHealthyDrag).toBeLessThan(initialDragArea);
    // The root solver's existing1e-10rad residual contract, propagated through
    // the source laws' Lipschitz bounds, is far below the thermal force signal.
    // Multiply both sides by q to compare actual N at this identical flow.
    expect(f.q * (initialLiftArea - lastHealthyLift)).toBeGreaterThan(f.q * 2 * grid.area * 1e-10);
    expect(f.q * (initialDragArea - lastHealthyDrag)).toBeGreaterThan(f.q * 1.2 * grid.area * 1e-10);
    expect(f.state.components[firstIndex]!.root.temperature).toBeGreaterThan(373.15);
    expect(f.state.components[firstIndex]!.root.temperature).toBeLessThan(PROOF_WITNESS_K);
    expect(f.state.components[firstIndex]!.root.energy).toBeGreaterThan(initialRootEnergy);
    expect(f.state.hull.energy).toBeGreaterThan(initialHullEnergy);
    expect(f.forces.gridLiftArea).toBe(0);
    expect(f.forces.gridDragArea).toBe(0);
    // An unloaded control at this naturally reached, still-valid temperature
    // distinguishes demand/proof failure from unsupported material-domain loss.
    const before = cloneDamageState(f.state);
    writeDamageControls(f.state, f.control, f.q, 0, 0, 0, f.forces);
    expect(f.forces.proofMask | f.forces.domainMask).toBe(0);
    expect(f.state).toEqual(before);
  });

  it('does not manufacture weakening without external flow or heat input', () => {
    const f = fixture();
    const before = cloneDamageState(f.state);
    const noFlowFlux = getReentryHeatPower(0, f.atmosphere.airDensity, SUPER_HEAVY.diameter / 2, ALPHA);
    const noFlowQ = getDynamicPressure(f.atmosphere.airDensity, 0) * 1000;
    for (let step = 0; step < 120; step++) {
      expect(advanceDamageHeat(f.state, f.thermal, DT, noFlowFlux, f.sink, f.atmosphere.airPressure * 1000)).toBe(0);
    }
    writeDamageControls(f.state, f.control, noFlowQ, 0, COMMAND, 0, f.forces);
    expect(f.forces.proofMask | f.forces.domainMask).toBe(0);
    for (const index of f.gridIndices) expect(f.forces.loadedAngles[index]).toBe(COMMAND);
    expect(f.state).toEqual(before);
  });
});
