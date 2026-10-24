import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createInitialState, cloneState } from '$core/state';
import { damageModelFor } from '$core/physics/damage-model';
import { createDamageMassProperties, writeDamageMass } from '$core/physics/damage-mass';
import { createBurnScratch, writeUnpoweredAcceleration } from '$core/control/guidance-physics';
import { precisionAlignment, controlEngineForAcceleration, controlEnginebyEffectiveVerticalTWR } from '$core/control/primitives';
import { rad } from '$core/units';
import * as C from '$core/constants';

describe('damage-aware direct guidance authority', () => {
  it('does not infer grid force from removed hardware or mutate proposed-angle probes', () => {
    const state = createInitialState(123, SUPER_HEAVY);
    const partition = damageModelFor(SUPER_HEAVY).partition;
    partition.components.forEach((c, i) => { if (c.kind === 'grid-fin') state.damage!.components[i]!.attached = false; });
    state.kinematics.altitude = 2000;
    state.kinematics.distanceToPlanetCenter = C.planetRadius + 2000;
    state.kinematics.speedX = 20;
    state.kinematics.speedY = -100;
    state.vehicle.frontFinExtension = 100;
    state.vehicle.vehicleMass = 999999; // stale fields must not replace retained physical mass.
    const retained = createDamageMassProperties();
    writeDamageMass(state.damage!, partition, state.vehicle.propellantMass, SUPER_HEAVY, retained);
    const reference = cloneState(state);
    reference.damage = null;
    reference.vehicle.vehicleMass = retained.totalMass;
    reference.vehicle.frontFinExtension = 50;
    reference.vehicle.vehicleInFlightMaxArea = SUPER_HEAVY.maxArea;
    const before = cloneState(state), actual = createBurnScratch(), expected = createBurnScratch();
    for (const pitch of [rad(.7), rad(-1.1)]) {
      writeUnpoweredAcceleration(state, pitch, SUPER_HEAVY, actual);
      writeUnpoweredAcceleration(reference, pitch, SUPER_HEAVY, expected);
      expect(actual.acc.x).toBeCloseTo(expected.acc.x, 12);
      expect(actual.acc.y).toBeCloseTo(expected.acc.y, 12);
      expect(state).toEqual(before);
    }
  });

  it('does not choose stale gimbal thrust when the engine package is missing', () => {
    const state = createInitialState();
    const p = damageModelFor(SHIP).partition;
    const support = p.components.findIndex(c => c.kind === 'engine-support');
    state.damage!.components[support]!.attached = false;
    state.engines.running[0] = true;
    state.forces.thrust = 1e6;
    state.status.finActive = false;
    state.status.rcsActive = true;
    state.kinematics.pitch = rad(.2);
    const before = structuredClone(state.damage);
    precisionAlignment(state, rad(0), 20);
    expect(state.autopilot.rcsThrustCommand).toBeLessThan(0);
    expect(state.damage).toEqual(before);
    expect(state.engines.running[0]).toBe(true); // querying availability is not a shutdown policy.
    controlEngineForAcceleration(state, 1);
    expect(state.vehicle.throttle).toBe(100);
    controlEnginebyEffectiveVerticalTWR(state, .2);
    expect(state.vehicle.throttle).toBe(100);
  });

  it('does not manufacture plate authority after both fin groups detach', () => {
    const state = createInitialState();
    const p = damageModelFor(SHIP).partition;
    p.components.forEach((c, i) => { if (c.kind === 'flap') state.damage!.components[i]!.attached = false; });
    state.kinematics.pitch = rad(.2);
    state.kinematics.speedY = -80;
    state.kinematics.angleOfAttack = rad(Math.PI / 2);
    state.kinematics.angleInToTheWind = rad(Math.PI / 2);
    state.atmosphere.airDensity = 1;
    state.status.finActive = true;
    state.status.rcsActive = false;
    state.forces.thrust = 0;
    const before = structuredClone(state.damage);
    precisionAlignment(state, rad(0), 20);
    expect(state.autopilot.pitchControl).toBe(0);
    expect(state.damage).toEqual(before);
  });
});
