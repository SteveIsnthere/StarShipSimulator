/** Catch guidance using Ship drag, dry-mass floors or actuator authority for
 * another vehicle; independent old routines defend unchanged Ship output. */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { SHIP } from '$core/vehicle';
import { createInitialState, cloneState } from '$core/state';
import { rad } from '$core/units';
import * as guidance from '$core/control/guidance-physics';
import * as primitive from '$core/control/primitives';
import * as shipped from './fixtures/ship-guidance';
import * as oldPrimitive from './fixtures/ship-primitives';

const wide = { ...SHIP, diameter: 18, minArea: SHIP.minArea * 4 };
const actuator = { ...SHIP, dryCentreOfMass: 40, frontFinArea: 10, aftFinArea: 5 };

describe('guidance uses selected physical geometry', () => {
  it('sizes tail-first drag with the selected axial area', () => {
    const scratch = guidance.createBurnScratch();
    const original = guidance.tailFirstDragDeceleration(1000, 100, 350_000, scratch);
    expect(guidance.tailFirstDragDeceleration(1000, 100, 350_000, scratch, wide)).toBe(original * 4);
  });

  it('rejects a burn that would spend fuel below the selected dry mass', () => {
    const heavyStructure = { ...SHIP, dryMass: 490_000 };
    expect(guidance.landingBurnStartAltitude(3, 500_000, 200, 50, guidance.createBurnScratch())).not.toBeNull();
    expect(guidance.landingBurnStartAltitude(3, 500_000, 200, 50, guidance.createBurnScratch(), heavyStructure)).toBeNull();
  });

  it('projects fall range with the selected nose-on drag', () => {
    const state = createInitialState(123);
    state.kinematics.altitude = 1000;
    state.kinematics.speedX = 330;
    state.kinematics.speedY = -70;
    const a = guidance.createFallResult();
    const b = guidance.createFallResult();
    guidance.unpoweredFallInto(state, 25, guidance.createBurnScratch(), a);
    guidance.unpoweredFallInto(state, 25, guidance.createBurnScratch(), b, wide);
    expect(a.reached).toBe(true);
    expect(b.reached).toBe(true);
    expect(b.downRange).toBeLessThan(a.downRange);
  });

  it('aligns on the selected moving engine arm', () => {
    const state = createInitialState(123);
    state.vehicle.propellantMass = 0;
    state.vehicle.vehicleMomentOfInertia = 1_000_000;
    state.forces.thrust = 5_000_000;
    state.engines.running[0] = true;
    state.status.rcsActive = false;
    state.status.finActive = false;
    primitive.precisionAlignment(state, rad(0.3), 2, actuator);
    expect(state.autopilot.pitchControl).toBe((Math.asin(75_000 / 40 / 5_000_000) * 100) / C.gimbalAngleLimit);
  });

  it('aligns on the selected fin area and stations when engines are off', () => {
    const state = createInitialState(123);
    state.vehicle.propellantMass = 0;
    state.vehicle.vehicleMomentOfInertia = 1_000_000;
    state.kinematics.speedY = -70;
    state.atmosphere.airDensity = 1;
    state.status.rcsActive = false;
    state.status.finActive = true;
    primitive.precisionAlignment(state, rad(0.3), 2, actuator);
    const torque = (0.5 * 1 * 70 ** 2 * 10 * 2) * Math.sin(C.finActuationMaxAngle) * (SHIP.frontFinStation - 40)
      + (0.5 * 1 * 70 ** 2 * 5 * 2) * (40 - SHIP.aftFinStation);
    expect(state.autopilot.pitchControl).toBe(75_000 / torque * 100);
  });

  it('commands throttle and fixed-nozzle vertical authority from the selected mounts', () => {
    const vac = { ...SHIP, engines: [SHIP.engines[3]!] };
    const state = createInitialState(123);
    state.engines.running = [true];
    state.vehicle.vehicleMass = 280_000;
    state.atmosphere.airPressure = 101.325;
    primitive.controlEngineForAcceleration(state, 6, vac);
    expect(state.vehicle.throttle).toBe((6 * 280_000 / C.thrustPerRVacAt(101.325)) * 100);
    expect(primitive.getEffectiveVerticalMaxThrust([true], rad(Math.PI / 4), 101.325, rad(0), vac))
      .toBe(C.thrustPerRVacAt(101.325));
  });
});

describe('Ship guidance numerical equivalence', () => {
  it('preserves drag and fuel-limited burn predictions including cap/null cases', () => {
    for (const engines of [0, 1, 2, 3]) {
      for (const mass of [120_000, 180_000, 350_000, 1_320_000]) {
        for (const speed of [0, 10, 70, 200, 400]) {
          const a = guidance.createBurnScratch();
          const b = shipped.createBurnScratch();
          expect(guidance.landingBurnStartAltitude(engines, mass, speed, 25, a, SHIP))
            .toBe(shipped.landingBurnStartAltitude(engines, mass, speed, 25, b));
          expect(a).toEqual(b);
        }
      }
    }
    for (const h of [0, 1000, 11_000, 70_000]) {
      for (const speed of [0, 35, 70, 7300]) {
        expect(guidance.tailFirstDragDeceleration(h, speed, 470_000, guidance.createBurnScratch(), SHIP))
          .toBe(shipped.tailFirstDragDeceleration(h, speed, 470_000, shipped.createBurnScratch()));
      }
    }
  });

  it('preserves fall predictions and primitive control outputs exactly', () => {
    for (const h of [250, 1000, 15_000]) {
      for (const vx of [0, 330, 1130]) {
        const state = createInitialState(123);
        state.kinematics.altitude = h;
        state.kinematics.speedX = vx;
        state.kinematics.speedY = -70;
        const a = guidance.createFallResult();
        const b = shipped.createFallResult();
        guidance.unpoweredFallInto(state, 25, guidance.createBurnScratch(), a, SHIP);
        shipped.unpoweredFallInto(state, 25, shipped.createBurnScratch(), b);
        expect(a).toEqual(b);
        for (const force of [0, 5_000_000]) {
          for (const fins of [false, true]) {
            for (const rcs of [false, true]) {
              const s = cloneState(state);
              s.forces.thrust = force;
              s.engines.running[0] = force > 0;
              s.status.finActive = fins;
              s.status.rcsActive = rcs;
              s.atmosphere.airDensity = 1;
              const original = cloneState(s);
              primitive.precisionAlignment(s, rad(0.3), 2, SHIP);
              oldPrimitive.precisionAlignment(original, rad(0.3), 2);
              expect(s.autopilot).toEqual(original.autopilot);
              primitive.controlEngineForAcceleration(s, 6, SHIP);
              oldPrimitive.controlEngineForAcceleration(original, 6);
              expect(s.vehicle).toEqual(original.vehicle);
            }
          }
        }
      }
    }
  });
});
