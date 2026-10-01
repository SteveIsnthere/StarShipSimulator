/**
 * The guidance-physics module (Phase 5 Task 2): each function against the
 * simulation it summarises.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import {
  BURN_STEP_CAP,
  createBurnScratch,
  landingBurnStartAltitude,
  localGravity,
  MIN_LOCAL_GRAVITY,
  tailFirstDragDeceleration,
  thrustFor,
} from '$core/control/guidance-physics';
import * as C from '$core/constants';
import { gravityAt } from '$core/physics/gravity';
import { isaAtmosphere } from '$core/physics/isa';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import type { SimState } from '$core/state';
import { rad } from '$core/units';

const R = C.planetRadius;

function at(altitude: number, speedX = 0, speedY = 0): SimState {
  const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'landing-burn')!);
  const a = s.autopilot;
  a.autoLandOn = false;
  a.demoAutoLandOn = false;
  s.kinematics.altitude = altitude;
  s.kinematics.speedX = speedX;
  s.kinematics.speedY = speedY;
  s.kinematics.pitch = rad(0);
  s.kinematics.angularVelocity = 0;
  return s;
}

describe('localGravity', () => {
  it('is gravity at altitude when not moving downrange', () => {
    for (const h of [0, 10_000, 80_000]) expect(localGravity(at(h))).toBe(gravityAt(R + h));
  });

  it('subtracts the centrifugal term of the downrange speed', () => {
    const v = 2_000;
    expect(localGravity(at(40_000, v))).toBeCloseTo(gravityAt(R + 40_000) - v ** 2 / (R + 40_000), 12);
  });

  it('never drops below its floor, even at and past orbital speed', () => {
    const orbital = Math.sqrt(gravityAt(R + 150_000) * (R + 150_000));
    expect(localGravity(at(150_000, orbital))).toBe(MIN_LOCAL_GRAVITY);
    expect(localGravity(at(150_000, orbital * 1.2))).toBe(MIN_LOCAL_GRAVITY);
  });
});

describe('thrustFor', () => {
  it('scales with the engine count and the pressure, as the engines do', () => {
    expect(thrustFor(3, 101.325)).toBe(3 * C.thrustPerRaptorAt(101.325));
    expect(thrustFor(1, 0)).toBe(C.thrustPerRaptorAt(0));
    expect(thrustFor(0, 50)).toBe(0);
    expect(thrustFor(1, 0)).toBeGreaterThan(thrustFor(1, 101.325));
  });
});

describe('tailFirstDragDeceleration', () => {
  const scratch = createBurnScratch();
  it('is zero at rest and grows with speed and density', () => {
    expect(tailFirstDragDeceleration(1_000, 0, 150_000, scratch)).toBe(0);
    const low = tailFirstDragDeceleration(1_000, 100, 150_000, scratch);
    const high = tailFirstDragDeceleration(30_000, 100, 150_000, scratch);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThan(low);
  });

  it('leaves the atmosphere it used in the scratch', () => {
    tailFirstDragDeceleration(12_345, 50, 150_000, scratch);
    expect(scratch.atmosphere).toEqual(isaAtmosphere(12_345));
  });
});

/**
 * The reference: engines already lit at full throttle, held upright, descending
 * at `speed` from `altitude`; fly `step()` until the descent stops. Returns the
 * altitude it stopped at and the mass it started with.
 */
function referenceStop(altitude: number, speed: number, engines: number, propellant: number): { stop: number; mass: number } {
  let s = at(altitude, 0, -speed);
  s.engines.running = [engines > 0, engines > 1, engines > 2];
  s.engines.ignitionCountdown = [null, null, null];
  s.vehicle.throttle = 100;
  s.vehicle.throttleCurrent = 100;
  s.vehicle.propellantMass = propellant;
  s.vehicle.vehicleMass = C.vehicleDryMass + s.vehicle.propellantMass;
  const mass = s.vehicle.vehicleMass;
  for (let i = 0; i < Math.round(60 / DT); i++) {
    s.kinematics.pitch = rad(0);
    s.kinematics.angularVelocity = 0;
    s = step(s, DT);
    if (s.status.onTheGround || s.status.landed || s.failures.crashed) {
      throw new Error(`reached the ground from ${altitude} m at ${speed} m/s: not a stop`);
    }
    if (s.kinematics.speedY >= 0) return { stop: s.kinematics.altitude, mass };
  }
  throw new Error(`no stop from ${altitude} m at ${speed} m/s`);
}

describe('landingBurnStartAltitude against the simulation', () => {
  const cases = [
    // Propellant per case: enough for the burn, light enough for one engine to stop it.
    { altitude: 2_000, speed: 120, engines: 3, propellant: 20_000 },
    { altitude: 2_000, speed: 80, engines: 1, propellant: 20_000 },
    { altitude: 10_000, speed: 250, engines: 3, propellant: 120_000 },
    { altitude: 40_000, speed: 600, engines: 3, propellant: 200_000 },
  ];
  for (const c of cases) {
    it(`from ${c.altitude / 1000} km at ${c.speed} m/s on ${c.engines} engine(s): within 2% of the burn or 20 m`, () => {
      const { stop, mass } = referenceStop(c.altitude, c.speed, c.engines, c.propellant);
      const predicted = landingBurnStartAltitude(c.engines, mass, c.speed, stop, createBurnScratch());
      expect(predicted).not.toBeNull();
      const burn = c.altitude - stop;
      const error = Math.abs(predicted! - c.altitude);
      expect(error, `predicted ${predicted!.toFixed(1)} m, actual ${c.altitude} m, burn ${burn.toFixed(0)} m`).toBeLessThanOrEqual(
        Math.max(0.02 * burn, 20),
      );
    });
  }
});

describe('landingBurnStartAltitude: the edges', () => {
  it('returns null, within the cap, when the burn cannot stop the vehicle', () => {
    // One engine cannot hold up a full-tanked vehicle at all.
    expect(landingBurnStartAltitude(1, C.vehicleMass, 300, 25, createBurnScratch())).toBeNull();
    // Nor can three stop 4 km/s inside the step cap (60 s).
    expect(landingBurnStartAltitude(3, 200_000, 4_000, 25, createBurnScratch())).toBeNull();
    expect(BURN_STEP_CAP).toBe(1200);
  });

  it('is the touchdown height when already at rest, and null without engines', () => {
    expect(landingBurnStartAltitude(3, 150_000, 0, 25, createBurnScratch())).toBe(25);
    expect(landingBurnStartAltitude(0, 150_000, 50, 25, createBurnScratch())).toBeNull();
  });

  it('rises with descent speed and with mass (property)', () => {
    const scratch = createBurnScratch();
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 200, noNaN: true }),
        fc.double({ min: 1, max: 40, noNaN: true }),
        fc.double({ min: 125_000, max: 180_000, noNaN: true }),
        fc.double({ min: 1_000, max: 20_000, noNaN: true }),
        (speed, more, mass, heavier) => {
          const base = landingBurnStartAltitude(3, mass, speed, 25, scratch);
          const faster = landingBurnStartAltitude(3, mass, speed + more, 25, scratch);
          const loaded = landingBurnStartAltitude(3, mass + heavier, speed, 25, scratch);
          if (base === null) return true;
          return (faster === null || faster > base) && (loaded === null || loaded >= base);
        },
      ),
      { seed: 42, numRuns: 200 },
    );
  });
});
