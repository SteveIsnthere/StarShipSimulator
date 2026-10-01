/**
 * Phase 6, Task 4b (Fidelity): the Ship's three Raptor Vacuums.
 *
 * Tier B: 258 tf and 380 s in vacuum (Wikipedia's Raptor article), a 2.3 m
 * exit, thrust falling with ambient pressure through the exit area.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { toggleAllRaptors } from '$core/control/commands';
import {
  getFuelFlowRate,
  getHealthySeaLevelCount,
  getOffAxisThrustDifference,
  getTotalMaxThrust,
  getWorkingSeaLevelCount,
} from '$core/physics/engines';
import { createInitialState } from '$core/state';
import { step } from '$core/step';
import { getEffectiveVerticalMaxThrust } from '$core/control/primitives';
import { rad } from '$core/units';

const ONLY_RVACS = [false, false, false, true, true, true];
const ONLY_SEA_LEVEL = [true, true, true, false, false, false];

describe('the Ship has six Raptors', () => {
  it('three sea-level engines, then three RVacs', () => {
    expect(C.RAPTORS.map((m) => m.kind)).toEqual([
      'sea-level', 'sea-level', 'sea-level', 'vacuum', 'vacuum', 'vacuum',
    ]);
    expect(C.SEA_LEVEL_RAPTORS).toEqual([0, 1, 2]);
    expect(createInitialState().engines.running).toHaveLength(6);
  });
});

describe('an RVac is its own engine', () => {
  it('makes 258 tf in vacuum at 380 s', () => {
    expect(getTotalMaxThrust([false, false, false, true, false, false], 0)).toBe(258 * 1000 * C.standardGravity);
    expect(C.RVAC_THRUST_VACUUM / (C.RVAC_MASS_FLOW * C.standardGravity)).toBeCloseTo(380, 9);
  });

  it('loses thrust in air through its exit area: about 2.11 MN on the pad', () => {
    const seaLevel = C.SEA_LEVEL_PRESSURE_PA / 1000;
    const pad = C.thrustPerRVacAt(seaLevel);
    expect(pad).toBeCloseTo(C.RVAC_THRUST_VACUUM - C.SEA_LEVEL_PRESSURE_PA * Math.PI * 1.15 ** 2, 6);
    expect(pad / 1e6).toBeCloseTo(2.11, 2);
    // It still fires there: no flow-separation refusal (Ships fire all six on the stand).
    expect(pad).toBeGreaterThan(0);
  });

  it('beats the sea-level engine in vacuum and loses to it on the pad', () => {
    expect(C.thrustPerRVacAt(0)).toBeGreaterThan(C.thrustPerRaptorAt(0));
    expect(C.thrustPerRVacAt(101.325)).toBeLessThan(C.thrustPerRaptorAt(101.325));
  });

  it('flows at its own rate, and six engines add up', () => {
    expect(getFuelFlowRate(ONLY_RVACS, 100)).toBeCloseTo(3 * C.RVAC_MASS_FLOW, 9);
    expect(getFuelFlowRate([true, true, true, true, true, true], 100)).toBeCloseTo(
      3 * C.RVAC_MASS_FLOW + 3 * C.maxFuelFlowPerRaptor,
      9,
    );
  });

  it('three RVacs together make almost no off-axis force, as the sea-level three do', () => {
    // Not exactly zero for either set: 2021's fraction, -o/sqrt(o^2 + (H/2)^2),
    // is not linear in the offset. Both stay under 0.1% of the set's thrust.
    const rvacs = 3 * C.thrustPerRVacAt(0);
    const seaLevel = 3 * C.thrustPerRaptorAt(0);
    expect(Math.abs(getOffAxisThrustDifference(ONLY_RVACS, 100, 0)) / rvacs).toBeLessThan(1e-3);
    expect(Math.abs(getOffAxisThrustDifference(ONLY_SEA_LEVEL, 100, 0)) / seaLevel).toBeLessThan(1e-3);
    expect(getOffAxisThrustDifference([false, false, false, true, false, false], 100, 0)).not.toBe(0);
  });
});

describe('the landing logic counts sea-level engines only', () => {
  it('a lit RVac is not a landing engine, and a failed one costs none', () => {
    expect(getWorkingSeaLevelCount(ONLY_RVACS)).toBe(0);
    expect(getHealthySeaLevelCount([false, false, false, true, true, true])).toBe(3);
  });

  it('Engines (all) lights the sea-level three and never an RVac', () => {
    const s = createInitialState();
    toggleAllRaptors(s);
    expect(s.engines.ignitionCountdown.map((c) => c !== null)).toEqual(ONLY_SEA_LEVEL);
  });
});

describe('the RVacs are fixed: they push along the hull and do not steer', () => {
  // Found by Phase 6's independent review: the whole thrust went through the
  // gimbal, so RVacs alone could translate sideways and pitch the vehicle.
  function vacuumOnly(gimbalPosition: number, seaLevelToo = false) {
    const s = createInitialState();
    s.kinematics.altitude = 120_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 120_000;
    s.kinematics.pitch = (Math.PI / 2) as never;
    s.status.finActive = false;
    s.status.rcsActive = false;
    s.engines.running = [seaLevelToo, false, false, true, true, true];
    s.engines.ignitionCountdown = [null, null, null, null, null, null];
    s.vehicle.throttle = 100;
    s.vehicle.throttleCurrent = 100;
    s.vehicle.gimbalPosition = gimbalPosition;
    return s;
  }

  it('a deflected gimbal makes no torque and no sideways push with only RVacs lit', () => {
    const straight = step(vacuumOnly(0), 1 / 120);
    const deflected = step(vacuumOnly(80), 1 / 120);
    expect(deflected.forces.thrustVectorForce).toBe(0);
    // Pointing prograde, the hull is horizontal: a gimballed engine would tilt
    // the push off it; fixed engines push the same way whatever the gimbal says.
    expect(deflected.kinematics.accelerationY).toBe(straight.kinematics.accelerationY);
    expect(deflected.kinematics.accelerationX).toBe(straight.kinematics.accelerationX);
  });

  it('with a sea-level engine lit too, only its thrust steers', () => {
    const s = step(vacuumOnly(80, true), 1 / 120);
    const seaLevel = C.thrustPerRaptorAt(s.atmosphere.airPressure);
    expect(s.forces.thrustVectorForce).toBeCloseTo(
      seaLevel * Math.sin(0.8 * C.gimbalAngleLimit),
      3,
    );
  });
});

describe('the vertical throttle law projects the RVacs along the hull', () => {
  it('RVacs alone at pitch 60° with the gimbal deflected: cos(pitch), not cos(gimbal direction)', () => {
    const running = [false, false, false, true, true, true];
    const p = 0;
    const total = 3 * C.thrustPerRVacAt(p);
    const pitch = rad(Math.PI / 3);
    const gimbalDirection = rad(Math.PI / 3 - (15 * Math.PI) / 180);
    expect(getEffectiveVerticalMaxThrust(running, gimbalDirection, p, pitch)).toBeCloseTo(total * 0.5, 3);
  });

  it('mixed: each kind along its own direction; sea-level only: the old expression to the bit', () => {
    const mixed = [true, false, false, true, false, false];
    const p = 0;
    const pitch = rad(0.4);
    const g = rad(0.3);
    const expected = C.thrustPerRaptorAt(p) * Math.cos(0.3) + C.thrustPerRVacAt(p) * Math.cos(0.4);
    expect(getEffectiveVerticalMaxThrust(mixed, g, p, pitch)).toBeCloseTo(expected, 3);
    const seaLevel = [true, true, true, false, false, false];
    expect(getEffectiveVerticalMaxThrust(seaLevel, g, p, pitch)).toBe(3 * C.thrustPerRaptorAt(p) * Math.cos(0.3));
  });
});

