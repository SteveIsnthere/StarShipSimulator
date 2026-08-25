/**
 * M7.5: the streak curve, and the flight-path marker's angle.
 *
 * Two things with opposite obligations, in one file on purpose:
 *
 *   THE STREAK CURVE IS SCENERY, so it is allowed to be a compression — and it
 *   is one, by a factor of forty at re-entry. What it owes is that it be silent
 *   where it should be silent (a landing hop must not snow), monotonic, and
 *   bounded.
 *
 *   THE MARKER IS AN INSTRUMENT, so it owes something stricter: its angle must
 *   be `angleOfMotion` exactly. That is asserted over all seven goldens, which
 *   is the acceptance line's own test — a marker that drifted from the state
 *   vector would be lying about where the vehicle is going.
 *
 * That difference is the honesty rule with teeth on it rather than in a comment.
 */
import { describe, expect, it } from 'vitest';
import {
  flightPathRotation,
  flightPathVisible,
  MARKER_MIN_SPEED,
  streakIntensity,
  streakLength,
  STREAK_FULL,
  STREAK_THRESHOLD,
} from '$view/motion-cues';
import { step } from '$core/step';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';

describe('the streak curve', () => {
  it('is EXACTLY zero below the threshold — a landing hop does not snow', () => {
    // The acceptance line's own words, and exact rather than small: a curve
    // that returned 0.001 would still be emitting a particle every few seconds
    // over a two-minute descent.
    for (const speed of [0, 10, 60, 120, STREAK_THRESHOLD]) {
      expect(streakIntensity(speed), `${speed} m/s`).toBe(0);
      expect(streakLength(streakIntensity(speed), 800), `${speed} m/s`).toBe(0);
    }
  });

  it('saturates rather than growing without bound', () => {
    // THE COMPRESSION, as an assertion. There is no visual difference a viewer
    // can extract between "very fast" and "twice as fast"; pretending otherwise
    // just fills the frame.
    expect(streakIntensity(STREAK_FULL)).toBe(1);
    expect(streakIntensity(7_300)).toBe(1);
    expect(streakIntensity(1e9)).toBe(1);
  });

  it('is monotonic and smooth at both ends', () => {
    let previous = -1;
    for (let v = 0; v < 3_000; v += 7) {
      const value = streakIntensity(v);
      expect(value, `${v} m/s`).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // Smoothstep: the rate is zero where it starts and where it stops, so
    // streaks fade in rather than switching on.
    const slope = (v: number) => (streakIntensity(v + 0.5) - streakIntensity(v - 0.5)) / 1;
    expect(Math.abs(slope(STREAK_THRESHOLD + 1))).toBeLessThan(1e-4);
    expect(Math.abs(slope(STREAK_FULL - 1))).toBeLessThan(1e-4);
  });

  it('is symmetric in direction and survives nonsense', () => {
    expect(streakIntensity(-1_000)).toBe(streakIntensity(1_000));
    expect(streakIntensity(NaN)).toBe(0);
  });

  it('does not depend on there being air, and that is the point', () => {
    /*
      An earlier version multiplied this by an ambient-pressure term. Measured
      over the goldens it took re-entry — 7300 m/s, no world visible, the single
      case these cues exist for — down to 0.19, and left every other flight
      alone. The plan's § 3.3 is explicit that screen-space cues are valuable
      precisely because none of them depend on there being anything out there.

      So: same speed, same streaks, at sea level and in vacuum.
    */
    expect(streakIntensity(2_500)).toBe(1);
    expect(streakIntensity(7_300)).toBe(1);
  });

  it('scales its length with the frame, not with absolute pixels', () => {
    // The same reasoning as the M7.3 camera shake: a cue sized in absolute
    // pixels means two different things on a phone and a desktop.
    expect(streakLength(1, 1600)).toBeCloseTo(2 * streakLength(1, 800), 9);
    expect(streakLength(1, 800)).toBeGreaterThan(streakLength(0.5, 800));
  });
});

describe('at the speeds the seven scenarios actually reach', () => {
  it('reports where the streaks are silent and where they blow', () => {
    /*
      The acceptance line asks for the curve to be tested at the speeds the
      scenarios reach. The interesting answer is not a bound — it is WHICH
      flights see streaks at all, because a cue that fired on all seven equally
      would be telling the player nothing.
    */
    const report: string[] = [];
    for (const spec of GOLDEN_SPECS) {
      let s: SimState = spec.build();
      let peakSpeed = 0;
      let peakStreak = 0;
      let silentSamples = 0;
      let samples = 0;

      for (let i = 0; i < spec.steps; i++) {
        s = step(s, GOLDEN_DT);
        if (i % 60 !== 0) continue;
        samples += 1;
        const value = streakIntensity(s.kinematics.trueSpeed);
        peakSpeed = Math.max(peakSpeed, s.kinematics.trueSpeed);
        peakStreak = Math.max(peakStreak, value);
        if (value === 0) silentSamples += 1;
        expect(value, `${spec.id}`).toBeGreaterThanOrEqual(0);
        expect(value, `${spec.id}`).toBeLessThanOrEqual(1);
      }

      report.push(
        `${spec.id}: peak ${peakSpeed.toFixed(0)} m/s -> streak ${peakStreak.toFixed(2)}, ` +
          `silent ${((silentSamples / samples) * 100).toFixed(0)}% of the flight`,
      );
    }
    console.log(report.join('\n'));
    expect(report).toHaveLength(GOLDEN_SPECS.length);
  });

  it('the two landing scenarios stay silent throughout', () => {
    // The claim the threshold exists for, on the flights it exists for.
    for (const id of ['landing-burn-autoland', 'intro-demo']) {
      const spec = GOLDEN_SPECS.find((x) => x.id === id)!;
      let s: SimState = spec.build();
      let worst = 0;
      for (let i = 0; i < spec.steps; i++) {
        s = step(s, GOLDEN_DT);
        worst = Math.max(worst, streakIntensity(s.kinematics.trueSpeed));
      }
      expect(worst, `${id} produced streaks`).toBe(0);
    }
  });
});

describe('the flight-path marker', () => {
  it('is angleOfMotion exactly, only flipped for the screen axis', () => {
    // NOT a compression. The negation is the same one vehicle.ts applies to
    // pitch: screen y grows downward, world y grows up.
    for (const angle of [0, 0.3, -1.2, Math.PI, -Math.PI / 2]) {
      expect(flightPathRotation(angle)).toBe(-angle);
    }
    expect(flightPathRotation(NaN)).toBe(0);
  });

  it('hides itself when there is no direction of travel to report', () => {
    // atan2 of two numbers near zero is noise, and a marker spinning on the
    // nose of a landed ship would be an instrument reporting its own rounding.
    expect(flightPathVisible(0)).toBe(false);
    expect(flightPathVisible(MARKER_MIN_SPEED - 0.01)).toBe(false);
    expect(flightPathVisible(MARKER_MIN_SPEED)).toBe(true);
    expect(flightPathVisible(-900)).toBe(true);
    expect(flightPathVisible(NaN)).toBe(false);
  });

  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))(
    '%s: the marker never disagrees with the state vector',
    (id, spec) => {
      /*
        The acceptance line: the marker's angle asserted against `angleOfMotion`
        over the goldens. Exact equality, sample by sample — this is the test
        that stops the instrument drifting from the simulation, which is the one
        failure that would make it worse than not drawing it at all.

        Also checked: that the marker and the NOSE genuinely differ, because if
        they never did there would be nothing worth drawing. The largest gap is
        reported — it is the angle of attack, which is exactly what the marker
        exists to make visible.
      */
      let s: SimState = spec.build();
      let worstDivergence = 0;

      for (let i = 0; i < spec.steps; i++) {
        s = step(s, GOLDEN_DT);
        if (i % 30 !== 0) continue;

        const rotation = flightPathRotation(s.kinematics.angleOfMotion);
        expect(rotation, `${id} at step ${i}`).toBe(-(s.kinematics.angleOfMotion as number));

        if (flightPathVisible(s.kinematics.trueSpeed)) {
          // Against the drawn vehicle, which is `-pitch` (vehicle.ts:83).
          const noseRotation = -(s.kinematics.pitch as number);
          let gap = Math.abs(rotation - noseRotation);
          if (gap > Math.PI) gap = Math.PI * 2 - gap;
          worstDivergence = Math.max(worstDivergence, gap);
        }
      }

      console.log(
        `${id}: nose and flight path diverge by up to ${((worstDivergence * 180) / Math.PI).toFixed(0)}°`,
      );
      expect(Number.isFinite(worstDivergence)).toBe(true);
    },
  );

  it('the divergence is real on at least one scenario, or this draws nothing', () => {
    // A marker that always sat on the nose would be a second vehicle sprite.
    const spec = GOLDEN_SPECS.find((x) => x.id === 'reentry-autoland')!;
    let s: SimState = spec.build();
    let worst = 0;
    for (let i = 0; i < spec.steps; i++) {
      s = step(s, GOLDEN_DT);
      if (!flightPathVisible(s.kinematics.trueSpeed)) continue;
      let gap = Math.abs((s.kinematics.pitch as number) - (s.kinematics.angleOfMotion as number));
      if (gap > Math.PI) gap = Math.PI * 2 - gap;
      worst = Math.max(worst, gap);
    }
    // A re-entry flies at a large angle of attack by design; anything less than
    // 20 degrees would mean the two marks are effectively the same mark.
    expect((worst * 180) / Math.PI).toBeGreaterThan(20);
  });
});
