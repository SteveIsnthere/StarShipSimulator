/**
 * M4.4: the menu's model — time warp and the flight editor.
 */
import { describe, expect, it } from 'vitest';
import {
  describeTimeSetting,
  EMPTY_FIELDS,
  fieldsFromPreset,
  fieldsToPreset,
  MAX_TIME_RATE,
  REAL_TIME,
  toLoopOptions,
} from '$ui/menu';
import { ALL_SCENARIOS, createScenarioState, getScenario, INTRO, PRESETS, ORBITAL_PRESETS } from '$core/scenarios';
import { advance, createLoopState, DT } from '$app/loop';
import { vehicleHeight, starBaseXPos } from '$core/constants';
import { toDeg } from '$core/units';

describe('time warp', () => {
  it('is real time at the default setting', () => {
    expect(toLoopOptions(REAL_TIME)).toEqual({ timeWarp: 1, slowMotion: 1 });
    expect(describeTimeSetting(REAL_TIME)).toBe('1x');
  });

  it('speeding up runs more steps; slowing down runs fewer', () => {
    expect(toLoopOptions({ rate: 4, speedingUp: true })).toEqual({ timeWarp: 4, slowMotion: 1 });
    expect(toLoopOptions({ rate: 4, speedingUp: false })).toEqual({ timeWarp: 1, slowMotion: 4 });
    expect(describeTimeSetting({ rate: 4, speedingUp: true })).toBe('4x');
    expect(describeTimeSetting({ rate: 4, speedingUp: false })).toBe('1/4x');
  });

  it('clamps the slider range and rounds', () => {
    expect(toLoopOptions({ rate: 99, speedingUp: true }).timeWarp).toBe(MAX_TIME_RATE);
    expect(toLoopOptions({ rate: 0, speedingUp: true }).timeWarp).toBe(1);
    expect(toLoopOptions({ rate: 3.6, speedingUp: true }).timeWarp).toBe(4);
  });
});

describe('time warp against the loop', () => {
  /** Steps taken over one simulated second of frames at 60 fps. */
  function stepsInOneSecond(options: { timeWarp: number; slowMotion: number }): number {
    const loop = createLoopState(createScenarioState(getScenario('landing-burn')!));
    for (let i = 0; i < 60; i++) advance(loop, 1 / 60, options);
    return loop.totalSteps;
  }

  it('warp N runs about N times the steps', () => {
    const one = stepsInOneSecond({ timeWarp: 1, slowMotion: 1 });
    expect(one).toBeGreaterThan(115);
    expect(one).toBeLessThanOrEqual(120);

    for (const n of [2, 4, 8]) {
      const many = stepsInOneSecond({ timeWarp: n, slowMotion: 1 });
      expect(many, `warp ${n}`).toBe(one * n);
    }
  });

  it('slow motion N runs about a fraction of the steps', () => {
    const one = stepsInOneSecond({ timeWarp: 1, slowMotion: 1 });
    for (const n of [2, 4, 8]) {
      const few = stepsInOneSecond({ timeWarp: 1, slowMotion: n });
      expect(few, `slow ${n}`).toBeGreaterThan(one / n - 2);
      expect(few, `slow ${n}`).toBeLessThan(one / n + 2);
    }
  });

  it('every step is still DT, at every setting', () => {
    // The whole point: warp changes how many steps happen, never what one means.
    for (const options of [
      { timeWarp: 1, slowMotion: 1 },
      { timeWarp: 8, slowMotion: 1 },
      { timeWarp: 1, slowMotion: 8 },
    ]) {
      const loop = createLoopState(createScenarioState(getScenario('landing-burn')!));
      for (let i = 0; i < 60; i++) advance(loop, 1 / 60, options);
      expect(loop.simulatedTime).toBeCloseTo(loop.totalSteps * DT, 12);
    }
  });

  it('a warped flight matches an unwarped one step for step', () => {
    // Same number of steps, reached differently: 240 steps at warp 4 over 60
    // frames must equal 240 steps at warp 1 over 240 frames.
    const warped = createLoopState(createScenarioState(getScenario('before-flip')!));
    const plain = createLoopState(createScenarioState(getScenario('before-flip')!));

    for (let i = 0; i < 60; i++) advance(warped, 1 / 60, { timeWarp: 4, slowMotion: 1 });
    while (plain.totalSteps < warped.totalSteps) advance(plain, 1 / 60, {});

    expect(plain.totalSteps).toBe(warped.totalSteps);
    expect(plain.state.kinematics.altitude).toBe(warped.state.kinematics.altitude);
    expect(plain.state.kinematics.speedY).toBe(warped.state.kinematics.speedY);
  });
});

