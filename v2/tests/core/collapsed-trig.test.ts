/**
 * M1.9, Fidelity: the `collapsedTrig` flag as shipped.
 *
 * tests/proofs/trig-collapse.test.ts proves the two forms agree to within a
 * ULP. This is a different question: is the flag actually WIRED — does turning
 * it on reach every one of the seven ladders, and does leaving it off change
 * nothing at all? A flag that is proved correct and not plumbed in is worse
 * than no flag, because the fixture recording its "on" path would be recording
 * the off path under a different name.
 */
import { describe, expect, it } from 'vitest';
import * as comp from '$core/physics/components';
import { getEffectiveVerticalMaxThrust } from '$core/control/primitives';
import { createFlags, DEFAULT_FLAGS, FLAG_COMBINATIONS, flagsId } from '$core/flags';
import { createInitialState, type SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { rad, type Rad } from '$core/units';
import { toggleAutoLand } from '$core/control/commands';
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
  { name: 'horizontalDrag', fn: comp.horizontalDragCoefficient, collapsed: (x: number) => -Math.sin(x) },
  { name: 'verticalDrag', fn: comp.verticalDragCoefficient, collapsed: (x: number) => -Math.cos(x) },
  { name: 'horizontalLift', fn: comp.horizontalLiftCoefficient, collapsed: (x: number) => -Math.cos(x) },
  { name: 'verticalLift', fn: comp.verticalLiftCoefficient, collapsed: (x: number) => Math.sin(x) },
  { name: 'horizontalThrust', fn: comp.horizontalThrustCoefficient, collapsed: (x: number) => Math.sin(x) },
  { name: 'verticalThrust', fn: comp.verticalThrustCoefficient, collapsed: (x: number) => Math.cos(x) },
] as const;

describe('the flag is off by default', () => {
  it('is declared false in DEFAULT_FLAGS', () => {
    expect(DEFAULT_FLAGS.collapsedTrig).toBe(false);
    expect(createInitialState().flags.collapsedTrig).toBe(false);
  });

  it('every coefficient defaults to the ladder when the argument is omitted', () => {
    // The default parameter matters: a call site that has not been taught about
    // the flag must get 2021's behaviour, not a silent change.
    for (const { name, fn } of LADDERS) {
      for (const angle of ANGLES) {
        expect(fn(angle), `${name}(${angle})`).toBe(fn(angle, false));
      }
    }
  });
});

describe('turning it on selects the collapsed form', () => {
  for (const { name, fn, collapsed } of LADDERS) {
    it(`${name} returns the single expression`, () => {
      for (const angle of ANGLES) {
        expect(fn(angle, true), `${name}(${angle})`).toBe(collapsed(angle));
      }
    });
  }

  it('the seventh ladder in primitives collapses too', () => {
    // getEffectiveVerticalMaxThrust inlines a copy of verticalThrustCoefficient.
    // Collapsing six of seven would be the worst of both worlds.
    const running = [true, true, true];
    for (const angle of ANGLES) {
      expect(getEffectiveVerticalMaxThrust(running, angle, true)).toBe(
        3 * maxThrustPerRaptor * Math.cos(angle),
      );
      expect(getEffectiveVerticalMaxThrust(running, angle, false)).toBe(
        getEffectiveVerticalMaxThrust(running, angle),
      );
    }
  });

  it('the two forms never differ by more than one unit-ULP', () => {
    // The headline number from the proof, restated against the shipped code
    // rather than against a transcription of the ladders.
    const ULP = Number.EPSILON; // 2.220446049250313e-16
    for (const { name, fn } of LADDERS) {
      let worst = 0;
      for (const angle of ANGLES) worst = Math.max(worst, Math.abs(fn(angle, true) - fn(angle, false)));
      expect(worst, `${name} max diff ${worst}`).toBeLessThanOrEqual(ULP);
    }
  });
});

