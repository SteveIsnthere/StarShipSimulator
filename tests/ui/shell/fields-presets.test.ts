/**
 * Every shipped scenario is flyable from the flight setup: picking a preset
 * fills the fields, and none of them may then hold Start flight back.
 */
import { describe, expect, it } from 'vitest';
import { fieldsFromPreset } from '$app/menu';
import { ALL_SCENARIOS, getScenario } from '$core/scenarios';
import { fieldErrors, fieldsFor } from '$ui/shell/Menu/fields';

describe('the flight setup ranges', () => {
  it('accepts the actual booster tank capacity and keeps the Ship limit', () => {
    const booster = { ...fieldsFromPreset(getScenario('rtls')!), propellant: '3650' };
    expect(fieldErrors(booster)).toEqual({});
    expect(fieldsFor(booster).find(field => field.key === 'propellant')!.max).toBe(3650);
    expect(fieldErrors({ ...booster, propellant: '3650.001' }).propellant).toBeTruthy();
    expect(fieldErrors({ ...booster, basedOn: 'launch-pad', propellant: '3000' }, 'super-heavy').propellant).toBeTruthy();
    expect(fieldErrors({ ...booster, basedOn: '', propellant: '3000' }, 'super-heavy')).toEqual({});
  });

  it.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))('%s fills the fields within range', (_id, preset) => {
    expect(fieldErrors(fieldsFromPreset(preset))).toEqual({});
  });
});
