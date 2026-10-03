import { describe, expect, it } from 'vitest';
import { createHotStageMission, stepMission, stackMassProperties, bodyMassPose } from '$core/mission';
import { cloneState } from '$core/state';
import { centreOfMass, momentOfInertia } from '$core/physics/mass';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY, CENTRE_ENGINES } from '$core/vehicles/super-heavy';
import { PRESETS } from '$core/scenarios';
import { rad } from '$core/units';
import { planetRadius, standardGravity, thrustPerRaptorAt } from '$core/constants';
import { tangentialAcceleration, verticalGravityAcceleration } from '$core/physics/gravity';
import { prepareDynamics, createStepDynamics } from '$core/physics/step-dynamics';

const DT = 1 / 120;

function gap(m: ReturnType<typeof createHotStageMission>): number {
  const b = m.booster.kinematics, s = m.ship.kinematics;
  return (s.downRangeDistance - b.downRangeDistance) * Math.sin(b.pitch)
    + (s.altitude - b.altitude) * Math.cos(b.pitch) - (SUPER_HEAVY.height + SHIP.height) / 2;
}

function untilRelease(m = createHotStageMission(123)) {
  for (let i = 0; i < 240 && m.phase === 'attached'; i++) m = stepMission(m, DT, { stage: true });
  return m;
}

