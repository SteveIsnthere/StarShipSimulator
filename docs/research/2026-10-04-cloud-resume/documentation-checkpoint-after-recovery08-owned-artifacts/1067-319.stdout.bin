/** First terminal boundary. Dry hardware becomes its original physical pieces;
 * retained mixture becomes an explicit released-material ledger, not extra
 * rigid debris or an invented chemical explosion impulse. Capture precedes all
 * legacy velocity/fuel resets. All public live poses refer to the hull centre.
 */
import type { SimState } from '../state';
import { gLimit, TILE_LIMIT_KELVIN, dynamicPressureLimit } from '../constants';
import type { VehicleDefinition } from '../vehicle';
import { ComponentFailure } from '../damage-state';
import { rad } from '../units';
import { damageModelFor } from './damage-model';
import { createDamageMassProperties, writeDamageMass } from './damage-mass';
import { createDetachmentScratch, detachComponents, type PhysicalCOMPose } from './damage-detachment';

export enum DamageTerminalReason {
  Impact = 1,
  Pressure = 2,
  Temperature = 4,
  Acceleration = 8,
  MaterialDomain = 16,
}
const retained = createDamageMassProperties();
const scratch = createDetachmentScratch();
const pose: PhysicalCOMPose = { x: 0, altitude: 0, pitch: rad(0), vx: 0, vy: 0, omega: 0 };

/** Called only after the paid failure interval, or before an incoming impact
 * can spend fuel. Keep event diagnostics, but never report phantom propulsion. */
export function clearTerminalPropulsion(state: SimState): void {
  const f = state.forces;
  state.engines.running.fill(false);
  state.engines.ignitionCountdown.fill(null);
  f.thrust = f.thrustAcceleration = f.twr = 0;
  f.paidThrustAccelerationX = f.paidThrustAccelerationY = 0;
  f.thrustVectorForce = f.thrustVectorAcceleration = 0;
  f.offAxisThrustDifferenceAcceleration = 0;
  f.rcsThrust = f.rcsThrustAngularAcceleration = 0;
}

export function captureDamageTerminal(state: SimState, model: VehicleDefinition, reason: number, time: number): void {
  const damage = state.damage;
  if (!damage || damage.terminal.active) return;
  const partition = damageModelFor(model).partition, k = state.kinematics;
  writeDamageMass(damage, partition, state.vehicle.propellantMass, model, retained);
  const sin = Math.sin(k.pitch), cos = Math.cos(k.pitch);
  const dx = retained.centreOfMassX, dz = retained.centreOfMass - model.height / 2;
  const rx = cos * dx + sin * dz, ry = -sin * dx + cos * dz;
  pose.x = k.downRangeDistance + rx; pose.altitude = k.altitude + ry;
  pose.pitch = k.pitch; pose.omega = k.angularVelocity;
  pose.vx = k.speedX + pose.omega * ry; pose.vy = k.speedY - pose.omega * rx;
  const event = damage.terminal;
  event.reason = reason; event.time = time;
  event.x = pose.x; event.altitude = pose.altitude; event.pitch = pose.pitch;
  event.speedX = pose.vx; event.speedY = pose.vy; event.angularVelocity = pose.omega;
  event.retainedDryMass = retained.retainedDryMass;
  event.retainedPropellant = retained.propellantMass;
  // Root/TPS nodes stay owned by their source pieces. The one residual hull
  // energy remains the common ledger of its two source hull pieces. This model
  // has no propellant thermal/chemical energy, so no such energy is fabricated.
  event.releasedEnergy = 0;
  const mask = (1 << partition.components.length) - 1;
  detachComponents(damage, partition, model, state.vehicle.propellantMass, pose,
    mask, ComponentFailure.Terminal, scratch);
  writeDamageMass(damage, partition, state.vehicle.propellantMass, model, retained);
  // After all dry loss, the surviving scratch owner consists of mixture only.
  const fuel = retained.totalMass;
  event.releasedMomentumX = fuel * pose.vx;
  event.releasedMomentumY = fuel * pose.vy;
  event.releasedAngularMomentum = retained.momentOfInertia * pose.omega
    + (pose.altitude - event.altitude) * event.releasedMomentumX
    - (pose.x - event.x) * event.releasedMomentumY;
  event.releasedKineticEnergy = .5 * fuel * (pose.vx ** 2 + pose.vy ** 2)
    + .5 * retained.momentOfInertia * pose.omega ** 2;
  state.engines.running.fill(false);
  state.engines.failed.fill(true);
  state.engines.ignitionCountdown.fill(null);
  state.vehicle.propellantMass = 0;
  state.vehicle.vehicleMass = 0;
  state.vehicle.vehicleMomentOfInertia = 0;
  event.active = true;
}

/** Independent existing global stops, plus explicit material-domain terminal. */
export function damageTerminalReason(state: SimState): number {
  return (state.forces.perceivedG > gLimit ? DamageTerminalReason.Acceleration : 0)
    | (state.forces.surfaceTemperature > TILE_LIMIT_KELVIN ? DamageTerminalReason.Temperature : 0)
    | (state.forces.dynamicPressure > dynamicPressureLimit ? DamageTerminalReason.Pressure : 0)
    | (state.damage && !state.damage.hull.valid ? DamageTerminalReason.MaterialDomain : 0);
}
