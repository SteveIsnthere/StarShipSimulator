/** Approved R2 standalone retained-mass/capability foundation.
 * Attachment flags determine parent dry ownership; debris never adds mass.
 * Existing centred LOX/CH4 columns retain the same mixture/fill assumptions.
 * Reference areas follow surviving inventory, not a new force coefficient.
 * This writer neither evolves damage nor changes any ownership/policy flag.
 */
import { ComponentFailure, type DamageState } from '../damage-state';
import { OXIDISER_SHARE, type VehicleDefinition } from '../vehicle';
import type { VehicleComponentPartition } from './vehicle-components';
import { centreOfMass, momentOfInertia } from './mass';

export interface DamageMassProperties {
  hasMass: boolean;
  /** kg — parent-owned dry material, unreleased mixture and their sum. */
  retainedDryMass: number;
  propellantMass: number;
  totalMass: number;
  /** m — dry centroid, body-right and above the engine plane. */
  dryCentreOfMassX: number;
  dryCentreOfMass: number;
  /** kg m² — dry intrinsic transverse inertia. */
  dryMomentOfInertia: number;
  /** m — wet centroid, using the same body coordinates. */
  centreOfMassX: number;
  centreOfMass: number;
  /** kg m² — retained dry plus actual filled-column transverse inertia. */
  momentOfInertia: number;
  frontFinCount: number;
  aftFinCount: number;
  gridFinCount: number;
  /** m² — surviving reference areas; loaded angles are separate physical state. */
  frontFinArea: number;
  aftFinArea: number;
  gridFinArea: number;
  engineSupportAvailable: boolean;
}

/** Allocate once; writeDamageMass reuses this scratch on every subsequent call. */
export function createDamageMassProperties(): DamageMassProperties {
  return { hasMass: false, retainedDryMass: 0, propellantMass: 0, totalMass: 0,
    dryCentreOfMassX: 0, dryCentreOfMass: 0, dryMomentOfInertia: 0,
    centreOfMassX: 0, centreOfMass: 0, momentOfInertia: 0,
    frontFinCount: 0, aftFinCount: 0, gridFinCount: 0,
    frontFinArea: 0, aftFinArea: 0, gridFinArea: 0, engineSupportAvailable: false };
}

/** Allocation-free. Missing all dry parts does not release fuel implicitly;
 * later canonical terminal mechanics owns that separate ledger transition.
 * A zero-total-mass body returns hasMass=false and zero centroid/inertia.
 */
export function writeDamageMass(state: DamageState, partition: VehicleComponentPartition,
  propellantMass: number, model: VehicleDefinition, out: DamageMassProperties): void {
  if (!Number.isFinite(propellantMass) || partition.id !== model.id
    || partition.dryMass !== model.dryMass || partition.dryCentreOfMass !== model.dryCentreOfMass
    || partition.dryMomentOfInertia !== model.dryMass * ((model.diameter / 2) ** 2 / 4 + model.height ** 2 / 12)
    || state.components.length !== partition.components.length)
    throw new RangeError('Retained mass requires matching component/model inventory and finite propellant');

  out.hasMass = false;
  out.retainedDryMass = 0;
  out.propellantMass = Math.max(0, propellantMass);
  out.totalMass = 0;
  out.dryCentreOfMassX = out.dryCentreOfMass = out.dryMomentOfInertia = 0;
  out.centreOfMassX = out.centreOfMass = out.momentOfInertia = 0;
  out.frontFinCount = out.aftFinCount = out.gridFinCount = 0;
  out.frontFinArea = out.aftFinArea = out.gridFinArea = 0;
  out.engineSupportAvailable = false;
  let intact = true;
  let firstX = 0, firstStation = 0;
  for (let i = 0; i < partition.components.length; i++) {
    const condition = state.components[i]!;
    if (condition.componentIndex !== i) throw new RangeError('Component indices must retain catalogue order');
    if (!condition.attached) { intact = false; continue; }
    const c = partition.components[i]!;
    out.retainedDryMass += c.mass;
    firstX += c.mass * c.x;
    firstStation += c.mass * c.station;
    if (c.kind === 'flap') {
      if (c.id.startsWith('ship-front-flap-')) out.frontFinCount++;
      else if (c.id.startsWith('ship-aft-flap-')) out.aftFinCount++;
    } else if (c.kind === 'grid-fin') out.gridFinCount++;
    else if (c.kind === 'engine-support')
      out.engineSupportAvailable = condition.permanentFailure === ComponentFailure.None;
  }
  out.frontFinArea = model.frontFinArea * out.frontFinCount / 2;
  out.aftFinArea = model.aftFinArea * out.aftFinCount / 2;
  out.gridFinArea = model.gridFins ? model.gridFins.area * out.gridFinCount / model.gridFins.count : 0;

  if (intact) {
    // The positive catalogue reproduces these moments analytically. Preserve
    // the canonical intact expression/order instead of changing its last bits
    // merely because the same structure is now represented by components.
    out.retainedDryMass = model.dryMass;
    out.dryCentreOfMassX = partition.dryCentreOfMassX;
    out.dryCentreOfMass = model.dryCentreOfMass;
    out.dryMomentOfInertia = partition.dryMomentOfInertia;
    out.totalMass = model.dryMass + out.propellantMass;
    out.hasMass = true;
    out.centreOfMassX = 0;
    out.centreOfMass = centreOfMass(out.propellantMass, model);
    out.momentOfInertia = momentOfInertia(out.propellantMass, model);
    return;
  }
  if (out.retainedDryMass > 0) {
    out.dryCentreOfMassX = firstX / out.retainedDryMass;
    out.dryCentreOfMass = firstStation / out.retainedDryMass;
    for (let i = 0; i < partition.components.length; i++) if (state.components[i]!.attached) {
      const c = partition.components[i]!;
      out.dryMomentOfInertia += c.inertia + c.mass * ((c.x - out.dryCentreOfMassX) ** 2
        + (c.station - out.dryCentreOfMass) ** 2);
    }
  }
  out.totalMass = out.retainedDryMass + out.propellantMass;
  if (out.totalMass === 0) return;
  out.hasMass = true;
  const fill = Math.min(1, out.propellantMass / model.propellantCapacity);
  const loxMass = out.propellantMass * OXIDISER_SHARE;
  const methaneMass = out.propellantMass * (1 - OXIDISER_SHARE);
  const loxHeight = model.loxTankHeight * fill, methaneHeight = model.ch4TankHeight * fill;
  const loxCentre = model.tankBottom + loxHeight / 2;
  const methaneCentre = model.ch4TankBottom + methaneHeight / 2;
  out.centreOfMassX = firstX / out.totalMass;
  out.centreOfMass = (firstStation + loxMass * loxCentre + methaneMass * methaneCentre) / out.totalMass;
  for (let i = 0; i < partition.components.length; i++) if (state.components[i]!.attached) {
    const c = partition.components[i]!;
    out.momentOfInertia += c.inertia + c.mass * ((c.x - out.centreOfMassX) ** 2
      + (c.station - out.centreOfMass) ** 2);
  }
  const radial = (model.diameter / 2) ** 2 / 4;
  out.momentOfInertia += loxMass * (radial + loxHeight ** 2 / 12
    + out.centreOfMassX ** 2 + (loxCentre - out.centreOfMass) ** 2);
  out.momentOfInertia += methaneMass * (radial + methaneHeight ** 2 / 12
    + out.centreOfMassX ** 2 + (methaneCentre - out.centreOfMass) ** 2);
}
