/** A proposed attitude must use the same paid force law as real dynamics,
 * including both gust axes. The probe has no actuator, fuel or RNG authority. */
import { describe, expect, it } from 'vitest';
import { cloneState, createInitialState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createBurnScratch, writeUnpoweredAcceleration } from '$core/control/guidance-physics';
import { createStepDynamics, prepareDynamics } from '$core/physics/step-dynamics';
import { getAttackAngles, relativeAirspeed, relativeWindAngle } from '$core/physics/aero';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import { isaAtmosphere } from '$core/physics/isa';
import { airVelocityX } from '$core/physics/wind';
import { tangentialAcceleration, verticalGravityAcceleration } from '$core/physics/gravity';
import * as C from '$core/constants';
import { rad } from '$core/units';
const DT = 1 / 120;
describe('unpowered attitude force probes', () => {
  it.each([SHIP, SUPER_HEAVY])('agrees with real %s force preparation in wind and two-axis gusts', model => {
    const s = createInitialState(123, model);
    const k = s.kinematics;
    k.altitude = 10_000; k.distanceToPlanetCenter = C.planetRadius + k.altitude;
    k.speedX = 40; k.speedY = -150; k.pitch = rad(.15);
    s.status.onTheGround = false;
    s.world.wind = 10; s.world.gust = 2; s.world.gustVertical = -3;
    s.vehicle.frontFinExtension = 50; s.vehicle.aftFinExtension = 50;
    const windX = airVelocityX(s.world, k.altitude);
    const angle = relativeWindAngle(k.speedX, k.speedY, windX, s.world.gustVertical);
    Object.assign(k, getAttackAngles(k.pitch, angle));
    k.machSpeed = relativeAirspeed(k.speedX, k.speedY, windX, s.world.gustVertical)
      / speedOfSoundAt(isaAtmosphere(k.altitude).airTemperature);
    const before = cloneState(s), paid = cloneState(s), work = createStepDynamics();
    prepareDynamics(paid, DT, model, work);
    const scratch = createBurnScratch();
    writeUnpoweredAcceleration(paid, k.pitch, model, scratch);
    const expectedX = work.bodyAccelerationX + tangentialAcceleration(k.distanceToPlanetCenter, k.speedX, k.speedY);
    const expectedY = work.bodyAccelerationY + verticalGravityAcceleration(k.distanceToPlanetCenter, k.speedX);
    // Equivalent angle composition uses independent expressions; sixteen
    // floating operations bound roundoff rather than a fitted force tolerance.
    for (const [actual, expected] of [[scratch.acc.x, expectedX], [scratch.acc.y, expectedY]])
      expect(Math.abs(actual! - expected!)).toBeLessThanOrEqual(16 * Number.EPSILON * Math.max(1, Math.abs(expected!)));
    expect(s).toEqual(before); expect(paid.rng).toEqual(before.rng);
    const calm = cloneState(paid); calm.world.wind = 0; calm.world.gust = 0; calm.world.gustVertical = 0;
    writeUnpoweredAcceleration(calm, k.pitch, model, scratch);
    expect(scratch.acc.x).not.toBe(expectedX); expect(scratch.acc.y).not.toBe(expectedY);
  });
});
