/** Refactor proof: a vehicle argument must change the physical mass layout,
 * while every Ship result stays ≤1 local-value ULP from shipped arithmetic. */
import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import * as mass from '$core/physics/mass';
import * as shipped from './fixtures/ship-mass';

const bits = new DataView(new ArrayBuffer(8));
function spacing(value: number): number {
  const a = Math.abs(value);
  if (a === 0) return Number.MIN_VALUE;
  bits.setFloat64(0, a);
  bits.setBigUint64(0, bits.getBigUint64(0) + 1n);
  return bits.getFloat64(0) - a;
}

describe('explicit vehicle mass layout', () => {
  it('uses the supplied dry COM and mass instead of Ship constants', () => {
    const alternate = { ...SHIP, dryMass: 240_000, dryCentreOfMass: 30 };
    expect(mass.centreOfMass(0, alternate)).toBe(30);
    const cylinder = 240_000 * ((9 / 2) ** 2 / 4 + 50 ** 2 / 12);
    expect(mass.momentOfInertia(0, alternate)).toBe(cylinder);
    expect(mass.momentOfInertia(0, alternate)).toBeGreaterThan(mass.momentOfInertia(0));
  });

  it('uses alternate capacity, tank geometry and station arms', () => {
    const alternate = {
      ...SHIP, propellantCapacity: 600_000, tankBottom: 8,
      loxTankHeight: 10, ch4TankHeight: 6, ch4TankBottom: 18,
      aftFinStation: 2, frontFinStation: 48, rcsStation: 40, height: 60,
    };
    expect(mass.fillFraction(300_000, alternate)).toBe(0.5);
    const propCom = (3.6 / 4.6) * 10.5 + (1 - 3.6 / 4.6) * 19.5;
    expect(mass.propellantCentreOfMass(300_000, alternate)).toBe(propCom);
    const com = (120_000 * 21.8 + 300_000 * propCom) / 420_000;
    const p = mass.createMassProperties(300_000, alternate);
    expect(p.centreOfMass).toBe(com);
    expect(p.aftFinArm).toBe(com - 2);
    expect(p.frontFinArm).toBe(48 - com);
    expect(p.rcsArm).toBe(40 - com);
    expect(p.rCubedIntegral).toBe((com ** 4 + (60 - com) ** 4) / 4);
  });
});

describe('Ship numerical equivalence to the preserved implementation', () => {
  it('covers the full tank domain, every mass output and float boundaries within 1 ULP', () => {
    let maxUlps = 0;
    let outputs = 0;
    const compare = (actual: number, expected: number) => {
      outputs++;
      const delta = Math.abs(actual - expected);
      if (delta !== 0) maxUlps = Math.max(maxUlps, delta / spacing(expected));
    };
    const check = (load: number) => {
      compare(mass.fillFraction(load, SHIP), shipped.fillFraction(load));
      compare(mass.propellantCentreOfMass(load, SHIP), shipped.propellantCentreOfMass(load));
      compare(mass.centreOfMass(load, SHIP), shipped.centreOfMass(load));
      compare(mass.momentOfInertia(load, SHIP), shipped.momentOfInertia(load));
      const a = mass.createMassProperties(load, SHIP);
      const b = shipped.createMassProperties(load);
      for (const key of Object.keys(b) as (keyof mass.MassProperties)[]) compare(a[key], b[key]);
      // A missing default argument must use this same model.
      const implicit = mass.createMassProperties(load);
      for (const key of Object.keys(b) as (keyof mass.MassProperties)[]) compare(implicit[key], b[key]);
    };
    for (let i = 0; i <= 50_000; i++) check((i * 1_200_000) / 50_000);
    for (const p of [-5000, -1, 0, Number.MIN_VALUE, 1, 12_000, 18_000, 350_000, 1_200_000, 2_400_000]) {
      check(p); check(p - spacing(p)); check(p + spacing(p));
    }
    expect(outputs).toBeGreaterThan(900_000);
    expect(maxUlps, `worst ${maxUlps} local-value ULP across ${outputs} outputs`).toBeLessThanOrEqual(1);
    expect(maxUlps).toBe(0);
  });
});
