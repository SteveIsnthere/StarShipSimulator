/** Refactor witness for constructor/step model propagation. Old pipeline and
 * old helpers are preserved separately; existing goldens defend whole flights. */
import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { createInitialState, syncDerivedFields } from '$core/state';
import { step } from '$core/step';
import { rad } from '$core/units';
import { toggleAllRaptors } from '$core/control/commands';
import { createMassProperties } from '$core/physics/mass';
import { step as shippedStep } from './fixtures/ship-step';
import { createInitialState as shippedInitial } from './fixtures/ship-initial';

const alternate = {
  ...SHIP, height: 100, diameter: 12, dryMass: 240_000, initialPropellant: 40_000,
  minArea: Math.PI * 6 ** 2, maxArea: 1200, frontFinArea: 10, aftFinArea: 5,
  engines: SHIP.engines.slice(3, 5), ignitionGroup: [1],
};

describe('model propagation through state, commands and the integrator', () => {
  it('creates engine arrays, mass and contact height for the supplied vehicle', () => {
    const s = createInitialState(123, alternate);
    expect(s.kinematics.altitude).toBe(50);
    expect(s.vehicle.propellantMass).toBe(40_000);
    expect(s.vehicle.vehicleMass).toBe(280_000);
    expect(s.engines.running).toHaveLength(2);
    expect(s.engines.failed).toHaveLength(2);
    expect(s.engines.ignitionCountdown).toEqual([null, null]);
    const expectedI = 280_000 * (12 / 2) ** 2 * 0.25 + (280_000 * 100 ** 2) / 12;
    expect(s.vehicle.vehicleMomentOfInertia).toBe(expectedI);
  });

  it('holds an unpowered selected vehicle at its own pad height', () => {
    const s = shippedInitial(123);
    s.kinematics.altitude = 50;
    const next = step(s, 1 / 120, {}, alternate);
    expect(next.kinematics.altitude).toBe(50);
    expect(next.kinematics.speedY).toBe(0);
    expect(next.status.onTheGround).toBe(true);
    expect(next.vehicle.vehicleMass).toBe(590_000);
    expect(next.vehicle.vehicleMomentOfInertia)
      .toBe(createMassProperties(next.vehicle.propellantMass, alternate).momentOfInertia);
  });

  it('uses the supplied fin geometry when restored state fields are synchronized', () => {
    const s = shippedInitial(123);
    syncDerivedFields(s, alternate);
    expect(s.vehicle.vehicleInFlightMaxArea).toBe(1200);
  });

  it('starts the model ignition group without writing nonexistent engine slots', () => {
    const s = shippedInitial(123);
    s.engines.running = [false, false];
    s.engines.failed = [false, false];
    s.engines.ignitionCountdown = [null, null];
    toggleAllRaptors(s, alternate);
    expect(s.engines.ignitionCountdown).toHaveLength(2);
    expect(s.engines.ignitionCountdown[0]).toBe(null);
    expect(s.engines.ignitionCountdown[1]).toBeGreaterThan(0);
  });
});

describe('Ship constructor and pipeline numerical equivalence', () => {
  it('preserves constructor shape and every numeric field at several seeds', () => {
    for (const seed of [0, 123, 0x5741_4c4b, 0xffff_ffff]) {
      expect(createInitialState(seed, SHIP)).toEqual(shippedInitial(seed));
      expect(createInitialState(seed)).toEqual(shippedInitial(seed));
    }
  });

  it('preserves every field across engine, atmosphere, attitude, fuel and dt boundaries', () => {
    let cases = 0;
    for (let mask = 0; mask < 64; mask++) {
      for (const h of [25, 1000, 70_000, 150_000]) {
        for (const load of [0, 1, 350_000]) {
          for (const pitch of [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
            for (const dt of [1 / 120, 1 / 30]) {
              const s = shippedInitial(123);
              s.kinematics.altitude = h;
              s.kinematics.pitch = rad(pitch);
              s.kinematics.speedX = mask % 2 ? 7300 : 330;
              s.kinematics.speedY = -70;
              s.vehicle.propellantMass = load;
              s.engines.running = Array.from({ length: 6 }, (_, i) => Boolean(mask & (1 << i)));
              s.world.wind = mask % 2 ? 0 : 15;
              const input = { throttle: 73, pitchControl: mask % 3 ? 0 : 40 };
              const expected = shippedStep(s, dt, input);
              expect(step(s, dt, input, SHIP)).toEqual(expected);
              cases++;
            }
          }
        }
      }
    }
    expect(cases).toBe(7680);
  });
});
