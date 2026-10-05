/** Standalone Phase8 finite thermal network; no SimState/flight/loss integration.
 * Numerical and geometric assumptions are frozen in modernization-phase-8.md.
 * Columns contain two finite silica cells when protected, one finite steel
 * root, and share one finite residual hull. Every rate uses old temperatures.
 * All internal transfers have equal/opposite joules; no pair-equilibrium solve
 * or timestep allocation is needed by this simultaneous explicit update.
 * Authored area-changing1D collector topology: steel beam spans0→L, its
 * thermal cell is centred atL/2, the hull boundary is0 and heat entry isL.
 * Each steel centre-to-face path isL/2; mechanical cantilever length staysL.
 * Sidewall/spreading/bond transport is omitted, not universally conservative.
 */
import type { DamageState, DamageThermalNode } from '../damage-state';
import { MAX_DAMAGE_COMPONENTS } from '../damage-state';
import { STEFAN_BOLTZMANN } from '../constants';
import type { VehicleComponentPartition } from './vehicle-components';
import {
  MATERIAL_MIN_K, MATERIAL_MAX_K, steelSpecificHeat, steelConductivity,
  steelSpecificEnthalpy, steelTemperatureFromEnthalpy,
} from './damage-material';
import {
  TPS_CP_MIN_K, TPS_CP_MAX_K, TPS_K_MIN_K, TPS_K_MAX_K, TPS_PRESSURE_MAX_PA,
  tpsSpecificHeat, tpsSpecificEnthalpy, tpsTemperatureFromEnthalpy,
  tpsConductivity, tpsMeanConductivity,
} from './tps-material';

export const HULL_THERMAL_DOMAIN_BIT = 1 << MAX_DAMAGE_COMPONENTS;
/** Authored blackened damage-patch surrogate; legacy tile0.85 stays separate. */
export const DAMAGE_THERMAL_EMISSIVITY = .8;
const MAX_SUBSTEPS = 8;
const TPS_THICKNESS = .0254;
const TPS_CENTRE_DISTANCE = TPS_THICKNESS / 2;
const TPS_INTERFACE_DISTANCE = TPS_THICKNESS / 4;
const TPS_MIN_K = Math.max(TPS_CP_MIN_K, TPS_K_MIN_K);
const TPS_MAX_K = Math.min(TPS_CP_MAX_K, TPS_K_MAX_K);
const RADIATION_FACTOR = DAMAGE_THERMAL_EMISSIVITY * STEFAN_BOLTZMANN;
const STEEL_MIN_H = steelSpecificEnthalpy(MATERIAL_MIN_K);
const STEEL_MAX_H = steelSpecificEnthalpy(MATERIAL_MAX_K);
const TPS_MIN_H = tpsSpecificEnthalpy(TPS_MIN_K);
const TPS_MAX_H = tpsSpecificEnthalpy(TPS_MAX_K);

export interface DamageThermalColumn {
  readonly componentIndex: number;
  readonly rootMass: number;
  readonly tpsCellMass: number;
  readonly heatArea: number;
  /** m — steel area/(L/2) for each distinct half path. */
  readonly steelPathRatio: number;
  /** 1/m — (L/2)/steel area for the interface resistance. */
  readonly steelResistanceRatio: number;
  readonly rootMinEnergy: number;
  readonly rootMaxEnergy: number;
  readonly tpsMinEnergy: number;
  readonly tpsMaxEnergy: number;
}

export interface DamageThermalModel {
  readonly componentCount: number;
  readonly columns: readonly DamageThermalColumn[];
  readonly hullMass: number;
  readonly hullMinEnergy: number;
  readonly hullMaxEnergy: number;
  /** s — sufficient simultaneous-link/radiation monotonic transport bound. */
  readonly safeStep: number;
}

