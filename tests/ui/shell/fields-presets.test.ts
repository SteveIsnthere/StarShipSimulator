/**
 * Every shipped scenario is flyable from the flight setup: picking a preset
 * fills the fields, and none of them may then hold Start flight back.
 */
import { describe, expect, it } from 'vitest';
import { fieldsFromPreset } from '$app/menu';
import { ALL_SCENARIOS } from '$core/scenarios';
import { fieldErrors } from '$ui/shell/Menu/fields';

describe('the flight setup ranges', () => {
  it.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))('%s fills the fields within range', (_id, preset) => {
    expect(fieldErrors(fieldsFromPreset(preset))).toEqual({});
  });
});
