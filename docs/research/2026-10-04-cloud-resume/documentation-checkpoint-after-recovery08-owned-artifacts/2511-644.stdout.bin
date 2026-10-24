import { describe, expect, it } from 'vitest';
import { createInitialState, cloneState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { step } from '$core/step';
import { rad } from '$core/units';
import { damageModelFor } from '$core/physics/damage-model';
import { createDamageMassProperties, writeDamageMass } from '$core/physics/damage-mass';
import { captureDamageTerminal, DamageTerminalReason } from '$core/physics/damage-terminal';

describe('terminal release before legacy shutdown', () => {
  it('preserves the last paid thrust only on the failure interval', () => {
    const s = createInitialState(123, SHIP);
    s.kinematics.altitude = 10000;
    s.kinematics.speedX = 2000;
    s.vehicle.throttle = s.vehicle.throttleCurrent = 100;
    s.engines.running.fill(true);
    const failed = step(s, 1 / 120);
    expect(failed.damage!.terminal.active).toBe(true);
    expect(failed.forces.thrust).toBeGreaterThan(0);
    expect(Math.hypot(failed.forces.paidThrustAccelerationX, failed.forces.paidThrustAccelerationY)).toBeGreaterThan(0);
    const next = step(failed, 1 / 120);
    expect(next.forces.thrust).toBe(0);
    expect(next.forces.thrustAcceleration).toBe(0);
    expect(next.forces.paidThrustAccelerationX).toBe(0);
    expect(next.forces.paidThrustAccelerationY).toBe(0);
    expect(next.forces.thrustVectorAcceleration).toBe(0);
    expect(next.forces.offAxisThrustDifferenceAcceleration).toBe(0);
    expect(next.damage!.terminal).toEqual(failed.damage!.terminal);
  });
  it('does not freeze an uninitialized pitch-rate infinity in a first-tick pressure failure', () => {
    const s = createInitialState(123, SHIP);
    s.kinematics.speedX = 286.0712560432027;
    s.vehicle.propellantMass = 0;
    const next = step(s, 1 / 120, {}, SHIP);
    expect(next.damage!.terminal.active).toBe(true);
    expect(Number.isFinite(next.kinematics.pitchRateOfChange)).toBe(true);
    expect(next.kinematics.pitchRateOfChange).toBe(0);
  });
  it('captures incoming impact motion before reset and advances only fragments afterward', () => {
    const s = createInitialState(123, SHIP);
    s.kinematics.altitude = 20;
    s.kinematics.speedX = 40; s.kinematics.speedY = -30;
    s.kinematics.angularVelocity = .4;
    s.forces.paidThrustAccelerationX = 7; s.forces.paidThrustAccelerationY = 9;
    const impact = step(s, 1 / 120, {}, SHIP);
    expect(impact.failures.crashed).toBe(true);
    expect(impact.forces.paidThrustAccelerationX).toBe(0);
    expect(impact.forces.paidThrustAccelerationY).toBe(0);
    expect(impact.damage!.terminal.reason).toBe(DamageTerminalReason.Impact);
    expect(impact.damage!.terminal.angularVelocity).toBe(.4);
    expect(impact.kinematics.angularVelocity).toBe(0);
    expect(impact.vehicle.vehicleMass).toBe(0);
    const next = step(impact, 1 / 120, {}, SHIP);
    expect(next.damage!.terminal).toEqual(impact.damage!.terminal);
    expect(next.damage!.revision).toBe(impact.damage!.revision);
    expect(next.vehicle.vehicleMass).toBe(0);
    expect(next.damage!.debris.some((p, i) => p.x !== impact.damage!.debris[i]!.x)).toBe(true);
  });
  it('keeps the terminal event once when pressure and temperature fail together', () => {
    const s = createInitialState(123, SHIP);
    s.kinematics.altitude = 1000; s.kinematics.distanceToPlanetCenter = 6372000;
    s.kinematics.speedY = -3000; s.kinematics.angularVelocity = .1;
    s.status.onTheGround = false;
    const next = step(s, 1 / 120, {}, SHIP);
    expect(next.failures.inFlightBreakUp).toBe(true);
    expect(next.damage!.terminal.reason & DamageTerminalReason.Pressure).not.toBe(0);
    expect(next.damage!.terminal.reason & DamageTerminalReason.Temperature).not.toBe(0);
    expect(next.damage!.terminal.time).toBe(1 / 120);
    expect(next.damage!.revision).toBe(1);
    expect(next.damage!.eventCount).toBe(damageModelFor(SHIP).partition.components.length);
    expect(next.damage!.debris.every(p => Number.isFinite(p.speedX + p.speedY + p.angularVelocity))).toBe(true);
  });
  it('partitions moving spinning dry structure and retained fuel without an impulse or duplicate owner', () => {
    const s = createInitialState(123, SHIP), model = damageModelFor(SHIP);
    s.kinematics.altitude = 30000; s.kinematics.downRangeDistance = 200;
    s.kinematics.pitch = rad(.7); s.kinematics.angularVelocity = .3;
    s.kinematics.speedX = 140; s.kinematics.speedY = -300;
    s.vehicle.propellantMass = 12000;
    const before = cloneState(s), mass = createDamageMassProperties();
    writeDamageMass(s.damage!, model.partition, s.vehicle.propellantMass, SHIP, mass);
    const dx = mass.centreOfMassX, dz = mass.centreOfMass - SHIP.height / 2;
    const rx = Math.cos(s.kinematics.pitch) * dx + Math.sin(s.kinematics.pitch) * dz;
    const ry = -Math.sin(s.kinematics.pitch) * dx + Math.cos(s.kinematics.pitch) * dz;
    const vx = s.kinematics.speedX + .3 * ry, vy = s.kinematics.speedY - .3 * rx;
    captureDamageTerminal(s, SHIP, DamageTerminalReason.Impact, s.world.environmentTime);
    const event = s.damage!.terminal;
    expect(event.active).toBe(true);
    expect(event.angularVelocity).toBe(.3);
    expect(event.retainedPropellant).toBe(12000);
    expect(s.vehicle.propellantMass).toBe(0);
    expect(s.damage!.components.every(c => !c.attached)).toBe(true);
    let px = event.releasedMomentumX, py = event.releasedMomentumY;
    let angular = event.releasedAngularMomentum;
    let energy = event.releasedKineticEnergy;
    let dryMass = 0;
    for (const part of s.damage!.debris) {
      expect(part.active).toBe(true);
      const c = model.partition.components[part.componentIndex]!;
      dryMass += c.mass;
      px += c.mass * part.speedX; py += c.mass * part.speedY;
      angular += c.inertia * part.angularVelocity
        + (part.altitude - event.altitude) * c.mass * part.speedX
        - (part.x - event.x) * c.mass * part.speedY;
      energy += .5 * c.mass * (part.speedX ** 2 + part.speedY ** 2)
        + .5 * c.inertia * part.angularVelocity ** 2;
    }
    expect(dryMass + event.retainedPropellant).toBeCloseTo(mass.totalMass, 8);
    expect(px).toBeCloseTo(mass.totalMass * vx, 6);
    expect(py).toBeCloseTo(mass.totalMass * vy, 6);
    expect(angular).toBeCloseTo(mass.momentOfInertia * .3, 4);
    expect(energy).toBeCloseTo(.5 * mass.totalMass * (vx ** 2 + vy ** 2) + .5 * mass.momentOfInertia * .3 ** 2, 4);
    expect(s.kinematics).toEqual(before.kinematics); // capture precedes shutdown
    const once = cloneState(s);
    captureDamageTerminal(s, SHIP, DamageTerminalReason.Pressure, 99);
    expect(s).toEqual(once);
  });
});
