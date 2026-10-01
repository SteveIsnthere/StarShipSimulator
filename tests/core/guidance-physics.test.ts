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
  createFallResult,
  landingBurnStartAltitude,
  localGravity,
  MIN_LOCAL_GRAVITY,
  tailFirstDragDeceleration,
  thrustFor,
  unpoweredFallInto,
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
      throw new Error(`reached the ground from ${altitude} m at ${speed} m/s: not a stop (alt ${s.kinematics.altitude.toFixed(0)} vY ${s.kinematics.speedY.toFixed(1)} crashed ${s.failures.crashed} ground ${s.status.onTheGround})`);
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
    // Near the hover limit: one engine on 190 t. An open secant answered "start
    // now" here (Phase 5's independent review); the bracketed iteration must not.
    { altitude: 3_000, speed: 150, engines: 1, propellant: 70_000 },
  ];
  for (const c of cases) {
    it(`from ${c.altitude / 1000} km at ${c.speed} m/s on ${c.engines} engine(s): within 0.1% of the burn or 2 m`, () => {
      const { stop, mass } = referenceStop(c.altitude, c.speed, c.engines, c.propellant);
      const predicted = landingBurnStartAltitude(c.engines, mass, c.speed, stop, createBurnScratch());
      expect(predicted).not.toBeNull();
      const burn = c.altitude - stop;
      const error = Math.abs(predicted! - c.altitude);
      expect(error, `predicted ${predicted!.toFixed(1)} m, actual ${c.altitude} m, burn ${burn.toFixed(0)} m`).toBeLessThanOrEqual(
        // Measured: 0.03-0.5 m on burns of 176 m to 11.8 km. The bound is that
        // with room, and tight enough that dropping drag fails every case.
        Math.max(0.001 * burn, 2),
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

  it('returns null at the hover limit: no burn can end at the pad if thrust there is below weight', () => {
    // One engine on 232 t: 2.25 MN against 2.26 MN of weight at sea level. It
    // can stop high up, where thrust is larger, but never at touchdown height.
    expect(landingBurnStartAltitude(1, 232_000, 30, 25, createBurnScratch())).toBeNull();
  });

  it('returns null, never a guess, when the burn is longer than the cap', () => {
    // One engine on 225 t at 300 m/s: the simulation needs 87 s of burn (from
    // 20 km it stops at 5.5 km). The bracketed iteration once bisected toward
    // the light end here and answered 14.6 km, an optimistic number for the
    // trigger to act on. Longer than the predictor sizes is "start now".
    expect(landingBurnStartAltitude(1, 225_000, 300, 5_509, createBurnScratch())).toBeNull();
  });

  it('returns null when even the lightest guess cannot finish inside the cap', () => {
    // Thin air, one engine, 3 km/s: about six minutes of burn against a 60 s cap.
    expect(landingBurnStartAltitude(1, 130_000, 3_000, 60_000, createBurnScratch())).toBeNull();
  });

  it('is the touchdown height when already at rest, and null without engines', () => {
    expect(landingBurnStartAltitude(3, 150_000, 0, 25, createBurnScratch())).toBe(25);
    expect(landingBurnStartAltitude(0, 150_000, 50, 25, createBurnScratch())).toBeNull();
  });

  it('rises with descent speed and with mass on one engine, the ladder\'s usual plan (property)', () => {
    const scratch = createBurnScratch();
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 120, noNaN: true }),
        fc.double({ min: 1, max: 20, noNaN: true }),
        fc.double({ min: 125_000, max: 185_000, noNaN: true }),
        fc.double({ min: 500, max: 5_000, noNaN: true }),
        (speed, more, mass, heavier) => {
          const base = landingBurnStartAltitude(1, mass, speed, 25, scratch);
          const faster = landingBurnStartAltitude(1, mass, speed + more, 25, scratch);
          const loaded = landingBurnStartAltitude(1, mass + heavier, speed, 25, scratch);
          if (base === null) return true;
          return (faster === null || faster > base) && (loaded === null || loaded >= base);
        },
      ),
      { seed: 42, numRuns: 200 },
    );
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

describe('unpoweredFallInto against the simulation, attitude held', () => {
  /**
   * The reference: engines off, autopilot off, attitude held, flown by `step()`
   * to touchdown height. The prediction holds attitude AND cross-section; the
   * simulation's fin controller still works the flaps, which changes the area
   * mid-fall, so the two agree closely but not exactly (measured: downrange
   * within 3-8%, time within 10%, a vertical drop within 2%).
   */
  function reference(altitude: number, vx: number, vy: number, pitchDeg: number) {
    let s = at(altitude, vx, vy);
    s.engines.running = [false, false, false, false, false, false];
    s.kinematics.pitch = rad((pitchDeg * Math.PI) / 180);
    s = step(s, DT);
    const pitch = s.kinematics.pitch;
    const start = s;
    const x0 = s.kinematics.downRangeDistance;
    let t = 0;
    for (let i = 0; i < Math.round(1_500 / DT); i++) {
      s.kinematics.pitch = pitch;
      s.kinematics.angularVelocity = 0;
      s = step(s, DT);
      t += DT;
      if (s.kinematics.altitude <= C.vehicleHeight / 2 + 0.01 || s.status.onTheGround) break;
    }
    return { start, time: t, downRange: s.kinematics.downRangeDistance - x0 };
  }

  const cases = [
    { name: 'a vertical drop from 40 km', h: 40_000, vx: 0, vy: 0, pitch: 0, time: 0.03 },
    { name: 'upright from 40 km, moving downrange', h: 40_000, vx: 200, vy: -50, pitch: 0, time: 0.05 },
    { name: 'belly-down from 10 km', h: 10_000, vx: 100, vy: -150, pitch: 90, time: 0.12 },
    { name: 'belly-down from 2 km', h: 2_000, vx: 30, vy: -60, pitch: 90, time: 0.12 },
    { name: 're-entering from 70 km', h: 70_000, vx: 1_500, vy: -300, pitch: 60, time: 0.12 },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const ref = reference(c.h, c.vx, c.vy, c.pitch);
      const out = createFallResult();
      unpoweredFallInto(ref.start, C.vehicleHeight / 2, createBurnScratch(), out);
      expect(out.reached).toBe(true);
      expect(Math.abs(out.time - ref.time) / ref.time, `time ${out.time.toFixed(1)} vs ${ref.time.toFixed(1)} s`).toBeLessThan(c.time);
      expect(Math.abs(out.downRange - ref.downRange), `downrange ${out.downRange.toFixed(0)} vs ${ref.downRange.toFixed(0)} m`).toBeLessThanOrEqual(
        Math.max(0.1 * Math.abs(ref.downRange), 50),
      );
    });
  }

  it('says it did not reach the ground when the cap runs out', () => {
    const s = at(60_000, 0, 7_000); // climbing at 7 km/s: thousands of km up, still away at the cap
    const out = createFallResult();
    unpoweredFallInto(s, C.vehicleHeight / 2, createBurnScratch(), out);
    expect(out.reached).toBe(false);
    expect(out.time).toBeNaN();
  });
});
