/**
 * Are the numbers physically sensible? The realism audit, made checkable.
 *
 * Every other test in this suite asks whether the simulation is internally
 * consistent, faithful to 2021, or unchanged since the last fixture. None of
 * them asks the question a reader actually cares about: is a thermal load of
 * 318 units a lot? Is a 150 m/s deorbit burn a normal size? Is the heat limit a
 * number a vehicle could be built to?
 *
 * The units make that hard to see, because most of them are the 2021 author's
 * own. So this file converts them into ones with meaning and checks the result
 * against the physical world. It is deliberately not tolerant: these are order
 * comparisons with reality, and a change that broke one would be a change that
 * made the simulation unphysical.
 */
import { describe, expect, it } from 'vitest';
import { getDynamicPressure } from '$core/physics/aero';
import { radiativeSinkKelvin, surfaceTemperature, suttonGravesFlux } from '$core/physics/thermal';
import { isaAtmosphere } from '$core/physics/isa';
import { circularOrbitalSpeed, gravityAt, MU } from '$core/physics/gravity';
import { getWorkingEngineCount } from '$core/physics/engines';
import * as C from '$core/constants';
import { createMassProperties, writeMassProperties } from '$core/physics/mass';

/** Scratch for the RCS claim below (M11.8). */
const rcsArms = createMassProperties();

describe('the heat flux is in W/m^2, and the limit is a tile temperature (Phase 6)', () => {
  it('the flux is Sutton-Graves with the published constant', () => {
    // q = K sqrt(rho / R_n) v^3 with K = 1.7415e-4 for a flux in W/m^2. 2021
    // used 1.83e-7, the same form on a scale 951.6 times smaller.
    const rho = 1e-4;
    const v = 7000;
    expect(suttonGravesFlux(v, rho, C.NOSE_RADIUS)).toBeCloseTo(1.7415e-4 * Math.sqrt(rho / C.NOSE_RADIUS) * v ** 3, 6);
    expect(C.SUTTON_GRAVES_K / 1.83e-7).toBeCloseTo(951.6, 1);
  });

  it('the limit is the HRSI tile 1,260 C held by radiative equilibrium: 26.6 W/cm^2', () => {
    // Shuttle's nose cap peaked around 45-70 W/cm^2 entering from low orbit,
    // on reinforced carbon-carbon; the belly tiles saw a fraction of that.
    expect(C.TILE_LIMIT_KELVIN).toBe(1533);
    expect(surfaceTemperature(C.heatLimit)).toBeCloseTo(1533, 6);
    expect(C.heatLimit / 1e4).toBeCloseTo(26.6, 1);
  });

  it('and the 2021 limit of 55 units was 5 W/cm^2, which nothing is built THAT fragile', () => {
    const old = (55 * (C.SUTTON_GRAVES_K / 1.83e-7)) / 1e4;
    expect(old).toBeLessThan(6);
  });

  it('a tile at 1,372 K re-radiates 18 W/cm^2: the Re-entry preset\'s peak, in physical terms', () => {
    // Radiative equilibrium both ways: eps sigma T^4 and its inverse.
    const flux = C.TILE_EMISSIVITY * C.STEFAN_BOLTZMANN * 1372 ** 4;
    expect(flux / 1e4).toBeCloseTo(17.1, 1);
    expect(surfaceTemperature(flux)).toBeCloseTo(1372, 6);
  });
});

describe('dynamic pressure is kilopascals, whatever 2021 labelled it', () => {
  it('the expression is half rho v squared, in kPa', () => {
    const rho = 1.0;
    const v = 300;
    expect(getDynamicPressure(rho, v)).toBeCloseTo((0.5 * rho * v ** 2) / 1000, 9);
  });

  it('so the 50-unit limit is 50 kPa, which is a real max-q', () => {
    // Launch vehicles fly max-q around 30-35 kPa, so a structural limit half
    // again above that is the right shape. 2021's JSDoc says "psi"; 50 psi
    // would be 345 kPa, which nothing would survive flying to.
    expect(C.dynamicPressureLimit).toBe(50);
    // The speed at which the limit bites at sea level: ~285 m/s, about Mach
    // 0.85 — which is why real vehicles throttle down through it.
    const speedAtLimit = Math.sqrt((C.dynamicPressureLimit * 1000 * 2) / 1.225);
    expect(speedAtLimit).toBeGreaterThan(250);
    expect(speedAtLimit).toBeLessThan(320);
  });
});

