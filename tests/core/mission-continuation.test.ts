/** Release is not just an instant: each body's mass centre must follow paid
 * force while its hull rotates around it. Independent point/Verlet equations. */
import { describe, expect, it } from 'vitest';
import { createHotStageMission, stepMission, bodyMassPose } from '$core/mission';
import { centreOfMass } from '$core/physics/mass';
import { tangentialAcceleration, verticalGravityAcceleration } from '$core/physics/gravity';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import * as C from '$core/constants';
const DT = 1 / 120;

function release() {
  let m = createHotStageMission(123);
  m.aggregate.kinematics.angularVelocity = 0.1;
  for (const k of [m.aggregate.kinematics, m.ship.kinematics, m.booster.kinematics]) {
    k.altitude += 1e9; k.distanceToPlanetCenter = C.planetRadius + k.altitude;
  }
  for (let i = 0; i < 240 && m.phase === 'attached'; i++) m = stepMission(m, DT, { stage: true });
  expect(m.phase).toBe('separated');
  for (const s of [m.ship, m.booster]) {
    s.engines.running.fill(false); s.engines.ignitionCountdown.fill(null); s.forces.rcsThrust = 0;
  }
  return m;
}
function roundoff(actual: number, expected: number) {
  //16 floating operations of point transforms: a roundoff bound, not metres
  //selected from a flight outcome or relaxed catch tolerance.
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(16 * Number.EPSILON * Math.max(1, Math.abs(expected)));
}
function integrate(x: number, y: number, vx: number, vy: number, fx: number, fy: number) {
  const ax0 = fx + tangentialAcceleration(C.planetRadius + y, vx, vy);
  const ay0 = fy + verticalGravityAcceleration(C.planetRadius + y, vx);
  const nx = x + vx * DT + ax0 * DT * DT / 2, ny = y + vy * DT + ay0 * DT * DT / 2;
  const ax1 = fx + tangentialAcceleration(C.planetRadius + ny, vx + ax0 * DT, vy + ay0 * DT);
  const ay1 = fy + verticalGravityAcceleration(C.planetRadius + ny, vx + ax0 * DT);
  return { x: nx, y: ny, vx: vx + (ax0 + ax1) * DT / 2, vy: vy + (ay0 + ay1) * DT / 2 };
}

describe('physical COM continuation after real paid Stage', () => {
  it('keeps both unequal mass offsets on force-only trajectories through120 rotating free steps', () => {
    let m = release();
    for (let tick = 0; tick < 120; tick++) {
      const snapshot = structuredClone(m);
      const next = stepMission(m, DT);
      for (const [id, model] of [['ship', SHIP], ['booster', SUPER_HEAVY]] as const) {
        const before = bodyMassPose(m[id], model), after = bodyMassPose(next[id], model);
        const expected = integrate(before.x, before.altitude, before.speedX, before.speedY, 0, 0);
        roundoff(after.x, expected.x); roundoff(after.altitude, expected.y);
        roundoff(after.speedX, expected.vx); roundoff(after.speedY, expected.vy);
        const k = next[id].kinematics, d = centreOfMass(next[id].vehicle.propellantMass, model) - model.height / 2;
        roundoff(k.speedX + d * k.angularVelocity * Math.cos(k.pitch), after.speedX);
        roundoff(k.speedY - d * k.angularVelocity * Math.sin(k.pitch), after.speedY);
        expect(next[id].vehicle.propellantMass).toBe(m[id].vehicle.propellantMass);
        expect(next[id].forces.thrust).toBe(0);
      }
      expect(m).toEqual(snapshot);
      m = next;
    }
  });
  it('uses remaining-mass station and actual paid thrust without making rotation a translation impulse', () => {
    const m = release();
    m.booster.engines.running[0] = true;
    m.booster.vehicle.gimbalPosition = 20;
    m.booster.vehicle.throttleCurrent = m.booster.vehicle.throttle = 40;
    const next = stepMission(m, DT), model = SUPER_HEAVY;
    const b = m.booster, n = next.booster, k = b.kinematics;
    expect(n.vehicle.propellantMass).toBeLessThan(b.vehicle.propellantMass);
    const shift = centreOfMass(n.vehicle.propellantMass, model) - centreOfMass(b.vehicle.propellantMass, model);
    const before = bodyMassPose(b, model), after = bodyMassPose(n, model);
    const thrust = C.thrustPerRaptorAt(0) * 0.4;
    roundoff(n.forces.thrust, thrust);
    const direction = k.pitch - 3 * Math.PI / 180;
    const expected = integrate(before.x + shift * Math.sin(k.pitch), before.altitude + shift * Math.cos(k.pitch),
      before.speedX + shift * k.angularVelocity * Math.cos(k.pitch), before.speedY - shift * k.angularVelocity * Math.sin(k.pitch),
      thrust * Math.sin(direction) / n.vehicle.vehicleMass, thrust * Math.cos(direction) / n.vehicle.vehicleMass);
    roundoff(after.x, expected.x); roundoff(after.altitude, expected.y);
    roundoff(after.speedX, expected.vx); roundoff(after.speedY, expected.vy);
    expect(n.kinematics.angularAcceleration).not.toBe(0);
  });
  it('catches at the physical hull lug and holds it without consuming fuel after separation', () => {
    let m = release();
    const k = m.booster.kinematics;
    k.pitch = 0 as typeof k.pitch; k.angularVelocity = k.angularAcceleration = 0;
    k.altitude = 90.501; k.distanceToPlanetCenter = C.planetRadius + k.altitude;
    k.downRangeDistance = C.starBaseXPos; k.speedX = 0; k.speedY = -1;
    m.booster.status.onTheGround = false;
    m = stepMission(m, DT);
    expect(m.booster.status.landed).toBe(true);
    expect(m.booster.status.onTheGround).toBe(false);
    expect(m.booster.kinematics.altitude).toBe(90.5);
    const captured = structuredClone(m.booster);
    m.booster.engines.running.fill(true);
    for (let tick = 0; tick < 10; tick++) m = stepMission(m, DT);
    expect(m.booster.kinematics).toEqual(captured.kinematics);
    expect(m.booster.vehicle.propellantMass).toBe(captured.vehicle.propellantMass);
    expect(m.booster.engines.running.some(Boolean)).toBe(false);
  });
  it('rejects a missed lug and treats slow physical ground contact as a crash', () => {
    for (const altitude of [90.501, 35.4]) {
      const m = release(), k = m.booster.kinematics;
      k.pitch = 0 as typeof k.pitch; k.angularVelocity = k.angularAcceleration = 0;
      k.altitude = altitude; k.distanceToPlanetCenter = C.planetRadius + altitude;
      k.downRangeDistance = C.starBaseXPos + 3; k.speedX = 0; k.speedY = -1;
      m.booster.status.onTheGround = false;
      const next = stepMission(m, DT).booster;
      expect(next.status.landed).toBe(false);
      expect(next.failures.crashed).toBe(altitude === 35.4);
      if (altitude === 35.4) {
        // Existing collision freezes the penetrated pose; it does not snap
        // a crashed hull upwards onto the ground plane.
        expect(next.kinematics.altitude).toBe(altitude);
        expect(next.kinematics.speedX).toBe(0); expect(next.kinematics.speedY).toBe(0);
      }
    }
  });
});
