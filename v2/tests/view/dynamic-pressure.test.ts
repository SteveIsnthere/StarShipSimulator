/**
 * M9.3: every dynamic-pressure threshold, checked against the flights.
 *
 * THE BUG CLASS THIS FILE EXISTS FOR. `forces.dynamicPressure` is kilopascals.
 * Its JSDoc in `core/state.ts` says psi, and 2021's source called it psi in
 * every comment it appears in, so every layer that has ever drawn or sounded
 * with it inherited a unit that is wrong. It has now produced the same bug
 * twice, a milestone apart and in different files:
 *
 *   M8.3  `AERO_FULL_Q` was written 30_000 — aerodynamic noise never rose
 *   M9.3  `SHAKE_FULL_Q` was written 30_000 — airframe shake never fired
 *
 * Both were caught by hand, by someone happening to look. This file is the
 * mechanism that catches the third one.
 *
 * THE CLAIM. A threshold constant is a promise that something happens when the
 * flight crosses it. A constant far above the highest value any flight reaches
 * is a promise that is never kept; a constant far below the lowest is one that
 * is kept from the first frame and therefore says nothing. Either way the
 * comment beside it is irrelevant — what makes a threshold meaningful is where
 * it sits relative to the numbers the simulation actually produces, and that is
 * a thing a test can know and a reader cannot.
 *
 * So: replay all seven goldens, find the interval Q actually visits, and check
 * every named Q constant in `view/`, `audio/` and `hud/` against it. The three
 * layers each keep their own copy of the number rather than importing one
 * another's — `audio/params.ts` explains why for SEA_LEVEL_KPA and the argument
 * is the same here — and this test is what keeps the copies in one universe.
 */
import { describe, expect, it } from 'vitest';
import { step } from '$core/step';
import { dynamicPressureLimit } from '$core/constants';
import { SHAKE_FULL_Q, shakeAmplitude, SHAKE_FRACTION } from '$view/camera';
import { AERO_TRAIL_FULL_Q, AERO_TRAIL_MIN_Q, SONIC_BOOM_MIN_Q } from '$view/effects';
import { AERO_FULL_Q, aeroLevel } from '$audio/params';
import { MAX_Q_FLOOR_KPA } from '$hud/timeline';
import type { SimState } from '$core/state';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';

/** What one golden flight does to the airframe. */
interface QProfile {
  readonly id: string;
  readonly peak: number;
  /** Fraction of the flight spent above a value. */
  readonly fractionAbove: (q: number) => number;
  /** Worst saturation: the largest share of the flight at full ramp intensity. */
  readonly samples: readonly number[];
}

const PROFILES: readonly QProfile[] = GOLDEN_SPECS.map((spec) => {
  let s: SimState = spec.build();
  const samples: number[] = [];
  let peak = 0;
  for (let i = 0; i < spec.steps; i++) {
    s = step(s, GOLDEN_DT);
    const q = s.forces.dynamicPressure;
    samples.push(q);
    if (q > peak) peak = q;
  }
  return {
    id: spec.id,
    peak,
    samples,
    fractionAbove: (v: number) => samples.filter((q) => q >= v).length / samples.length,
  };
});

/** The highest dynamic pressure any of the seven flights reaches. */
const PEAK = Math.max(...PROFILES.map((p) => p.peak));

const TABLE = PROFILES.map((p) => `  ${p.id.padEnd(24)} peak ${p.peak.toFixed(2)} kPa`).join('\n');

