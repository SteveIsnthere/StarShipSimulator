/** Shared, non-mutating control authority evaluation for live and forecast use.
 * Geometry is the frozen Phase8 attachment surrogate. Failure masks are demands
 * for the ownership transition; this evaluator never detaches or spends mass.
 */
import { ComponentFailure, type DamageState } from '../damage-state';
import { finDragCoefficient } from '../constants';
import type { VehicleDefinition } from '../vehicle';
import type { VehicleComponentPartition } from './vehicle-components';
import { loadedRootAngle, rootLoadCoefficient, rootUtilization, type RootSection } from './damage-root';
import { steelProofStrength } from './damage-material';

interface ControlColumn {
  readonly index: number;
  readonly group: 'front' | 'aft' | 'grid';
  readonly area: number;
  /** m — physical span centroid from hinge, before visual projection. */
  readonly lever: number;
}
export interface DamageControlModel {
  readonly componentCount: number;
  readonly root: RootSection;
  readonly columns: readonly ControlColumn[];
}
export interface DamageControlForces {
  /** m² — effective areas to multiply by the canonical dynamic pressure. */
  frontArea: number;
  aftArea: number;
  /** Dimensionless fractions of each complete two-flap pair. */
  frontFraction: number;
  aftFraction: number;
  gridLiftArea: number;
  gridDragArea: number;
  /** Per-component rad; fixed inventory allocated once. */
  loadedAngles: number[];
  /** Distinct permanent-loss reasons; no invented strength outside source. */
  proofMask: number;
  domainMask: number;
}

export function createDamageControlModel(partition: VehicleComponentPartition, vehicle: VehicleDefinition): DamageControlModel {
  const columns: ControlColumn[] = [];
  for (let index = 0; index < partition.components.length; index++) {
    const component = partition.components[index]!;
    if (component.kind === 'grid-fin') {
      const grid = vehicle.gridFins;
      if (!grid) throw new RangeError('Grid component requires grid geometry');
      columns.push(Object.freeze({ index, group: 'grid', area: grid.area / grid.count,
        lever: component.loadLever }));
    } else if (component.kind === 'flap') {
      const front = component.id.includes('-front-');
      columns.push(Object.freeze({ index, group: front ? 'front' : 'aft',
        area: (front ? vehicle.frontFinArea : vehicle.aftFinArea) / 2,
        lever: component.loadLever }));
    }
  }
  return Object.freeze({ componentCount: partition.components.length,
    root: partition.rootSection, columns: Object.freeze(columns) });
}

export function createDamageControlForces(componentCount: number): DamageControlForces {
  return { frontArea: 0, aftArea: 0, frontFraction: 0, aftFraction: 0, gridLiftArea: 0, gridDragArea: 0,
    loadedAngles: new Array<number>(componentCount).fill(0), proofMask: 0, domainMask: 0 };
}

/** Shared validation for a fresh query and reuse against an immutable source. */
export function validateDamageControlForcing(state: DamageState, model: DamageControlModel,
  q: number, incidence: number, out: DamageControlForces): void {
  if (!(q >= 0 && incidence >= 0 && incidence <= 1) || !Number.isFinite(q)
    || state.components.length !== model.componentCount || out.loadedAngles.length < model.componentCount)
    throw new RangeError('Invalid component control forcing or inventory');
}

/** q in Pa, incidence=abs(sin(angleIntoWind)), commands in rad. Guidance may
 * evaluate alternate commands without changing actual articulation or damage.
 * Grid command is frontCommand; it uses the existing flow-relative grid law.
 */
export function writeDamageControls(state: DamageState, model: DamageControlModel,
  q: number, incidence: number, frontCommand: number, aftCommand: number,
  out: DamageControlForces): void {
  validateDamageControlForcing(state, model, q, incidence, out);
  out.frontArea = out.aftArea = out.gridLiftArea = out.gridDragArea = 0;
  out.frontFraction = out.aftFraction = 0;
  out.proofMask = out.domainMask = 0;
  out.loadedAngles.fill(0);
  for (const column of model.columns) {
    const component = state.components[column.index]!;
    if (!component.attached || component.permanentFailure !== ComponentFailure.None) continue;
    if (!component.root.valid || steelProofStrength(component.root.temperature) === 0) {
      out.domainMask |= 1 << column.index;
      continue;
    }
    const grid = column.group === 'grid';
    const command = column.group === 'aft' ? aftCommand : frontCommand;
    const forceScale = q * column.area * (grid ? 1 : finDragCoefficient * incidence);
    const law = grid ? 'grid' : 'plate';
    const angle = loadedRootAngle(command, forceScale, column.lever,
      component.root.temperature, model.root, law);
    out.loadedAngles[column.index] = angle;
    const moment = forceScale * rootLoadCoefficient(Math.abs(angle), law) * column.lever;
    if (rootUtilization(moment, component.root.temperature, model.root) > 1) {
      out.proofMask |= 1 << column.index;
      continue;
    }
    if (grid) {
      out.gridLiftArea += column.area * Math.sin(2 * angle);
      out.gridDragArea += column.area * 1.2 * Math.sin(angle) ** 2;
    } else {
      const projected = Math.sin(angle);
      // Each catalogue flap owns half its pair. Accumulate the fraction
      // directly so unloaded hardware exactly retains the initializer's sin,
      // without a gratuitous area multiply/divide rounding round-trip.
      if (column.group === 'front') {
        out.frontArea += column.area * projected;
        out.frontFraction += .5 * projected;
      } else {
        out.aftArea += column.area * projected;
        out.aftFraction += .5 * projected;
      }
    }
  }
}
