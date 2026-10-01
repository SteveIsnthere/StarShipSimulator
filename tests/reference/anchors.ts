/**
 * The reference rows. Each probe reads the simulation's own model; nothing here
 * restates a constant the model does not use.
 */
import * as C from '$core/constants';
import { createInitialState } from '$core/state';
import { PROPELLANT_CAPACITY } from '$core/physics/mass';
import { getFuelFlowRate, getTotalMaxThrust } from '$core/physics/engines';
import { circularOrbitalSpeed } from '$core/physics/gravity';
import { around, type Band } from './bands';

const G0 = 9.80665;
const ONE_ENGINE = [true, false, false] as const;
const SEA_LEVEL_KPA = 101.325;

/** Specific impulse of one engine at an ambient pressure, from thrust and flow. */
function ispAt(pressureKPa: number): number {
  const thrust = getTotalMaxThrust(ONE_ENGINE, pressureKPa);
  const flow = getFuelFlowRate(ONE_ENGINE, 100);
  return thrust / (flow * G0);
}

/** Engines the Ship is built with, as the simulation models it. */
function modelledShipEngines(): number {
  return createInitialState().engines.running.length;
}

const EARTH_MEAN_RADIUS = 6_371_000;

export const BANDS: readonly Band[] = [
  {
    id: 'raptor2.sl.thrust',
    quantity: 'sea-level thrust of one Raptor 2 at full throttle, N',
    ...around(230_000 * G0, 0.05),
    unit: 'N',
    tier: 'A',
    source:
      'SpaceX, x.com/SpaceX/status/1819795288116330594 (2024-08-03): Raptor 2 sea-level variant, 230 tf',
    conditions: 'sea-level ambient pressure, 100% throttle',
    probe: () => getTotalMaxThrust(ONE_ENGINE, SEA_LEVEL_KPA),
  },
  {
    id: 'raptor2.vac.isp',
    quantity: 'specific impulse of the sea-level Raptor 2 in vacuum, s',
    ...around(347, 0.03),
    unit: 's',
    tier: 'A',
    source:
      'SpaceX, x.com/SpaceX/status/1819795288116330594 (2024-08-03): Raptor 2 sea-level variant, 347 s',
    conditions: 'vacuum, sea-level-optimised nozzle',
    probe: () => ispAt(0),
  },
  {
    id: 'raptor2.sl.isp',
    quantity: 'specific impulse of the sea-level Raptor 2 at sea level, s',
    ...around(327, 0.03),
    unit: 's',
    tier: 'B',
    source: 'en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft), retrieved 2026-10-01: SL 327 s',
    conditions: 'sea-level ambient pressure',
    probe: () => ispAt(SEA_LEVEL_KPA),
  },
  {
    id: 'ship.propellant.capacity',
    quantity: 'Ship propellant load when full, kg',
    ...around(1_200_000, 0.05),
    unit: 'kg',
    tier: 'A',
    source: 'SpaceX Starship user guide, Block 1 Ship: 1,200 t',
    conditions: 'Block 1 Ship (Block 2 is 1,500 t)',
    probe: () => PROPELLANT_CAPACITY,
  },
  {
    id: 'ship.dry.mass',
    quantity: 'Ship dry mass, kg',
    ...around(100_000, 0.25),
    unit: 'kg',
    tier: 'B',
    source:
      'Elon Musk, 2021, via en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft): roughly 100 t (Block 1)',
    conditions: 'Block 1 Ship, empty',
    probe: () => C.vehicleDryMass,
  },
  {
    id: 'ship.engine.count',
    quantity: 'Raptor engines on the Ship',
    min: 6,
    max: 6,
    unit: 'engines',
    tier: 'A',
    source:
      'SpaceX; en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft): three sea-level Raptors and three RVacs',
    conditions: 'every Ship flown since Flight 1',
    probe: modelledShipEngines,
  },
  {
    id: 'earth.radius',
    quantity: 'Earth mean radius, m',
    ...around(EARTH_MEAN_RADIUS, 0.001),
    unit: 'm',
    tier: 'A',
    source: 'IUGG mean Earth radius R1 = 6,371,008.8 m',
    conditions: 'spherical Earth',
    probe: () => C.planetRadius,
  },
  {
    id: 'orbit.circular.200km',
    quantity: 'circular orbital speed at 200 km altitude, m/s',
    ...around(Math.sqrt(3.986004418e14 / (EARTH_MEAN_RADIUS + 200_000)), 0.005),
    unit: 'm/s',
    tier: 'A',
    source: 'vis-viva with GM = 3.986004418e14 m^3/s^2 (IERS) and R = 6,371 km',
    conditions: 'vacuum, 200 km above the mean radius',
    probe: () => circularOrbitalSpeed(C.planetRadius + 200_000),
  },
];
