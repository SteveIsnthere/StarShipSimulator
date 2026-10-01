/**
 * M7.6: the cloud deck.
 *
 * Three claims, which are the acceptance line's three words — deterministic
 * across runs, allocation unchanged, correct above and below:
 *
 *   DETERMINISTIC. The deck must be the same deck every run, or the committed
 *   screenshots are irreproducible and two players comparing notes are not
 *   looking at the same sky. `view/` is allowed to call Math.random; this
 *   deliberately does not.
 *
 *   CORRECT ABOVE AND BELOW. The deck is at a real altitude, so there are two
 *   regimes and a moment of flying through it. The ordering that must never
 *   break is clouds above ground: a deck drawn below M7.4's horizon would be a
 *   bug nobody needs a test to notice, which is exactly the kind that survives.
 *
 *   ALLOCATION UNCHANGED. Eighteen puffs built once and transformed after.
 */
import { describe, expect, it } from 'vitest';
import {
  CLOUD_ALTITUDE,
  CLOUD_FADE_ALTITUDE,
  CLOUD_PARALLAX,
  CLOUD_PUFFS,
  cloudLineFraction,
  cloudOpacity,
  createCloudDeck,
  DECK_DOWN_FOLLOW,
  DECK_UP_FOLLOW,
  puffRandom,
  CLOUD_DECK_DEPTH_RATIO,
  PUFF_SPACING,
} from '$view/clouds';
import { compressedScrollSpeed, groundLineFraction } from '$view/distant-earth';
import { computeViewport } from '$view/camera';
import { vehicleHeight } from '$core/constants';

const viewportAt = (altitude: number) => computeViewport(1280, 800, vehicleHeight, 1, altitude);
const heightAt = (altitude: number) => viewportAt(altitude).physicalHeight;

