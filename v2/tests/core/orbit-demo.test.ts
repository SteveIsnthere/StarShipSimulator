/**
 * M2.9: the orbital demonstration, end to end.
 *
 * Circularize at 150 km, coast a full lap, deorbit, land at StarBase — the
 * acceptance line for M2.9, and the thing this whole rebuild was building
 * toward. None of it was possible in 2021: the relief term was clamped at g, so
 * a vehicle at orbital speed still fell, and "circularize" had nothing to mean.
 *
 * This file used to be a list of blockers. All three are resolved, and each is
 * still asserted here — as a fact rather than an obstacle — because the reason
 * each was a blocker is worth not forgetting:
 *
 *   100 KM IS NOT A SUSTAINABLE ORBIT. Still true, still measured below: a
 *   perfectly circular orbit there decays to the ground within one lap, purely
 *   from drag. That is not a defect. 100 km is the Karman line, and real
 *   objects there deorbit within an orbit or two. M2.9(b) moved the presets to
 *   150 km, where the same orbit drifts by under 200 m in a lap.
 *
 *   ORBITAL RE-ENTRY EXCEEDED THE HEAT LIMIT SIX TIMES OVER. Resolved by
 *   M2.9(a): the limit had been tuned against a model that understated both
 *   density and heating. Recalibrated to preserve the 2021 margin, it is 390,
 *   and a managed entry from orbit peaks at 309.
 *
 *   THE AUTOPILOT HAD NO ORBITAL TARGETING. Built in M2.9(c): `autoDeorbit`.
 *   Open-loop, the vehicle used to reach the ground 15 000 km from StarBase.
 *   It now lands within a few hundred metres of it.
 */
import { describe, expect, it } from 'vitest';
import { circularOrbitalSpeed } from '$core/physics/gravity';
import { isaAtmosphere } from '$core/physics/isa';
import {
  createScenarioState,
  getScenario,
  ORBIT_ALTITUDE,
  ORBITAL_PRESETS,
} from '$core/scenarios';
import type { SimState } from '$core/state';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import * as C from '$core/constants';

const DT = 1 / 120;

const circularHere = (s: SimState) => circularOrbitalSpeed(s.kinematics.distanceToPlanetCenter);

