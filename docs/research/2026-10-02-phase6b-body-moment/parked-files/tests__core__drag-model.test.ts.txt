/**
 * Phase 6b, Task 1 (Fidelity): body drag per component, on the geometry.
 *
 * Anchored on the sources named in physics/aero.ts: Hoerner's stagnation
 * pressure and blunt-face drag, the base-drag and nose-cone formulas as the
 * OpenRocket technical documentation gives them, Jorgensen's subcritical
 * crossflow coefficient and the Newtonian limit.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import {
  broadsideDragCoefficient,
  getCrossSectionalArea,
  noseFirstDragCoefficient,
  stagnationPressureRatio,
  tailFirstDragCoefficient,
} from '$core/physics/aero';
import { rad } from '$core/units';

describe('the area is the geometry (5a)', () => {
  it('nose-on is the 9 m circle, broadside the side and fins, with no / 2.1', () => {
    expect(getCrossSectionalArea(rad(0), C.vehicleInFlightMaxArea)).toBeCloseTo(Math.PI * 4.5 ** 2, 9);
    expect(getCrossSectionalArea(rad(Math.PI / 2), C.vehicleInFlightMaxArea)).toBeCloseTo(C.vehicleInFlightMaxArea, 9);
  });
});

describe('the stagnation-pressure ratio (Hoerner, OpenRocket eq. B.1)', () => {
  it('is 1 at rest, about 1.28 at Mach 1, and 1.84 in the hypersonic limit', () => {
    expect(stagnationPressureRatio(0)).toBe(1);
    expect(stagnationPressureRatio(0.999)).toBeCloseTo(1.275, 2);
    expect(stagnationPressureRatio(1)).toBeCloseTo(1.281, 3);
    expect(stagnationPressureRatio(1e6)).toBeCloseTo(1.84, 9);
  });
});

describe('broadside, a cylinder in crossflow', () => {
  it('is 1.2 subcritical (Jorgensen, NASA TR R-474)', () => {
    expect(broadsideDragCoefficient(0.1)).toBe(1.2);
    expect(broadsideDragCoefficient(0.4)).toBe(1.2);
  });

  it('peaks transonic and settles at the Newtonian 1.227 above Mach 4, near the ~1.24 measured', () => {
    expect(broadsideDragCoefficient(1)).toBeGreaterThan(1.45);
    expect(broadsideDragCoefficient(4)).toBeCloseTo(1.2267, 4);
    expect(broadsideDragCoefficient(25)).toBeCloseTo(1.2267, 4);
  });

  it('is continuous', () => {
    for (const m of [0.4, 1, 4]) {
      expect(Math.abs(broadsideDragCoefficient(m + 1e-9) - broadsideDragCoefficient(m - 1e-9)), `Mach ${m}`).toBeLessThan(1e-6);
    }
  });
});

describe('nose first: the ogive, the base and the skin', () => {
  it('is 0.155 at low speed: base drag 0.12 plus friction, the smooth nose adding nothing', () => {
    expect(noseFirstDragCoefficient(0)).toBeCloseTo(0.155, 9);
  });

  it('rises through the sound barrier and falls supersonic', () => {
    expect(noseFirstDragCoefficient(1.2)).toBeGreaterThan(2 * noseFirstDragCoefficient(0.5));
    expect(noseFirstDragCoefficient(5)).toBeLessThan(noseFirstDragCoefficient(1.3));
  });

  it('is far below the broadside coefficient: a rocket is shaped to fly this way', () => {
    for (const m of [0, 0.8, 1.2, 3, 10]) {
      expect(noseFirstDragCoefficient(m), `Mach ${m}`).toBeLessThan(broadsideDragCoefficient(m) / 2);
    }
  });
});

describe('tail first: the flat engine end as a blunt face (OpenRocket eq. B.2)', () => {
  it('is 0.85 q_stag/q plus friction', () => {
    expect(tailFirstDragCoefficient(0)).toBeCloseTo(0.885, 9);
    expect(tailFirstDragCoefficient(3)).toBeCloseTo(0.85 * stagnationPressureRatio(3) + 0.035, 9);
  });

  it('is well above nose first, which is why a landing burn gets help from the air', () => {
    expect(tailFirstDragCoefficient(0.2)).toBeGreaterThan(5 * noseFirstDragCoefficient(0.2));
  });
});
