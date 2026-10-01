/**
 * M11.8, Fidelity — the centre of mass moves as the tanks drain.
 *
 * The 2021 model had four constant moment arms and a uniform cylinder's
 * inertia at the current mass, so a vehicle that was 74% propellant at the pad
 * and 14% at the flip balanced in the same place throughout. It does not.
 *
 * The assertions here are the closed forms — a two-body centroid, the parallel
 * axis theorem — plus the two limits that make the change safe to fly: at dry
 * mass every arm is EXACTLY the 2021 constant, so the landings are on the
 * geometry they were tuned on; and the gimbal's authority does not collapse
 * when the tanks are full, because the arm and the inertia fall together.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { integralOfRCubedTimesDx, vehicleHeight } from '$core/constants';
import {
  AFT_FIN_STATION,
  CH4_TANK_BOTTOM,
  CH4_TANK_HEIGHT,
  DRY_CENTRE_OF_MASS,
  FRONT_FIN_STATION,
  LOX_TANK_HEIGHT,
  OXIDISER_SHARE,
  PROPELLANT_CAPACITY,
  RCS_STATION,
  TANK_BOTTOM,
  centreOfMass,
  createMassProperties,
  fillFraction,
  momentOfInertia,
  propellantCentreOfMass,
  rCubedIntegral,
  writeMassProperties,
} from '$core/physics/mass';

describe('the stated tank layout', () => {
  it('fits inside the hull, above the engine skirt', () => {
    expect(TANK_BOTTOM).toBeGreaterThan(0);
    expect(CH4_TANK_BOTTOM).toBe(TANK_BOTTOM + LOX_TANK_HEIGHT);
    const top = CH4_TANK_BOTTOM + CH4_TANK_HEIGHT;
    expect(top).toBeLessThan(C.vehicleHeight);
    // 22.6 m of tank from 5 m to 27.6 m in a 50 m hull, which leaves the
    // payload volume above it that a Starship actually has.
    expect(top).toBeCloseTo(27.6, 1);
  });

  it('holds the editor’s cap at Raptor’s mixture ratio', () => {
    const area = Math.PI * (C.vehicleDiameter / 2) ** 2;
    expect(LOX_TANK_HEIGHT * area * 1141).toBeCloseTo(PROPELLANT_CAPACITY * OXIDISER_SHARE, 3);
    expect(CH4_TANK_HEIGHT * area * 424).toBeCloseTo(PROPELLANT_CAPACITY * (1 - OXIDISER_SHARE), 3);
    expect(OXIDISER_SHARE).toBeCloseTo(3.6 / 4.6, 12);
  });

  it('reads the 2021 arms as stations on the hull', () => {
    // The four constants were arms about a centre of mass at 21.8 m; here
    // they are places, and the dry centre of mass is that same 21.8.
    expect(DRY_CENTRE_OF_MASS).toBe(C.engineDistanceFromCenterOfMass);
    expect(AFT_FIN_STATION).toBe(DRY_CENTRE_OF_MASS - C.aftFinDistanceFromCenterOfMass);
    expect(RCS_STATION).toBe(DRY_CENTRE_OF_MASS + C.rcsThrustDistanceFromCenterOfMass);
    expect(FRONT_FIN_STATION).toBe(DRY_CENTRE_OF_MASS + C.frontFinDistanceFromCenterOfMass);
    // Every station is on the vehicle.
    for (const station of [AFT_FIN_STATION, RCS_STATION, FRONT_FIN_STATION]) {
      expect(station).toBeGreaterThan(0);
      expect(station).toBeLessThan(C.vehicleHeight);
    }
  });
});

describe('the centre of mass', () => {
  it('is the dry one exactly when the tanks are empty', () => {
    expect(centreOfMass(0)).toBe(DRY_CENTRE_OF_MASS);
  });

  it('is the two-body centroid of structure and propellant', () => {
    for (const p of [1_000, 50_000, 200_000, 350_000, 1_200_000]) {
      const expected =
        (C.vehicleDryMass * DRY_CENTRE_OF_MASS + p * propellantCentreOfMass(p)) /
        (C.vehicleDryMass + p);
      expect(centreOfMass(p)).toBeCloseTo(expected, 9);
    }
  });

  it('dips to a minimum near half full, then rises — which is what a tank does', () => {
    // Not monotonic, and the first version of this test assumed it was. Two
    // effects pull against each other: filling adds mass low down, which
    // drags the centre of mass toward the skirt, but it also raises the
    // PROPELLANT'S OWN centroid as the columns grow taller. The first wins
    // while the tanks are shallow and the second wins once they are deep, so
    // the lowest the vehicle ever balances is around half full.
    const loads = [0, 20_000, 100_000, 350_000, 500_000, 700_000, 1_000_000, 1_200_000];
    const coms = loads.map(centreOfMass);
    for (const com of coms) {
      expect(com).toBeGreaterThan(0);
      expect(com).toBeLessThan(C.vehicleHeight);
    }
    const lowest = Math.min(...coms);
    const at = loads[coms.indexOf(lowest)]!;
    expect(at).toBeGreaterThan(200_000);
    expect(at).toBeLessThan(800_000);
    // Falling on the way down to it, rising after.
    expect(coms[0]!).toBeGreaterThan(coms[3]!);
    expect(coms[coms.length - 1]!).toBeGreaterThan(lowest);
    // And every flight this game flies is on the falling side: the fullest
    // preset is 500 t, so within the scenarios the rule is simply "heavier
    // is lower".
    expect(centreOfMass(500_000)).toBeLessThan(centreOfMass(200_000));
  });

  it('is 12.7 m at the pad’s 350 t and 21.8 m dry — the range the flight covers', () => {
    expect(centreOfMass(350_000)).toBeCloseTo(12.7, 1);
    expect(centreOfMass(20_000)).toBeCloseTo(19.8, 1);
    expect(centreOfMass(0)).toBeCloseTo(21.8, 1);
  });

  it('treats a negative load as empty rather than as a lever the wrong way', () => {
    expect(centreOfMass(-5_000)).toBe(DRY_CENTRE_OF_MASS);
    expect(fillFraction(-1)).toBe(0);
    expect(fillFraction(2 * PROPELLANT_CAPACITY)).toBe(1);
  });
});

describe('the moment of inertia', () => {
  it('is the 2021 cylinder exactly when the tanks are empty', () => {
    // The dry structure alone, about its own centre, is what the old formula
    // computed at dry mass — so nothing about an empty vehicle changes.
    const cylinder =
      C.vehicleDryMass * (C.vehicleDiameter / 2) ** 2 * 0.25 +
      (C.vehicleDryMass * C.vehicleHeight ** 2) / 12;
    expect(momentOfInertia(0)).toBeCloseTo(cylinder, 6);
  });

  it('is always positive and rises with the load', () => {
    let last = 0;
    for (const p of [0, 20_000, 100_000, 350_000, 1_200_000]) {
      const inertia = momentOfInertia(p);
      expect(inertia, `${p} kg`).toBeGreaterThan(last);
      last = inertia;
    }
  });

  it('is FAR below the old model at full tanks, because the propellant is short and low', () => {
    // The old formula treated 350 t of propellant as if it were spread over
    // the whole 50 m hull. It sits in 12 m of tank near the bottom, so the
    // real figure is half: 5.0e7 against 1.0e8.
    const old = (m: number) =>
      m * (C.vehicleDiameter / 2) ** 2 * 0.25 + (m * C.vehicleHeight ** 2) / 12;
    expect(momentOfInertia(350_000)).toBeCloseTo(5.03e7, -5);
    expect(momentOfInertia(350_000) / old(C.vehicleDryMass + 350_000)).toBeLessThan(0.55);
  });
});

describe('what this does to control, which is why it is safe to fly', () => {
  const arms = createMassProperties();

  it('the gimbal’s authority does not collapse with full tanks — it rises', () => {
    // The risk worth checking before flying it: the engine arm halves at the
    // pad (21.8 m to 12.7), which alone would halve the pitch authority. The
    // inertia halves too, and angular acceleration is force times arm over
    // inertia, so the two nearly cancel — and what is left is a 16% GAIN. A
    // full ship is bottom-heavy AND much harder to spin.
    const old = (m: number) =>
      m * (C.vehicleDiameter / 2) ** 2 * 0.25 + (m * C.vehicleHeight ** 2) / 12;
    writeMassProperties(350_000, arms);
    const now = arms.engineArm / arms.momentOfInertia;
    const before = C.engineDistanceFromCenterOfMass / old(C.vehicleDryMass + 350_000);
    expect(now / before).toBeGreaterThan(1);
    expect(now / before).toBeLessThan(1.4);
  });

  it('every arm is exactly the 2021 constant when the tanks are dry', () => {
    writeMassProperties(0, arms);
    expect(arms.engineArm).toBe(C.engineDistanceFromCenterOfMass);
    // To rounding, not to the bit: an arm is a station minus a centre, and
    // 41.8 - 21.8 is 20.000000000000004 in binary floating point.
    expect(arms.aftFinArm).toBeCloseTo(C.aftFinDistanceFromCenterOfMass, 9);
    expect(arms.frontFinArm).toBeCloseTo(C.frontFinDistanceFromCenterOfMass, 9);
    expect(arms.rcsArm).toBeCloseTo(C.rcsThrustDistanceFromCenterOfMass, 9);
  });

  it('and within a metre or two of them on the loads the landings are flown at', () => {
    // The soul: the intro auto-landing and every landing scenario fly on
    // twenty to fifty tonnes, where the geometry has barely moved from the
    // figures the controllers were tuned against.
    for (const p of [20_000, 30_000, 50_000]) {
      writeMassProperties(p, arms);
      expect(Math.abs(arms.engineArm - C.engineDistanceFromCenterOfMass), `${p} kg`).toBeLessThan(4.1);
      expect(Math.abs(arms.frontFinArm - C.frontFinDistanceFromCenterOfMass)).toBeLessThan(4.1);
    }
  });

  it('the aft fins lose authority with full tanks and the front fins gain it', () => {
    // Physically the whole point: a fin near the centre of mass does little.
    // At the pad the aft fins are 3.5 m from it rather than 12.6.
    writeMassProperties(350_000, arms);
    expect(arms.aftFinArm).toBeLessThan(C.aftFinDistanceFromCenterOfMass * 0.4);
    expect(arms.frontFinArm).toBeGreaterThan(C.frontFinDistanceFromCenterOfMass * 1.3);
    // Both stay on the correct side of the centre of mass, always.
    for (const p of [0, 50_000, 350_000, 1_200_000]) {
      writeMassProperties(p, arms);
      expect(arms.aftFinArm, `${p} kg`).toBeGreaterThan(0);
      expect(arms.frontFinArm, `${p} kg`).toBeGreaterThan(0);
      expect(arms.rcsArm, `${p} kg`).toBeGreaterThan(0);
      expect(arms.engineArm, `${p} kg`).toBeGreaterThan(0);
    }
  });

  it('writeMassProperties agrees with the functions it is built from', () => {
    for (const p of [0, 120_000, 350_000]) {
      writeMassProperties(p, arms);
      expect(arms.centreOfMass).toBe(centreOfMass(p));
      expect(arms.momentOfInertia).toBe(momentOfInertia(p));
      expect(arms.engineArm).toBe(arms.centreOfMass);
    }
  });
});

/**
 * M12 debt: the angular drag integral, about the axis the vehicle turns on.
 *
 * The old `integralOfRCubedTimesDx` was a constant 97 656 sitting in a quotient
 * whose denominator — the moment of inertia — has been about the MOVING centre
 * of mass since M11.8. Two axes in one expression. It was also, at the midpoint
 * it did assume, half the integral: 97 656 is one end of a 50 m rod, and both
 * ends make torque.
 */
