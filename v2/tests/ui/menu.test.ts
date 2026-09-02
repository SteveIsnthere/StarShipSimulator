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
  type EditorFields,
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

describe('a custom flight remembers the preset it came from — M11.4', () => {
  it('a preset fills `basedOn`, and Configure carries it into the custom preset', () => {
    for (const preset of ALL_SCENARIOS) {
      const fields = fieldsFromPreset(preset);
      expect(fields.basedOn, preset.id).toBe(preset.id);
      const custom = fieldsToPreset({ ...fields, altitude: '123' }, INTRO);
      expect(custom.id).toBe('custom');
      expect(custom.basedOn, preset.id).toBe(preset.id);
      // And a custom flight edited again still points at the original.
      expect(fieldsFromPreset(custom).basedOn).toBe(preset.id);
    }
  });

  it('a cleared form is based on nothing', () => {
    const custom = fieldsToPreset({ ...EMPTY_FIELDS, altitude: '500' }, INTRO);
    expect(custom.basedOn).toBeUndefined();
  });
});

describe('what the editor produces is flyable', () => {
  it('applies the 2021 conversions and clamps', () => {
    const preset = fieldsToPreset(
      {
        altitude: '-500',
        xPosition: '250',
        speedX: '10',
        speedY: '-5',
        pitch: '45',
        propellant: '9999',
        basedOn: '',
      },
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

describe('the editor reads what the DOM actually hands back', () => {
  /*
    M6.7. `EditorFields` says six strings; Svelte's `bind:value` on
    `<input type="number">` says otherwise — a number once anyone has typed,
    and `null` when the box is cleared. `fieldsToPreset` trimmed, and threw
    `e.trim is not a function`, which killed `onConfigure` before it could
    close the menu. Live since M4.4, and invisible because every e2e that
    pressed Configure pressed a preset first: `fieldsFromPreset` returns real
    strings, so the only broken path was the one the editor exists for.

    These pass numbers and nulls in deliberately, as the DOM does.
  */
  const base = getScenario('landing-burn')!;

  it('accepts numbers, as a number input gives them', () => {
    const fields = { ...EMPTY_FIELDS, altitude: 9000, speedY: 300 } as unknown as EditorFields;
    const preset = fieldsToPreset(fields, base);
    expect(preset.altitude).toBe(9000);
    expect(preset.speedY).toBe(300);
  });

  it('treats a cleared box as absent, not as zero', () => {
    // `null` is what an emptied number input binds to, and it has to mean
    // "keep what the flight has" — the same as the empty string a preset-free
    // form starts with. Reading it as 0 would silently teleport the vehicle to
    // the ground.
    const fields = { ...EMPTY_FIELDS, altitude: null } as unknown as EditorFields;
    expect(fieldsToPreset(fields, base).altitude).toBe(base.altitude);
  });

  it('falls back rather than producing NaN', () => {
    const fields = { ...EMPTY_FIELDS, altitude: NaN } as unknown as EditorFields;
    expect(fieldsToPreset(fields, base).altitude).toBe(base.altitude);
  });

  it('a whole hand-typed form converts without throwing', () => {
    // The path that was broken, end to end: every box a number, nothing from a
    // preset. This is the assertion that would have caught it.
    const typed = {
      altitude: 9000,
      xPosition: -1200,
      speedX: 40,
      speedY: 300,
      pitch: 15,
      propellant: 120,
    } as unknown as EditorFields;

    const preset = fieldsToPreset(typed, base);
    expect(preset.altitude).toBe(9000);
    expect(preset.xPosition).toBe(-1200);
    expect(preset.speedX).toBe(40);
    expect(preset.speedY).toBe(300);
    expect(preset.propellant).toBe(120);
    expect(Number.isFinite(preset.pitch as number)).toBe(true);
  });

  it('still handles the strings a preset puts there', () => {
    const fromPreset = fieldsFromPreset(base);
    const preset = fieldsToPreset(fromPreset, base);
    expect(preset.altitude).toBe(base.altitude);
    expect(preset.propellant).toBe(base.propellant);
  });
});
