/** Approved Phase 8 R2 Fidelity prerequisite; no live flight integration.
 *
 * This is a positive lumped partition of the inherited dry mass, not a
 * measured V3 density map. Frozen assumptions precede flight evaluation in
 * modernization-phase-8.md. Engine packages use the published 1525 kg SL
 * engine mass (SpaceX May 12 2026 V3 update); RVac equality and inclusion of
 * unmeasured support/shielding in that package are surrogate assumptions.
 * Panels use 4 mm solid-equivalent 304, including the uncertain grid lattice
 * fill. Nose/hot-stage allocations are 5%/2% of dry mass. Root/TPS masses
 * belong to appendages and are never added to the intact mass.
 *
 * Hull residuals are three positive axial disk slices, not uniform-density
 * wall sections. Their convex weights reproduce the remaining first/second
 * moments analytically. Construction rejects impossible residuals rather
 * than changing an allocation to rescue a flight.
 */
import type { VehicleDefinition } from '../vehicle';
import { createRootSection, type RootSection } from './damage-root';
import { STEEL_DENSITY } from './damage-material';

export type VehicleComponentKind = 'hull' | 'nose' | 'engine-support' | 'hot-stage' | 'flap' | 'grid-fin';
export interface ComponentMassSlice {
  readonly role: 'structure' | 'root' | 'tps';
  /** kg — already part of the intact dry mass. */
  readonly mass: number;
  /** m — body-right, and above the engine plane, respectively. */
  readonly x: number;
  readonly station: number;
  /** kg m² — intrinsic transverse inertia about this slice's own centroid. */
  readonly inertia: number;
}
export interface VehicleComponent {
  readonly id: string;
  readonly kind: VehicleComponentKind;
  readonly mass: number;
  /** Physical mass centroid; deliberately distinct from a renderer pivot. */
  readonly x: number;
  readonly station: number;
  /** kg m² — intrinsic inertia, excluding the parent parallel-axis term. */
  readonly inertia: number;
  /** kg — thermal subpartitions within mass, not additional ownership. */
  readonly rootMass: number;
  readonly tpsMass: number;
  /** m — physical appendage span-centroid lever, before view projection. */
  readonly loadLever: number;
  readonly hinge?: Readonly<{ x: number; station: number }>;
  readonly slices: readonly ComponentMassSlice[];
}
export interface VehicleComponentPartition {
  readonly id: VehicleDefinition['id'];
  readonly dryMass: number;
  /** m — intact transverse centre; remaining components may be asymmetric. */
  readonly dryCentreOfMassX: 0;
  /** m — intact reference centre, above the engine plane. */
  readonly dryCentreOfMass: number;
  readonly dryMomentOfInertia: number;
  /** kg — only the two hull components; excludes appendage roots and TPS. */
  readonly hullThermalMass: number;
  readonly rootSection: RootSection;
  readonly components: readonly VehicleComponent[];
}

const ENGINE_PACKAGE_MASS = 1525;
const PANEL_THICKNESS = .004;
const TPS_DENSITY = 144;
const TPS_THICKNESS = .0254;
const GRID_AZIMUTH = 20 * Math.PI / 180;

function slice(role: ComponentMassSlice['role'], mass: number, x: number,
  station: number, inertia: number): ComponentMassSlice {
  if (!(mass > 0 && inertia > 0) || !Number.isFinite(mass + x + station + inertia))
    throw new RangeError('Component slice requires positive finite mass and inertia');
  return Object.freeze({ role, mass, x, station, inertia });
}

function component(id: string, kind: VehicleComponentKind, slices: ComponentMassSlice[],
  hinge?: Readonly<{ x: number; station: number }>, loadLever = 0): VehicleComponent {
  const mass = slices.reduce((sum, s) => sum + s.mass, 0);
  const x = slices.reduce((sum, s) => sum + s.mass * s.x, 0) / mass;
  const station = slices.reduce((sum, s) => sum + s.mass * s.station, 0) / mass;
  const inertia = slices.reduce((sum, s) => sum + s.inertia
    + s.mass * ((s.x - x) ** 2 + (s.station - station) ** 2), 0);
  return Object.freeze({ id, kind, mass, x, station, inertia, loadLever,
    rootMass: slices.reduce((sum, s) => sum + (s.role === 'root' ? s.mass : 0), 0),
    tpsMass: slices.reduce((sum, s) => sum + (s.role === 'tps' ? s.mass : 0), 0),
    ...(hinge ? { hinge: Object.freeze({ ...hinge }) } : {}),
    slices: Object.freeze(slices),
  });
}

function appendage(id: string, kind: 'flap' | 'grid-fin', area: number, span: number,
  projection: number, station: number, radius: number, root: RootSection,
  protectedRoot: boolean): VehicleComponent {
  if (!(area > 0 && span > 0)) throw new RangeError('Appendage area and span must be positive');
  const chord = area / span;
  const panelMass = STEEL_DENSITY * PANEL_THICKNESS * area;
  const panelX = projection * (radius + span / 2);
  const rootX = projection * (radius + root.length / 2);
  const width = root.heatArea / root.length;
  const panelInertia = panelMass * ((span * projection) ** 2 + chord ** 2) / 12;
  const rootInertia = root.mass * ((root.length * projection) ** 2 + width ** 2) / 12;
  const slices = [slice('structure', panelMass, panelX, station, panelInertia),
    slice('root', root.mass, rootX, station, rootInertia)];
  if (protectedRoot) {
    const mass = TPS_DENSITY * root.heatArea * TPS_THICKNESS;
    slices.push(slice('tps', mass, rootX, station,
      mass * ((root.length * projection) ** 2 + width ** 2) / 12));
  }
  return component(id, kind, slices, { x: projection * radius, station }, span / 2);
}