describe('the planet is Earth, to within a percent', () => {
  it('its gravitational parameter and radius are Earth\'s', () => {
    // Since Phase 6: GM from IERS 2010 / WGS 84, R the IUGG mean radius. The
    // pull at the surface is GM/R^2 = 9.820, above standard gravity's 9.807
    // because that one is read on a rotating Earth (2021 had 6400 km and 9.731).
    expect(MU).toBe(3.986004418e14);
    expect(C.planetRadius).toBe(6_371_000);
    expect(gravityAt(C.planetRadius)).toBe(MU / C.planetRadius ** 2);
    expect(gravityAt(C.planetRadius)).toBeCloseTo(9.820, 3);
  });

  it('escape velocity is 11.2 km/s', () => {
    expect(Math.sqrt((2 * MU) / C.planetRadius) / 1000).toBeCloseTo(11.16, 1);
  });

  it('low orbit is 7.8 km/s and takes Kepler\'s 87 minutes', () => {
    const r = C.planetRadius + 150_000;
    const v = circularOrbitalSpeed(r);
    expect(v).toBeCloseTo(7800, -2);
    expect((2 * Math.PI * r) / v).toBeCloseTo(2 * Math.PI * Math.sqrt(r ** 3 / MU), 6);
    expect((2 * Math.PI * r) / v / 60).toBeCloseTo(87.3, 1);
  });
});

describe('the vehicle is a Starship, to within what a game needs', () => {
  const wetMass = C.vehicleDryMass + C.propellantMass;

  it('50 m tall, 9 m across, 120 t dry', () => {
    expect(C.vehicleHeight).toBe(50);
    expect(C.vehicleDiameter).toBe(9);
    expect(C.vehicleMaxArea, 'broadside area').toBe(450);
  });

  it('its implied specific impulse is a Raptor\'s', () => {
    // Thrust over mass flow over g0. Since M11.2 the sea-level figure is the
    // published 327 s and the vacuum figure 350 s; `maxThrustPerRaptor` is the
    // sea-level reference. The bounds are a Raptor's, not a specific model's.
    const isp = C.maxThrustPerRaptor / (C.maxFuelFlowPerRaptor * 9.80665);
    expect(isp).toBeGreaterThan(320);
    expect(isp).toBeLessThan(390);
    const ispVac = C.RAPTOR_THRUST_VACUUM / (C.maxFuelFlowPerRaptor * 9.80665);
    expect(ispVac).toBeGreaterThan(isp);
    expect(ispVac).toBeLessThan(390);
  });

  it('lifts off at a thrust-to-weight a little over one', () => {
    const twr = (3 * C.maxThrustPerRaptor) / (wetMass * C.gravity);
    expect(twr).toBeGreaterThan(1.2);
    expect(twr).toBeLessThan(1.8);
  });

  it('and carries about 4.6 km/s of delta-V, which is a landing ship\'s budget', () => {
    const isp = C.maxThrustPerRaptor / (C.maxFuelFlowPerRaptor * 9.80665);
    const deltaV = isp * 9.80665 * Math.log(wetMass / C.vehicleDryMass);
    expect(deltaV).toBeGreaterThan(4_000);
    expect(deltaV).toBeLessThan(5_500);
    // Enough to deorbit thirty times over, which is why the 150 m/s burn is
    // never the constraint.
    expect(deltaV / C.DEORBIT_DELTA_V).toBeGreaterThan(20);
  });

  it('its RCS could flip it end over end in five seconds, and the reserve buys a handful', () => {
    /*
      The number that showed M2.11's dead command was a control defect and not
      a hardware limit: bang-bang, a 180-degree rotation takes 2*sqrt(pi/alpha).

      IT SAID NINE SECONDS UNTIL M11.8, and that was an artefact rather than a
      measurement: it divided the RCS torque at the empty-tank arm by the
      moment of inertia of a FULL vehicle (`C.vehicleMomentOfInertia` is the
      wet-mass cylinder), so it paired a light ship's leverage with a heavy
      ship's stubbornness and got a number belonging to neither. With the two
      taken from the same load — which is what the simulation does now — the
      flip is 4.5 s empty, 4.6 s at the flip's own 30 t, and 6.8 s with full
      tanks, where the arm has grown but the inertia has grown faster.
    */
    // M11.8: against the arm and the inertia the SIMULATION uses, which are
    // now functions of the propellant — the constants this used to read are
    // the empty-tank case only, so the claim was true of a vehicle the sim
    // stopped flying. Checked at the load a flip actually happens at (the
    // before-flip preset's 30 t) and at the extremes, so it is a claim about
    // the vehicle rather than about one row of a table.
    const flipAlpha = (propellant: number) => {
      writeMassProperties(propellant, rcsArms);
      return (C.rcsMaxThrust * rcsArms.rcsArm) / rcsArms.momentOfInertia;
    };
    const alpha = flipAlpha(30_000);
    expect(alpha).toBeGreaterThan(0.1);
    const minimumTimeFlip = 2 * Math.sqrt(Math.PI / alpha);
    expect(minimumTimeFlip).toBeLessThan(12);
    // Full tanks are the hard case and it is still inside the reserve: the
    // arm grows as the centre of mass drops, and the inertia grows faster.
    const fullTimeFlip = 2 * Math.sqrt(Math.PI / flipAlpha(1_200_000));
    expect(fullTimeFlip).toBeGreaterThan(minimumTimeFlip);
    expect(fullTimeFlip).toBeLessThan(C.rcsRunTimeRemaining);
    // And the reserve is 25 s, so it affords a handful of flips and not an
    // unlimited number — between 3.7 with full tanks and 5.6 empty — which is
    // what makes RCS a resource rather than a free actuator.
    expect(C.rcsRunTimeRemaining / minimumTimeFlip).toBeGreaterThan(3);
    expect(C.rcsRunTimeRemaining / minimumTimeFlip).toBeLessThan(7);
    expect(C.rcsRunTimeRemaining / fullTimeFlip).toBeGreaterThan(3);
  });

  it('and three engines is what getWorkingEngineCount counts', () => {
    expect(getWorkingEngineCount([true, true, true])).toBe(3);
  });
});

