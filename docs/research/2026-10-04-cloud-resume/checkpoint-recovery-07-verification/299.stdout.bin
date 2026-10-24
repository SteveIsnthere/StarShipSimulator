/** Approved R2 endpoint ownership/reference transformation, not a force step.
 * The supplied physical COM pose is already advanced to the loss event. Never
 * apply its new mass/authority retroactively to the preceding interval.
 *
 * Authored articulation is a frozen-mass surrogate: loaded angles do not move
 * lumped centroids or change intrinsic inertia. Detached pieces keep the body's
 * orientation/spin; their separate stored articulation remains unchanged.
 * No impulse, random kick, heat transfer or propellant release is invented.
 */
import { ComponentFailure, MAX_DAMAGE_COMPONENTS, type DamageState } from '../damage-state';
import type { VehicleDefinition } from '../vehicle';
import type { Rad } from '../units';
import type { VehicleComponentPartition } from './vehicle-components';
import { createDamageMassProperties, writeDamageMass, type DamageMassProperties } from './damage-mass';

export interface PhysicalCOMPose {
  /** m — current physical COM in world downrange/altitude coordinates. */
  x: number;
  altitude: number;
  /** rad — clockwise orientation from upright. */
  pitch: Rad;
  /** m/s — world physical-COM velocity. */
  vx: number;
  vy: number;
  /** rad/s — clockwise spin. */
  omega: number;
}

export interface DetachmentScratch {
  before: DamageMassProperties;
  after: DamageMassProperties;
}

/** Allocate once per independently advanced body/rollout. */
export function createDetachmentScratch(): DetachmentScratch {
  return { before: createDamageMassProperties(), after: createDamageMassProperties() };
}

/**
 * Commit fresh mask bits once, returning the actual committed bitmask.
 * Rebase pose to the retained wet COM with the same rigid velocity field.
 * An empty survivor has no COM, so its unused pose remains unchanged.
 * revision advances once per nonempty batch; eventCount counts its pieces.
 * Existing thermal nodes/fuel and terminal ledger are deliberately untouched.
 * Successful calls allocate nothing and reuse fixed source-index debris slots.
 */
export function detachComponents(state: DamageState, partition: VehicleComponentPartition,
  model: VehicleDefinition, propellantMass: number, pose: PhysicalCOMPose,
  mask: number, reason: ComponentFailure, scratch: DetachmentScratch): number {
  const count = partition.components.length;
  if (count < 1 || count > MAX_DAMAGE_COMPONENTS || state.components.length !== count || state.debris.length !== count
    || !Number.isInteger(mask) || mask < 0 || mask > (1 << count) - 1)
    throw new RangeError('Detachment requires a bounded matching component mask');
  if (scratch.before === scratch.after)
    throw new RangeError('Detachment mass snapshots require distinct scratch');
  if (!Number.isFinite(pose.x) || !Number.isFinite(pose.altitude) || !Number.isFinite(pose.pitch)
    || !Number.isFinite(pose.vx) || !Number.isFinite(pose.vy) || !Number.isFinite(pose.omega))
    throw new RangeError('Detachment requires a finite physical COM pose');
  let committed = 0, losses = 0;
  for (let i = 0; i < count; i++) if ((mask & (1 << i)) !== 0 && state.components[i]!.attached) {
    const slot = state.debris[i]!;
    if (slot.active || slot.componentIndex !== i)
      throw new RangeError('An attached component cannot already have a debris owner');
    committed |= 1 << i;
    losses++;
  }
  if (committed === 0) return 0;
  if (reason !== ComponentFailure.ProofExceeded && reason !== ComponentFailure.MaterialDomain && reason !== ComponentFailure.Terminal)
    throw new RangeError('Detachment requires a permanent connection disposition');
  // Validate model, fuel and all catalogue indices before any ownership change.
  writeDamageMass(state, partition, propellantMass, model, scratch.before);
  if (!scratch.before.hasMass) throw new RangeError('Cannot detach from an empty physical owner');
  const before = scratch.before;
  const cosine = Math.cos(pose.pitch), sine = Math.sin(pose.pitch);
  for (let i = 0; i < count; i++) if ((committed & (1 << i)) !== 0) {
    const definition = partition.components[i]!;
    const component = state.components[i]!;
    const slot = state.debris[i]!;
    const dx = definition.x - before.centreOfMassX;
    const dz = definition.station - before.centreOfMass;
    // Body-right=(cos,-sin), body-up=(sin,cos), for clockwise pitch.
    const rx = cosine * dx + sine * dz;
    const ry = -sine * dx + cosine * dz;
    slot.x = pose.x + rx;
    slot.altitude = pose.altitude + ry;
    slot.pitch = pose.pitch;
    slot.speedX = pose.vx + pose.omega * ry;
    slot.speedY = pose.vy - pose.omega * rx;
    slot.angularVelocity = pose.omega;
    slot.active = true;
    component.attached = false;
    if (component.permanentFailure === ComponentFailure.None) component.permanentFailure = reason;
  }
  writeDamageMass(state, partition, propellantMass, model, scratch.after);
  if (scratch.after.hasMass) {
    const dx = scratch.after.centreOfMassX - before.centreOfMassX;
    const dz = scratch.after.centreOfMass - before.centreOfMass;
    const rx = cosine * dx + sine * dz;
    const ry = -sine * dx + cosine * dz;
    pose.x += rx;
    pose.altitude += ry;
    pose.vx += pose.omega * ry;
    pose.vy -= pose.omega * rx;
  }
  state.revision++;
  state.eventCount += losses;
  return committed;
}
