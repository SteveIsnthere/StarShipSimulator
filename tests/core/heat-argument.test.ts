/**
 * M2.2, Bug-fix tier: getReentryHeatPower is passed an area, not a radius.
 *
 * THE DEFECT. physics.js:1 declares
 *
 *     function getReentryHeatPower(vehicleNoseRadius) {
 *       return 1.83e-7 * trueSpeed**3 * Math.sqrt(airDensity / vehicleNoseRadius)
 *     }
 *
 * That is the Sutton-Graves stagnation-point heating correlation, and its
 * denominator is a nose RADIUS in metres. Every call site passes
 * `crossSectionalArea` instead - an AREA in square metres, between about 63 m^2
 * nose-on and 500 m^2 broadside.
 *
 * The formula is therefore dimensionally wrong as invoked, and the error is not
 * a constant: it scales with sqrt(area / radius), and the area itself varies
 * with attitude by a factor of eight through a belly flop. So the 2021 model
 * did not merely understate heating - it understated it by a factor that
 * changed as the vehicle rotated, and in the wrong direction. Turning broadside
 * raised the area, which LOWERED the computed heat, when presenting more of
 * yourself to a hypersonic flow should do the opposite.
 *
 * THE FIX is at the call site, not in the function: pass the nose radius.
 * Starship is 9 m in diameter, so 4.5 m.
 *
 * These tests were written before the fix and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { getReentryHeatPower } from '$core/physics/thermal';
import { NOSE_RADIUS, vehicleDiameter, vehicleMinArea } from '$core/constants';
import { createInitialState } from '$core/state';
import { step } from '$core/step';

describe('the nose radius is a radius', () => {
  it('is half the vehicle diameter', () => {
    expect(NOSE_RADIUS).toBe(vehicleDiameter / 2);
    expect(NOSE_RADIUS).toBe(4.5);
  });

  it('is not an area', () => {
    // The bug in one line: 4.5 m against 63.6 m^2 nose-on.
    expect(NOSE_RADIUS).toBeLessThan(vehicleMinArea);
    expect(vehicleMinArea / NOSE_RADIUS).toBeGreaterThan(14);
  });
});

describe('step() passes the radius, not the area', () => {
  /**
   * Fly a few steps at a given attitude relative to the airflow.
   *
   * More than one step, deliberately: step() computes crossSectionalArea from
   * `angleInToTheWind` BEFORE recomputing that angle from the current pitch, so
   * a single step still uses the spawn attitude and the areas would come out
   * identical - making the comparison vacuous.
   */
  function heatAtAttitude(pitch: number): { heat: number; area: number } {
    let s = createInitialState();
    s.kinematics.altitude = 60_000;
    s.kinematics.speedX = 3000;
    s.kinematics.speedY = 0;
    s.kinematics.trueSpeed = 3000;
    s.kinematics.pitch = pitch as never;
    // TWO steps, not three. The first step sets the aerodynamic angles from
    // the pitch (the area read at the top of a step is the previous step's),
    // so the second is the first whose presented area reflects the attitude —
    // and its heat is computed from the speed after one step of drag on the
    // SAME area for both. A third step would let the broadside vehicle's
    // larger drag slow it more (M11.3: the drag acts within the step now) and
    // its heat fall for a physical reason unrelated to the argument under test.
    for (let i = 0; i < 2; i++) s = step(s, 1 / 120);
    return { heat: s.forces.thermalPower, area: s.forces.crossSectionalArea };
  }

  it('heating no longer falls when the vehicle turns broadside', () => {
    // The clearest symptom, and note it is driven by ATTITUDE rather than by
    // writing crossSectionalArea directly - step() recomputes that field before
    // using it, so injecting an area would have made this test vacuous.
    //
    // Moving from nose-on to broadside raises the presented area severalfold.
    // With the area in the denominator, computed heat FELL as the vehicle
    // presented more of itself to a hypersonic flow.
    const noseOn = heatAtAttitude(Math.PI / 2);
    const broadside = heatAtAttitude(0);

    expect(broadside.area / noseOn.area, 'the areas must actually differ').toBeGreaterThan(3);

    // Heating now depends on the nose radius, not on how the vehicle is turned.
    // Not bit-identical: the lift's sign follows the angle of attack, so after
    // one step the two speeds differ by 3e-11 m/s and the heat in the 13th
    // digit. The claim is that heat no longer TRACKS the area — a 15x area
    // difference used to move it by sqrt(15), and now moves it by 1e-13.
    const heatRatio = broadside.heat / noseOn.heat;
    expect(Math.abs(heatRatio - 1)).toBeLessThan(1e-10);
    // For contrast: under the old argument that same pair differed by sqrt(3).
    expect(Math.sqrt(broadside.area / noseOn.area)).toBeGreaterThan(1.7);

    // And under the 2021 argument it would have dropped as the area grew.
    const legacyNoseOn = getReentryHeatPower(3000, 1e-4, noseOn.area);
    const legacyBroadside = getReentryHeatPower(3000, 1e-4, broadside.area);
    expect(legacyBroadside).toBeLessThan(legacyNoseOn);
  });

  it('matches the formula evaluated with a 4.5 m nose radius', () => {
    const before = createInitialState();
    before.kinematics.altitude = 60_000;
    before.kinematics.trueSpeed = 3000;
    before.kinematics.speedX = 3000;
    const after = step(before, 1 / 120);

    // Note which speed: step() computes thermalPower in its basic-params phase,
    // before spatial motion updates trueSpeed, so it uses the INCOMING speed
    // with the NEW air density. That ordering is 2021's and is preserved.
    const expected = getReentryHeatPower(
      before.kinematics.trueSpeed,
      after.atmosphere.airDensity,
      NOSE_RADIUS,
    );
    expect(after.forces.thermalPower).toBe(expected);
  });

  it('heating is larger than 2021 computed, by sqrt(area / radius)', () => {
    const s = createInitialState();
    s.kinematics.altitude = 60_000;
    s.kinematics.trueSpeed = 3000;
    s.kinematics.speedX = 3000;
    const after = step(s, 1 / 120);

    const area = after.forces.crossSectionalArea;
    const legacy = getReentryHeatPower(
      s.kinematics.trueSpeed,
      after.atmosphere.airDensity,
      area,
    );
    expect(after.forces.thermalPower).toBeGreaterThan(legacy);
    expect(after.forces.thermalPower / legacy).toBeCloseTo(Math.sqrt(area / NOSE_RADIUS), 6);
  });
});

describe('the correlation itself behaves', () => {
  it('scales with the cube of speed', () => {
    const a = getReentryHeatPower(1000, 1e-4, NOSE_RADIUS);
    const b = getReentryHeatPower(2000, 1e-4, NOSE_RADIUS);
    expect(b / a).toBeCloseTo(8, 9);
  });

  it('scales with the square root of density', () => {
    const a = getReentryHeatPower(3000, 1e-4, NOSE_RADIUS);
    const b = getReentryHeatPower(3000, 4e-4, NOSE_RADIUS);
    expect(b / a).toBeCloseTo(2, 9);
  });

  it('a blunter nose heats less, which is why re-entry vehicles are blunt', () => {
    const sharp = getReentryHeatPower(3000, 1e-4, 1);
    const blunt = getReentryHeatPower(3000, 1e-4, 9);
    expect(blunt).toBeLessThan(sharp);
    expect(sharp / blunt).toBeCloseTo(3, 9);
  });

  it('is zero at zero speed and zero density', () => {
    expect(getReentryHeatPower(0, 1e-4, NOSE_RADIUS)).toBe(0);
    expect(getReentryHeatPower(3000, 0, NOSE_RADIUS)).toBe(0);
  });
});
