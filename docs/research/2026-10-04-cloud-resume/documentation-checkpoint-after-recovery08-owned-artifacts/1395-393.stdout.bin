import { describe, expect, it } from 'vitest';
import { createRootSection, loadedRootAngle, rootUtilization } from '$core/physics/damage-root';
import { steelElasticModulus, steelProofStrength } from '$core/physics/damage-material';

describe('declared hollow attachment beam', () => {
  it('derives SI section and thermal mass from the frozen geometry', () => {
    const section = createRootSection(9);
    const area = .9 * 1.35 - .892 * 1.342;
    const inertia = (.9 * 1.35 ** 3 - .892 * 1.342 ** 3) / 12;
    expect(section.area).toBeCloseTo(area, 12);
    expect(section.inertia).toBeCloseTo(inertia, 12);
    expect(section.modulus).toBeCloseTo(inertia / .675, 12);
    expect(section.mass).toBeCloseTo(area * .45 * 7920, 10);
    expect(section.heatArea).toBeCloseTo(.9 * .45, 12);
  });

  it('solves the coupled passive load with an independent moment residual', () => {
    const section = createRootSection(9);
    for (const temperature of [288, 773.15, 1073.15]) {
      for (const command of [-.7, -.2, .2, .7]) {
        const angle = loadedRootAngle(command, 2e5, 2, temperature, section, 'plate');
        const moment = 2e5 * Math.sin(angle) * 2;
        const residual = angle + moment * section.length
          / (steelElasticModulus(temperature) * section.inertia) - command;
        expect(Math.abs(residual)).toBeLessThan(1e-10);
        expect(Math.abs(angle)).toBeLessThan(Math.abs(command));
        expect(Math.sign(angle)).toBe(Math.sign(command));
      }
    }
  });

  it('softens continuously with thermal exposure without deleting attached area', () => {
    const section = createRootSection(9);
    const cold = loadedRootAngle(.7, 2e5, 2, 373.15, section, 'plate');
    const hot = loadedRootAngle(.7, 2e5, 2, 1073.15, section, 'plate');
    expect(hot).toBeLessThan(cold);
    expect(hot).toBeGreaterThan(0);
    expect(loadedRootAngle(.7, 0, 2, 1073.15, section, 'plate')).toBe(.7);
    expect(loadedRootAngle(0, 2e5, 2, 1073.15, section, 'plate')).toBe(0);
  });

  it('compares actual moment with proof capacity without a fatigue timer', () => {
    const section = createRootSection(9);
    const moment = section.modulus * steelProofStrength(773.15);
    expect(rootUtilization(moment, 773.15, section)).toBeCloseTo(1, 12);
    expect(rootUtilization(-moment, 773.15, section)).toBeCloseTo(1, 12);
    expect(rootUtilization(moment, 373.15, section)).toBeLessThan(1);
    expect(rootUtilization(moment, 1073.15, section)).toBeGreaterThan(1);
    expect(rootUtilization(0, 373.15, section)).toBe(0);
  });

  it('solves grid resultant load and preserves odd symmetry', () => {
    const section = createRootSection(9);
    const command = .4;
    const angle = loadedRootAngle(command, 9e4, 1.5, 973.15, section, 'grid');
    const force = 9e4 * Math.hypot(Math.sin(2 * angle), 1.2 * Math.sin(angle) ** 2);
    expect(angle + force * 1.5 * section.length
      / (steelElasticModulus(973.15) * section.inertia)).toBeCloseTo(command, 10);
    expect(loadedRootAngle(-command, 9e4, 1.5, 973.15, section, 'grid')).toBe(-angle);
  });
});
