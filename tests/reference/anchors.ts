/**
 * The reference rows. Each probe reads the simulation's own model; nothing here
 * restates a constant the model does not use.
 */
import * as C from '$core/constants';
import { createInitialState } from '$core/state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
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
  {
    id:'super-heavy.height',quantity:'historical booster hull height, m',
    ...around(71,.01),unit:'m',tier:'A',
    source:'FAA https://www.faa.gov/media/94371 PDF108/printed41, historical71m x9m cohort',
    conditions:'Raptor2 historical booster, excluding future V3 expansion',probe:()=>SUPER_HEAVY.height,
  },
  {
    id:'super-heavy.diameter',quantity:'historical booster hull diameter, m',
    ...around(9,.01),unit:'m',tier:'A',
    source:'FAA https://www.faa.gov/media/94371 PDF108/printed41',
    conditions:'Raptor2 historical booster',probe:()=>SUPER_HEAVY.diameter,
  },
  {
    id:'super-heavy.propellant.capacity',quantity:'historical booster full propellant load, kg',
    ...around(3400000,.05),unit:'kg',tier:'A',
    source:'FAA https://www.faa.gov/media/94371 PDF230, SpaceX page accessed2025-02-07',
    conditions:'historical3400t cohort; future4100t cap excluded',probe:()=>SUPER_HEAVY.propellantCapacity,
  },
  {
    id:'super-heavy.engine.count',quantity:'booster Raptor engine count',
    min:33,max:33,unit:'engines',tier:'A',
    source:'SpaceX https://www.spacex.com/updates/reusability',
    conditions:'33 sea-level Raptors,13 steerable',probe:()=>createInitialState(123,SUPER_HEAVY).engines.running.length,
  },
  {
    id:'super-heavy.dry.mass',quantity:'estimated booster dry mass, kg',
    ...around(200000,.2),unit:'kg',tier:'B',
    source:'Phase7 declared engineering estimate; no verified primary dry-mass declaration',
    conditions:'160–240t sensitivity, not manufacturer-certified',probe:()=>SUPER_HEAVY.dryMass,
  },
  {
    id:'super-heavy.grid-fin.area',quantity:'estimated combined four-fin reference area, m²',
    ...around(24,.25),unit:'m²',tier:'B',
    source:'Phase7 declared flat-plate engineering approximation, not measured coefficient data',
    conditions:'four coupled upper grid fins',probe:()=>SUPER_HEAVY.gridFins!.area,
  },

];
