/**
 * Wall-clock budgets. Not part of the gate: timings on a shared or busy machine
 * are not evidence, and they turned the gate red under load. Run them on an idle
 * machine with `npm run bench`. Work-count checks stay in perf.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { createInitialState } from '$core/state';
import { step } from '$core/step';
import { createScenarioState, getScenario } from '$core/scenarios';
import { advance, createLoopState, DT } from '$app/loop';
import { createParticleSystem } from '$view/particles';
import { PARTICLE_TEXTURES, writeParticleTexture } from '$view/particles';
import {
  HAZE_RAMP_HEIGHT,
  MOTTLE_TILE,
  RAMP_HEIGHT,
  writeGroundRamp,
  writeHazeRamp,
  writeLimbRamp,
  writeMottleTile,
} from '$view/terrain';
import * as cmd from '$core/control/commands';

/** Median of repeated timings — mean is hostage to a single GC pause. */
function medianMs(runs: number, body: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    body();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

/**
 * The median RATIO of two bodies, timed in interleaved pairs.
 *
 * Not the ratio of two medians, which is what this replaced and which flakes.
 * `medianMs(5, a)` followed by `medianMs(5, b)` measures the two in separate
 * blocks of wall time, so a load spike that lands in the second block and not
 * the first inflates the ratio with no change in either body — on a four-core
 * container that is about one run in three, and it failed at 39.2 against a cap
 * of 32 while the same code passes comfortably when the machine is quiet.
 *
 * Pairing them puts both bodies inside the same spike, where it divides out.
 * The median is then taken over the per-pair ratios rather than over the times,
 * so a single bad pair cannot move the answer at all.
 */
function medianRatio(runs: number, numerator: () => void, denominator: () => void): number {
  const ratios: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    denominator();
    const t1 = performance.now();
    numerator();
    const t2 = performance.now();
    const below = t1 - t0;
    // A zero-length denominator would divide by zero on a coarse clock; the
    // smallest positive interval the timer can report stands in for it.
    ratios.push((t2 - t1) / Math.max(below, Number.EPSILON));
  }
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)]!;
}

describe('simulation step budget', () => {
  it('a step costs well under 1 ms, the 240 Hz budget', () => {
    // Measured over 1000 steps and divided, so one slow step does not dominate.
    let s = createScenarioState(getScenario('before-flip')!);
    cmd.toggleAutoLand(s);
    // Warm up, so this measures steady state rather than first-call compilation.
    for (let i = 0; i < 2_000; i++) s = step(s, DT);

    const perThousand = medianMs(7, () => {
      for (let i = 0; i < 1_000; i++) s = step(s, DT);
    });
    const perStep = perThousand / 1_000;

    // The budget is 1 ms. Reported so a regression shows its actual size.
    expect(perStep, `step cost ${perStep.toFixed(4)} ms`).toBeLessThan(1);
  });

  it('240 Hz of simulation fits in well under a second of wall clock', () => {
    // The budget restated as the thing it protects: real-time at 240 Hz.
    let s = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 1_000; i++) s = step(s, 1 / 240);

    const cost = medianMs(5, () => {
      for (let i = 0; i < 240; i++) s = step(s, 1 / 240);
    });
    expect(cost, `one simulated second cost ${cost.toFixed(2)} ms`).toBeLessThan(100);
  });

  it('the autopilot does not dominate the step', () => {
    // Worth knowing separately: if the autopilot were the expensive part, time
    // warp would be far more costly with it armed than without.
    let plain = createInitialState();
    plain.kinematics.altitude = 5_000;
    let flying = createScenarioState(getScenario('before-flip')!);
    cmd.toggleAutoLand(flying);
    for (let i = 0; i < 1_000; i++) {
      plain = step(plain, DT);
      flying = step(flying, DT);
    }

    const plainCost = medianMs(5, () => {
      for (let i = 0; i < 1_000; i++) plain = step(plain, DT);
    });
    const flyingCost = medianMs(5, () => {
      for (let i = 0; i < 1_000; i++) flying = step(flying, DT);
    });

    expect(flyingCost / plainCost).toBeLessThan(4);
  });
});

describe('time warp stays affordable', () => {
  it('warp 16 costs about sixteen steps, not more', () => {
    // Warp is N steps per frame by construction, so the cost must be linear.
    // A superlinear result would mean something per-frame is being redone.
    const build = () => {
      const s = createScenarioState(getScenario('booster-sep')!);
      cmd.toggleBoostBack(s);
      return createLoopState(s);
    };
    const one = build();
    const sixteen = build();
    for (let i = 0; i < 200; i++) {
      advance(one, DT);
      advance(sixteen, DT, { timeWarp: 16 });
    }

    const ratio = medianRatio(
      7,
      () => {
        for (let i = 0; i < 200; i++) advance(sixteen, DT, { timeWarp: 16 });
      },
      () => {
        for (let i = 0; i < 200; i++) advance(one, DT);
      },
    );

    expect(sixteen.totalSteps / one.totalSteps).toBeCloseTo(16, 0);
    // Allow generous headroom for measurement noise; the point is that it is
    // not quadratic. The cap has not moved — see `medianRatio` for why the
    // measurement under it did.
    expect(ratio, `${ratio.toFixed(1)}x for 16x the steps`).toBeLessThan(32);
  });
});

