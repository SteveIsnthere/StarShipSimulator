/**
 * A scenario starts at the Mach number of its own altitude (Phase 6 Task 1,
 * Bug fix from the backlog: it used 343 m/s, the sea-level speed of sound, so
 * the first step's drag read the Mach of the wrong air). Written failing first.
 */
import { describe, expect, it } from 'vitest';
import { relativeAirspeed } from '$core/physics/aero';
import { airVelocityX } from '$core/physics/wind';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import { isaAtmosphere } from '$core/physics/isa';
import { ALL_SCENARIOS, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';

describe('the starting Mach number', () => {
  it.each(ALL_SCENARIOS.map((p) => [p.id, p] as const))('%s', (_id, preset) => {
    const s = createScenarioState(preset);
    const k = s.kinematics;
    const air = isaAtmosphere(k.altitude);
    const expected = relativeAirspeed(k.speedX, k.speedY, airVelocityX(s.world, k.altitude), s.world.gustVertical) / speedOfSoundAt(air.airTemperature);
    expect(k.machSpeed).toBeCloseTo(expected, 12);
  });

  it.each(ALL_SCENARIOS.map((p) => [p.id, p] as const))('%s agrees with the Mach step() computes', (_id, preset) => {
    // Not the same expression twice: step() derives Mach through its own
    // path. A microsecond step barely moves the state, so the two must agree.
    const s = createScenarioState(preset);
    const after = step(s, 1e-6).kinematics.machSpeed;
    expect(Math.abs(s.kinematics.machSpeed - after)).toBeLessThanOrEqual(1e-6 * Math.max(1, after));
  });

  it('booster-sep starts at Mach 5.38 in the 220 K air of 70 km, not 4.66 against 343 m/s', () => {
    const s = createScenarioState(ALL_SCENARIOS.find((p) => p.id === 'booster-sep')!);
    expect(s.kinematics.machSpeed).toBeCloseTo(5.3796, 4);
  });
});
