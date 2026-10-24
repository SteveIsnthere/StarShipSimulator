/** Canonical retained-hardware inputs for real steps and direct authority probes.
 * Only the explicit articulation writer mutates damage state. Scratch results
 * are consumed synchronously and never stored in a live/forecast state.
 */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { finActuationMaxAngle } from '../constants';
import { ComponentFailure, MAX_DAMAGE_COMPONENTS } from '../damage-state';
import { rad, type Rad } from '../units';
import { damageModelFor } from './damage-model';
import { createDamageMassProperties, writeDamageMass } from './damage-mass';
import { createDamageControlForces, writeDamageControls } from './damage-controls';
import type { MassProperties } from './mass';
import { writeFlightMassQuery } from './flight-mass-query';
import { writeGridFinForces, type GridFinForces } from './grid-fins';
import { advanceDamageHeat, HULL_THERMAL_DOMAIN_BIT } from './damage-thermal';
import { createDetachmentScratch, detachComponents, type PhysicalCOMPose } from './damage-detachment';
import { radiativeSinkKelvin } from './thermal';
import { captureDamageTerminal, damageTerminalReason } from './damage-terminal';

const mass = createDamageMassProperties();
const controls = createDamageControlForces(MAX_DAMAGE_COMPONENTS);

/** Retain installed failed engines' mass, but never restore detached structure. */
export function writeFlightMass(state: SimState, model: VehicleDefinition, out?: MassProperties): void {
  writeFlightMassQuery(state, model, mass, out);
  state.vehicle.vehicleMass = mass.totalMass;
  if (state.damage || out) state.vehicle.vehicleMomentOfInertia = mass.momentOfInertia;
}

/** Call before fuel payment and ignition. A missing package cannot consume fuel. */
export function enforceEngineSupport(state: SimState, model: VehicleDefinition): void {
  if (!state.damage) return;
  writeDamageMass(state.damage, damageModelFor(model).partition, state.vehicle.propellantMass, model, mass);
  if (mass.engineSupportAvailable) return;
  state.engines.running.fill(false);
  state.engines.failed.fill(true);
  state.engines.ignitionCountdown.fill(null);
}

function evaluateControls(state: SimState, model: VehicleDefinition, q: number, incidence: number, gridCommand?: number): void {
  const front = model.gridFins
    ? gridCommand ?? (state.vehicle.frontFinExtension - 50) / 50 * model.gridFins.maxAngle
    : state.vehicle.frontFinExtension * .01 * finActuationMaxAngle;
  writeDamageControls(state.damage!, damageModelFor(model).controls, q, incidence,
    front, state.vehicle.aftFinExtension * .01 * finActuationMaxAngle, controls);
}

/** Store delivered articulation and canonical surviving plate-area fractions. */
export function writeFlightFinAreas(state: SimState, model: VehicleDefinition, q: number, incidence: number): void {
  if (!state.damage) return;
  evaluateControls(state, model, q, incidence);
  for (let i = 0; i < state.damage.components.length; i++) {
    const component = state.damage.components[i]!;
    if (component.attached) component.loadedAngle = rad(controls.loadedAngles[i]!);
  }
  state.forces.frontFinEffectiveAreaFraction = controls.frontFraction;
  state.forces.aftFinEffectiveAreaFraction = controls.aftFraction;
  state.vehicle.vehicleInFlightMaxArea = model.maxArea + 1.8 * (controls.frontArea + controls.aftArea);
}

/** Same grid law, resolved per surviving root about the actual transverse COM.
 * A proposed attitude probe calls this without changing actual articulation. */
export function writeFlightGridForces(state: SimState, rho: number, vx: number, vy: number,
  pitch: Rad, properties: MassProperties, model: VehicleDefinition, out: GridFinForces, gridCommand?: Rad): void {
  if (!state.damage) {
    writeGridFinForces(rho, vx, vy, gridCommand ?? rad((state.vehicle.frontFinExtension - 50) / 50 * (model.gridFins?.maxAngle ?? 0)),
      pitch, properties.centreOfMass, model, out);
    return;
  }
  out.forceX = out.forceY = out.torque = out.drag = out.lift = 0;
  const grid = model.gridFins, speed = Math.hypot(vx, vy);
  if (!grid || rho <= 0 || speed === 0) return;
  const q = .5 * rho * speed * speed;
  evaluateControls(state, model, q, 0, gridCommand);
  const catalogue = damageModelFor(model).partition.components;
  const sin = Math.sin(pitch), cos = Math.cos(pitch);
  for (let i = 0; i < catalogue.length; i++) {
    const part = catalogue[i]!;
    if (part.kind !== 'grid-fin' || !state.damage.components[i]!.attached
      || ((controls.proofMask | controls.domainMask) & (1 << i)) !== 0) continue;
    const a = controls.loadedAngles[i]!;
    const lift = q * grid.area / grid.count * Math.sin(2 * a);
    const drag = q * grid.area / grid.count * 1.2 * Math.sin(a) ** 2;
    const fx = (-vy * lift - vx * drag) / speed, fy = (vx * lift - vy * drag) / speed;
    const dx = part.x - properties.centreOfMassX, dz = part.station - properties.centreOfMass;
    const rx = cos * dx + sin * dz, ry = -sin * dx + cos * dz;
    out.forceX += fx; out.forceY += fy;
    out.lift += lift; out.drag += drag;
    out.torque += ry * fx - rx * fy;
  }
}

