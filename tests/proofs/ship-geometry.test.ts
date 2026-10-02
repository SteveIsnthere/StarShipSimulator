/** Detect ignored hull/fin geometry while preserving the shipped Ship aero. */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { SHIP } from '$core/vehicle';
import * as aero from '$core/physics/aero';
import * as shipped from './fixtures/ship-aero';
import { rad } from '$core/units';

const alternate = {
  ...SHIP, diameter: 18, minArea: Math.PI * 9 ** 2, maxArea: 900,
  frontFinArea: 10, aftFinArea: 5,
};
const ANGLES = [-Math.PI, -Math.PI / 2, -0.3, 0, 0.3, Math.PI / 2, Math.PI];

describe('selected vehicle hull and fins', () => {
  it('uses its own nose area and diameter for axial and angular drag', () => {
    expect(aero.getCrossSectionalArea(rad(0), 900, alternate)).toBe(Math.PI * 9 ** 2 / 2.1);
    expect(aero.getAngularDragAcceleration(1, 2, 1_000_000, 100_000, alternate)).toBe(-7.2);
  });

  it('uses its own fin reference areas with the existing sign conventions', () => {
    const scale = 0.5 * 1 * 100 ** 2 * C.finDragCoefficient * 0.6;
    const front = aero.getFrontFinDrag(1, 100, rad(-0.3), rad(0.7), 0.6, alternate);
    const aft = aero.getAftFinDrag(1, 100, rad(-0.3), rad(0.7), 0.6, alternate);
    // Match the original multiplication order while deriving area independently.
    expect(front).toBe(-((0.5 * 1 * 100 ** 2 * (Math.abs(Math.sin(0.7)) * 10) * C.finDragCoefficient) * 0.6));
    expect(aft / front).toBe(-0.5);
    expect(Math.abs(front)).toBeCloseTo(Math.abs(Math.sin(0.7)) * 10 * scale, 9);
    const area = aero.updateVehicleInFlightMaxArea(100, 50, alternate);
    const f = Math.sin(C.finActuationMaxAngle * 100 * 0.01);
    const a = Math.sin(C.finActuationMaxAngle * 50 * 0.01);
    expect(area.totalFinSurfaceArea).toBe(f * 10 + a * 5);
    expect(area.vehicleInFlightMaxArea).toBe(900 + (f * 10 + a * 5) * 1.8);
  });
});

describe('Ship geometry numerical equivalence', () => {
  it('preserves axial/broadside area, rotational drag and every fin sign exactly', () => {
    for (const angle of ANGLES) {
      for (const surface of [0, 450, 576]) {
        expect(aero.getCrossSectionalArea(rad(angle), surface, SHIP))
          .toBe(shipped.getCrossSectionalArea(rad(angle), surface));
      }
      for (const rho of [0, 0.001, 1.225]) {
        for (const speed of [0, 70, 7300]) {
          for (const attack of ANGLES) {
            for (const fraction of [0, 0.5, 1]) {
              expect(aero.getFrontFinDrag(rho, speed, rad(attack), rad(angle), fraction, SHIP))
                .toBe(shipped.getFrontFinDrag(rho, speed, rad(attack), rad(angle), fraction));
              expect(aero.getAftFinDrag(rho, speed, rad(attack), rad(angle), fraction, SHIP))
                .toBe(shipped.getAftFinDrag(rho, speed, rad(attack), rad(angle), fraction));
            }
          }
        }
        for (const omega of [-2, -0.001, 0, 0.001, 2]) {
          expect(aero.getAngularDragAcceleration(rho, omega, 1e8, 4e5, SHIP))
            .toBe(shipped.getAngularDragAcceleration(rho, omega, 1e8, 4e5));
        }
      }
    }
    for (const front of [0, 50, 100]) {
      for (const aft of [0, 50, 100]) {
        expect(aero.updateVehicleInFlightMaxArea(front, aft, SHIP))
          .toEqual(shipped.updateVehicleInFlightMaxArea(front, aft));
      }
    }
  });
});