/** Startup only. Coordinates/inertias serve later physical COM conversion;
 * projected polygons and attachment pivots never stand in for mass centroids. */
export function createVehicleComponents(model: VehicleDefinition): VehicleComponentPartition {
  const { height: h, diameter: d, dryMass: mass, dryCentreOfMass: centre } = model;
  if (!(h > 0 && d > 0 && mass > 0 && centre > 0 && centre < h)
    || !Number.isFinite(h + d + mass + centre))
    throw new RangeError('Invalid intact vehicle mass geometry');
  const r = d / 2, ship = model.id === 'ship';
  const root = createRootSection(d);
  const parts: VehicleComponent[] = [];
  const supportHeight = h * (ship ? .035 : .03);
  const packageMass = model.engines.length * ENGINE_PACKAGE_MASS;
  parts.push(component(`${ship ? 'ship' : 'booster'}-engine-support`, 'engine-support', [
    slice('structure', packageMass, 0, supportHeight / 2,
      packageMass * (r ** 2 / 4 + supportHeight ** 2 / 12)),
  ]));
  if (ship) {
    const noseMass = mass * .05;
    parts.push(component('ship-nose', 'nose', [slice('structure', noseMass, 0, h * .87,
      noseMass * ((.4 * r) ** 2 + (.08 * h) ** 2) / 5)]));
    for (const front of [true, false]) for (const side of [-1, 1]) {
      const station = front ? model.frontFinStation : model.aftFinStation;
      parts.push(appendage(`ship-${front ? 'front' : 'aft'}-flap-${side < 0 ? 'left' : 'right'}`,
        'flap', (front ? model.frontFinArea : model.aftFinArea) / 2,
        d * (front ? .34 : .46), side, station, r, root, true));
    }
  } else {
    const grids = model.gridFins;
    if (!grids || !Number.isInteger(grids.count) || grids.count < 3)
      throw new RangeError('Booster component partition requires a grid inventory');
    const crownMass = mass * .02;
    parts.push(component('booster-hot-stage', 'hot-stage', [slice('structure', crownMass, 0, h * .975,
      crownMass * (r ** 2 / 2 + (.05 * h) ** 2 / 12))]));
    for (let i = 0; i < grids.count; i++) parts.push(appendage(`booster-grid-${i}`, 'grid-fin',
      grids.area / grids.count, d * .46, Math.sin(GRID_AZIMUTH + i * 2 * Math.PI / grids.count),
      grids.station, r, root, false));
  }
  for (const p of parts) if (!(p.station >= 0 && p.station <= h))
    throw new RangeError('Component centroid outside the hull');

  const hullMass = mass - parts.reduce((sum, p) => sum + p.mass, 0);
  if (!(hullMass > 0)) throw new RangeError('No positive hull mass remains');
  const hullCentre = (mass * centre - parts.reduce((sum, p) => sum + p.mass * p.station, 0)) / hullMass;
  // Cancel only roundoff in symmetric appendage projections. This is also
  // explicit transverse first-moment accounting for future asymmetric loss.
  const hullX = -parts.reduce((sum, p) => sum + p.mass * p.x, 0) / hullMass;
  const dryInertia = mass * (r ** 2 / 4 + h ** 2 / 12);
  const otherInertia = parts.reduce((sum, p) => sum + p.inertia
    + p.mass * (p.x ** 2 + (p.station - centre) ** 2), 0);
  const hullIntrinsic = dryInertia - otherInertia
    - hullMass * (hullX ** 2 + (hullCentre - centre) ** 2);
  const variance = hullIntrinsic / hullMass - r ** 2 / 4;
  const lower = h * (ship ? .055 : .05), upper = h * (ship ? .72 : .93);
  const split = h * (ship ? .30 : .50);
  const maxVariance = (hullCentre - lower) * (upper - hullCentre);
  if (!(hullCentre > lower && hullCentre < upper && variance > 0 && variance < maxVariance))
    throw new RangeError('Hull residual moments have no positive supported partition');
  const mix = variance / maxVariance;
  const lowMass = hullMass * mix * (upper - hullCentre) / (upper - lower);
  const highMass = hullMass * mix * (hullCentre - lower) / (upper - lower);
  const centreMass = hullMass - lowMass - highMass;
  const hullSlices = [slice('structure', lowMass, hullX, lower, lowMass * r ** 2 / 4),
    slice('structure', centreMass, hullX, hullCentre, centreMass * r ** 2 / 4),
    slice('structure', highMass, hullX, upper, highMass * r ** 2 / 4)];
  const prefix = ship ? 'ship' : 'booster';
  const aft = component(`${prefix}-hull-aft`, 'hull', hullSlices.filter(s => s.station < split));
  const forward = component(`${prefix}-hull-forward`, 'hull', hullSlices.filter(s => s.station >= split));
  parts.push(aft, forward);
  return Object.freeze({ id: model.id, dryMass: mass, dryCentreOfMassX: 0, dryCentreOfMass: centre,
    dryMomentOfInertia: dryInertia, hullThermalMass: aft.mass + forward.mass,
    rootSection: root, components: Object.freeze(parts) });
}