/** Startup-only construction. No mutable partition reference enters state. */
export function createDamageThermalModel(partition: VehicleComponentPartition): DamageThermalModel {
  const count = partition.components.length;
  const section = partition.rootSection;
  if (count < 1 || count > MAX_DAMAGE_COMPONENTS
    || !(partition.hullThermalMass > 0 && section.area > 0 && section.length > 0 && section.heatArea > 0)
    || !Number.isFinite(partition.hullThermalMass + section.area + section.length + section.heatArea)) {
    throw new RangeError('Invalid thermal catalogue geometry/inventory');
  }
  // Source-table extrema: silica cp and k rows are nondecreasing; the cold
  // implemented steel cp minimum is its4K endpoint. Hot k rises to1473.15K
  // and exceeds the cold/bridge values. These are bounds, not fitted rates.
  const steelMinCp = steelSpecificHeat(MATERIAL_MIN_K);
  const steelMaxK = steelConductivity(MATERIAL_MAX_K);
  const tpsMinCp = tpsSpecificHeat(TPS_CP_MIN_K);
  const tpsMaxK = tpsConductivity(TPS_K_MAX_K, TPS_PRESSURE_MAX_PA);
  // One whole finite steel volumeAs×L centred atL/2 has two distinct half
  // paths. CountingL in both links would double this volume's axial length.
  const steelHalfPath = section.length / 2;
  const steelPathRatio = section.area / steelHalfPath;
  const steelResistanceRatio = steelHalfPath / section.area;
  const rootHullMaxG = steelMaxK * steelPathRatio;
  const radiationSteel = 4 * RADIATION_FACTOR * section.heatArea * MATERIAL_MAX_K ** 3;
  const radiationTPS = 4 * RADIATION_FACTOR * section.heatArea * TPS_MAX_K ** 3;
  const columns: DamageThermalColumn[] = [];
  let safeStep = Infinity;
  let hullMaxG = 0;
  for (let componentIndex = 0; componentIndex < count; componentIndex++) {
    const component = partition.components[componentIndex]!;
    if (!(component.rootMass >= 0 && component.tpsMass >= 0)
      || !Number.isFinite(component.rootMass + component.tpsMass)) {
      throw new RangeError('Invalid component thermal masses');
    }
    if (component.rootMass === 0) {
      if (component.tpsMass > 0) throw new RangeError('TPS column requires a finite root');
      continue;
    }
    const cellMass = component.tpsMass / 2;
    const rootCapacity = component.rootMass * steelMinCp;
    if (cellMass > 0) {
      const interiorMaxG = tpsMaxK * section.heatArea / TPS_CENTRE_DISTANCE;
      const interfaceMaxG = 1 / (TPS_INTERFACE_DISTANCE / (tpsMaxK * section.heatArea)
        + steelResistanceRatio / steelMaxK);
      const cellCapacity = cellMass * tpsMinCp;
      safeStep = Math.min(safeStep, cellCapacity / (interiorMaxG + radiationTPS),
        cellCapacity / (interiorMaxG + interfaceMaxG),
        rootCapacity / (interfaceMaxG + rootHullMaxG));
    } else {
      safeStep = Math.min(safeStep, rootCapacity / (rootHullMaxG + radiationSteel));
    }
    hullMaxG += rootHullMaxG;
    columns.push(Object.freeze({ componentIndex, rootMass: component.rootMass,
      tpsCellMass: cellMass, heatArea: section.heatArea, steelPathRatio, steelResistanceRatio,
      rootMinEnergy: component.rootMass * STEEL_MIN_H,
      rootMaxEnergy: component.rootMass * STEEL_MAX_H,
      tpsMinEnergy: cellMass * TPS_MIN_H, tpsMaxEnergy: cellMass * TPS_MAX_H }));
  }
  if (hullMaxG > 0) safeStep = Math.min(safeStep, partition.hullThermalMass * steelMinCp / hullMaxG);
  return Object.freeze({ componentCount: count, columns: Object.freeze(columns),
    hullMass: partition.hullThermalMass,
    hullMinEnergy: partition.hullThermalMass * STEEL_MIN_H,
    hullMaxEnergy: partition.hullThermalMass * STEEL_MAX_H, safeStep });
}

function requireNodeTemperature(node: DamageThermalNode, minimum: number, maximum: number): void {
  if (!Number.isFinite(node.temperature) || node.temperature < minimum || node.temperature > maximum
    || !Number.isFinite(node.energy)) {
    throw new RangeError('Valid thermal node has invalid temperature/energy');
  }
}

function applyEnergy(
  node: DamageThermalNode, deltaEnergy: number, mass: number,
  minimum: number, maximum: number, silica: boolean,
): boolean {
  node.energy += deltaEnergy;
  if (!Number.isFinite(node.energy) || node.energy < minimum || node.energy > maximum) {
    node.valid = false;
    // Temperature stays explicitly last-valid; preserve all candidate joules.
    return false;
  }
  if (deltaEnergy !== 0) {
    // Exact energy-domain endpoints need no division/inversion; avoid an
    // E/m roundoff excursion past a verified bound without clipping joules.
    if (node.energy === minimum) node.temperature = silica ? TPS_MIN_K : MATERIAL_MIN_K;
    else if (node.energy === maximum) node.temperature = silica ? TPS_MAX_K : MATERIAL_MAX_K;
    else node.temperature = silica ? tpsTemperatureFromEnthalpy(node.energy / mass)
      : steelTemperatureFromEnthalpy(node.energy / mass);
  }
  return true;
}

/**
 * Advance only attached parent columns, mutating the supplied fixed-shape state.
 * Return component bits0–11 and hullbit12 on a material-domain exit. Complete
 * that simultaneous substep, then stop: remaining larger-call time is unused.
 * No failure policy, detachment, revision counter or terminal snapshot here.
 * Sink186–1473.15K keeps each radiation secant inside the frozen derivative
 * bound. The existing atmospheric/mesopause sink lies well inside this range.
 */