describe('what the seven flights actually do', () => {
  it('records the interval, so the numbers below are measured rather than assumed', () => {
    /*
      Measured 2026-08-26:

        launch-pad-takeoff      23.63      before-flip-autoland     2.89
        booster-sep-boostback    0.11      landing-burn-autoland    0.87
        rtls-boostback          28.61      intro-demo               1.68
        reentry-autoland         7.55

      A textbook max-Q in kilopascals, and an absurdity in anything else: 28.6
      psi would be 197 kPa, six times what any launch vehicle survives, and
      28.6 Pa would not move a leaf.
    */
    expect(PEAK, TABLE).toBeGreaterThan(20);
    expect(PEAK, TABLE).toBeLessThan(50);
    // And the structural limit is above every one of them, which is why none of
    // these flights breaks up: a limit the goldens crossed would be a different
    // finding entirely.
    expect(PEAK, `limit ${dynamicPressureLimit}\n${TABLE}`).toBeLessThan(dynamicPressureLimit);
  });
});

describe('every Q threshold lies in the range the flights visit', () => {
  /**
   * Every named dynamic-pressure constant in the three drawing layers.
   *
   * ADD TO THIS LIST when a new one appears. That is the whole maintenance
   * burden of this file, and it is the reason M9.3 gave names to two thresholds
   * that had been literals inside `effects.ts`: a constant this list cannot see
   * is a constant nothing checks.
   */
  const CONSTANTS: readonly (readonly [string, number])[] = [
    ['view/camera.ts SHAKE_FULL_Q', SHAKE_FULL_Q],
    ['view/effects.ts AERO_TRAIL_MIN_Q', AERO_TRAIL_MIN_Q],
    ['view/effects.ts AERO_TRAIL_FULL_Q', AERO_TRAIL_FULL_Q],
    ['view/effects.ts SONIC_BOOM_MIN_Q', SONIC_BOOM_MIN_Q],
    ['audio/params.ts AERO_FULL_Q', AERO_FULL_Q],
    ['hud/timeline.ts MAX_Q_FLOOR_KPA', MAX_Q_FLOOR_KPA],
    ['core/constants.ts dynamicPressureLimit', dynamicPressureLimit],
  ];

  /*
    THE BOUNDS, and why they are these.

    Above `2 * PEAK` a threshold can never be reached by any flight the goldens
    describe, so whatever it gates is dead code. Below `PEAK / 200` it is
    crossed within the first moments of every flight that has any air at all, so
    whatever it gates is always on. The window is deliberately wide — a factor
    of four hundred — because these are honest tuning choices spanning gates and
    full-scale values, and a tight window would be a second opinion about taste.

    It is still narrow enough to catch what it exists to catch. The two shipped
    bugs were both a factor of 1000 (kPa written as Pa); a psi/kPa confusion is
    6.9x, and either overshoots `2 * PEAK` from any sensible starting value.
  */
  const floor = PEAK / 200;
  const ceiling = PEAK * 2;

  it.each(CONSTANTS)('%s', (name, value) => {
    const report =
      `${name} = ${value} kPa, against a measured peak of ${PEAK.toFixed(2)} kPa\n` +
      `allowed [${floor.toFixed(3)}, ${ceiling.toFixed(1)}]\n${TABLE}`;
    expect(value, report).toBeGreaterThanOrEqual(floor);
    expect(value, report).toBeLessThanOrEqual(ceiling);
  });

  it('and would have caught both of the bugs that made this file necessary', () => {
    // 30_000 is what `SHAKE_FULL_Q` held until M9.3 and what `AERO_FULL_Q` held
    // until M8.3. A test that cannot fail on the bug it was written for is
    // decoration.
    expect(30_000).toBeGreaterThan(ceiling);
    // And the psi reading of the same number, which is the more insidious one
    // because it is only wrong by a factor of seven.
    expect(30 * 6.894757).toBeGreaterThan(ceiling);
  });
});

