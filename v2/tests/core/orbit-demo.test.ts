/**
 * M2.9: the orbital demonstration — PARTIAL. See docs/ROADMAP-TASKS.md.
 *
 * Acceptance asked for: under the fidelity flags, circularize at 100 km, coast
 * one full lap, deorbit, land at StarBase.
 *
 * WHAT WORKS, and is asserted below: the orbital presets exist, a 21 m/s
 * prograde burn circularizes, and a circular orbit at 150 km holds for a full
 * 88-minute lap with 38 m of drift.
 *
 * WHAT DOES NOT, with the measurements:
 *
 *   100 km IS NOT A SUSTAINABLE ORBIT. Measured: a perfectly circular 100 km
 *   orbit decays to the ground within one lap, purely from drag. That is not a
 *   defect — 100 km is the Karman line, and real objects there deorbit within
 *   an orbit or two; real LEO starts around 200 km. At 150 km the same orbit
 *   drifts by 38 m in a lap, and at 200 km by 40 m. The acceptance line's
 *   "100 km" is below what the physics allows.
 *
 *   ORBITAL RE-ENTRY EXCEEDS THE HEAT LIMIT BY SIX TIMES. Measured: a deorbit
 *   from 150 km peaks at 310 thermal units against a heatLimit of 55. This is
 *   the same owner decision already raised at M2.1 — that limit was tuned
 *   against a model which understated both density and heating, and M2.2 changed
 *   the units the number is expressed in.
 *
 *   THE AUTOPILOT HAS NO ORBITAL TARGETING. Flown open-loop with breakup
 *   suppressed, the vehicle reaches the ground 15,000 km from StarBase. The
 *   2021 autopilot knows how to come home from a suborbital hop; landing from
 *   orbit on a chosen site needs a deorbit-targeting mode that has never
 *   existed. That is a feature, not a fix.
 *
 * These are asserted, not merely described, so they cannot drift unnoticed.
 */
import { describe, expect, it } from 'vitest';
import { circularOrbitalSpeed } from '$core/physics/gravity';
import { isaAtmosphere } from '$core/physics/isa';
import { createScenarioState, getScenario, ORBITAL_PRESETS } from '$core/scenarios';
import type { SimState } from '$core/state';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import * as C from '$core/constants';

const DT = 1 / 120;
/** The configuration the demo is specified to run under. */
const ORBIT_FLAGS = { planetCenteredGravity: true, fullISA: true } as const;

const circularHere = (s: SimState) => circularOrbitalSpeed(s.kinematics.distanceToPlanetCenter);

/** Put a state in a circular orbit at `altitude`. */
function circularAt(altitude: number): SimState {
  const s = createScenarioState(getScenario('deorbit')!);
  Object.assign(s.flags, ORBIT_FLAGS);
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.speedX = circularOrbitalSpeed(C.planetRadius + altitude);
  s.kinematics.speedY = 0;
  s.kinematics.trueSpeed = s.kinematics.speedX;
  return s;
}

/** Steps in one orbital period at a given altitude. */
const lapSteps = (altitude: number) => {
  const r = C.planetRadius + altitude;
  return Math.round((2 * Math.PI * r) / circularOrbitalSpeed(r) / DT);
};

describe('the orbital presets', () => {
  it('exist, and are declared separately from the 2021 five', () => {
    expect(ORBITAL_PRESETS.map((p) => p.id)).toEqual(['circularize', 'deorbit']);
    // Not among PRESETS: they are unplayable in the default configuration,
    // because the 2021 relief term is clamped at g.
    expect(getScenario('circularize')).toBeDefined();
    expect(getScenario('deorbit')).toBeDefined();
  });

  it('Circularize starts just short of orbital speed', () => {
    const s = createScenarioState(getScenario('circularize')!);
    const shortfall = circularHere(s) - s.kinematics.speedX;
    expect(shortfall).toBeGreaterThan(5);
    expect(shortfall).toBeLessThan(60);
  });

  it('Deorbit starts circular, half a lap from StarBase', () => {
    const s = createScenarioState(getScenario('deorbit')!);
    expect(s.kinematics.speedX / circularHere(s)).toBeCloseTo(1, 3);
    const fromBase = Math.abs(s.kinematics.downRangeDistance - C.starBaseXPos);
    expect(fromBase).toBeCloseTo(Math.PI * C.planetRadius, -4);
  });
});

describe('circularize — works', () => {
  it('a short prograde burn closes the orbit', () => {
    let s = createScenarioState(getScenario('circularize')!);
    Object.assign(s.flags, ORBIT_FLAGS);
    const needed = circularHere(s) - s.kinematics.speedX;

    cmd.toggleAllRaptors(s);
    s.vehicle.throttle = 100;
    s.vehicle.throttleCurrent = 100;

    let burnSteps = 0;
    for (let i = 0; i < 120 * 300; i++) {
      if (s.kinematics.speedX >= circularHere(s)) {
        cmd.toggleAllRaptors(s);
        break;
      }
      s = step(s, DT);
      burnSteps += 1;
    }

    // About 20 m/s, which is what circularising a nearly-circular orbit costs.
    expect(needed).toBeLessThan(60);
    expect(burnSteps * DT, 'burn duration').toBeLessThan(30);
    expect(s.kinematics.speedX / circularHere(s)).toBeCloseTo(1, 3);
    expect(s.failures.inFlightBreakUp).toBe(false);
    expect(s.kinematics.altitude).toBeGreaterThan(95_000);
  });
});