describe('deterministic across runs', () => {
  it('two decks built independently are identical', () => {
    // The acceptance line's first word. Built twice, in the same process, with
    // nothing shared: if either reached for Math.random this fails.
    const a = createCloudDeck();
    const b = createCloudDeck();
    const shape = (deck: ReturnType<typeof createCloudDeck>) =>
      deck.container.children.map((c) => `${c.x},${c.y},${c.scale.x},${c.scale.y}`).join('|');

    const viewport = viewportAt(1_000);
    a.update(viewport, 1_000, 100, 1 / 60);
    b.update(viewport, 1_000, 100, 1 / 60);
    expect(shape(a)).toBe(shape(b));
  });

  it('the same deck replays identically from the same inputs', () => {
    const a = createCloudDeck();
    const b = createCloudDeck();
    const viewport = viewportAt(500);
    for (let i = 0; i < 200; i++) {
      a.update(viewport, 500 + i, 300, 1 / 60);
      b.update(viewport, 500 + i, 300, 1 / 60);
    }
    expect(a.scrollOffset).toBe(b.scrollOffset);
  });

  it('the puff hash is stable, spread and in range', () => {
    // Not a general-purpose RNG and it does not need to be — what it needs is
    // to give the same answer forever and not to clump.
    expect(puffRandom(0, 1)).toBe(puffRandom(0, 1));
    expect(puffRandom(3, 1)).not.toBe(puffRandom(3, 2));
    let low = 0;
    for (let i = 0; i < 200; i++) {
      const v = puffRandom(i, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      if (v < 0.5) low += 1;
    }
    // Roughly half below the midpoint. A hash that returned 0.5 every time
    // would pass every other assertion here.
    expect(low).toBeGreaterThan(60);
    expect(low).toBeLessThan(140);
  });
});

describe('correct above and below', () => {
  it('is above the vehicle below the deck, and below it above the deck', () => {
    // The sign of the thing, which is the claim everything else rests on.
    expect(cloudLineFraction(0, 200)).toBeLessThan(0.5);
    expect(cloudLineFraction(CLOUD_ALTITUDE, 200)).toBeCloseTo(0.5, 9);
    expect(cloudLineFraction(CLOUD_ALTITUDE + 10_000, 1_000)).toBeGreaterThan(0.5);
  });

  it('NEVER draws cloud below the ground', () => {
    /*
      The one ordering that must hold at every altitude, checked against M7.4's
      own curve rather than against a number copied out of it — so that moving
      the horizon later cannot silently put the sky underneath it.
    */
    for (let altitude = 0; altitude < 60_000; altitude += 97) {
      const height = heightAt(altitude);
      const cloud = cloudLineFraction(altitude, height);
      const ground = groundLineFraction(altitude, height);
      expect(cloud, `${altitude} m: cloud ${cloud} vs ground ${ground}`).toBeLessThan(ground);
    }
  });

  it('crosses the frame at TRUE scale where the vehicle flies through it', () => {
    /*
      The moment this layer exists to sell. Within the follow band the curve is
      the identity, so passing through the deck is uncompressed: the deck moves
      down the screen at exactly the rate the vehicle climbs.
    */
    const height = 200;
    const near = CLOUD_ALTITUDE - DECK_UP_FOLLOW * height * 0.5;
    const at = (a: number) => cloudLineFraction(a, height);
    const slope = (at(near + 0.5) - at(near - 0.5)) / 1;
    expect(slope).toBeCloseTo(1 / height, 9);
  });

  it('is continuous and monotonic through the crossing', () => {
    let previous = -Infinity;
    let worstStep = 0;
    for (let altitude = 0; altitude < 60_000; altitude += 1) {
      const value = cloudLineFraction(altitude, heightAt(altitude));
      expect(value, `${altitude} m`).toBeGreaterThanOrEqual(previous - 1e-12);
      if (previous > -Infinity) worstStep = Math.max(worstStep, Math.abs(value - previous));
      previous = value;
    }
    // Per metre. The true-scale rate on the tightest viewport is 1/200; nothing
    // may exceed it, which is what rules out a jump at either join.
    expect(worstStep, `worst ${worstStep.toExponential(2)} per metre`).toBeLessThanOrEqual(1 / 200);
  });

  it('is bounded on screen at every altitude the scenarios reach', () => {
    for (const altitude of [0, 500, CLOUD_ALTITUDE, 20_000, 80_000, 200_000]) {
      const value = cloudLineFraction(altitude, heightAt(altitude));
      expect(value, `${altitude} m`).toBeGreaterThan(0);
      expect(value, `${altitude} m`).toBeLessThan(1);
    }
  });

  it('has both bends C1, so neither join has a seam', () => {
    /*
      C1 means the two ONE-SIDED slopes agree at the join, so that is what is
      compared — not each of them against a constant.

      The difference matters here because the downward span is only 4 m of
      altitude on this viewport: any finite probe offset has already begun to
      decay, and a test that demanded the exact identity slope a metre past the
      join would be demanding the compression not happen. The claim is that
      there is no STEP.
    */
    const height = 200;
    const at = (a: number) => cloudLineFraction(a, height);
    const slope = (a: number) => (at(a + 0.005) - at(a - 0.005)) / 0.01;

    for (const [name, join] of [
      ['up', CLOUD_ALTITUDE - DECK_UP_FOLLOW * height],
      ['down', CLOUD_ALTITUDE + DECK_DOWN_FOLLOW * height],
    ] as const) {
      const before = slope(join - 0.02);
      const after = slope(join + 0.02);
      /*
        Symmetric, because the two joins bend in opposite directions in
        ALTITUDE. `distance` shrinks as the vehicle climbs, so the compressed
        side of the UP join is below it and the slope rises back to the identity
        as you pass through; at the DOWN join it falls away. The claim that
        covers both is simply that there is no step.
      */
      expect(Math.abs(after / before - 1), `${name} join: ${before} -> ${after}`).toBeLessThan(0.01);
    }
  });

  it('thins out above the weather rather than hanging around at 25 km', () => {
    expect(cloudOpacity(0)).toBe(1);
    expect(cloudOpacity(CLOUD_ALTITUDE)).toBe(1);
    expect(cloudOpacity(CLOUD_FADE_ALTITUDE)).toBe(0);
    expect(cloudOpacity(200_000)).toBe(0);
    expect(cloudOpacity(NaN)).toBe(0);
    // Monotonic down, with no threshold to pop at.
    let previous = 1;
    for (let a = CLOUD_ALTITUDE; a <= CLOUD_FADE_ALTITUDE; a += 31) {
      const value = cloudOpacity(a);
      expect(value).toBeLessThanOrEqual(previous + 1e-12);
      previous = value;
    }
  });

  it('survives nonsense', () => {
    expect(cloudLineFraction(NaN, 200)).toBe(0.5);
    expect(cloudLineFraction(100, 0)).toBe(0.5);
    expect(cloudLineFraction(100, NaN)).toBe(0.5);
  });
});

describe('it is a different distance, not a second copy of the far layer', () => {
  it('moves faster than the distant earth by the parallax factor', () => {
    /*
      THE WHOLE POINT. Depth is the relationship between rates; a middle
      distance moving at the same rate as the far one is not a middle distance.
      Asserted as a ratio rather than as two numbers, so retuning either
      compression cannot quietly collapse them onto each other.
    */
    for (const truePx of [50, 400, 3_000, 26_280]) {
      const far = compressedScrollSpeed(truePx);
      const near = far * CLOUD_PARALLAX;
      expect(Math.abs(near), `${truePx} px/s`).toBeGreaterThan(Math.abs(far));
      expect(near / far).toBeCloseTo(CLOUD_PARALLAX, 9);
    }
    // And still far below true scale, or the § 1.3 problem is back.
    expect(compressedScrollSpeed(26_280) * CLOUD_PARALLAX).toBeLessThan(26_280 / 10);
  });
});

describe('allocation', () => {
  it('builds its puffs once and transforms them thereafter', () => {
    const deck = createCloudDeck();
    const children = deck.container.children.length;
    expect(children).toBe(CLOUD_PUFFS);

    // Sweep the whole altitude range, both directions, at speed.
    for (let i = 0; i < 5_000; i++) {
      const altitude = Math.abs(2_500 - (i % 5_000)) * 12;
      deck.update(viewportAt(altitude), altitude, 400, 1 / 60);
      expect(deck.container.children.length).toBe(children);
    }
  });

  it('keeps its scroll offset bounded over a long flight', () => {
    // Wrapped rather than accumulated: an offset that grew for ten minutes at
    // 1500 px/s would lose precision and the deck would start to judder.
    const deck = createCloudDeck();
    const viewport = viewportAt(1_000);
    for (let i = 0; i < 40_000; i++) deck.update(viewport, 1_000, 3_000, 1 / 60);
    expect(Number.isFinite(deck.scrollOffset)).toBe(true);
    expect(Math.abs(deck.scrollOffset)).toBeLessThan(1_000);
  });
});

/* ── M9.7: two sub-decks, and a deck that is not one flat value ─────────── */

describe('the deck has thickness (M9.7)', () => {
  it('is two sub-decks at different parallax, not one', () => {
    /*
      THE SAME ARGUMENT AS `CLOUD_PARALLAX`, one level down. That constant
      exists because a middle distance moving at the far layer's rate would not
      be a middle distance; this one exists because a deck whose every puff moves
      at one rate is a cutout, however many puffs it has.
    */
    expect(CLOUD_DECK_DEPTH_RATIO).toBeGreaterThan(0.5);
    expect(CLOUD_DECK_DEPTH_RATIO).toBeLessThan(1);

    /*
      ONE step, from a fresh deck, small enough that neither offset has wrapped.
      Both wrap at PUFF_SPACING, so a test that ran for thirty frames would be
      measuring the modulo rather than the rate — which is exactly what the first
      version of this test did, and it reported the two decks as 0.6% apart.
    */
    const deck = createCloudDeck();
    deck.update(viewportAt(1_000), 1_000, 60, 1 / 60);
    const nearTravel = PUFF_SPACING - deck.scrollOffset;
    const farTravel = PUFF_SPACING - deck.farScrollOffset;
    const report = `near travelled ${nearTravel.toFixed(2)} px, far ${farTravel.toFixed(2)}`;
    expect(nearTravel, report).toBeGreaterThan(0);
    expect(farTravel, report).toBeLessThan(nearTravel);
    expect(farTravel / nearTravel, report).toBeCloseTo(CLOUD_DECK_DEPTH_RATIO, 6);
  });

  it('gives every puff its own opacity and its own shape', () => {
    /*
      THE FLATNESS THIS TASK EXISTS TO FIX, as a property of the scene graph.
      Every puff used to be drawn at `opacity * 0.5` and at exactly 2:1, so the
      deck had one tone and one silhouette. Both come from `puffRandom` now — the
      hash that already decides position and size, so there is no new source of
      randomness and the deck is still the same deck on every reload.
    */
    const deck = createCloudDeck();
    deck.update(viewportAt(1_000), 1_000, 100, 1 / 60);
    const alphas = deck.container.children.map((c) => c.alpha);
    const shapes = deck.container.children.map((c) => c.scale.y / c.scale.x);

    expect(new Set(alphas.map((a) => a.toFixed(4))).size).toBeGreaterThan(CLOUD_PUFFS / 2);
    expect(new Set(shapes.map((a) => a.toFixed(4))).size).toBeGreaterThan(CLOUD_PUFFS / 2);
    // Varied, and still within a band that reads as one deck rather than as a
    // scattering of unrelated blobs.
    expect(Math.min(...alphas)).toBeGreaterThan(0.15);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(1);
    expect(Math.min(...shapes)).toBeGreaterThan(0.3);
    expect(Math.max(...shapes)).toBeLessThan(1);
  });

  it('and is still the same deck on every reload', () => {
    // The M7.6 guarantee, re-checked against the two things M9.7 added: the
    // per-puff alpha and aspect must come from the hash, not from a generator.
    const a = createCloudDeck();
    const b = createCloudDeck();
    const viewport = viewportAt(4_000);
    a.update(viewport, 4_000, 250, 1 / 60);
    b.update(viewport, 4_000, 250, 1 / 60);
    const fingerprint = (deck: ReturnType<typeof createCloudDeck>) =>
      deck.container.children
        .map((c) => `${c.x},${c.y},${c.scale.x},${c.scale.y},${c.alpha}`)
        .join('|');
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('keeps the far half behind the near half', () => {
    // Draw order is child order, and the far sub-deck is the first half for
    // exactly that reason. Asserted rather than left to the loop's shape.
    const deck = createCloudDeck();
    deck.update(viewportAt(1_000), 1_000, 100, 1 / 60);
    const half = CLOUD_PUFFS / 2;
    const widths = deck.container.children.map((c) => c.scale.x);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // The far half is drawn smaller, which is the only property visible from
    // here — and it is enough to say which half is which.
    expect(mean(widths.slice(0, half))).toBeLessThan(mean(widths.slice(half)));
  });
});