const detachment = createDetachmentScratch();
const endpointPose: PhysicalCOMPose = { x: 0, altitude: 0, pitch: rad(0), vx: 0, vy: 0, omega: 0 };

/** End-of-interval loss transaction. Call after all paid mechanical forces,
 * before changing actuator commands. Hull coordinates remain fixed material
 * coordinates; a mass-reference caller is rebased to the surviving wet COM.
 * The returned hull-domain bit requires the caller's terminal disposition.
 * This function does not advance existing debris or erase a paid impulse.
 */
export function advanceFlightDamage(state: SimState, dt: number, model: VehicleDefinition,
  reference: 'mass' | 'hull'): number {
  const damage = state.damage;
  if (!damage || damage.terminal.active) return 0;
  const catalogue = damageModelFor(model);
  const thermalMask = advanceDamageHeat(damage, catalogue.thermal, dt,
    state.forces.thermalPower,
    radiativeSinkKelvin(state.kinematics.altitude, state.atmosphere.airTemperature),
    state.atmosphere.airPressure * 1000);
  // Global terminal takes precedence over individual proof losses at this
  // endpoint; all still-attached pieces transfer once from the same rigid body.
  const terminalReason = damageTerminalReason(state);
  if (terminalReason !== 0) {
    if (reference !== 'hull') throw new RangeError('Terminal live state must publish its hull reference');
    captureDamageTerminal(state, model, terminalReason, state.world.environmentTime + dt);
    return thermalMask;
  }
  evaluateControls(state, model, state.forces.dynamicPressure * 1000,
    Math.abs(Math.sin(state.kinematics.angleInToTheWind)));
  const domainMask = (thermalMask & ~HULL_THERMAL_DOMAIN_BIT) | controls.domainMask;
  const proofMask = controls.proofMask & ~domainMask;
  // Preserve actual endpoint articulation on the departing original component.
  for (let i = 0; i < damage.components.length; i++) {
    const component = damage.components[i]!;
    if (component.attached && (domainMask & (1 << i)) === 0)
      component.loadedAngle = rad(controls.loadedAngles[i]!);
  }
  if ((domainMask | proofMask) === 0) return thermalMask;
  writeDamageMass(damage, catalogue.partition, state.vehicle.propellantMass, model, mass);
  const k = state.kinematics, sin = Math.sin(k.pitch), cos = Math.cos(k.pitch);
  const dx = reference === 'hull' ? mass.centreOfMassX : 0;
  const dz = reference === 'hull' ? mass.centreOfMass - model.height / 2 : 0;
  const rx = cos * dx + sin * dz, ry = -sin * dx + cos * dz;
  endpointPose.x = k.downRangeDistance + rx;
  endpointPose.altitude = k.altitude + ry;
  endpointPose.pitch = k.pitch;
  endpointPose.vx = k.speedX + k.angularVelocity * ry;
  endpointPose.vy = k.speedY - k.angularVelocity * rx;
  endpointPose.omega = k.angularVelocity;
  const revision = damage.revision;
  let committed = detachComponents(damage, catalogue.partition, model, state.vehicle.propellantMass,
    endpointPose, domainMask, ComponentFailure.MaterialDomain, detachment);
  committed |= detachComponents(damage, catalogue.partition, model, state.vehicle.propellantMass,
    endpointPose, proofMask, ComponentFailure.ProofExceeded, detachment);
  // Distinct reasons can share one endpoint transaction and forecast epoch.
  if (committed !== 0) damage.revision = revision + 1;
  if (reference === 'mass') {
    k.downRangeDistance = endpointPose.x;
    k.downRangeDistanceNextFrame = endpointPose.x;
    k.altitude = endpointPose.altitude;
    k.speedX = endpointPose.vx;
    k.speedY = endpointPose.vy;
  }
  writeFlightMass(state, model);
  enforceEngineSupport(state, model);
  return committed | (thermalMask & HULL_THERMAL_DOMAIN_BIT);
}
