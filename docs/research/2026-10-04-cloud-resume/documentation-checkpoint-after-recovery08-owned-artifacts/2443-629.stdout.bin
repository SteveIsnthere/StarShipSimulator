import { describe, expect, it } from 'vitest';
import { SHIP, OXIDISER_SHARE, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleComponents, type VehicleComponentPartition } from '$core/physics/vehicle-components';
import { createDamageState, ComponentFailure, type DamageState } from '$core/damage-state';
import { rad } from '$core/units';
import { createDetachmentScratch, detachComponents, type PhysicalCOMPose } from '$core/physics/damage-detachment';

// Independent whole-system construction: no production mass-writer calls.
function retained(state: DamageState, p: VehicleComponentPartition, model: VehicleDefinition, fuel: number) {
  const fill = Math.min(1, fuel / model.propellantCapacity);
  const bodies = p.components.filter((_, i) => state.components[i]!.attached)
    .map(c => ({ mass: c.mass, x: c.x, station: c.station, inertia: c.inertia }));
  for (const [mass, bottom, height] of [
    [fuel * OXIDISER_SHARE, model.tankBottom, fill * model.loxTankHeight],
    [fuel * (1 - OXIDISER_SHARE), model.ch4TankBottom, fill * model.ch4TankHeight],
  ]) bodies.push({ mass: mass!, x: 0, station: bottom! + height! / 2,
    inertia: mass! * ((model.diameter / 2) ** 2 / 4 + height! ** 2 / 12) });
  const mass = bodies.reduce((sum, c) => sum + c.mass, 0);
  const x = bodies.reduce((sum, c) => sum + c.mass * c.x, 0) / mass;
  const station = bodies.reduce((sum, c) => sum + c.mass * c.station, 0) / mass;
  const inertia = bodies.reduce((sum, c) => sum + c.inertia
    + c.mass * ((c.x - x) ** 2 + (c.station - station) ** 2), 0);
  return { mass, x, station, inertia };
}

function close(actual: number, expected: number, scale = Math.abs(expected)) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-11 * Math.max(1, scale));
}

