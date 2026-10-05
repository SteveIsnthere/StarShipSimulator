/** Physical substantial debris, approved Phase8 Fidelity surrogate.
 * Pieces use their source mass centroid/inertia and receive no separation kick.
 * Authored drag: fully presented source geometry envelope with the existing
 * body Mach law (and existing1.8 plate multiplier). This is neither measured
 * fragment Cd nor a claim that tumbling drag is always this large. No lift,
 * aerodynamic torque, heating, fracture or further material loss is modeled.
 * Air is still in the existing rotating ground frame; wind is omitted here.
 * Enclosing-sphere contact is intentionally coarse, perfectly inelastic and
 * non-rebounding; its radius prevents geometric penetration at every pitch.
 * Parent advances existing slots first: newly born endpoint pieces start next
 * tick. Bounded O(component count) work also supports .05/.25s forecasts;
 * analytic drag is stable at any positive dt, while gravity/ISA accuracy still
 * requires timestep refinement. No mutable scratch escapes into simulation.
 */
import type { DamageState, DamageDebrisState } from '../damage-state';
import type { VehicleDefinition } from '../vehicle';
import type { VehicleComponentPartition } from './vehicle-components';
import { planetRadius } from '../constants';
import { rad } from '../units';
import { isaAtmosphereInto } from './isa';
import { speedOfSoundAt } from './atmosphere';
import { getBodyDragCoefficient } from './aero';
import { tangentialAcceleration, verticalGravityAcceleration } from './gravity';

export interface DamageDebrisPieceModel {
  readonly mass: number;
  readonly inertia: number;
  /** m² — broad surface and edge/end envelope, both derived at startup. */
  readonly broadsideArea: number;
  readonly dragArea: number;
  readonly dragMultiplier: number;
  /** m — enclosing source geometry about physical mass centroid. */
  readonly supportRadius: number;
}
export interface DamageDebrisModel {
  readonly pieces: readonly DamageDebrisPieceModel[];
}

/** Startup-only geometry. Structural lengths match the catalogue's authored
 * package/nose/ring extents and hull split; residual moment slices do not
 * independently manufacture a new solid fragment. Appendage dimensions use
 * the selected vehicle's area/span, including their allocated root envelope.
 */
export function createDamageDebrisModel(partition: VehicleComponentPartition,
  vehicle: VehicleDefinition): DamageDebrisModel {
  if (partition.id !== vehicle.id || partition.dryMass !== vehicle.dryMass)
    throw new RangeError('Debris requires matching source vehicle inventory');
  const d = vehicle.diameter, h = vehicle.height, ship = vehicle.id === 'ship';
  const pieces = partition.components.map(c => {
    let broadsideArea: number, dragArea: number, supportRadius: number;
    const appendage = c.kind === 'flap' || c.kind === 'grid-fin';
    if (appendage) {
      const front = c.id.startsWith('ship-front');
      const span = d * (c.kind === 'grid-fin' || !front ? .46 : .34);
      broadsideArea = c.kind === 'grid-fin'
        ? vehicle.gridFins!.area / vehicle.gridFins!.count
        : (front ? vehicle.frontFinArea : vehicle.aftFinArea) / 2;
      const chord = broadsideArea / span;
      // Solid-equivalent4mm panel thickness is the same authored catalogue
      // assumption, not physical grid porosity or a new flight calibration.
      const panelThickness = .004;
      dragArea = broadsideArea + panelThickness * (span + chord)
        + partition.rootSection.heatArea;
      supportRadius = 0;
      for (const slice of c.slices) {
        const bound = slice.role === 'structure' ? Math.hypot(span, chord) / 2
          : Math.hypot(partition.rootSection.length,
            partition.rootSection.heatArea / partition.rootSection.length) / 2;
        supportRadius = Math.max(supportRadius,
          Math.hypot(slice.x - c.x, slice.station - c.station) + bound);
      }
    } else {
      let length: number, width = d;
      if (c.kind === 'engine-support') length = h * (ship ? .035 : .03);
      else if (c.kind === 'nose') { length = .08 * h; width = .4 * d; }
      else if (c.kind === 'hot-stage') length = .05 * h;
      else length = h * (c.id.endsWith('-aft') ? (ship ? .30 : .50) : (ship ? .70 : .50));
      broadsideArea = width * length;
      dragArea = broadsideArea + Math.PI * width * width / 4;
      // Slice centroids may differ from the enclosing section's geometric
      // centre. Include the farthest source slice to keep the bound enclosing.
      let offset = 0;
      for (const slice of c.slices) offset = Math.max(offset,
        Math.hypot(slice.x - c.x, slice.station - c.station));
      supportRadius = offset + Math.hypot(width, length) / 2;
    }
    if (!(c.mass > 0 && c.inertia > 0 && dragArea > 0 && supportRadius > 0)
      || !Number.isFinite(c.mass + c.inertia + dragArea + supportRadius))
      throw new RangeError('Debris source geometry must be positive and finite');
    return Object.freeze({ mass: c.mass, inertia: c.inertia, broadsideArea,
      dragArea, supportRadius, dragMultiplier: appendage ? 1.8 : 1 });
  });
  return Object.freeze({ pieces: Object.freeze(pieces) });
}

