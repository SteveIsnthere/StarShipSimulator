/** Task4 Refactor: compare extraction with independent shipped arithmetic,
 * and prove prepared per-body work cannot be overwritten by a second body. */
import { describe, expect, it } from 'vitest';
import { cloneState } from '$core/state';
import { HISTORICAL_SHIP as SHIP } from '../reference/historical-vehicles';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { step } from '$core/step';
import { rad } from '$core/units';
import { createInitialState as shippedInitial } from './fixtures/ship-initial';
import { step as shippedStep } from './fixtures/ship-step';
import { createStepDynamics, prepareDynamics, integrateTranslation } from '$core/physics/step-dynamics';

const DT = 1 / 120;

describe('shared dynamics extraction', () => {
  it('retains every Ship field bit-exactly across independent boundary observations', () => {
    let cases = 0;
    for (const mask of [0, 1, 7, 8, 24, 63]) {
      for (const height of [25, 25 + Number.EPSILON * 25, 1000, 86_000, 150_000]) {
        for (const fuel of [0, 1, 18_000, 1_200_000]) {
          for (const pitch of [-Math.PI - 1e-12, -Math.PI / 2, 0, Math.PI / 2, Math.PI + 1e-12]) {
            for (const dt of [DT, 1 / 30]) {
              const s = shippedInitial(123);
              s.kinematics.altitude = height;
              s.kinematics.pitch = rad(pitch);
              s.kinematics.speedX = mask % 2 ? 7300 : 330;
              s.kinematics.speedY = -70;
              s.kinematics.angularVelocity = 0.2;
              s.kinematics.angularAcceleration = -0.03;
              s.vehicle.propellantMass = fuel;
              s.vehicle.gimbalPosition = mask % 2 ? 100 : -100;
              s.engines.running = Array.from({ length: 6 }, (_, i) => Boolean(mask & (1 << i)));
              s.world.wind = mask % 2 ? 15 : 0;
              const input = { throttle: 73, pitchControl: 40 };
              expect(step(s, dt, input, SHIP)).toEqual(shippedStep(s, dt, input));
              cases++;
            }
          }
        }
      }
    }
    expect(cases).toBe(1200);
  });

  it('owns paid force preparation per body and shares the translation kernel', () => {
    const original = shippedInitial(123);
    original.kinematics.altitude = 70_000;
    original.status.onTheGround = false;
    original.engines.running.fill(true);
    const ship = cloneState(original);
    const work = createStepDynamics();
    prepareDynamics(ship, DT, SHIP, work);
    const prepared = structuredClone(work);
    const other = cloneState(original);
    other.engines.running = Array(33).fill(true);
    other.engines.failed = Array(33).fill(false);
    other.engines.ignitionCountdown = Array(33).fill(null);
    other.vehicle.propellantMass = 500_000;
    prepareDynamics(other, DT, SUPER_HEAVY, createStepDynamics());
    expect(work).toEqual(prepared);
    expect(ship.forces.thrust).not.toBe(other.forces.thrust);
    expect(ship.vehicle.propellantMass).toBeLessThan(original.vehicle.propellantMass);
    expect(other.vehicle.propellantMass).toBeLessThan(500_000);
    const untouched = cloneState(ship);
    integrateTranslation(ship, DT, work.bodyAccelerationX, work.bodyAccelerationY, SHIP);
    integrateTranslation(untouched, DT, 0, 0, SHIP);
    expect(ship.kinematics.speedY).toBeGreaterThan(untouched.kinematics.speedY);
    expect(original.world.updatedFrameCount).toBe(0);
  });
});
