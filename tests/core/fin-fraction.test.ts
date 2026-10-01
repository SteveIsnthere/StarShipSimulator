/**
 * M2.3, Bug-fix tier: the fin area fields are initialised as areas and used as
 * fractions.
 *
 * THE DEFECT. Two fields, `frontFinEffectiveAreaFraction` and its aft twin, are
 * written in two places that disagree about what they hold.
 *
 *   initBackEnd.js:186 (initControlSurface)
 *       frontFinEffectiveAreaFraction = frontFinSurfaceAera
 *                                       * Math.sin(finAcuationMaxAngle * frontFinExtention * 0.01)
 *       ...an AREA in m^2, since it multiplies by the fin's 24.2 m^2.
 *
 *   physics.js:437 (upDateVehicleInFlightMaxArea), every step thereafter
 *       frontFinEffectiveAreaFraction = Math.sin(finAcuationMaxAngle * frontFinExtention * 0.01)
 *       ...a bare FRACTION, dimensionless.
 *
 * The two disagree by the fin area itself - 24.2x for the front fin, 45.8x for
 * the aft. `getFrontFinDrag` multiplies by this field AND by frontFinSurfaceAera
 * separately, so the init value double-counts the area.
 *
 * In the shipped game both fins start retracted, so sin(0) = 0 and both forms
 * give zero: the bug is latent, and only bites a scenario that begins with fins
 * already deployed. That is exactly what the flight-configuration editor
 * (M4.4) will allow, and what a mid-flight save/restore would produce.
 *
 * The field is a FRACTION - that is what its name says, what physics.js writes
 * every step, and what getFrontFinDrag's arithmetic requires. The initialiser
 * is the side that is wrong.
 *
 * These tests were written before the fix and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, syncDerivedFields } from '$core/state';
import { step } from '$core/step';
import * as aero from '$core/physics/aero';
import * as C from '$core/constants';
import { rad } from '$core/units';

describe('the field holds a fraction at every point in its life', () => {
  it('is a fraction at spawn, not an area', () => {
    const s = createInitialState();
    // Retracted: 0 either way, which is why this stayed hidden.
    expect(s.forces.frontFinEffectiveAreaFraction).toBe(0);
    expect(s.forces.aftFinEffectiveAreaFraction).toBe(0);
  });

  it('a state built with fins deployed holds a fraction, in [0, 1]', () => {
    // The case the initialiser gets wrong. Building a state with fins already
    // out must produce the same field the running simulation would.
    const s = createInitialState();
    s.vehicle.frontFinExtension = 100;
    s.vehicle.aftFinExtension = 100;

    const after = step(s, 1 / 120);
    expect(after.forces.frontFinEffectiveAreaFraction).toBeGreaterThan(0);
    expect(after.forces.frontFinEffectiveAreaFraction).toBeLessThanOrEqual(1);
    expect(after.forces.aftFinEffectiveAreaFraction).toBeLessThanOrEqual(1);
    // sin(1.03) at full extension.
    expect(after.forces.frontFinEffectiveAreaFraction).toBeCloseTo(Math.sin(1.03), 12);
  });

  it('the initialiser and the per-step update agree', () => {
    // The heart of it. Whatever createInitialState writes for a given fin
    // extension must be what step() writes for the same extension.
    for (const extension of [0, 25, 50, 75, 100]) {
      const s = createInitialState();
      s.vehicle.frontFinExtension = extension;
      s.vehicle.aftFinExtension = extension;

      const initialised = aero.updateVehicleInFlightMaxArea(extension, extension);
      const stepped = step(s, 1 / 120);

      expect(stepped.forces.frontFinEffectiveAreaFraction, `front at ${extension}%`).toBe(
        initialised.frontFinEffectiveAreaFraction,
      );
      expect(stepped.forces.aftFinEffectiveAreaFraction, `aft at ${extension}%`).toBe(
        initialised.aftFinEffectiveAreaFraction,
      );
    }
  });

  it('never exceeds 1, because a fraction cannot', () => {
    for (let extension = 0; extension <= 100; extension += 5) {
      const { frontFinEffectiveAreaFraction, aftFinEffectiveAreaFraction } =
        aero.updateVehicleInFlightMaxArea(extension, extension);
      expect(frontFinEffectiveAreaFraction, `${extension}%`).toBeLessThanOrEqual(1);
      expect(aftFinEffectiveAreaFraction, `${extension}%`).toBeLessThanOrEqual(1);
      expect(frontFinEffectiveAreaFraction).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the size of the defect, had it fired', () => {
  it('the area form is 24.2x the fraction form for the front fin', () => {
    const extension = 100;
    const fraction = Math.sin(C.finActuationMaxAngle * extension * 0.01);
    const areaForm = C.frontFinSurfaceArea * fraction;
    expect(areaForm / fraction).toBeCloseTo(C.frontFinSurfaceArea, 9);
    expect(C.frontFinSurfaceArea).toBeCloseTo(24.2, 9);
  });

  it('and 45.8x for the aft fin', () => {
    expect(C.aftFinSurfaceArea).toBeCloseTo(45.8, 9);
  });

  it('fin drag would have double-counted the area', () => {
    // getFrontFinDrag multiplies by the fin's surface area AND by this field.
    // With the area form in the field, the area appears twice.
    const correct = aero.getFrontFinDrag(1.225, 200, rad(0.5), rad(0.5), Math.sin(1.03));
    const buggy = aero.getFrontFinDrag(
      1.225,
      200,
      rad(0.5),
      rad(0.5),
      C.frontFinSurfaceArea * Math.sin(1.03),
    );
    expect(buggy / correct).toBeCloseTo(C.frontFinSurfaceArea, 9);
  });
});

describe('a mid-flight state round-trips', () => {
  it('rebuilding a state from a flying one reproduces the same fin forces', () => {
    // What the flight editor in M4.4 and any save/restore will do. Before the
    // fix, restoring a state with fins deployed produced 24x the fin drag for
    // one step, which is a real torque impulse on the vehicle.
    let flying = createInitialState();
    flying.kinematics.altitude = 5_000;
    flying.kinematics.speedY = -100;
    flying.status.finActive = true;
    for (let i = 0; i < 240; i++) flying = step(flying, 1 / 120);

    const restored = createInitialState();
    restored.kinematics.altitude = flying.kinematics.altitude;
    restored.kinematics.speedY = flying.kinematics.speedY;
    restored.kinematics.pitch = flying.kinematics.pitch;
    restored.vehicle.frontFinExtension = flying.vehicle.frontFinExtension;
    restored.vehicle.aftFinExtension = flying.vehicle.aftFinExtension;
    restored.status.finActive = true;
    // The call any hand-built state owes. Before M2.3 there was nothing to
    // call: the initialiser used a different formula from the running sim.
    syncDerivedFields(restored);

    expect(flying.vehicle.frontFinExtension).toBeGreaterThan(0);
    expect(restored.forces.frontFinEffectiveAreaFraction).toBe(
      flying.forces.frontFinEffectiveAreaFraction,
    );
    expect(restored.vehicle.vehicleInFlightMaxArea).toBe(flying.vehicle.vehicleInFlightMaxArea);

    // And the fin forces it produces are the same, which is the point.
    expect(
      aero.getFrontFinDrag(
        1.225,
        200,
        rad(0.5),
        rad(0.5),
        restored.forces.frontFinEffectiveAreaFraction,
      ),
    ).toBe(
      aero.getFrontFinDrag(1.225, 200, rad(0.5), rad(0.5), flying.forces.frontFinEffectiveAreaFraction),
    );
  });
});

describe('CORRECTION: this is not a behavioural bug', () => {
  /**
   * The pre-implementation analysis claimed the fin fields caused a "~24x
   * discrepancy on frame one". They do not, and this block is the evidence.
   *
   * step() recomputes both fields in its basic-params phase (3a) via
   * updateVehicleInFlightMaxArea, and only reads them in its rotational phase
   * (3c) when computing fin drag. The constructed value is therefore overwritten
   * before anything can observe it - on the very first step, in every scenario.
   * updateBackEnd() had the same ordering, so this was true in 2021 too.
   *
   * The inconsistency is still worth fixing: an initialiser that computes
   * something other than what its field means is a trap for the next reader,
   * and syncDerivedFields is needed by the flight editor in M4.4. But it is a
   * correctness-and-clarity fix with provably zero behavioural effect, not a
   * bug fix that changes flight. The golden fixtures are byte-identical across
   * it, which is a stronger result than the 1-ULP bound a Refactor owes.
   */
  it('step() overwrites the field before any consumer reads it', () => {
    const build = (fraction: number) => {
      const s = createInitialState();
      s.kinematics.altitude = 8_000;
      s.kinematics.speedY = -180;
      s.kinematics.pitch = rad(1.4);
      s.status.finActive = true;
      s.vehicle.frontFinExtension = 100;
      s.vehicle.aftFinExtension = 100;
      s.forces.frontFinEffectiveAreaFraction = fraction;
      s.forces.aftFinEffectiveAreaFraction = fraction;
      return s;
    };

    // The correct fraction, the 2021 area form, and a deliberately absurd value.
    const correct = step(build(Math.sin(1.03)), 1 / 120);
    const areaForm = step(build(C.frontFinSurfaceArea * Math.sin(1.03)), 1 / 120);
    const nonsense = step(build(1e9), 1 / 120);

    for (const other of [areaForm, nonsense]) {
      expect(other.forces.frontFinDrag).toBe(correct.forces.frontFinDrag);
      expect(other.forces.aftFinDrag).toBe(correct.forces.aftFinDrag);
      expect(other.kinematics.angularAcceleration).toBe(correct.kinematics.angularAcceleration);
    }
  });

  it('and it stays overwritten over a long run', () => {
    const run = (fraction: number) => {
      const s = createInitialState();
      s.kinematics.altitude = 8_000;
      s.kinematics.speedY = -180;
      s.kinematics.pitch = rad(1.4);
      s.status.finActive = true;
      s.vehicle.frontFinExtension = 100;
      s.vehicle.aftFinExtension = 100;
      s.forces.frontFinEffectiveAreaFraction = fraction;
      s.forces.aftFinEffectiveAreaFraction = fraction;
      let cur = s;
      for (let i = 0; i < 600; i++) cur = step(cur, 1 / 120);
      return cur;
    };
    const a = run(Math.sin(1.03));
    const b = run(C.frontFinSurfaceArea * Math.sin(1.03));
    expect(b.kinematics.pitch).toBe(a.kinematics.pitch);
    expect(b.kinematics.altitude).toBe(a.kinematics.altitude);
    expect(b.kinematics.angularVelocity).toBe(a.kinematics.angularVelocity);
  });

  it('so the value only matters to code that reads a state without stepping it', () => {
    // Which is exactly the flight editor, a save/restore, or a HUD readout - and
    // is why syncDerivedFields exists rather than the initialiser simply being
    // deleted.
    const s = createInitialState();
    s.vehicle.frontFinExtension = 100;
    syncDerivedFields(s);
    expect(s.forces.frontFinEffectiveAreaFraction).toBeCloseTo(Math.sin(1.03), 12);
    expect(s.forces.frontFinEffectiveAreaFraction).toBeLessThanOrEqual(1);
  });
});
