import { describe, expect, it } from 'vitest';
import { enginePlumeLook } from '$view/engine-look';

const look = () => ({ spread: 0, scale: 0, diamonds: 0, cellLength: 0 });

describe('authored per-engine exhaust', () => {
  it('distinguishes the larger fixed vacuum nozzle from a sea-level pencil', () => {
    const sl = look();
    const vacuum = look();
    enginePlumeLook(101.325, 100, false, sl);
    enginePlumeLook(101.325, 100, true, vacuum);
    expect(sl.diamonds).toBeGreaterThan(0);
    expect(vacuum.spread).toBeGreaterThan(sl.spread);
    expect(vacuum.scale).toBeGreaterThan(sl.scale);
    expect(vacuum.diamonds).toBeLessThan(sl.diamonds);
    expect(vacuum.cellLength).toBeGreaterThan(sl.cellLength);
  });

  it('expands both nozzle classes monotonically as the air thins', () => {
    for (const vacuum of [false, true]) {
      const out = look();
      let spread = 0;
      let scale = 0;
      let diamonds = Infinity;
      for (const pressure of [101.325, 70, 30, 10, 1, 0]) {
        enginePlumeLook(pressure, 100, vacuum, out);
        expect(out.spread).toBeGreaterThanOrEqual(spread);
        expect(out.scale).toBeGreaterThanOrEqual(scale);
        expect(out.diamonds).toBeLessThanOrEqual(diamonds);
        spread = out.spread;
        scale = out.scale;
        diamonds = out.diamonds;
      }
      expect(out.diamonds).toBe(0);
    }
  });

  it('shortens a throttled engine without changing its pressure expansion', () => {
    const full = look();
    const throttled = look();
    enginePlumeLook(30, 100, false, full);
    enginePlumeLook(30, 40, false, throttled);
    expect(throttled.scale).toBeGreaterThan(0);
    expect(throttled.scale).toBeLessThan(full.scale);
    expect(throttled.spread).toBe(full.spread);
  });

  it('zeros off engines and bounds malformed inputs in reusable output', () => {
    const out = look();
    for (const throttle of [0, -20, NaN, Infinity, -Infinity]) {
      enginePlumeLook(101.325, 100, false, out);
      enginePlumeLook(101.325, throttle, false, out);
      expect(out.scale).toBe(0);
      expect(out.diamonds).toBe(0);
    }
    const seaLevel = look();
    enginePlumeLook(101.325, 100, false, seaLevel);
    enginePlumeLook(1000, 200, false, out);
    expect(out).toEqual(seaLevel);
    for (const pressure of [NaN, Infinity, -Infinity, -10]) {
      enginePlumeLook(pressure, 100, false, out);
      expect(Object.values(out).every(Number.isFinite)).toBe(true);
      expect(out.spread).toBeGreaterThanOrEqual(1);
      expect(out.spread).toBeLessThanOrEqual(3.6);
      expect(out.cellLength).toBeGreaterThan(0);
      expect(out.diamonds).toBeGreaterThanOrEqual(0);
      expect(out.diamonds).toBeLessThanOrEqual(1);
    }
  });
});
