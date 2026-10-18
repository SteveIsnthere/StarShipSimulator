/** Refactor proof: expose the already existing per-vehicle builder without
 * changing its arithmetic or default Ship behavior. The oracle reaches that
 * unchanged builder through createScenarioVehicle's existing selection path.
 */
import { expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_SCENARIOS, createScenarioState, createScenarioVehicle, type ScenarioPreset } from '$core/scenarios';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { deg } from '$core/units';

/** No tolerance or omitted leaf: signed zero and nonfinite sentinels retain bits. */
function assertExact(actual: unknown, expected: unknown, path = 'state'): void {
  if (Object.is(actual, expected)) return;
  if (actual === null || expected === null || typeof actual !== 'object' || typeof expected !== 'object') {
    throw new Error(`${path}: expected identical values, got ${String(actual)} versus ${String(expected)}`);
  }
  if (Array.isArray(actual) !== Array.isArray(expected)) throw new Error(`${path}: array shape differs`);
  const a = actual as Record<string, unknown>, b = expected as Record<string, unknown>;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) throw new Error(`${path}: key count differs`);
  for (const key of keys) {
    if (!Object.hasOwn(b, key)) throw new Error(`${path}.${key}: missing key`);
    assertExact(a[key], b[key], `${path}.${key}`);
  }
}


it('preserves every default state and explicitly selects the actual model for all presets', () => {
  for (const model of [SHIP, SUPER_HEAVY]) {
    for (const preset of ALL_SCENARIOS) {
      const oracle = createScenarioVehicle({ ...preset, id: 'custom',
        basedOn: model === SHIP ? 'deorbit' : 'booster-sep' }, 12345);
      expect(oracle.vehicle).toBe(model);
      const explicit = createScenarioState(preset, 12345, model);
      assertExact(explicit, oracle.state);
      expect(explicit.engines.running).toHaveLength(model.engines.length);
      expect(explicit.vehicle.vehicleMass).toBe(model.dryMass + explicit.vehicle.propellantMass);
      if (model === SHIP) {
        assertExact(createScenarioState(preset, 12345), explicit);
        assertExact(createScenarioState(preset, 12345, undefined), explicit);
      }
    }
  }
});

it('preserves exact numeric outputs over custom conversion/clamp boundaries and seeds', () => {
  const finite = (min: number, max: number) => fc.double({ min, max, noNaN: true });
  fc.assert(fc.property(fc.record({
    altitude: finite(-20_000_000, 2_000_000),
    xPosition: finite(-40_000_000, 40_000_000),
    speedX: finite(-12_000, 12_000), speedY: finite(-12_000, 12_000),
    pitch: finite(-720, 720), propellant: finite(-1000, 10_000),
    wind: finite(-200, 200), seed: fc.integer(),
  }), input => {
    const preset: ScenarioPreset = { ...input, pitch: deg(input.pitch),
      id: 'custom', name: 'proof', description: 'data-only model selection proof' };
    for (const model of [SHIP, SUPER_HEAVY]) {
      const oracle = createScenarioVehicle({ ...preset,
        basedOn: model === SHIP ? 'deorbit' : 'booster-sep' }, input.seed);
      assertExact(createScenarioState(preset, input.seed, model), oracle.state);
      if (model === SHIP) assertExact(createScenarioState(preset, input.seed), oracle.state);
    }
  }), { seed: 20261018, numRuns: 500 });
});
