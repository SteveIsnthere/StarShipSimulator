import { describe, expect, it } from 'vitest';
import { createInitialState, cloneState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { step } from '$core/step';
import { rad } from '$core/units';
import { engineThrust } from '$core/physics/propulsion';
import { gimbalAngleLimit } from '$core/constants';
import { createDamageMassProperties, writeDamageMass } from '$core/physics/damage-mass';
import { damageModelFor } from '$core/physics/damage-model';

describe('actual flight respects remaining hardware', () => {
  function flying(booster = false) {
    const model = booster ? SUPER_HEAVY : SHIP;
    const s = createInitialState(123, model);
    s.kinematics.altitude = 30000;
    s.kinematics.distanceToPlanetCenter = 6371000 + 30000;
    s.kinematics.speedY = -100;
    s.kinematics.pitch = rad(Math.PI / 2);
    s.kinematics.pitchRecord.fill(s.kinematics.pitch);
    s.status.onTheGround = false;
    return { s, model, partition: damageModelFor(model).partition };
  }
  it('does not restore a detached flap mass when propellant bookkeeping runs', () => {
    const { s, model, partition } = flying();
    const i = partition.components.findIndex(p => p.id === 'ship-front-flap-left');
    s.vehicle.frontFinExtension = 75;
    const intact = step(s, 1 / 120, {}, model);
    s.damage!.components[i]!.attached = false;
    const next = step(s, 1 / 120, {}, model);
    expect(next.vehicle.vehicleMass).toBeCloseTo(model.dryMass + next.vehicle.propellantMass - partition.components[i]!.mass, 7);
    expect(intact.forces.frontFinEffectiveAreaFraction).toBeGreaterThan(0);
    expect(next.forces.frontFinEffectiveAreaFraction / intact.forces.frontFinEffectiveAreaFraction).toBeCloseTo(.5, 10);
  });
  it('an absent support cannot burn propellant, ignite or produce thrust', () => {
    const { s, model, partition } = flying();
    const i = partition.components.findIndex(p => p.kind === 'engine-support');
    s.damage!.components[i]!.attached = false;
    s.engines.running.fill(true);
    s.engines.ignitionCountdown.fill(.001);
    s.vehicle.throttleCurrent = 100;
    const next = step(s, 1 / 120, {}, model);
    expect(next.vehicle.propellantMass).toBe(s.vehicle.propellantMass);
    expect(next.engines.running.every(v => !v)).toBe(true);
    expect(next.engines.ignitionCountdown.every(v => v === null)).toBe(true);
    expect(next.forces.thrust).toBe(0);
  });
  it('takes engine moments about the actual transverse mass centre after asymmetric loss', () => {
    const { s, model, partition } = flying();
    s.kinematics.altitude = 1e7; s.kinematics.distanceToPlanetCenter = 16371000;
    s.kinematics.speedY = 0; s.kinematics.pitch = rad(0);
    s.kinematics.pitchRecord.fill(rad(0));
    s.vehicle.gimbalPosition = 25;
    s.vehicle.throttleCurrent = 70;
    s.engines.running.fill(true);
    s.damage!.components[partition.components.findIndex(p => p.id === 'ship-front-flap-left')]!.attached = false;
    const next = step(s, 1 / 120, {}, model);
    const mass = createDamageMassProperties();
    writeDamageMass(next.damage!, partition, next.vehicle.propellantMass, model, mass);
    let torque = 0;
    for (const engine of model.engines) {
      const angle = (engine.gimballed ?? engine.kind === 'sea-level') ? .25 * gimbalAngleLimit : 0;
      const thrust = .7 * engineThrust(model.propulsion, engine.kind, next.atmosphere.airPressure);
      // Fbody=(-Tsinδ,Tcosδ), mount=(x,0) relative to physical COM.
      torque += mass.centreOfMass * thrust * Math.sin(angle)
        - (engine.offAxis - mass.centreOfMassX) * thrust * Math.cos(angle);
    }
    expect(next.kinematics.angularAcceleration).toBeCloseTo(torque / mass.momentOfInertia, 12);
  });
  it('one detached grid removes its force contribution from the real step', () => {
    const { s, model, partition } = flying(true);
    s.kinematics.pitch = rad(0);
    s.kinematics.pitchRecord.fill(rad(0));
    s.vehicle.frontFinExtension = 75;
    const damaged = cloneState(s);
    const i = partition.components.findIndex(p => p.kind === 'grid-fin');
    damaged.damage!.components[i]!.attached = false;
    const intact = step(s, 1 / 120, {}, model);
    const lost = step(damaged, 1 / 120, {}, model);
    expect(lost.forces.frontFinDrag / intact.forces.frontFinDrag).toBeCloseTo(2 / 3, 5);
    expect(lost.vehicle.vehicleMass).toBeLessThan(intact.vehicle.vehicleMass);
  });
});
