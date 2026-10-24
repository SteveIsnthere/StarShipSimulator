import { describe, expect, it } from 'vitest';
import { tileGlow } from '$view/heat-look';

describe('authored equilibrium-temperature incandescence', () => {
  it('leaves cold tiles dark and distinguishes warm from hot tiles', () => {
    expect(tileGlow(300)).toBe(0);
    expect(tileGlow(800)).toBe(0);
    expect(tileGlow(900)).toBeGreaterThan(0);
    expect(tileGlow(1533)).toBeGreaterThan(tileGlow(900));
    expect(tileGlow(1533)).toBe(1);
  });

  it('is bounded and monotonic without inventing heat for invalid input', () => {
    for (const temperature of [Number.NaN, Infinity, -Infinity, -100]) expect(tileGlow(temperature)).toBe(0);
    let previous = 0;
    for (let temperature = 0; temperature <= 2000; temperature += 10) {
      const glow = tileGlow(temperature);
      expect(glow).toBeGreaterThanOrEqual(previous);
      expect(glow).toBeLessThanOrEqual(1);
      previous = glow;
    }
    expect(tileGlow(800.001)).toBeLessThan(0.00001);
    expect(tileGlow(1532.999)).toBeGreaterThan(0.99999);
  });
});