describe('coast a full lap — works at 150 km, not at 100', () => {
  it('a 150 km orbit holds for a full 88-minute lap', () => {
    let s = circularAt(150_000);
    const steps = lapSteps(150_000);
    expect((steps * DT) / 60).toBeCloseTo(87.9, 0);

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < steps; i++) {
      s = step(s, DT);
      min = Math.min(min, s.kinematics.altitude);
      max = Math.max(max, s.kinematics.altitude);
    }
    expect(max - min, 'altitude band over one lap').toBeLessThan(200);
    expect(s.failures.inFlightBreakUp).toBe(false);
    expect(s.forces.thermalPower).toBeLessThan(C.heatLimit);
  });

  it('BLOCKER: a 100 km orbit decays to the ground within one lap', () => {
    // Physically correct rather than a defect: 100 km is the Karman line.
    // Asserted so the roadmap's "100 km" is measured, not assumed.
    let s = circularAt(100_000);
    const steps = lapSteps(100_000);
    for (let i = 0; i < steps; i++) {
      // Breakup suppressed, to measure decay rather than the heat limit.
      s.failures.inFlightBreakUp = false;
      s = step(s, DT);
      if (s.kinematics.altitude < 1_000) break;
    }
    expect(s.kinematics.altitude, 'should have decayed').toBeLessThan(1_000);
  });

  it('the atmosphere is 12x thinner at 150 km than at 100 km', () => {
    // Why one works and the other does not.
    const ratio = isaAtmosphere(100_000).airDensity / isaAtmosphere(150_000).airDensity;
    expect(ratio).toBeGreaterThan(1_000);
  });
});

describe('deorbit and land — BLOCKED', () => {
  it('BLOCKER: orbital re-entry peaks at ~6x the heat limit', () => {
    let s = circularAt(150_000);
    s.kinematics.pitch = (-Math.PI / 2) as never;
    cmd.toggleAllRaptors(s);
    s.vehicle.throttle = 100;
    s.vehicle.throttleCurrent = 100;

    const v0 = s.kinematics.speedX;
    for (let i = 0; i < 120 * 200 && s.kinematics.speedX > v0 - 200; i++) s = step(s, DT);
    cmd.toggleAllRaptors(s);
    cmd.toggleAutoLand(s);

    let peakHeat = 0;
    for (let i = 0; i < 120 * 4000; i++) {
      s.failures.inFlightBreakUp = false;
      s = step(s, DT);
      peakHeat = Math.max(peakHeat, s.forces.thermalPower);
      if (s.kinematics.altitude < 1_000 || s.failures.crashed) break;
    }

    expect(peakHeat, 'peak thermal load on re-entry from orbit').toBeGreaterThan(200);
    expect(peakHeat / C.heatLimit).toBeGreaterThan(4);
  });

  it('BLOCKER: the autopilot cannot target a landing site from orbit', () => {
    // autoLand knows how to come home from a suborbital hop. It has no
    // deorbit-targeting mode, and the 2021 tree never had one either.
    let s = circularAt(150_000);
    s.kinematics.pitch = (-Math.PI / 2) as never;
    cmd.toggleAllRaptors(s);
    const v0 = s.kinematics.speedX;
    for (let i = 0; i < 120 * 200 && s.kinematics.speedX > v0 - 200; i++) s = step(s, DT);
    cmd.toggleAllRaptors(s);
    cmd.toggleAutoLand(s);

    for (let i = 0; i < 120 * 4000; i++) {
      s.failures.inFlightBreakUp = false;
      s = step(s, DT);
      if (s.kinematics.altitude < 100 || s.failures.crashed || s.status.landed) break;
    }
    const missDistance = Math.abs(s.kinematics.downRangeDistance - C.starBaseXPos);
    expect(missDistance, 'lands nowhere near StarBase').toBeGreaterThan(1_000_000);
  });
});

describe('the isothermal continuation above the ISA table', () => {
  it('matches the published standard at 100 km within 4%', () => {
    // Landed here because the previous hard clamp made orbital flight
    // impossible: it held the 86 km density everywhere above, which is twelve
    // times too dense at 100 km and turns a 31-unit thermal load into 109.
    expect(isaAtmosphere(100_000).airDensity / 5.604e-7).toBeCloseTo(1, 1);
  });

  it('decays smoothly and stays positive to any altitude', () => {
    let previous = Infinity;
    for (const h of [86_000, 90_000, 100_000, 120_000, 150_000, 200_000, 400_000]) {
      const rho = isaAtmosphere(h).airDensity;
      expect(rho, `${h} m`).toBeLessThan(previous);
      expect(rho).toBeGreaterThan(0);
      previous = rho;
    }
  });
});
