/** Numerical Refactor within the uncommitted Fidelity model: certify the exact
 * same forty-bisection cell, not merely a fitted force/angle tolerance. */
import { describe, expect, it } from 'vitest';
import { createRootSection, loadedRootAngle, rootLoadCoefficient, type RootLoadLaw, type RootSection } from '$core/physics/damage-root';
import { steelElasticModulus } from '$core/physics/damage-material';

function original(command: number, forceScale: number, lever: number, temperature: number, section: RootSection, law: RootLoadLaw) {
  const magnitude = Math.abs(command), modulus = steelElasticModulus(temperature);
  if (modulus === 0) return 0;
  if (magnitude === 0 || forceScale === 0 || lever === 0) return command;
  const compliance = forceScale * lever * section.length / (modulus * section.inertia);
  let lower = 0, upper = magnitude;
  for (let i = 0; i < 40; i++) {
    const middle = (lower + upper) / 2;
    if (middle + compliance * rootLoadCoefficient(middle, law) < magnitude) lower = middle;
    else upper = middle;
  }
  return Math.sign(command) * (lower + upper) / 2;
}

describe('certified root solver fast path', () => {
  it('retains every original bit over cold/hot temperatures, signed commands and extreme loads', () => {
    let cases = 0;
    for (const diameter of [5, 9, 12]) {
      const section = createRootSection(diameter);
      for (const law of ['plate', 'grid'] as const) {
        const limit = law === 'plate' ? Math.PI / 2 : Math.PI / 4;
        for (let j = 0; j <= 32; j++) {
          const temperature = 186 + j / 32 * (1173.15 - 186);
          for (const force of [0, 1e-12, .001, 1, 100, 10000, 1e6, 1e8, 1e12, 1e30]) {
            for (let i = -20; i <= 20; i++) {
              const command = limit * i / 20;
              expect(loadedRootAngle(command, force, diameter * .23, temperature, section, law))
                .toBe(original(command, force, diameter * .23, temperature, section, law));
              cases++;
            }
          }
        }
      }
    }
    expect(cases).toBe(81180);
  });
});