describe('the flight editor', () => {
  it('a preset fills every field', () => {
    const fields = fieldsFromPreset(PRESETS[0]!);
    expect(fields.altitude).toBe('70000');
    expect(fields.speedX).toBe('1130');
    expect(Object.values(fields).every((v) => v !== '')).toBe(true);
  });

  it('an empty field leaves that value alone', () => {
    // tools.js:188 tested `!= ""` per field, so a partial form is a partial
    // edit. This is why the fields are strings rather than numbers: 0 and
    // "untouched" would otherwise be the same value.
    const base = PRESETS[0]!;
    const result = fieldsToPreset({ ...EMPTY_FIELDS, altitude: '1234' }, base);

    expect(result.altitude).toBe(1234);
    expect(result.speedX).toBe(base.speedX);
    expect(result.speedY).toBe(base.speedY);
    expect(result.propellant).toBe(base.propellant);
  });

  it('an entirely empty form reproduces the current flight', () => {
    const base = PRESETS[2]!;
    const result = fieldsToPreset(EMPTY_FIELDS, base);
    for (const key of ['altitude', 'xPosition', 'speedX', 'speedY', 'pitch', 'propellant'] as const) {
      expect(result[key], key).toBe(base[key]);
    }
  });

  it('treats junk as untouched rather than as zero', () => {
    const base = PRESETS[0]!;
    const result = fieldsToPreset({ ...EMPTY_FIELDS, speedY: 'abc', altitude: '  ' }, base);
    expect(result.speedY).toBe(base.speedY);
    expect(result.altitude).toBe(base.altitude);
  });

  it('accepts negatives, which the re-entry preset needs', () => {
    const result = fieldsToPreset({ ...EMPTY_FIELDS, xPosition: '-1980000' }, PRESETS[0]!);
    expect(result.xPosition).toBe(-1_980_000);
  });

  it('round-trips every preset through the form', () => {
    for (const preset of ALL_SCENARIOS) {
      const back = fieldsToPreset(fieldsFromPreset(preset), INTRO);
      expect(back.altitude, preset.id).toBe(preset.altitude);
      expect(back.xPosition, preset.id).toBe(preset.xPosition);
      expect(back.speedX, preset.id).toBe(preset.speedX);
      expect(back.speedY, preset.id).toBe(preset.speedY);
      expect(back.pitch as number, preset.id).toBe(preset.pitch as number);
      expect(back.propellant, preset.id).toBe(preset.propellant);
    }
  });
});

describe('what the editor produces is flyable', () => {
  it('applies the 2021 conversions and clamps', () => {
    const preset = fieldsToPreset(
      { altitude: '-500', xPosition: '250', speedX: '10', speedY: '-5', pitch: '45', propellant: '9999' },
      INTRO,
    );
    const state = createScenarioState(preset);

    // Altitude floored at half the vehicle height, so it cannot spawn buried.
    expect(state.kinematics.altitude).toBe(vehicleHeight / 2);
    // X is relative to StarBase.
    expect(state.kinematics.downRangeDistance).toBe(250 + starBaseXPos);
    // Pitch is degrees in, radians inside.
    expect(toDeg(state.kinematics.pitch)).toBeCloseTo(45, 10);
    // Propellant is tonnes, capped at 1200 t.
    expect(state.vehicle.propellantMass).toBe(1_200_000);
  });

  it('every orbital preset is offered and builds a state', () => {
    expect(ORBITAL_PRESETS.length).toBe(2);
    for (const preset of ORBITAL_PRESETS) {
      const state = createScenarioState(preset);
      expect(state.kinematics.altitude, preset.id).toBe(preset.altitude);
      expect(state.kinematics.speedX, preset.id).toBe(preset.speedX);
    }
  });
});
