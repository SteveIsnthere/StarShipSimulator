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
import { getReentryHeatPower } from '$core/physics/thermal';
import { getDynamicPressure } from '$core/physics/aero';
import { circularOrbitalSpeed, gravityAt, MU } from '$core/physics/gravity';
import { getWorkingEngineCount } from '$core/physics/engines';
import * as C from '$core/constants';

describe('the thermal units are kilowatts per square metre, near enough', () => {
  /**
   * Sutton-Graves in SI: q = K * sqrt(rho / R_nose) * v^3, in W/m^2.
   *
   * The 2021 model uses the same form with K = 1.83e-7 where the published
   * constant is 1.7415e-4 — a factor of 951.6. So `thermalPower` is heat flux
   * in W/m^2 divided by 951.6, which is within 5% of kW/m^2. Nothing in the
   * simulation depends on knowing that; everything about whether its numbers
   * are sane does.
   */
  const K_SI = 1.7415e-4;
  const K_GAME = 1.83e-7;
  /** W/m^2 per game unit. */
  const WATTS_PER_UNIT = K_SI / K_GAME;

  it('the game constant is the published one, scaled', () => {
    // Recovered from the function rather than from a comment: one unit of
    // thermalPower is 951.6 W/m^2.
    const rho = 1e-4;
    const v = 7000;
    const units = getReentryHeatPower(v, rho, C.NOSE_RADIUS);
    const wattsPerSquareMetre = K_SI * Math.sqrt(rho / C.NOSE_RADIUS) * v ** 3;
    expect(wattsPerSquareMetre / units).toBeCloseTo(WATTS_PER_UNIT, 6);
    expect(WATTS_PER_UNIT / 1000, 'kW/m^2 per unit').toBeCloseTo(0.952, 3);
  });

  it('so heatLimit is about 37 W/cm^2 — a number a heat shield is built to', () => {
    // For scale: Shuttle's nose cap peaked around 45-70 W/cm^2 on entry from
    // low orbit, and that is the regime this vehicle flies.
    const wattsPerSquareCm = (C.heatLimit * WATTS_PER_UNIT) / 1e4;
    expect(wattsPerSquareCm).toBeGreaterThan(25);
    expect(wattsPerSquareCm).toBeLessThan(60);
  });

  it('and the 2021 limit of 55 was 5 W/cm^2, which nothing is built THAT fragile', () => {
    // The independent corroboration of M2.9(a). The recalibration was derived
    // from 2021's own margin without reference to any of this — and it landed
    // on a physically sensible number, where the value it replaced did not.
    const old = (55 * WATTS_PER_UNIT) / 1e4;
    expect(old).toBeLessThan(6);
  });

  it('a re-entry from low orbit peaks in the twenties, as it should', () => {
    // 318 units at the orbital entry's peak; the Re-entry preset reaches 246.
    for (const [units, low, high] of [
      [246, 18, 30],
      [318, 25, 40],
    ] as const) {
      const wattsPerSquareCm = (units * WATTS_PER_UNIT) / 1e4;
      expect(wattsPerSquareCm, `${units} units`).toBeGreaterThan(low);
      expect(wattsPerSquareCm).toBeLessThan(high);
    }
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
  it('its gravitational parameter is Earth\'s', () => {
    // 3.986e14. The radius is 6400 km rather than 6371, so surface gravity is
    // 9.731 rather than 9.807 — which is why the 2021 constant is 0.78% high.
    expect(MU / 3.986e14).toBeCloseTo(1, 2);
    expect(gravityAt(C.planetRadius)).toBeCloseTo(9.731, 2);
  });

  it('escape velocity is 11.2 km/s', () => {
    expect(Math.sqrt((2 * MU) / C.planetRadius) / 1000).toBeCloseTo(11.16, 1);
  });

  it('low orbit is 7.8 km/s and takes 88 minutes', () => {
    const r = C.planetRadius + 150_000;
    const v = circularOrbitalSpeed(r);
    expect(v).toBeCloseTo(7800, -2);
    expect((2 * Math.PI * r) / v / 60).toBeCloseTo(88, 0);
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
    // Thrust over mass flow over g0. Raptor is ~330 s at sea level and ~380 in
    // vacuum; a single figure between them is the right simplification.
    const isp = C.maxThrustPerRaptor / (C.maxFuelFlowPerRaptor * 9.80665);
    expect(isp).toBeGreaterThan(320);
    expect(isp).toBeLessThan(390);
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

  it('its RCS could flip it end over end in nine seconds', () => {
    // The number that showed M2.11's dead command was a control defect and not
    // a hardware limit: bang-bang, a 180-degree rotation takes
    // 2*sqrt(pi/alpha).
    const alpha =
      (C.rcsMaxThrust * C.rcsThrustDistanceFromCenterOfMass) / C.vehicleMomentOfInertia;
    expect(alpha).toBeGreaterThan(0.1);
    const minimumTimeFlip = 2 * Math.sqrt(Math.PI / alpha);
    expect(minimumTimeFlip).toBeLessThan(12);
    // And the reserve is 25 s, so it can afford two of them and no more, which
    // is what makes RCS a resource rather than a free actuator.
    expect(C.rcsRunTimeRemaining / minimumTimeFlip).toBeGreaterThan(2);
    expect(C.rcsRunTimeRemaining / minimumTimeFlip).toBeLessThan(4);
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
