/**
 * M7.4: the distant earth's two compression curves.
 *
 * Both are cheats, and both say so in their own comments — the plan's honesty
 * rule (§ 5) applies to the code, not to a document nobody opens next to it.
 * What can still be demanded of a cheat is that it be a WELL-BEHAVED one:
 *
 *   MONOTONIC. A ground line that came back up as the vehicle climbed, or a
 *   scroll that slowed as it went faster, would be worse than no cue at all —
 *   it would be a cue pointing the wrong way.
 *
 *   CONTINUOUS, in position and in rate. Both curves are identity below a knee
 *   and compressed above it, and both joins are C1 by construction rather than
 *   by tuning: the derivative of `A(1 - e^(-x/A))` and of `K ln(1 + x/K)` is
 *   exactly 1 at zero. A seam here reads as the world snagging.
 *
 *   NO DISCONTINUITY AT THE HANDOVER. The acceptance line's own words. The
 *   ground line follows the TRUE projection exactly until 80% of the way down
 *   the screen, so while the real ground is on screen the two are the same line
 *   and this layer is hidden behind it.
 *
 * Tested at the altitudes and speeds the seven scenarios actually visit, which
 * is the difference between a curve that works and one that works on paper.
 */
import { describe, expect, it } from 'vitest';
import {
  compressedScrollSpeed,
  COMPRESSED_SPAN,
  distantEarthVisible,
  FOLLOW_RATIO,
  groundLineFraction,
  SCROLL_KNEE,
} from '$view/distant-earth';
import { altitudeFov, computeViewport } from '$view/camera';
import { vehicleHeight } from '$core/constants';
import { step } from '$core/step';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';

/** The world height the viewport covers at a given altitude, after M7.3. */
const heightAt = (altitude: number) =>
  computeViewport(1280, 800, vehicleHeight, 1, altitude).physicalHeight;

describe('the ground line', () => {
  it('IS the true projection while the real ground is on screen', () => {
    // The seam test. Below the follow ratio these must be equal, not close:
    // the two layers are drawing the same line and any difference at all would
    // show as the distant one poking out above the near one.
    for (const ratio of [0, FOLLOW_RATIO * 0.25, FOLLOW_RATIO * 0.9, FOLLOW_RATIO]) {
      const height = 200;
      const altitude = ratio * height;
      expect(groundLineFraction(altitude, height), `ratio ${ratio}`).toBeCloseTo(0.5 + ratio, 12);
    }
  });

  it('is continuous in rate across the join, not just in position', () => {
    const height = 200;
    const at = (ratio: number) => groundLineFraction(ratio * height, height);
    const slope = (ratio: number) => (at(ratio + 1e-6) - at(ratio - 1e-6)) / 2e-6;
    // 1 on the way in, and still 1 immediately after: the exponential's length
    // scale is the span it has left, which is what makes this true by
    // construction rather than by choosing numbers until it looked right.
    expect(slope(FOLLOW_RATIO - 1e-5)).toBeCloseTo(1, 4);
    // Just past the join the slope has begun to decay — by exp(-x/A), so it is
    // still 0.9999 a hundred-thousandth of a frame in. That decay IS the
    // compression; what matters is that it starts from 1 rather than from a
    // step.
    expect(slope(FOLLOW_RATIO + 1e-5)).toBeCloseTo(1, 3);
  });

  it('keeps the band above the overlay at every altitude, and never leaves it', () => {
    const asymptote = 0.5 + FOLLOW_RATIO + COMPRESSED_SPAN;
    for (const altitude of [200, 1_000, 20_000, 100_000, 200_000]) {
      const fraction = groundLineFraction(altitude, heightAt(altitude));
      // At or below the asymptote — high altitude saturates it exactly, in
      // floating point, because exp(-42) is zero to a double.
      expect(fraction, `${altitude} m`).toBeLessThanOrEqual(asymptote);
      // Below the centre line and above the overlay: the earth owns the band
      // between the horizon and the scrim, which is the point of the number.
      expect(fraction, `${altitude} m`).toBeGreaterThan(0.5);
      expect(fraction, `${altitude} m`).toBeLessThan(0.6);
    }
  });

  it('is monotonic — the ground never rises as the vehicle climbs', () => {
    let previous = 0;
    for (let altitude = 0; altitude < 250_000; altitude += 251) {
      const fraction = groundLineFraction(altitude, heightAt(altitude));
      expect(fraction, `${altitude} m`).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = fraction;
    }
  });

  it('survives nonsense without producing one', () => {
    expect(groundLineFraction(NaN, 200)).toBe(0.5);
    expect(groundLineFraction(100, 0)).toBe(0.5);
    expect(groundLineFraction(100, NaN)).toBe(0.5);
    expect(groundLineFraction(-500, 200)).toBe(0.5);
    expect(Number.isFinite(groundLineFraction(Infinity, 200))).toBe(true);
  });

  it('is off while the real ground covers it, and on once it starts to leave', () => {
    expect(distantEarthVisible(10, 200)).toBe(false);
    expect(distantEarthVisible(100, 200)).toBe(true);
    expect(distantEarthVisible(50_000, 1_000)).toBe(true);
    expect(distantEarthVisible(NaN, 200)).toBe(false);
  });
});