describe('the flag reaches the simulation', () => {
  it('is threaded into the acceleration inputs', () => {
    const base = {
      angleOfMotion: rad(2.5),
      angleOfAttack: rad(0.3),
      gimbalPointingDirection: rad(2.0),
      aerodynamicDragAcceleration: 12,
      aerodynamicLiftAcceleration: 4,
      thrustAcceleration: 20,
    };
    // An angle in the second quadrant, where the ladder takes its `PI - a`
    // branch and the collapsed form does not.
    expect(comp.getHorizontalAcceleration({ ...base, collapsedTrig: true })).not.toBe(
      comp.getHorizontalAcceleration({ ...base, collapsedTrig: false }),
    );
  });

  it('changes a real flight, which is why it is Fidelity and not Refactor', () => {
    // If this produced identical trajectories the flag would be pointless and
    // its golden fixture would be a duplicate of the default one.
    //
    // Sampled MID-FLIGHT, at 25 s of a 60 s descent. Comparing the final state
    // proves nothing here: both paths land, and a landed vehicle is pinned to
    // exactly half its height with its velocities zeroed, so the endpoints
    // agree to the bit however different the flights were. That is the sort of
    // assertion that passes for the wrong reason.
    const flyTo = (collapsedTrig: boolean, steps: number) => {
      let s: SimState = createScenarioState(getScenario('before-flip')!);
      s.flags = createFlags({ collapsedTrig });
      toggleAutoLand(s);
      for (let i = 0; i < steps; i++) s = step(s, DT);
      return s;
    };

    const off = flyTo(false, 3_000);
    const on = flyTo(true, 3_000);

    expect(off.status.landed, 'still flying at the sample point').toBe(false);

    // Which fields moved is not obvious in advance, and picking one by hand
    // gets it wrong: altitude happens to agree here, because it is an integral
    // of an integral and the perturbation has not reached its last bit yet.
    // So the assertion is over the whole state.
    const moved: string[] = [];
    const walk = (x: unknown, y: unknown, path: string) => {
      if (typeof x === 'number' && typeof y === 'number') {
        if (!Object.is(x, y)) moved.push(`${path}: ${x} vs ${y}`);
        return;
      }
      if (Array.isArray(x) && Array.isArray(y)) {
        x.forEach((v, i) => walk(v, y[i], `${path}[${i}]`));
        return;
      }
      if (x && y && typeof x === 'object' && typeof y === 'object') {
        for (const k of Object.keys(x)) {
          walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${path}.${k}`);
        }
      }
    };
    walk(on.kinematics, off.kinematics, 'kinematics');
    walk(on.forces, off.forces, 'forces');
    walk(on.vehicle, off.vehicle, 'vehicle');

    expect(moved.length, 'the flag must change something').toBeGreaterThan(0);

    // But it is a last-bit difference compounded, not a different flight. Every
    // moved field agrees to at least ten significant figures.
    for (const entry of moved) {
      const [lhs, rhs] = entry.slice(entry.indexOf(': ') + 2).split(' vs ').map(Number);
      const scale = Math.max(Math.abs(lhs!), Math.abs(rhs!), 1e-12);
      expect(Math.abs(lhs! - rhs!) / scale, entry).toBeLessThan(1e-10);
    }

    // And both still land.
    expect(flyTo(true, 7_200).status.landed).toBe(flyTo(false, 7_200).status.landed);
  });

  it('is deterministic on both paths', () => {
    const fly = (collapsedTrig: boolean) => {
      let s: SimState = createScenarioState(getScenario('landing-burn')!);
      s.flags = createFlags({ collapsedTrig });
      for (let i = 0; i < 1_200; i++) s = step(s, DT);
      return [s.kinematics.altitude, s.kinematics.speedY, s.kinematics.pitch as number];
    };
    expect(fly(true)).toEqual(fly(true));
    expect(fly(false)).toEqual(fly(false));
  });
});

describe('golden coverage', () => {
  it('ships a combination with the flag on, and one with everything on', () => {
    const ids = FLAG_COMBINATIONS.map((c) => flagsId(createFlags(c)));
    expect(ids).toContain('collapsedTrig');
    expect(ids).toContain('planetCenteredGravity+realSpeedOfSound+fullISA+collapsedTrig');
  });
});
