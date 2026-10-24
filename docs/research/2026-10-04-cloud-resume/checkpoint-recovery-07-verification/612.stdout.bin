import { describe, expect, it } from 'vitest';
import { createHotStageMission, stackMassProperties, bodyMassPose, stepMission } from '$core/mission';
import { cloneState, createInitialState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { damageModelFor } from '$core/physics/damage-model';
import { createDamageMassProperties, writeDamageMass } from '$core/physics/damage-mass';
import { step } from '$core/step';
import { stepMissionBody } from '$core/mission-free-flight';
import { rad } from '$core/units';

describe('damaged mission mass and reference', () => {
  it('combines both retained bodies in two dimensions about their shared mass centre', () => {
    const m = createHotStageMission(123);
    const partition = damageModelFor(SHIP).partition;
    const i = partition.components.findIndex(c => c.id === 'ship-front-flap-left');
    m.ship.damage!.components[i]!.attached = false;
    const b = createDamageMassProperties(), s = createDamageMassProperties();
    writeDamageMass(m.booster.damage!, damageModelFor(SUPER_HEAVY).partition, m.booster.vehicle.propellantMass, SUPER_HEAVY, b);
    writeDamageMass(m.ship.damage!, partition, m.ship.vehicle.propellantMass, SHIP, s);
    const actual = stackMassProperties(m.booster, m.ship);
    const mass = b.totalMass + s.totalMass;
    const x = (b.totalMass * b.centreOfMassX + s.totalMass * s.centreOfMassX) / mass;
    const z = (b.totalMass * b.centreOfMass + s.totalMass * (SUPER_HEAVY.height + s.centreOfMass)) / mass;
    const inertia = b.momentOfInertia + s.momentOfInertia
      + b.totalMass * ((b.centreOfMassX - x) ** 2 + (b.centreOfMass - z) ** 2)
      + s.totalMass * ((s.centreOfMassX - x) ** 2 + (SUPER_HEAVY.height + s.centreOfMass - z) ** 2);
    expect(actual.mass).toBe(mass);
    expect(actual.centreX).toBeCloseTo(x, 12);
    expect(actual.centreStation).toBeCloseTo(z, 12);
    expect(actual.inertia).toBeCloseTo(inertia, 5);
    m.ship.kinematics.pitch = rad(0);
    m.ship.kinematics.angularVelocity = .4;
    const pose = bodyMassPose(m.ship, SHIP);
    expect(pose.x - m.ship.kinematics.downRangeDistance).toBeCloseTo(s.centreOfMassX, 8);
    expect(pose.speedY - m.ship.kinematics.speedY).toBeCloseTo(-.4 * s.centreOfMassX, 10);
  });
  it('releases a ground-impact connection before either body can divide by a vanished mass', () => {
    const m = createHotStageMission(123);
    m.booster.kinematics.altitude = 20;
    m.booster.kinematics.speedY = -100;
    m.booster.kinematics.angularVelocity = .2;
    const healthy = stepMissionBody(m.ship, 1 / 120, {}, SHIP);
    const result = stepMission(m, 1 / 120);
    expect(result.phase).toBe('separated');
    expect(result.booster.failures.crashed).toBe(true);
    expect(result.booster.damage!.terminal.angularVelocity).toBe(.2);
    expect(result.ship).toEqual(healthy);
    expect(result.booster.damage!.debris.every(p => Number.isFinite(p.x + p.altitude + p.speedX + p.speedY))).toBe(true);
  });
  for (const failed of ['ship', 'booster'] as const) it(`dissolves the stack on ${failed} terminal loss without resetting the survivor`, () => {
    const m = createHotStageMission(123);
    m.aggregate.kinematics.angularVelocity = .01;
    m.aggregate.kinematics.speedX = 40;
    m.aggregate.kinematics.speedY = 100;
    const failedMission = { ...m, ship: cloneState(m.ship), booster: cloneState(m.booster) };
    failedMission[failed].damage!.hull.valid = false;
    const healthy = failed === 'ship' ? 'booster' : 'ship';
    const reference = stepMission(m, 1 / 120);
    const result = stepMission(failedMission, 1 / 120);
    expect(result.phase).toBe('separated');
    expect(result[failed].damage!.terminal.active).toBe(true);
    expect(result[healthy].damage!.terminal.active).toBe(false);
    expect(result[healthy].kinematics).toEqual(reference[healthy].kinematics);
    expect(result[healthy].kinematics.angularVelocity).not.toBe(0);
  });
  it('standalone and free mission steps publish identical damaged hull trajectories', () => {
    const s = createInitialState(123, SHIP);
    s.kinematics.altitude = 30000;
    s.kinematics.distanceToPlanetCenter = 6401000;
    s.kinematics.speedX = 12; s.kinematics.speedY = -80;
    s.kinematics.pitch = rad(.4); s.kinematics.angularVelocity = .2;
    s.status.onTheGround = false;
    s.damage!.components[damageModelFor(SHIP).partition.components.findIndex(c => c.id === 'ship-front-flap-left')]!.attached = false;
    expect(step(s, 1 / 120, {}, SHIP)).toEqual(stepMissionBody(s, 1 / 120, {}, SHIP));
  });
});
