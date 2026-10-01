import { describe, expect, it } from 'vitest';
import { step } from '$core/step';
import { ACTIVE_REL_TOL, GOLDEN_REL_TOL, isRecordingPlatform, relDiff } from './compare';
import { flattenState, GOLDEN_DT } from './record';
import { GOLDEN_SPECS } from './scenarios';

describe('the golden tolerance stays far below a real physics change', () => {
  it('a 1e-6 relative change in one value is outside it', () => {
    expect(relDiff(1.000001, 1)).toBeGreaterThan(GOLDEN_REL_TOL * 10);
  });

  it('identical values and identical sentinels compare equal', () => {
    expect(relDiff(Infinity, Infinity)).toBe(0);
    expect(relDiff(Number.NaN, Number.NaN)).toBe(0);
    expect(relDiff(0, 0)).toBe(0);
    expect(relDiff(true, true)).toBe(0);
  });

  it('a sentinel never matches a number, and a flipped boolean never matches', () => {
    expect(relDiff(Infinity, 1e308)).toBe(Infinity);
    expect(relDiff(true, false)).toBe(Infinity);
    expect(relDiff(-0, 0)).toBe(0);
  });

  it('is exact on the recording platform and tolerant only elsewhere', () => {
    expect(ACTIVE_REL_TOL).toBe(isRecordingPlatform() ? 0 : GOLDEN_REL_TOL);
  });

  it('a 1e-6 change in propellant mass moves a replay past the tolerance', () => {
    // End to end through step(): if the tolerance could hide this, it could
    // hide a physics change.
    const spec = GOLDEN_SPECS.find((g) => g.id === 'landing-burn-autoland')!;
    let a = spec.build();
    let b = spec.build();
    b.vehicle.propellantMass *= 1 + 1e-6;
    let worst = 0;
    for (let i = 1; i <= 1200; i++) {
      a = step(a, GOLDEN_DT);
      b = step(b, GOLDEN_DT);
      if (i % 60 === 0) {
        const fa = flattenState(a);
        const fb = flattenState(b);
        for (const k of Object.keys(fa)) worst = Math.max(worst, relDiff(fb[k], fa[k]));
      }
    }
    expect(worst).toBeGreaterThan(GOLDEN_REL_TOL * 10);
  });
});