const atmosphere = { airDensity: 0, airTemperature: 0, airPressure: 0 };

/** Exact still-air quadratic-drag solution with frozen beta=ρCdA/(2m), m⁻¹.
 * Returns specific aerodynamic work in J/kg, always nonpositive. Direction
 * cannot reverse even at a coarse timestep or extremely strong drag.
 */
export function dissipateDebrisDrag(piece: DamageDebrisState, beta: number, dt: number): number {
  if (!(beta >= 0 && dt >= 0) || !Number.isFinite(beta + dt))
    throw new RangeError('Debris drag requires finite nonnegative coefficient and time');
  const speed = Math.hypot(piece.speedX, piece.speedY);
  const factor = 1 / (1 + beta * speed * dt);
  piece.speedX *= factor;
  piece.speedY *= factor;
  return -.5 * speed * speed * (1 - factor) * (1 + factor);
}

function drag(piece: DamageDebrisState, model: DamageDebrisPieceModel, dt: number): void {
  isaAtmosphereInto(piece.altitude, atmosphere);
  const speed = Math.hypot(piece.speedX, piece.speedY);
  const cd = getBodyDragCoefficient(speed / speedOfSoundAt(atmosphere.airTemperature));
  dissipateDebrisDrag(piece, atmosphere.airDensity * cd * model.dragMultiplier * model.dragArea / (2 * model.mass), dt);
}

/** Mutates only pre-existing active centroid poses. Inactive slots, ownership,
 * thermal state, terminal payload and event counters are never touched.
 */
export function advanceDamageDebris(state: DamageState, model: DamageDebrisModel, dt: number): void {
  if (!(dt >= 0) || !Number.isFinite(dt) || state.debris.length !== model.pieces.length)
    throw new RangeError('Debris advance requires matching inventory and finite nonnegative time');
  // Validate every active slot before any slot moves.
  for (let i = 0; i < state.debris.length; i++) {
    const p = state.debris[i]!;
    if (p.componentIndex !== i || (p.active && !Number.isFinite(
      p.x + p.altitude + p.speedX + p.speedY + p.pitch + p.angularVelocity)))
      throw new RangeError('Debris active pose and source index must be finite and valid');
  }
  if (dt === 0) return;
  for (let i = 0; i < state.debris.length; i++) {
    const p = state.debris[i]!;
    if (!p.active) continue;
    const m = model.pieces[i]!;
    if (p.altitude <= m.supportRadius) {
      p.altitude = m.supportRadius;
      p.speedX = p.speedY = p.angularVelocity = 0;
      continue;
    }
    drag(p, m, dt / 2);
    const x = p.x, y = p.altitude, vx = p.speedX, vy = p.speedY;
    const r = planetRadius + y;
    const ax = tangentialAcceleration(r, vx, vy), ay = verticalGravityAcceleration(r, vx);
    const nextX = x + vx * dt + .5 * ax * dt * dt;
    const nextY = y + vy * dt + .5 * ay * dt * dt;
    if (nextY <= m.supportRadius) {
      // Locate contact on this discrete chord; no restitution/friction kick.
      const fraction = (y - m.supportRadius) / (y - nextY);
      p.x = x + (nextX - x) * fraction;
      p.altitude = m.supportRadius;
      p.pitch = rad(p.pitch + p.angularVelocity * dt * fraction);
      p.speedX = p.speedY = p.angularVelocity = 0;
      continue;
    }
    const nextR = planetRadius + nextY;
    p.x = nextX; p.altitude = nextY;
    p.speedX = vx + .5 * (ax + tangentialAcceleration(nextR, vx + ax * dt, vy + ay * dt)) * dt;
    p.speedY = vy + .5 * (ay + verticalGravityAcceleration(nextR, vx + ax * dt)) * dt;
    p.pitch = rad(p.pitch + p.angularVelocity * dt);
    drag(p, m, dt / 2);
  }
}