/** Put a state in a circular orbit at `altitude`. */
function circularAt(altitude: number): SimState {
  const s = createScenarioState(getScenario('deorbit')!);
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

type Outcome = 'flying' | 'landed' | 'crashed' | 'brokeUp';

interface Flight {
  state: SimState;
  outcome: Outcome;
  seconds: number;
  peakHeat: number;
  /** m, signed: positive is past the pad. */
  miss: number;
  burnStartedAt: number;
  handedOverAt: number;
}

/** Fly a state to a conclusion, recording what happened on the way. */
function fly(start: SimState, maxSeconds: number): Flight {
  let s = start;
  let peakHeat = 0;
  let burnStartedAt = -1;
  let handedOverAt = -1;
  let outcome: Outcome = 'flying';
  let seconds = maxSeconds;

  for (let i = 1; i <= 120 * maxSeconds; i++) {
    s = step(s, DT);
    peakHeat = Math.max(peakHeat, s.forces.thermalPower);
    if (burnStartedAt < 0 && s.autopilot.deorbitBurnStarted) burnStartedAt = i / 120;
    if (handedOverAt < 0 && s.autopilot.autoLandOn) handedOverAt = i / 120;
    if (s.failures.inFlightBreakUp) outcome = 'brokeUp';
    else if (s.failures.crashed) outcome = 'crashed';
    else if (s.status.landed) outcome = 'landed';
    if (outcome !== 'flying') {
      seconds = i / 120;
      break;
    }
  }

  return {
    state: s,
    outcome,
    seconds,
    peakHeat,
    miss: s.kinematics.downRangeDistance - C.starBaseXPos,
    burnStartedAt,
    handedOverAt,
  };
}

describe('the orbital presets', () => {
  it('exist, and are declared separately from the 2021 five', () => {
    expect(ORBITAL_PRESETS.map((p) => p.id)).toEqual(['circularize', 'deorbit']);
    expect(getScenario('circularize')).toBeDefined();
    expect(getScenario('deorbit')).toBeDefined();
  });

  it("both spawn at 150 km — M2.9(b), the owner's decision", () => {
    for (const id of ['circularize', 'deorbit']) {
      const s = createScenarioState(getScenario(id)!);
      expect(s.kinematics.altitude, id).toBe(ORBIT_ALTITUDE);
    }
    expect(ORBIT_ALTITUDE).toBe(150_000);
  });

  it('Circularize starts exactly 20 m/s short of circular speed', () => {
    const s = createScenarioState(getScenario('circularize')!);
    // Derived from circularOrbitalSpeed at spawn rather than transcribed, so
    // moving the altitude cannot leave a stale speed behind.
    expect(circularHere(s) - s.kinematics.speedX).toBeCloseTo(20, 6);
    expect(s.kinematics.speedX).toBeCloseTo(7780.68, 1);
  });

  it('Deorbit starts exactly circular, half a lap from StarBase', () => {
    const s = createScenarioState(getScenario('deorbit')!);
    expect(s.kinematics.speedX).toBe(circularHere(s));
    expect(s.kinematics.speedX).toBeCloseTo(7800.68, 1);
    const fromBase = Math.abs(s.kinematics.downRangeDistance - C.starBaseXPos);
    expect(fromBase).toBeCloseTo(Math.PI * C.planetRadius, -4);
  });
});

describe('step 1 — circularize', () => {
  it('a short prograde burn closes the orbit', () => {
    let s = createScenarioState(getScenario('circularize')!);
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

    expect(needed).toBeCloseTo(20, 6);
    expect(burnSteps * DT, 'burn duration').toBeLessThan(30);
    expect(s.kinematics.speedX / circularHere(s)).toBeCloseTo(1, 3);
    expect(s.failures.inFlightBreakUp).toBe(false);
    expect(s.kinematics.altitude).toBeGreaterThan(145_000);
  });
});

describe('step 2 — coast a full lap', () => {
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

  it('and 100 km still does not — which is why the presets are at 150', () => {
    let s = circularAt(100_000);
    const steps = lapSteps(100_000);
    for (let i = 0; i < steps; i++) {
      s.failures.inFlightBreakUp = false;
      s = step(s, DT);
      if (s.kinematics.altitude < 1_000) break;
    }
    expect(s.kinematics.altitude, 'should have decayed').toBeLessThan(1_000);
  });

  it('the atmosphere is a thousand times thinner at 150 km than at 100 km', () => {
    const ratio = isaAtmosphere(100_000).airDensity / isaAtmosphere(150_000).airDensity;
    expect(ratio).toBeGreaterThan(1_000);
  });
});

describe('step 3 — deorbit and land at StarBase', () => {
  // The acceptance flight. 48 simulated minutes at 120 Hz.
  const flight = fly(
    (() => {
      const s = createScenarioState(getScenario('deorbit')!);
      cmd.toggleAutoDeorbit(s);
      return s;
    })(),
    8_000,
  );

  it('survives the entry', () => {
    expect(flight.outcome, `after ${flight.seconds.toFixed(0)} s`).toBe('landed');
    expect(flight.state.failures.inFlightBreakUp).toBe(false);
    expect(flight.state.failures.crashed).toBe(false);
  });

  it('and touches down within a kilometre of the pad', () => {
    // THE MEASURED FIGURE, not a promise made in advance. `DEORBIT_LEAD_DISTANCE`
    // was calibrated by a secant search over this very flight, so this assertion
    // is what pins the calibration: change the burn, the atmosphere, the
    // autopilot or the presets and this moves.
    //
    // Asserted as a band rather than a number because the point is the accuracy,
    // not the digits: within a kilometre of a pad after leaving a 150 km orbit.
    expect(Math.abs(flight.miss), `missed by ${(flight.miss / 1000).toFixed(3)} km`).toBeLessThan(
      1_000,
    );
  });

  it('lands gently, within the touchdown limits', () => {
    const k = flight.state.kinematics;
    expect(Math.abs(k.speedY)).toBeLessThan(C.touchDownSpeedLimit);
    expect(Math.abs(k.speedX)).toBeLessThan(2);
    expect(Math.abs(k.pitch)).toBeLessThan(C.touchDownPitchLimit);
  });

  it('flies the sequence it is supposed to: coast, burn, hand over, descend', () => {
    // Not merely "it landed" — that could happen by accident. The phases have to
    // have run, in order, at the times the design says.
    expect(flight.burnStartedAt, 'coasted most of a lap before firing').toBeGreaterThan(1_500);
    expect(flight.handedOverAt, 'handed over shortly after the burn').toBeGreaterThan(
      flight.burnStartedAt,
    );
    expect(flight.handedOverAt - flight.burnStartedAt, 'burn duration').toBeLessThan(30);
    expect(flight.seconds, 'a 48-minute flight').toBeGreaterThan(2_000);

    // And the mode really did hand over rather than fight autoLand for control.
    // (autoLandOn is false at the end because autoLand clears itself once the
    // vehicle is down — `handedOverAt` is the evidence it ran.)
    expect(flight.state.autopilot.autoDeorbitOn, 'deorbit mode cleared itself').toBe(false);
    expect(flight.handedOverAt, 'autoLand took over').toBeGreaterThan(0);
    expect(flight.state.autopilot.deorbitBurnCompleted).toBe(true);
  });

  it('and the entry is managed, not merely survived', () => {
    // 309 units against a limit of 390 — 79% of it. The margin is the whole
    // reason the burn is a fixed 150 m/s: a bigger one drops perigee further,
    // meets thick air faster, and pushes the peak up.
    expect(flight.peakHeat).toBeGreaterThan(250);
    expect(flight.peakHeat).toBeLessThan(C.heatLimit);
    expect(flight.peakHeat / C.heatLimit, 'fraction of the structural limit').toBeCloseTo(0.79, 2);
  });

  it('is deterministic — the same flight twice', () => {
    const again = fly(
      (() => {
        const s = createScenarioState(getScenario('deorbit')!);
        cmd.toggleAutoDeorbit(s);
        return s;
      })(),
      8_000,
    );
    expect(again.miss).toBe(flight.miss);
    expect(again.seconds).toBe(flight.seconds);
    expect(again.peakHeat).toBe(flight.peakHeat);
  });
});

describe('the deorbit mode itself', () => {
  it('spends the coast turning around, because RCS is slow', () => {
    // Prograde at spawn, and the mode has to turn the vehicle 180 degrees on
    // reaction control alone. Measured: about 0.0015 rad/s, so half a turn takes
    // roughly 35 minutes and the vehicle is still 19.5 degrees short of
    // retrograde when the burn starts. That is not a defect to hide — it is why
    // the mode commands retrograde from the first step of the coast instead of
    // waiting until the firing point, and why the burn is 150 m/s rather than a
    // brief nudge that a 20-degree pointing error would smear.
    let s = createScenarioState(getScenario('deorbit')!);
    cmd.toggleAutoDeorbit(s);
    expect(s.kinematics.pitch).toBeCloseTo(Math.PI / 2, 6);

    let pitchAtBurn = NaN;
    for (let i = 0; i < 120 * 2_000; i++) {
      s = step(s, DT);
      if (s.autopilot.deorbitBurnStarted) {
        pitchAtBurn = s.kinematics.pitch;
        break;
      }
    }

    expect(s.status.rcsActive, 'RCS armed to do the turning').toBe(true);
    expect(Number.isNaN(pitchAtBurn), 'never fired').toBe(false);
    // Within 25 degrees of retrograde at ignition, and closing.
    expect(Math.abs(pitchAtBurn - -Math.PI / 2)).toBeLessThan(0.44);
    expect(pitchAtBurn).toBeLessThan(0);
  });

  it('does not fire until the ground track is right', () => {
    let s = createScenarioState(getScenario('deorbit')!);
    cmd.toggleAutoDeorbit(s);
    for (let i = 0; i < 120 * 2_000; i++) {
      s = step(s, DT);
      if (s.autopilot.deorbitBurnStarted) break;
      const gap = C.starBaseXPos - s.kinematics.downRangeDistance;
      const toGo = gap < 0 ? gap + C.planetCircumference : gap;
      expect(toGo, 'fired early').toBeGreaterThan(C.DEORBIT_LEAD_DISTANCE);
    }
    expect(s.autopilot.deorbitBurnStarted).toBe(true);
  });

  it('turning it off resets it, so re-arming starts from the coast', () => {
    const s = createScenarioState(getScenario('deorbit')!);
    cmd.toggleAutoDeorbit(s);
    s.autopilot.deorbitBurnStarted = true;
    s.autopilot.deorbitTargetSpeed = 1234;

    cmd.toggleAutoDeorbit(s);
    expect(s.autopilot.autoDeorbitOn).toBe(false);
    expect(s.autopilot.deorbitBurnStarted).toBe(false);
    expect(s.autopilot.deorbitInitCompleted).toBe(false);
    expect(s.autopilot.deorbitTargetSpeed).toBeUndefined();
  });

  it('does nothing at all while it is off, which every other scenario relies on', () => {
    // The six 2021 scenarios and the intro all run with this mode present and
    // disarmed. If it touched anything, every golden fixture would have moved.
    let s = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 120 * 30; i++) s = step(s, DT);
    expect(s.autopilot.autoDeorbitOn).toBe(false);
    expect(s.autopilot.deorbitInitCompleted).toBe(false);
    expect(s.autopilot.deorbitBurnStarted).toBe(false);
    expect(s.autopilot.deorbitTargetSpeed).toBeUndefined();
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