describe('physical attached hot staging', () => {
  it('retains the original booster pose/load and places a full Ship above its touching hull', () => {
    const m = createHotStageMission(123);
    const p = PRESETS.find(p => p.id === 'booster-sep')!;
    expect(m.booster.kinematics.altitude).toBe(p.altitude);
    expect(m.booster.kinematics.speedX).toBe(p.speedX);
    expect(m.booster.kinematics.speedY).toBe(p.speedY);
    expect(m.booster.vehicle.propellantMass).toBe(500_000);
    expect(m.ship.vehicle.propellantMass).toBe(1_200_000);
    expect(m.booster.engines.running).toHaveLength(33);
    expect(m.ship.engines.running).toHaveLength(6);
    expect(gap(m)).toBeCloseTo(0, 8);
    expect(m.phase).toBe('attached');
    expect(m.aggregate.kinematics.distanceToPlanetCenter).toBe(planetRadius + m.aggregate.kinematics.altitude);
  });

  it('uses both actual masses and the parallel-axis inertia about the aggregate COM', () => {
    const m = createHotStageMission(123), properties = stackMassProperties(m.booster, m.ship);
    const mb = 700_000, ms = 1_320_000;
    const cb = centreOfMass(500_000, SUPER_HEAVY), cs = 71 + centreOfMass(1_200_000, SHIP);
    const c = (mb * cb + ms * cs) / (mb + ms);
    expect(properties.mass).toBe(mb + ms);
    expect(properties.centreStation).toBe(c);
    expect(properties.inertia).toBe(momentOfInertia(500_000, SUPER_HEAVY)
      + momentOfInertia(1_200_000, SHIP) + mb * (cb - c) ** 2 + ms * (cs - c) ** 2);
    m.ship.vehicle.propellantMass = 100_000;
    expect(stackMassProperties(m.booster, m.ship).inertia).not.toBe(properties.inertia);
  });

  it('integrates the sum of both paid world forces, with a no-Ship-thrust positive control', () => {
    const initial = createHotStageMission(123);
    initial.booster.engines.running[0] = true;
    initial.ship.engines.running.fill(true);
    initial.booster.vehicle.throttleCurrent = 40;
    initial.ship.vehicle.throttleCurrent = 73;
    const b = cloneState(initial.booster), ship = cloneState(initial.ship);
    const bw = createStepDynamics(), sw = createStepDynamics();
    prepareDynamics(b, DT, SUPER_HEAVY, bw);
    prepareDynamics(ship, DT, SHIP, sw);
    const mass = b.vehicle.vehicleMass + ship.vehicle.vehicleMass;
    const expectedX = (bw.bodyAccelerationX * b.vehicle.vehicleMass + sw.bodyAccelerationX * ship.vehicle.vehicleMass) / mass;
    const expectedY = (bw.bodyAccelerationY * b.vehicle.vehicleMass + sw.bodyAccelerationY * ship.vehicle.vehicleMass) / mass;
    const m = stepMission(initial, DT);
    expect(m.aggregate.forces.perceivedG_X).toBe(expectedX / standardGravity);
    expect(m.aggregate.forces.perceivedG_Y).toBe(expectedY / standardGravity);
    initial.ship.engines.running.fill(false);
    const control = stepMission(initial, DT);
    expect(control.aggregate.forces.perceivedG_Y).toBeLessThan(m.aggregate.forces.perceivedG_Y);
    expect(control.aggregate.kinematics.speedY).toBeLessThan(m.aggregate.kinematics.speedY);
  });

  it('applies a real off-axis engine torque about the combined inertia, rather than each hull rotating alone', () => {
    const initial = createHotStageMission(123);
    for (const k of [initial.aggregate.kinematics, initial.booster.kinematics, initial.ship.kinematics]) k.altitude += 300_000_000;
    initial.booster.engines.running[1] = true; // Actual -0.65m central mount.
    const m = stepMission(initial, DT);
    const torque = 0.65 * thrustPerRaptorAt(0) * initial.booster.vehicle.throttleCurrent * 0.01;
    const expectedAlpha = torque / stackMassProperties(m.booster, m.ship).inertia;
    expect(m.aggregate.kinematics.angularAcceleration).toBeCloseTo(expectedAlpha, 12);
    expect(m.aggregate.kinematics.angularAcceleration).toBeGreaterThan(0);
    expect(m.ship.kinematics.angularVelocity).toBe(m.booster.kinematics.angularVelocity);
    initial.booster.engines.running[1] = false;
    expect(stepMission(initial, DT).aggregate.kinematics.angularAcceleration).toBe(0);
  });

  it('pays ignition and fuel, keeps the constraint, and releases once actual axial acceleration permits it', () => {
    const initial = createHotStageMission(123), snapshot = structuredClone(initial);
    let m = stepMission(initial, DT, { stage: true });
    expect(m.phase).toBe('attached');
    expect(m.ship.engines.running.some(Boolean)).toBe(false);
    expect(m.ship.engines.ignitionCountdown.every(t => t !== null && t > 0)).toBe(true);
    expect(m.ship.rng.counters.ignitionDelay).toBe(6);
    expect(m.booster.rng.counters.ignitionDelay).toBe(3);
    let last = m;
    for (let i = 0; i < 240 && m.phase === 'attached'; i++) {
      last = m;
      m = stepMission(m, DT, { stage: true });
      expect(gap(m)).toBeCloseTo(0, 7);
      expect(m.ship.world.environmentTime).toBe(m.elapsedTime);
      expect(m.booster.world.environmentTime).toBe(m.elapsedTime);
    }
    expect(m.phase).toBe('separated');
    expect(m.ship.forces.thrust).toBeGreaterThan(0);
    expect(CENTRE_ENGINES.every(i => m.booster.engines.running[i])).toBe(true);
    expect(m.ship.vehicle.propellantMass).toBeLessThan(1_200_000);
    expect(m.booster.vehicle.propellantMass).toBeLessThan(500_000);
    expect(last.phase).toBe('attached');
    expect(initial).toEqual(snapshot);
    const independent = stepMission(m, DT);
    expect(gap(independent)).toBeGreaterThan(gap(m));
    expect(independent.elapsedTime).toBe(m.elapsedTime + DT);
  });

  it('manufactures no release impulse: COM momentum and angular momentum match the paid aggregate', () => {
    const m = createHotStageMission(123);
    m.aggregate.kinematics.angularVelocity = 0.1;
    m.aggregate.kinematics.angularAcceleration = 0;
    const released = untilRelease(m);
    expect(released.phase).toBe('separated');
    const properties = stackMassProperties(released.booster, released.ship);
    const mb = released.booster.vehicle.vehicleMass, ms = released.ship.vehicle.vehicleMass;
    const bk = released.booster.kinematics, sk = released.ship.kinematics, ak = released.aggregate.kinematics;
    expect((mb * bk.speedX + ms * sk.speedX) / properties.mass).toBeCloseTo(ak.speedX, 10);
    expect((mb * bk.speedY + ms * sk.speedY) / properties.mass).toBeCloseTo(ak.speedY, 10);
    const b = bodyMassPose(released.booster, SUPER_HEAVY), s = bodyMassPose(released.ship, SHIP);
    const torqueMomentum = (body: typeof b, mass: number, inertia: number) =>
      inertia * ak.angularVelocity + mass * ((body.altitude - ak.altitude) * (body.speedX - ak.speedX)
        - (body.x - ak.downRangeDistance) * (body.speedY - ak.speedY));
    const angularMomentum = torqueMomentum(b, mb, momentOfInertia(released.booster.vehicle.propellantMass, SUPER_HEAVY))
      + torqueMomentum(s, ms, momentOfInertia(released.ship.vehicle.propellantMass, SHIP));
    expect(angularMomentum).toBeCloseTo(properties.inertia * ak.angularVelocity, 2);
  });

  it('keeps a no-thrust stack attached with fixed hull gap and zero rotational impulse', () => {
    let m = createHotStageMission(123);
    m.aggregate.kinematics.angularVelocity = 0.1;
    m.aggregate.kinematics.angularAcceleration = 0;
    // Rarefied air keeps aerodynamic rotation below velocity precision.
    for (const k of [m.aggregate.kinematics, m.booster.kinematics, m.ship.kinematics]) k.altitude += 100_000_000;
    m.booster.kinematics.pitch = m.ship.kinematics.pitch = m.aggregate.kinematics.pitch = rad(0);
    const before = cloneState(m.booster);
    for (let i = 0; i < 120; i++) m = stepMission(m, DT);
    expect(m.phase).toBe('attached');
    expect(gap(m)).toBeCloseTo(0, 8);
    expect(m.ship.engines.running.some(Boolean)).toBe(false);
    expect(m.booster.engines.running.some(Boolean)).toBe(false);
    expect(m.booster.vehicle.propellantMass).toBe(before.vehicle.propellantMass);
    expect(m.aggregate.kinematics.angularVelocity).toBe(0.1);
    const properties = stackMassProperties(m.booster, m.ship);
    expect((m.booster.vehicle.vehicleMass * m.booster.kinematics.speedX
      + m.ship.vehicle.vehicleMass * m.ship.kinematics.speedX) / properties.mass)
      .toBeCloseTo(m.aggregate.kinematics.speedX, 10);
    expect(m.aggregate.kinematics.speedY).toBeLessThan(before.kinematics.speedY);
  });

  it('reports rotational constraint load at each physical body rather than copying aggregate g', () => {
    const initial = createHotStageMission(123);
    initial.aggregate.kinematics.angularVelocity = 0.1;
    const m = stepMission(initial, DT);
    for (const body of [m.booster, m.ship]) {
      const k = body.kinematics;
      const gx = (k.accelerationX - tangentialAcceleration(k.distanceToPlanetCenter, k.speedX, k.speedY)) / standardGravity;
      const gy = (k.accelerationY - verticalGravityAcceleration(k.distanceToPlanetCenter, k.speedX)) / standardGravity;
      expect(body.forces.perceivedG_X).toBe(gx);
      expect(body.forces.perceivedG_Y).toBe(gy);
      expect(body.forces.perceivedG).toBe(Math.sqrt(gx ** 2 + gy ** 2));
      expect(body.forces.perceivedG).not.toBe(m.aggregate.forces.perceivedG);
    }
  });

  it('reports failed Ship ignition honestly, stays attached and isolates its RNG from the booster', () => {
    const initial = createHotStageMission(123);
    initial.ship.engines.failed.fill(true);
    let m = initial;
    for (let i = 0; i < 240; i++) m = stepMission(m, DT, { stage: true });
    expect(m.phase).toBe('attached');
    expect(m.stagingFailed).toBe(true);
    expect(m.ship.forces.thrust).toBe(0);
    expect(m.ship.rng.counters.ignitionDelay).toBe(0);
    expect(m.booster.rng.counters.ignitionDelay).toBe(3);
    expect(m.booster.engines.failed.some(Boolean)).toBe(false);
    expect(gap(m)).toBeCloseTo(0, 7);
    expect(initial.ship.rng.counters.ignitionDelay).toBe(0);
  });
});
