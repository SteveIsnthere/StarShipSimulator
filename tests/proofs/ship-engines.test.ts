/** Catch hardcoded Ship mount counts/flow/dry mass, and preserve every old
 * Ship engine result against an independent shipped implementation. */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { HISTORICAL_SHIP as SHIP } from '../reference/historical-vehicles';
import * as engine from '$core/physics/engines';
import * as shipped from './fixtures/ship-engines';
import { cloneState } from '$core/state';
import { createInitialState } from './fixtures/historical-runtime';

const PRESSURES = [0, 0.001, 1, 25, 101.325];
const THROTTLES = [0, 40, 73, 100];
const DTS = [1/24, 1/30, 1/48, 1/60, 1/72, 1/90, 1/120, 1/144, 1/240];
function flags(mask: number): boolean[] {
  return Array.from({ length: 6 }, (_, i) => Boolean(mask & (1 << i)));
}

const alternate = {
  ...SHIP, dryMass: 240_000,
  engines: [
    { kind: 'vacuum' as const, offAxis: -2, offAxisForceFraction: 0.25 },
    { kind: 'sea-level' as const, offAxis: 2, offAxisForceFraction: -0.25 },
  ],
  ignitionGroup: [1],
};

describe('engine arithmetic uses the supplied model', () => {
  it('counts nozzle kinds from the selected mounts, not the six Ship slots', () => {
    expect(engine.getWorkingSeaLevelCount([true, false], alternate)).toBe(0);
    expect(engine.getHealthySeaLevelCount([false, true], alternate)).toBe(0);
    expect(engine.getTotalMaxThrust([true, false], 0, alternate)).toBe(C.thrustPerRVacAt(0));
    expect(engine.getThrust([true, false], 40, 0, alternate)).toBe(C.thrustPerRVacAt(0) * 40 * 0.01);
    expect(engine.getFuelFlowRate([true, false], 40, alternate)).toBe(40 * 0.01 * C.RVAC_MASS_FLOW);
    expect(engine.gimballedShare([true, false], 0, alternate)).toBe(0);
    expect(engine.getOffAxisThrustDifference([true, false], 40, 0, alternate))
      .toBe(0.25 * 40 * 0.01 * C.thrustPerRVacAt(0));
  });

  it('keeps the model dry mass when the last fuel pays only a partial impulse', () => {
    const state = createInitialState();
    state.engines.running = [true, false];
    state.vehicle.propellantMass = 1;
    state.vehicle.throttleCurrent = 100;
    const paid = engine.updatePropellant(state, 1, alternate);
    expect(paid).toBe(1 / C.RVAC_MASS_FLOW);
    expect(state.vehicle.propellantMass).toBe(0);
    expect(state.vehicle.vehicleMass).toBe(240_000);
  });
});

describe('Ship engine numerical equivalence', () => {
  it('preserves every mask, pressure, throttle and failed-engine count exactly', () => {
    for (let mask = 0; mask < 64; mask++) {
      const running = flags(mask);
      expect(engine.getWorkingSeaLevelCount(running, SHIP)).toBe(shipped.getWorkingSeaLevelCount(running));
      expect(engine.getHealthySeaLevelCount(running, SHIP)).toBe(shipped.getHealthySeaLevelCount(running));
      for (const pressure of PRESSURES) {
        expect(engine.getTotalMaxThrust(running, pressure, SHIP)).toBe(shipped.getTotalMaxThrust(running, pressure));
        expect(engine.getTotalMinThrust(running, pressure, SHIP)).toBe(shipped.getTotalMinThrust(running, pressure));
        expect(engine.gimballedShare(running, pressure, SHIP)).toBe(shipped.gimballedShare(running, pressure));
        for (const throttle of THROTTLES) {
          expect(engine.getThrust(running, throttle, pressure, SHIP)).toBe(shipped.getThrust(running, throttle, pressure));
          expect(engine.getFuelFlowRate(running, throttle, SHIP)).toBe(shipped.getFuelFlowRate(running, throttle));
          expect(engine.getOffAxisThrustDifference(running, throttle, pressure, SHIP))
            .toBe(shipped.getOffAxisThrustDifference(running, throttle, pressure));
        }
      }
    }
  });

  it('preserves fuel-paid fraction, dry mass and dump transitions across the domain', () => {
    for (let mask = 0; mask < 64; mask++) {
      for (const propellant of [-1, 0, Number.MIN_VALUE, 1, 12_000, 18_000, 350_000, 1_200_000]) {
        for (const dt of DTS) {
          for (const dump of [false, true]) {
            const state = createInitialState(123);
            state.engines.running = flags(mask);
            state.vehicle.propellantMass = propellant;
            state.vehicle.throttleCurrent = THROTTLES[mask % 4]!;
            state.status.dumpingFuel = dump;
            state.status.forceDump = mask % 2 === 0;
            const baseline = cloneState(state);
            expect(engine.updatePropellant(state, dt, SHIP)).toBe(shipped.updatePropellant(baseline, dt));
            expect(state.vehicle).toEqual(baseline.vehicle);
            expect(state.status).toEqual(baseline.status);
          }
        }
      }
    }
  });
});
