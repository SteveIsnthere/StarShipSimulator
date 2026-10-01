/**
 * M11.5 — the sheath's geometry and the inset's rules, in node.
 */
import { describe, expect, it } from 'vitest';
import { getAttackAngles, getAngleOfMotion } from '$core/physics/aero';
import { rad } from '$core/units';
import {
  INSET_CLEARANCE,
  INSET_HIDE,
  INSET_MAX,
  INSET_MIN,
  INSET_SHOW,
  INSET_TOP,
  insetLayout,
  insetShouldShow,
  vehicleTopOnScreen,
  windwardInHull,
  type InsetLayout,
} from '$view/reentry';

describe('the windward direction in the hull frame', () => {
  const out = { x: 0, y: 0 };

  it('is the nose when flying nose-first', () => {
    windwardInHull(0, out);
    expect(out.x).toBeCloseTo(0, 12);
    expect(out.y).toBeCloseTo(1, 12);
  });

  it('is the belly in a belly flop: nose right, falling straight down', () => {
    // The before-flip preset: pitch 90° nose-right, speedY -70. Angle of attack
    // from the same function the step uses, so the convention cannot drift.
    const { angleOfAttack } = getAttackAngles(rad(Math.PI / 2), getAngleOfMotion(0, -70));
    windwardInHull(angleOfAttack, out);
    // The hull's +x flank: upright it is the right side; rotated nose-right it
    // faces the ground, which is where the air is coming from.
    expect(out.x).toBeCloseTo(1, 9);
    expect(out.y).toBeCloseTo(0, 9);
  });

  it('is the tail when falling backwards', () => {
    windwardInHull(Math.PI, out);
    expect(out.y).toBeCloseTo(-1, 12);
  });

  it('mirrors with the sign of the angle, and is always unit length', () => {
    for (const a of [0.3, 1.1, 2.4, -0.7, -2.9]) {
      windwardInHull(a, out);
      const x = out.x;
      windwardInHull(-a, out);
      expect(out.x).toBeCloseTo(-x, 12);
      expect(out.x ** 2 + out.y ** 2).toBeCloseTo(1, 12);
    }
  });
});

describe('the inset shows with hysteresis', () => {
  it('appears above the show line and stays until the hide line', () => {
    expect(insetShouldShow(0, false)).toBe(false);
    expect(insetShouldShow(INSET_SHOW - 0.001, false)).toBe(false);
    expect(insetShouldShow(INSET_SHOW + 0.001, false)).toBe(true);
    // Once shown, a dip below the show line does not hide it.
    expect(insetShouldShow(INSET_SHOW - 0.001, true)).toBe(true);
    expect(insetShouldShow(INSET_HIDE + 0.001, true)).toBe(true);
    expect(insetShouldShow(INSET_HIDE - 0.001, true)).toBe(false);
    expect(INSET_HIDE).toBeLessThan(INSET_SHOW);
  });
});

describe('the inset sits under the strip, centred, clear of the rails and the vehicle', () => {
  const layout: InsetLayout = { x: 0, y: 0, size: 0 };
  const cases = [
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'phone portrait', width: 390, height: 844 },
    { name: 'phone landscape', width: 844, height: 390 },
    { name: 'a narrow window', width: 320, height: 568 },
  ];

  it('is inside the viewport at every size', () => {
    for (const c of cases) {
      insetLayout(c, layout);
      expect(layout.x, c.name).toBeGreaterThanOrEqual(0);
      expect(layout.y, c.name).toBe(INSET_TOP);
      expect(layout.x + layout.size, c.name).toBeLessThanOrEqual(c.width);
      expect(layout.y + layout.size, c.name).toBeLessThanOrEqual(c.height);
      expect(layout.size, c.name).toBeGreaterThanOrEqual(INSET_MIN);
      expect(layout.size, c.name).toBeLessThanOrEqual(INSET_MAX);
    }
  });

  it('is centred, so neither side rail — vertically centred, up to 300 px tall — can reach it', () => {
    for (const c of cases) {
      insetLayout(c, layout);
      expect(Math.abs(layout.x + layout.size / 2 - c.width / 2), c.name).toBeLessThanOrEqual(1);
      // The rails are 180 px wide at the edges; the inset's edges stay clear
      // of them on any window at least 640 px wide.
      if (c.width >= 640) {
        expect(layout.x, c.name).toBeGreaterThan(180);
        expect(layout.x + layout.size, c.name).toBeLessThan(c.width - 180);
      }
    }
  });

  it('ends above the vehicle, which the camera frames at the middle of the screen', () => {
    // From the camera's own rule, not a guess: a quarter of the height,
    // clamped to [100, 220], centred. On a phone on its side that leaves
    // 85 px under the strip, and the inset takes 77 of them.
    for (const c of cases) {
      insetLayout(c, layout);
      const top = vehicleTopOnScreen(c.height);
      expect(top, c.name).toBe(
        c.height / 2 - Math.min(220, Math.max(100, c.height / 4)) / 2,
      );
      expect(layout.y + layout.size, c.name).toBeLessThanOrEqual(top - INSET_CLEARANCE);
    }
  });
});
