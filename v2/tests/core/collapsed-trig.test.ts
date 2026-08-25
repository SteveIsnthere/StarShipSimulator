/**
 * M1.9 → M2.10: the collapsed trig as SHIPPED.
 *
 * tests/proofs/trig-collapse.test.ts proves the two forms agree to within a
 * ULP over four million angles per ladder. This is a different question, and
 * the one that actually protects the build: is the collapsed form what the
 * simulation runs, in every one of the seven places 2021 wrote a ladder?
 *
 * Seven, not six. Six are in physics/components.ts; the seventh is inlined in
 * `getEffectiveVerticalMaxThrust` (physics.js:477). Collapsing six of seven
 * would be the worst of both worlds — the shipped physics would then be neither
 * the 2021 arithmetic nor the collapsed arithmetic, and no proof would cover
 * it.
 *
 * Until M2.10 this was a fidelity flag and this file asked whether the flag was
 * wired. The flag is gone; the question becomes whether the ladders are gone
 * from the flight path, and whether the copies kept for the parity suite are
 * still the 2021 ones.
 */
import { describe, expect, it } from 'vitest';
import * as comp from '$core/physics/components';
import {
  getEffectiveVerticalMaxThrust,
  legacyEffectiveVerticalMaxThrust,
} from '$core/control/primitives';
import { createScenarioState, getScenario } from '$core/scenarios';
import type { SimState } from '$core/state';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { rad, type Rad } from '$core/units';
import { maxThrustPerRaptor } from '$core/constants';

/** Angles across all four quadrants, including every branch boundary. */
const ANGLES: Rad[] = [];
{
  const H = Math.PI / 2;
  for (const boundary of [-Math.PI, -H, 0, H, Math.PI]) {
    ANGLES.push(rad(boundary), rad(boundary - 1e-12), rad(boundary + 1e-12));
  }
  for (let i = 0; i <= 400; i++) ANGLES.push(rad(-Math.PI + (2 * Math.PI * i) / 400));
}

const LADDERS = [
  {
    name: 'horizontalDrag',
    shipped: comp.horizontalDragCoefficient,
    ladder: comp.legacyHorizontalDragCoefficient,
    collapsed: (x: number) => -Math.sin(x),
  },
  {
    name: 'verticalDrag',
    shipped: comp.verticalDragCoefficient,
    ladder: comp.legacyVerticalDragCoefficient,
    collapsed: (x: number) => -Math.cos(x),
  },
  {
    name: 'horizontalLift',
    shipped: comp.horizontalLiftCoefficient,
    ladder: comp.legacyHorizontalLiftCoefficient,
    collapsed: (x: number) => -Math.cos(x),
  },
  {
    name: 'verticalLift',
    shipped: comp.verticalLiftCoefficient,
    ladder: comp.legacyVerticalLiftCoefficient,
    collapsed: (x: number) => Math.sin(x),
  },
  {
    name: 'horizontalThrust',
    shipped: comp.horizontalThrustCoefficient,
    ladder: comp.legacyHorizontalThrustCoefficient,
    collapsed: (x: number) => Math.sin(x),
  },
  {
    name: 'verticalThrust',
    shipped: comp.verticalThrustCoefficient,
    ladder: comp.legacyVerticalThrustCoefficient,
    collapsed: (x: number) => Math.cos(x),
  },
] as const;

describe('the shipped coefficient is the single expression', () => {
  for (const { name, shipped, collapsed } of LADDERS) {
    it(`${name} is exactly its collapsed form, at every angle`, () => {
      for (const angle of ANGLES) {
        expect(shipped(angle), `${name}(${angle})`).toBe(collapsed(angle));
      }
    });
  }

  it('the seventh ladder, inlined in primitives, is collapsed too', () => {
    const running = [true, true, true];
    for (const angle of ANGLES) {
      expect(getEffectiveVerticalMaxThrust(running, angle)).toBe(
        3 * maxThrustPerRaptor * Math.cos(angle),
      );
    }
  });
});

describe('the 2021 ladders are still here, and still 2021', () => {
  it('every ladder keeps its branch structure — they are not aliases', () => {
    // If a future edit "simplified" the legacy copies into the collapsed form,
    // the parity suite would start comparing v2 against v2 and pass forever.
    // The two forms differ on about a third of angles in the last bit, so
    // finding at least one disagreement proves the copies are distinct code.
    for (const { name, shipped, ladder } of LADDERS) {
      const differs = ANGLES.some((a) => !Object.is(shipped(a), ladder(a)));
      expect(differs, `${name}: legacy copy is identical to the collapsed form`).toBe(true);
    }
    const running = [true, true, true];
    expect(
      ANGLES.some(
        (a) =>
          !Object.is(
            getEffectiveVerticalMaxThrust(running, a),
            legacyEffectiveVerticalMaxThrust(running, a),
          ),
      ),
    ).toBe(true);
  });

  it('and the disagreement is never more than one unit-ULP', () => {
    // The headline number from the proof, restated against the shipped code
    // rather than a transcription of it.
    const ULP = Number.EPSILON; // 2.220446049250313e-16
    for (const { name, shipped, ladder } of LADDERS) {
      let worst = 0;
      for (const angle of ANGLES) worst = Math.max(worst, Math.abs(shipped(angle) - ladder(angle)));
      expect(worst, `${name} max diff ${worst}`).toBeLessThanOrEqual(ULP);
    }
  });
});

describe('the collapsed form is what reaches the simulation', () => {
  it('the composed accelerations use it, not the ladders', () => {
    // An angle in the second quadrant, where the ladder takes its `PI - a`
    // branch and the collapsed form does not — so composing by hand from the
    // legacy copies gives a different last bit from what step() computes.
    const i = {
      angleOfMotion: rad(2.5),
      angleOfAttack: rad(0.3),
      gimbalPointingDirection: rad(2.0),
      aerodynamicDragAcceleration: 12,
      aerodynamicLiftAcceleration: 4,
      thrustAcceleration: 20,
    };

    const viaLadders = (() => {
      const dragComponent =
        comp.legacyHorizontalDragCoefficient(i.angleOfMotion) * i.aerodynamicDragAcceleration;
      const lift = comp.legacyHorizontalLiftCoefficient(i.angleOfMotion);
      const liftComponent = comp.liftSignIsInverted(i.angleOfAttack)
        ? -lift * i.aerodynamicLiftAcceleration
        : lift * i.aerodynamicLiftAcceleration;
      const thrustComponent =
        comp.legacyHorizontalThrustCoefficient(i.gimbalPointingDirection) * i.thrustAcceleration;
      return dragComponent + thrustComponent + liftComponent;
    })();

    expect(comp.getHorizontalAcceleration(i)).not.toBe(viaLadders);
    // Same value to well within anything physical — it is one bit, not a
    // different formula.
    expect(comp.getHorizontalAcceleration(i)).toBeCloseTo(viaLadders, 12);
  });

  it('and a real flight is deterministic under it', () => {
    const fly = () => {
      let s: SimState = createScenarioState(getScenario('landing-burn')!);
      for (let i = 0; i < 1_200; i++) s = step(s, DT);
      return [s.kinematics.altitude, s.kinematics.speedY, s.kinematics.pitch as number];
    };
    expect(fly()).toEqual(fly());
  });
});