describe('airframe shake, which had never fired', () => {
  it('is silent in calm air and non-zero at max-Q on both powered flights', () => {
    expect(shakeAmplitude(0, 0)).toBe(0);
    for (const id of ['launch-pad-takeoff', 'rtls-boostback']) {
      const profile = PROFILES.find((p) => p.id === id)!;
      const amplitude = shakeAmplitude(profile.peak, 0);
      const report = `${id}: peak ${profile.peak.toFixed(2)} kPa gives amplitude ${amplitude.toFixed(4)}`;
      expect(amplitude, report).toBeGreaterThan(0);
      /*
        And not merely non-zero — READABLE. Before M9.3 this number was 0.00079
        on the launch and 0.00095 on the RTLS, which is not "a subtle shake": at
        SHAKE_FRACTION = 0.006 of a 200 m viewport it is five ten-thousandths of
        a metre, four thousandths of a pixel. The pixel it should move is what
        makes the difference between a bug and a taste.
      */
      expect(amplitude, report).toBeGreaterThan(0.5);
    }
  });

  it('lands at M7.3’s designed amplitude, by the owner’s decision', () => {
    /*
      Owner decision, 2026-08-26: the shake arrives at the fraction M7.3 chose
      rather than dialled back for its first outing. It has never once fired, so
      every ascent will feel different the moment this lands, and whether 0.6% of
      viewport height is right is a viewing decision to be made after seeing it —
      not a number to guess at now. Pinned so that dialling it back later is a
      deliberate act with a test to change.
    */
    expect(SHAKE_FRACTION).toBe(0.006);
  });

  it('still cannot shake the instrument off the screen', () => {
    // The cap that made the old bug survivable is still there, and now it
    // matters: with Q reading correctly, a max-Q ascent under full thrust is the
    // first flight that can reach it.
    expect(shakeAmplitude(PEAK * 10, 1000)).toBe(1);
  });
});

describe('the fin vortices carry information again', () => {
  /** The shipped ramp, as `view/effects.ts` computes it. */
  const finIntensity = (q: number): number =>
    q > AERO_TRAIL_MIN_Q ? Math.min(Math.sqrt(q / AERO_TRAIL_FULL_Q), 1) : 0;

  it('is not saturated for most of any flight', () => {
    /*
      THE COMPLAINT, AS A NUMBER. The old ramp reached full intensity at 2 kPa
      and stayed there for 85% of the launch, 76% of the RTLS and 44% of the
      re-entry — an effect that says the same thing at 2 kPa and at 28 is not
      telling anyone anything.
    */
    const old = (q: number) => (q > 0.2 ? Math.min(q / 2, 1) : 0);
    const report: string[] = [];
    for (const profile of PROFILES) {
      const before = profile.samples.filter((q) => old(q) >= 1).length / profile.samples.length;
      const after = profile.samples.filter((q) => finIntensity(q) >= 1).length / profile.samples.length;
      report.push(
        `${profile.id.padEnd(24)} saturated ${(before * 100).toFixed(0)}% before, ${(after * 100).toFixed(0)}% after`,
      );
    }
    for (const profile of PROFILES) {
      const after = profile.samples.filter((q) => finIntensity(q) >= 1).length / profile.samples.length;
      expect(after, report.join('\n')).toBeLessThan(0.05);
    }
  });

  it('rises monotonically across everything the flights visit', () => {
    let previous = -1;
    for (let q = 0; q <= PEAK; q += PEAK / 500) {
      const value = finIntensity(q);
      expect(value, `${q.toFixed(2)} kPa`).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('spans most of its range over a launch, where before it spanned none', () => {
    const launch = PROFILES.find((p) => p.id === 'launch-pad-takeoff')!;
    const values = launch.samples.map(finIntensity).filter((v) => v > 0);
    const span = Math.max(...values) - Math.min(...values);
    expect(span, `intensity spans ${span.toFixed(2)} over the launch`).toBeGreaterThan(0.6);
  });

  it('and reads the same scale the audio does, because it is the same air', () => {
    // Both are `sqrt(q / 30)`. Not a coincidence to be tidied away later: the
    // fins shedding vortices and the airframe roaring are one phenomenon, and
    // a player who sees more and hears less would be being told two things.
    for (const q of [0.5, 2, 7.55, 23.63, 28.61]) {
      expect(finIntensity(q), `${q} kPa`).toBeCloseTo(aeroLevel(q), 10);
    }
  });
});