describe('the scroll rate', () => {
  it('is EXACTLY true scale where true scale is readable', () => {
    // A landing must look like a landing. Below the knee this is the identity,
    // so nothing about slow flight is a cheat at all.
    for (const px of [0, 10, 120, SCROLL_KNEE]) {
      expect(compressedScrollSpeed(px), `${px} px/s`).toBe(px);
    }
  });

  it('folds the unreadable range into something a viewer can follow', () => {
    // § 1.3: at 7300 m/s a ground object crosses a 1280 px screen in 49 ms.
    // 3.6 px/m is the measured scale, so 26,280 px/s is the true rate.
    const folded = compressedScrollSpeed(26_280);
    expect(folded).toBeGreaterThan(SCROLL_KNEE);
    expect(folded).toBeLessThan(700);
    // Reported, because the size of the cheat is the thing worth knowing:
    // a factor of about forty.
    expect(26_280 / folded).toBeGreaterThan(30);
  });

  it('is continuous in rate at the knee', () => {
    const slope = (v: number) => (compressedScrollSpeed(v + 1e-4) - compressedScrollSpeed(v - 1e-4)) / 2e-4;
    expect(slope(SCROLL_KNEE - 1)).toBeCloseTo(1, 6);
    expect(slope(SCROLL_KNEE + 1)).toBeCloseTo(1, 1);
  });

  it('is monotonic and odd — faster is always faster, and direction survives', () => {
    let previous = -Infinity;
    for (let v = 0; v < 40_000; v += 37) {
      const s = compressedScrollSpeed(v);
      expect(s, `${v}`).toBeGreaterThanOrEqual(previous);
      previous = s;
      expect(compressedScrollSpeed(-v)).toBeCloseTo(-s, 9);
    }
  });

  it('survives nonsense', () => {
    // Both non-finite inputs return a standing layer rather than a NaN
    // transform, which would blank the whole scene in Pixi.
    expect(compressedScrollSpeed(NaN)).toBe(0);
    expect(compressedScrollSpeed(Infinity)).toBe(0);
    expect(compressedScrollSpeed(-Infinity)).toBe(0);
  });
});

describe('at the altitudes and speeds the seven scenarios actually visit', () => {
  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s stays readable', (id, spec) => {
    /*
      The claim that matters: over a real flight the ground line is always on
      screen and the scroll rate is always inside the band a viewer can follow.
      Curves that behave on a sweep of round numbers and not on the trajectories
      the game actually flies would be curves nobody checked.
    */
    let s: SimState = spec.build();
    let lowest = 1;
    let fastest = 0;
    let highestAltitude = 0;

    for (let i = 0; i < spec.steps; i++) {
      s = step(s, GOLDEN_DT);
      if (i % 120 !== 0) continue;
      const altitude = s.kinematics.altitude;
      const viewport = computeViewport(1280, 800, vehicleHeight, 1, altitude);
      const fraction = groundLineFraction(altitude, viewport.physicalHeight);
      const scroll = Math.abs(compressedScrollSpeed(s.kinematics.speedX * viewport.scale));

      expect(Number.isFinite(fraction), `${id} at ${altitude.toFixed(0)} m`).toBe(true);
      expect(fraction, `${id} at ${altitude.toFixed(0)} m`).toBeGreaterThan(0.5);
      expect(fraction, `${id} at ${altitude.toFixed(0)} m`).toBeLessThan(1);
      lowest = Math.min(lowest, fraction);
      fastest = Math.max(fastest, scroll);
      highestAltitude = Math.max(highestAltitude, altitude);
    }

    // Nothing in any scenario asks the layer to scroll faster than the readable
    // band allows. The unfolded rate at re-entry would be 26,280 px/s.
    expect(
      fastest,
      `${id}: peak ${fastest.toFixed(0)} px/s, up to ${(highestAltitude / 1000).toFixed(0)} km`,
    ).toBeLessThan(700);
    expect(lowest).toBeGreaterThan(0.5);
  });
});

describe('the field of view and the ground line agree', () => {
  it('the ground stays put as the camera opens up around it', () => {
    /*
      M7.3 made the viewport grow with altitude, which means the RATIO this
      curve works in changes for two reasons at once. Worth checking they do not
      fight: as the view opens, the ground line must not jump.

      This is the one interaction between the two milestones' curves, and it is
      exactly the kind of thing that works in each file's own test and fails
      when they meet.
    */
    let previous = groundLineFraction(0, heightAt(0));
    let worst = 0;
    let worstAt = 0;
    for (let altitude = 0; altitude <= 60_000; altitude += 1) {
      const fraction = groundLineFraction(altitude, heightAt(altitude));
      const jump = Math.abs(fraction - previous);
      if (jump > worst) {
        worst = jump;
        worstAt = altitude;
      }
      previous = fraction;
    }
    /*
      Per METRE of climb, and the bound is what the curve is entitled to.

      Low down it follows the true projection exactly, which moves the line by
      `1 / physicalHeight` per metre — 1/200 on this viewport, so 0.005 is the
      honest floor and anything at that value is the curve doing its job. What
      this rules out is a JUMP: the field of view opening underneath the ratio
      while the ratio is also changing, and the two combining into a step.
      Measured worst case is exactly the true-projection rate.
    */
    expect(worst, `worst step ${worst.toExponential(2)} at ${worstAt} m`).toBeLessThan(0.006);
    // And the field of view really was moving underneath it, or this proves
    // nothing at all.
    expect(altitudeFov(60_000)).toBeGreaterThan(altitudeFov(0));
  });
});
