/**
 * M1.7 acceptance: each preset initialises a valid SimState.
 *
 * "Valid" is checked as three things: the conversions match
 * `configureNewFlight()` exactly, every numeric field is finite, and the state
 * actually flies — a scenario that produces NaN on step 3 is not valid however
 * well-formed it looks at rest.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_SCENARIOS,
  createIntroState,
  createScenarioState,
  getScenario,
  INTRO,
  LAUNCH_PAD,
  PRESETS,
} from '$core/scenarios';
import * as C from '$core/constants';
import { step } from '$core/step';
import { toRad } from '$core/units';
import type { SimState } from '$core/state';
import { commandIgnition } from '$core/physics/engines';

const DT = 1 / 120;

function flatten(value: unknown, prefix = '', out: Map<string, unknown> = new Map()) {
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

describe('the preset catalogue', () => {
  it('has the five presets index.html actually ships', () => {
    // Reported honestly: CLAUDE.md, the plan and the game's own "What's New?"
    // panel all say six. index.html has five configScenarioPreset buttons and
    // there is no sixth anywhere in the 2021 tree. See core/scenarios.ts.
    expect(PRESETS).toHaveLength(5);
    expect(PRESETS.map((p) => p.name)).toEqual([
      'Booster Sep',
      'RTLS',
      'Re-entry',
      'Before Flip',
      'Landing Burn',
    ]);
  });

  it('carries the exact numbers from the onclick attributes', () => {
    // configScenarioPreset(alt, xpos, vx, vy, pit, porp)
    const expected: ReadonlyArray<readonly [string, number[]]> = [
      ['booster-sep', [70000, 45000, 1130, 1130, 45, 500]],
      ['rtls', [15000, 5000, 330, 430, 30, 200]],
      ['reentry', [80000, -1980000, 7300, -30, 30, 50]],
      ['before-flip', [1000, -100, 0, -70, 90, 30]],
      ['landing-burn', [200, 0, 0, -35, 0, 20]],
    ];
    for (const [id, [alt, xpos, vx, vy, pit, porp]] of expected) {
      const p = getScenario(id)!;
      expect([p.altitude, p.xPosition, p.speedX, p.speedY, p.pitch, p.propellant], id).toEqual([
        alt,
        xpos,
        vx,
        vy,
        pit,
        porp,
      ]);
    }
  });

  it('ids are unique and resolvable', () => {
    const ids = ALL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getScenario(id)?.id).toBe(id);
    expect(getScenario('nope')).toBeUndefined();
  });
});

describe('createScenarioState applies configureNewFlight verbatim', () => {
  it.each(ALL_SCENARIOS)('$name produces a valid state', (preset) => {
    const s = createScenarioState(preset);

    // X-position is relative to StarBase (tools.js:204).
    expect(s.kinematics.downRangeDistance).toBe(preset.xPosition + C.starBaseXpos);
    // Pitch is degrees in, radians out (tools.js:213).
    expect(s.kinematics.pitch).toBe(toRad(preset.pitch));
    // Propellant is tonnes (tools.js:216).
    expect(s.vehicle.propellantMass).toBe(preset.propellant * 1000);
    expect(s.vehicle.vehicleMass).toBe(C.vehicleDryMass + preset.propellant * 1000);

    expect(s.kinematics.speedX).toBe(preset.speedX);
    expect(s.kinematics.speedY).toBe(preset.speedY);

    for (const [path, value] of flatten(s)) {
      if (typeof value === 'number') {
        expect(Number.isNaN(value), `${path} is NaN`).toBe(false);
      }
    }
  });

  it('floors altitude at vehicleHeight / 2, so nothing spawns underground', () => {
    const sunken = { ...LAUNCH_PAD, altitude: -500 };
    expect(createScenarioState(sunken).kinematics.altitude).toBe(C.vehicleHeight / 2);
    // And the real presets are all above it already.
    for (const p of PRESETS) expect(p.altitude).toBeGreaterThanOrEqual(C.vehicleHeight / 2);
  });

  it('caps propellant at 1200 t, as the 2021 form did', () => {
    const overfull = { ...LAUNCH_PAD, propellant: 5000 };
    expect(createScenarioState(overfull).vehicle.propellantMass).toBe(1_200_000);
  });

  it('derives trueSpeed and Mach from the components', () => {
    const s = createScenarioState(getScenario('booster-sep')!);
    expect(s.kinematics.trueSpeed).toBeCloseTo(Math.sqrt(1130 ** 2 + 1130 ** 2), 9);
    expect(s.kinematics.machSpeed).toBeCloseTo(s.kinematics.trueSpeed / C.speedOfSound, 9);
  });

  it('the launch pad preset reproduces the default spawn', () => {
    const s = createScenarioState(LAUNCH_PAD);
    expect(s.kinematics.altitude).toBe(C.vehicleHeight / 2);
    expect(s.kinematics.downRangeDistance).toBe(C.starBaseXpos);
    expect(s.vehicle.propellantMass).toBe(C.propellantMass);
  });
});

describe('every scenario actually flies', () => {
  function run(s: SimState, steps: number): SimState {
    let cur = s;
    for (let i = 0; i < steps; i++) cur = step(cur, DT);
    return cur;
  }

  it.each(ALL_SCENARIOS)('$name stays finite over 30 s unpowered', (preset) => {
    const end = run(createScenarioState(preset), 30 * 120);
    for (const [path, value] of flatten(end)) {
      if (typeof value === 'number') {
        expect(Number.isNaN(value), `${preset.id}: ${path} became NaN`).toBe(false);
      }
    }
  });

  it.each(ALL_SCENARIOS)('$name stays finite over 30 s under power', (preset) => {
    const s = createScenarioState(preset);
    for (const i of [0, 1, 2] as const) commandIgnition(s, i);
    const end = run(s, 30 * 120);
    for (const [path, value] of flatten(end)) {
      if (typeof value === 'number') {
        expect(Number.isNaN(value), `${preset.id}: ${path} became NaN`).toBe(false);
      }
    }
  });

  it.each(ALL_SCENARIOS)('$name is deterministic', (preset) => {
    const a = flatten(run(createScenarioState(preset), 600));
    const b = flatten(run(createScenarioState(preset), 600));
    for (const [path, value] of a) {
      expect(Object.is(b.get(path), value), `${preset.id} diverged at ${path}`).toBe(true);
    }
  });

  it('Re-entry starts at genuinely orbital speed, which is the point of it', () => {
    const s = createScenarioState(getScenario('reentry')!);
    const circular = Math.sqrt(
      (C.gravitationalConstant * C.planetMass) / s.kinematics.distanceToPlanetCenter,
    );
    // 7300 m/s against ~7860 m/s circular: sub-orbital but close, which is why
    // the 2021 relief hack showing zero relief here is so wrong. M2.6.
    expect(s.kinematics.speedX / circular).toBeGreaterThan(0.9);
    expect(s.kinematics.speedX / circular).toBeLessThan(1.0);
  });
});

describe('the intro demo scenario', () => {
  it('matches welcome.js startRunningGame()', () => {
    const s = createIntroState();
    expect(s.kinematics.altitude).toBe(999);
    expect(s.kinematics.speedY).toBe(-250);
    expect(s.vehicle.propellantMass).toBe(12_000);
    expect(s.status.finLocked).toBe(true);
    expect(s.autopilot.demoAutoLandOn).toBe(true);
  });

  it('is a scenario like any other, just without a button', () => {
    expect(INTRO.id).toBe('intro');
    expect(ALL_SCENARIOS).toContain(INTRO);
  });
});