describe('M9 emitters and textures, timed', () => {
  it('costs a measurable and small fraction of the frame, banded or not', () => {
    /*
      THE NUMBER M9.9 EXISTS TO REPORT. The banding is a hypot and a cosine per
      live particle per frame, and the honest way to know what that costs is to
      run the same pool both ways and subtract — not to reason about it.

      Reported rather than tightly bounded: this runs on whatever CI machine is
      free, and a per-frame budget asserted to the microsecond on shared hardware
      is a flake with a plan. The bound is the HUD's 2 ms, which the whole
      particle system has to fit inside several times over.
    */
    const run = (banded: boolean): number => {
      const particles = createParticleSystem(Texture.EMPTY, 4_000, 1_234_567);
      // Fill the pool to something like a real peak before timing anything.
      for (let i = 0; i < 400; i++) {
        particles.emit('raptorPlumeCore', 0, 0, 0, 1, DT, 1, 1, banded ? 40 : 0, banded ? 0.55 : 0);
        particles.update(DT);
      }
      const started = performance.now();
      for (let frame = 0; frame < 2_000; frame++) {
        particles.emit('raptorPlumeCore', 0, 0, 0, 1, DT, 1, 1, banded ? 40 : 0, banded ? 0.55 : 0);
        particles.update(DT);
      }
      return (performance.now() - started) / 2_000;
    };

    const plain = run(false);
    const banded = run(true);
    const report =
      `particle update: ${(plain * 1000).toFixed(1)} us/frame plain, ` +
      `${(banded * 1000).toFixed(1)} us banded — the shock train costs ` +
      `${((banded - plain) * 1000).toFixed(1)} us`;
    console.log(report);

    expect(banded, report).toBeLessThan(2);
    expect(plain, report).toBeLessThan(2);
  });

  it('generating every texture M9 added is a mount cost, not a frame cost', () => {
    /*
      Every generated texture rather than fetched — which is what keeps the
      asset budget byte-identical. The trade is CPU at mount, and "off the
      critical path" is a claim worth measuring rather than asserting: a second
      of noise generation before the first frame would be a worse bargain than
      shipping the art.

      Measured through the pure writers, because the canvas half needs a DOM and
      the arithmetic is all of the cost.

      THE SET WAS INCOMPLETE UNTIL M9.14. It read "all six M9 textures" and
      measured four particle frames, the mottle and the ground ramp — the haze
      wash added at M9.10 and the limb added at M9.13 were generated at mount
      like the rest and simply not counted. Both are 1x64 ramps and neither
      changes the total meaningfully, which is exactly why it went unnoticed;
      the point of listing them is that a budget with an unlisted exception is
      not a budget.
    */
    const started = performance.now();
    const cell = new Uint8ClampedArray(64 * 64 * 4);
    for (const name of PARTICLE_TEXTURES) writeParticleTexture(name, 64, cell);
    const tile = new Uint8ClampedArray(MOTTLE_TILE * MOTTLE_TILE * 4);
    writeMottleTile(MOTTLE_TILE, tile);
    const ramp = new Uint8ClampedArray(RAMP_HEIGHT * 4);
    writeGroundRamp(RAMP_HEIGHT, ramp);
    const haze = new Uint8ClampedArray(HAZE_RAMP_HEIGHT * 4);
    writeHazeRamp(HAZE_RAMP_HEIGHT, haze);
    const limb = new Uint8ClampedArray(HAZE_RAMP_HEIGHT * 4);
    writeLimbRamp(HAZE_RAMP_HEIGHT, limb);
    const elapsed = performance.now() - started;

    console.log(
      `generating all eight generated textures: ${elapsed.toFixed(1)} ms, once, at mount`,
    );
    /*
      A frame is 16.7 ms. Generating everything must cost less than a handful of
      them, or the page has a visible hitch where it used to have a download.

      THIS CAP HELD AND THEN DID NOT. M9.10 took the mottle from a 128 px tile
      with three octaves to 256 px with four — sixteen times the sampling — and
      the measurement here went from a comfortable margin to 268 ms under load
      on a four-core container, failing about one run in four. The cap did not
      move. `latticeTable` did: a lattice has at most `lattice ** 2` distinct
      values and every one of them was being re-hashed hundreds of times, so
      hashing each once takes the mottle from 33 ms to 18.9 and the whole set
      well back under. Same bits out, asserted by the tileable and determinism
      tests either side of this one.
    */
    expect(elapsed, `${elapsed.toFixed(1)} ms`).toBeLessThan(120);
  });
});