export function advanceDamageHeat(
  state: DamageState, model: DamageThermalModel, dt: number,
  fluxWm2: number, sinkK: number, pressurePa: number,
): number {
  if (!Number.isFinite(dt) || dt < 0 || dt > model.safeStep * MAX_SUBSTEPS
    || !Number.isFinite(fluxWm2) || fluxWm2 < 0
    || !Number.isFinite(sinkK) || sinkK < 186 || sinkK > MATERIAL_MAX_K
    || !Number.isFinite(pressurePa) || pressurePa < 0 || pressurePa > TPS_PRESSURE_MAX_PA
    || state.components.length !== model.componentCount) {
    throw new RangeError('Thermal forcing/inventory outside the supported numerical contract');
  }
  let domainMask = state.hull.valid ? 0 : HULL_THERMAL_DOMAIN_BIT;
  for (const column of model.columns) {
    const component = state.components[column.componentIndex]!;
    if (component.componentIndex !== column.componentIndex) throw new RangeError('Thermal catalogue identity mismatch');
    if (!component.attached) continue;
    if (!component.root.valid || (column.tpsCellMass > 0
      && (!component.tps[0].valid || !component.tps[1].valid))) domainMask |= 1 << column.componentIndex;
  }
  if (domainMask !== 0 || dt === 0) return domainMask;
  // Preflight the entire participating inventory before any update can throw.
  requireNodeTemperature(state.hull, MATERIAL_MIN_K, MATERIAL_MAX_K);
  for (const column of model.columns) {
    const component = state.components[column.componentIndex]!;
    if (!component.attached) continue;
    requireNodeTemperature(component.root, MATERIAL_MIN_K, MATERIAL_MAX_K);
    if (column.tpsCellMass > 0) {
      requireNodeTemperature(component.tps[0], TPS_MIN_K, TPS_MAX_K);
      requireNodeTemperature(component.tps[1], TPS_MIN_K, TPS_MAX_K);
    }
  }
  // The preflight multiplication bound governsN; min contains ceiling roundoff
  // at the exact8-step boundary rather than changing the requested duration.
  const substeps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / model.safeStep)));
  const step = dt / substeps;
  const sinkFourthPower = sinkK ** 4;
  for (let substep = 0; substep < substeps; substep++) {
    const oldHullTemperature = state.hull.temperature;
    const oldHullK = steelConductivity(oldHullTemperature);
    let hullEnergyDelta = 0;
    for (const column of model.columns) {
      const component = state.components[column.componentIndex]!;
      if (!component.attached) continue;
      const rootTemperature = component.root.temperature;
      const rootK = steelConductivity(rootTemperature);
      // Declared lumped mean-path approximation: average local endpoint k.
      // Each k uses its own steel temperature; no cold quadrature/extrapolation.
      const rootHullQ = step * (rootK + oldHullK) / 2 * column.steelPathRatio
        * (rootTemperature - oldHullTemperature);
      hullEnergyDelta += rootHullQ;
      let rootEnergyDelta = -rootHullQ;
      let componentValid = true;
      if (column.tpsCellMass > 0) {
        const outer = component.tps[0], inner = component.tps[1];
        const outerTemperature = outer.temperature, innerTemperature = inner.temperature;
        const interiorQ = step * tpsMeanConductivity(outerTemperature, innerTemperature, pressurePa)
          * column.heatArea / TPS_CENTRE_DISTANCE * (outerTemperature - innerTemperature);
        // Unlike-material interface: frozen lumped series resistance, not a
        // solved interface temperature. Each material uses its OWN nodeT.
        const interfaceQ = step * (innerTemperature - rootTemperature)
          / (TPS_INTERFACE_DISTANCE / (tpsConductivity(innerTemperature, pressurePa) * column.heatArea)
            + column.steelResistanceRatio / rootK);
        const externalQ = step * column.heatArea
          * (fluxWm2 - RADIATION_FACTOR * (outerTemperature ** 4 - sinkFourthPower));
        rootEnergyDelta += interfaceQ;
        componentValid = applyEnergy(outer, externalQ - interiorQ, column.tpsCellMass,
          column.tpsMinEnergy, column.tpsMaxEnergy, true);
        // Do not short-circuit: every candidate energy in this substep is paid.
        if (!applyEnergy(inner, interiorQ - interfaceQ, column.tpsCellMass,
          column.tpsMinEnergy, column.tpsMaxEnergy, true)) componentValid = false;
      } else {
        rootEnergyDelta += step * column.heatArea
          * (fluxWm2 - RADIATION_FACTOR * (rootTemperature ** 4 - sinkFourthPower));
      }
      if (!applyEnergy(component.root, rootEnergyDelta, column.rootMass,
        column.rootMinEnergy, column.rootMaxEnergy, false)) componentValid = false;
      if (!componentValid) domainMask |= 1 << column.componentIndex;
    }
    if (!applyEnergy(state.hull, hullEnergyDelta, model.hullMass,
      model.hullMinEnergy, model.hullMaxEnergy, false)) domainMask |= HULL_THERMAL_DOMAIN_BIT;
    if (domainMask !== 0) return domainMask;
  }
  return 0;
}