describe('impulse-free component detachment', () => {
  for (const model of [SHIP, SUPER_HEAVY]) for (const simultaneous of [false, true]) {
    it(`conserves mass, first moment, momenta and kinetic energy: ${model.id}, simultaneous=${simultaneous}`, () => {
      const partition = createVehicleComponents(model), state = createDamageState(partition, 250);
      const indices = partition.components.flatMap((c, i) => c.rootMass > 0 ? [i] : []).slice(0, simultaneous ? 2 : 1);
      indices.forEach(i => { state.components[i]!.loadedAngle = rad(.3); });
      const fuel = model.propellantCapacity * .1;
      const initial = retained(state, partition, model, fuel);
      const pose: PhysicalCOMPose = { x: 317, altitude: 1250, pitch: rad(.63), vx: 70, vy: -310, omega: .4 };
      const origin = { ...pose }, before = structuredClone(state);
      const mask = indices.reduce((bits, i) => bits | (1 << i), 0);
      expect(detachComponents(state, partition, model, fuel, pose, mask, ComponentFailure.ProofExceeded,
        createDetachmentScratch())).toBe(mask);
      const remaining = retained(state, partition, model, fuel);
      const pieces = indices.map(i => ({ mass: partition.components[i]!.mass,
        inertia: partition.components[i]!.inertia, ...state.debris[i]! }));
      const all = [{ mass: remaining.mass, inertia: remaining.inertia, x: pose.x,
        altitude: pose.altitude, speedX: pose.vx, speedY: pose.vy, angularVelocity: pose.omega }, ...pieces];
      close(all.reduce((sum, c) => sum + c.mass, 0), initial.mass);
      close(all.reduce((sum, c) => sum + c.mass * (c.x - origin.x), 0), 0, initial.mass);
      close(all.reduce((sum, c) => sum + c.mass * (c.altitude - origin.altitude), 0), 0, initial.mass);
      close(all.reduce((sum, c) => sum + c.mass * c.speedX, 0), initial.mass * origin.vx);
      close(all.reduce((sum, c) => sum + c.mass * c.speedY, 0), initial.mass * origin.vy);
      const angular = all.reduce((sum, c) => sum + c.inertia * c.angularVelocity
        + c.mass * ((c.altitude - origin.altitude) * c.speedX - (c.x - origin.x) * c.speedY), 0);
      close(angular, initial.inertia * origin.omega);
      const energy = all.reduce((sum, c) => sum + c.mass * (c.speedX ** 2 + c.speedY ** 2) / 2
        + c.inertia * c.angularVelocity ** 2 / 2, 0);
      close(energy, initial.mass * (origin.vx ** 2 + origin.vy ** 2) / 2 + initial.inertia * origin.omega ** 2 / 2);
      expect(pose.pitch).toBe(origin.pitch);
      expect(pose.omega).toBe(origin.omega);
      expect(state.revision).toBe(1);
      expect(state.eventCount).toBe(indices.length);
      expect(state.hull).toEqual(before.hull);
      state.components.forEach((c, i) => {
        expect(c.root).toEqual(before.components[i]!.root);
        expect(c.tps).toEqual(before.components[i]!.tps);
        expect(c.loadedAngle).toBe(before.components[i]!.loadedAngle);
      });
      const latched = structuredClone(state), latchedPose = { ...pose };
      expect(detachComponents(state, partition, model, fuel, pose, mask, ComponentFailure.MaterialDomain,
        createDetachmentScratch())).toBe(0);
      expect(state).toEqual(latched);
      expect(pose).toEqual(latchedPose);
    });
  }

  it('mirrors off-axis loss with reflected translation, rotation and spin', () => {
    const p = createVehicleComponents(SHIP);
    const left = createDamageState(p, 250), right = createDamageState(p, 250);
    const a: PhysicalCOMPose = { x: 100, altitude: 200, pitch: rad(.4), vx: 50, vy: -60, omega: .7 };
    const b: PhysicalCOMPose = { ...a, x: -a.x, pitch: rad(-a.pitch), vx: -a.vx, omega: -a.omega };
    const li = p.components.findIndex(c => c.id === 'ship-front-flap-left');
    const ri = p.components.findIndex(c => c.id === 'ship-front-flap-right');
    detachComponents(left, p, SHIP, 40000, a, 1 << li, ComponentFailure.ProofExceeded, createDetachmentScratch());
    detachComponents(right, p, SHIP, 40000, b, 1 << ri, ComponentFailure.ProofExceeded, createDetachmentScratch());
    close(a.x, -b.x); close(a.altitude, b.altitude); close(a.vx, -b.vx); close(a.vy, b.vy);
    const l = left.debris[li]!, r = right.debris[ri]!;
    close(l.x, -r.x); close(l.altitude, r.altitude); close(l.speedX, -r.speedX); close(l.speedY, r.speedY);
    expect(l.angularVelocity).toBe(-r.angularVelocity);
  });

  it('rejects invalid masks/ownership before changing state or the pose', () => {
    const p = createVehicleComponents(SHIP), state = createDamageState(p, 250);
    const pose: PhysicalCOMPose = { x: 1, altitude: 2, pitch: rad(0), vx: 3, vy: 4, omega: 5 };
    const scratch = createDetachmentScratch();
    const before = structuredClone(state), originalPose = { ...pose };
    for (const mask of [-1, .5, 1 << p.components.length])
      expect(() => detachComponents(state, p, SHIP, 0, pose, mask, ComponentFailure.ProofExceeded, scratch)).toThrow(RangeError);
    expect(() => detachComponents(state, p, SHIP, 0, pose, 1, ComponentFailure.None, scratch)).toThrow(RangeError);
    expect(state).toEqual(before); expect(pose).toEqual(originalPose);
    state.debris[0]!.active = true;
    expect(() => detachComponents(state, p, SHIP, 0, pose, 1, ComponentFailure.ProofExceeded, scratch)).toThrow(RangeError);
  });
});