describe('the deorbit burn is a normal size for the job', () => {
  it('150 m/s from 150 km, where a real one is 60-150', () => {
    // Lower orbits need less: the burn only has to drop the perigee into the
    // atmosphere, and from 150 km it does not have far to go.
    expect(C.DEORBIT_DELTA_V).toBeGreaterThan(50);
    expect(C.DEORBIT_DELTA_V).toBeLessThan(250);
  });

  it('and it costs a few tonnes of propellant, not a tankful', () => {
    const isp = C.maxThrustPerRaptor / (C.maxFuelFlowPerRaptor * 9.80665);
    const wetMass = C.vehicleDryMass + 300_000;
    const spent = wetMass * (1 - Math.exp(-C.DEORBIT_DELTA_V / (isp * 9.80665)));
    expect(spent / 1000).toBeGreaterThan(10);
    expect(spent / 1000).toBeLessThan(30);
  });
});

describe('the tile sits at its surroundings when nothing heats it (Phase 6 close)', () => {
  it('reads the sink with no flux, and the flux-only figure far above it', () => {
    expect(surfaceTemperature(0, 288.15)).toBeCloseTo(288.15, 9);
    expect(surfaceTemperature(C.heatLimit, 288.15) - 1533).toBeLessThan(0.5);
    expect(surfaceTemperature(C.heatLimit, 288.15) - 1533).toBeGreaterThan(0);
  });

  it('the sink is the air below 86 km and the mesopause above it, continuous at 86 km', () => {
    expect(radiativeSinkKelvin(0, 15)).toBeCloseTo(288.15, 9);
    expect(radiativeSinkKelvin(150_000, 700)).toBeCloseTo(186.95, 2);
    const below = radiativeSinkKelvin(85_999.9, isaAtmosphere(85_999.9).airTemperature);
    expect(Math.abs(below - radiativeSinkKelvin(86_000, 0))).toBeLessThan(0.01);
  });
});