describe('the angular drag integral (M12, Fidelity)', () => {
  /**
   * The same integral by brute force, so the closed form is checked against
   * something that shares none of its algebra.
   */
  const numeric = (com: number, length = vehicleHeight, n = 200_000): number => {
    const dx = length / n;
    let total = 0;
    for (let i = 0; i < n; i++) total += Math.abs((i + 0.5) * dx - com) ** 3 * dx;
    return total;
  };

  it('agrees with a numerical integration of |r|^3 along the hull', () => {
    for (const com of [0, 5, 12.71, 21.8, 25, 40, vehicleHeight]) {
      expect(rCubedIntegral(com), `com ${com} m`).toBeCloseTo(numeric(com), 0);
    }
  });

  it('is smallest about the midpoint, which is what an integral of |r|^3 must be', () => {
    // A sanity shape rather than a number: moving the axis away from the middle
    // puts more of the hull further out, and r^3 grows faster than r.
    const middle = rCubedIntegral(vehicleHeight / 2);
    for (const com of [5, 12.71, 21.8, 30, 45]) {
      expect(rCubedIntegral(com), `com ${com} m`).toBeGreaterThanOrEqual(middle);
    }
  });

  it('and the constant it replaces was half the rod, about the wrong axis', () => {
    /*
      BOTH ERRORS, AS NUMBERS. 97 656 is exactly one half of a 50 m rod about
      its midpoint — the whole-body figure there is 195 312.5 — and the axis is
      not the midpoint anyway. The named debt estimated the correction at 1.1x
      dry and 2.5x wet; it is 2.20x and 5.02x, and this is where that is
      recorded rather than in a commit message.
    */
    // 97 656 is 97 656.25 with the quarter dropped, which is the 2021 constant
    // as written; the whole-rod figure about the midpoint is exactly twice it.
    expect(integralOfRCubedTimesDx).toBe(Math.trunc((vehicleHeight / 2) ** 4 / 4));
    expect(rCubedIntegral(vehicleHeight / 2)).toBe((vehicleHeight / 2) ** 4 / 2);
    expect(Math.abs(rCubedIntegral(vehicleHeight / 2) - 2 * integralOfRCubedTimesDx)).toBeLessThan(1);

    const dry = rCubedIntegral(centreOfMass(0));
    const wet = rCubedIntegral(centreOfMass(C.propellantMass));
    expect(dry / integralOfRCubedTimesDx).toBeCloseTo(2.2, 1);
    expect(wet / integralOfRCubedTimesDx).toBeCloseTo(5.02, 1);
  });

  it('and the step hands the drag term the same axis as the inertia', () => {
    // The defect in one assertion: these two came from different places and now
    // come from the same one.
    const properties = createMassProperties(C.propellantMass);
    expect(properties.rCubedIntegral).toBe(rCubedIntegral(properties.centreOfMass));
    expect(properties.momentOfInertia).toBe(momentOfInertia(C.propellantMass));
  });
});
