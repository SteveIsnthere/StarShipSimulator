/**
 * A scenario starts at the Mach number of its own altitude (Phase 6 Task 1,
 * Bug fix from the backlog: it used 343 m/s, the sea-level speed of sound, so
 * the first step's drag read the Mach of the wrong air). Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { relativeAirspeed } from '$core/physics/aero';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import { isaAtmosphere } from '$core/physics/isa';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';

describe('the starting Mach number', () => {
  it.each(ALL_SCENARIOS.map((p) => [p.id, p] as const))('%s', (_id, preset) => {
    const s = createScenarioState(preset);
    const k = s.kinematics;
    const air = isaAtmosphere(k.altitude);
    const expected = relativeAirspeed(k.speedX, k.speedY, s.world.wind, s.world.gust) / speedOfSoundAt(air.airTemperature);
    expect(k.machSpeed).toBeCloseTo(expected, 12);
  });
});
