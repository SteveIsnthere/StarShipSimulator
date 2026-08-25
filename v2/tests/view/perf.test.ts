/**
 * M3.7: the performance audit.
 *
 * CLAUDE.md sets three budgets: sim step under 1 ms at 240 Hz, HUD update under
 * 2 ms, and zero allocation in the per-frame path. The HUD does not exist until
 * M4.1; the other two are measured here, and the sim budget runs in CI.
 *
 * A note on measuring allocation in JavaScript. There is no portable way to ask
 * "did this allocate". What CAN be measured is the observable consequence:
 * whether a long run's heap grows without bound, and whether object counts that
 * should be fixed stay fixed. Both are checked below, and the second is the one
 * that would actually have caught the 2021 leak.
 */
import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { createInitialState } from '$core/state';
import { step } from '$core/step';
import { createScenarioState, getScenario } from '$core/scenarios';
import { advance, createLoopState, DT } from '$app/loop';
import { createParticleSystem } from '$view/particles';
import { createEffectDriver } from '$view/effects';
import {
  createCamera,
  writeViewport,
  type MutableViewport,
} from '$view/camera';
import { vehicleHeight } from '$core/constants';
import { GOLDEN_SPECS } from '../golden/scenarios';
import {
  horizonSagittaFraction,
  plumeScaleFactor,
  plumeSpreadFactor,
  SEA_LEVEL_PRESSURE,
} from '$view/atmosphere-look';
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

describe('the per-frame path does not grow', () => {
  it('the particle pool is fixed for the life of the system', () => {
    // The check that would have caught the 2021 leak, stated as an invariant
    // rather than as a benchmark.
    const particles = createParticleSystem(Texture.EMPTY, 1_000, 4242);
    const children = particles.container.children.length;

    for (let frame = 0; frame < 20_000; frame++) {
      particles.emit('raptorPlume', 0, 0, 0, 1, DT, 1);
      if (frame % 100 === 0) particles.burst('raptorShutdown', 0, 0, 30, 1);
      if (frame % 5_000 === 0) particles.burst('explosion', 0, 0, 600, 1);
      particles.update(DT);
      expect(particles.container.children.length).toBe(children);
    }
  });

  it('the M6.7 effects do not grow it either', () => {
    /*
      The same invariant, run over what M6.7 added: a plume whose spread and
      size vary per frame, and a plasma trail. Both are new CALL SHAPES rather
      than new machinery — `emit` gained a numeric parameter — but a pooled
      system is exactly the kind of thing where a new caller quietly allocates,
      and the 2021 leak was a renderer effect fired from a new call site.

      The spread factor is varied every frame here, because a constant would
      test the one case least likely to be wrong.
    */
    const particles = createParticleSystem(Texture.EMPTY, 1_000, 20_250_825);
    const children = particles.container.children.length;

    for (let frame = 0; frame < 20_000; frame++) {
      // Sweep sea level to vacuum and back, so every spread the model can
      // produce is exercised rather than just the endpoints.
      const pressure = SEA_LEVEL_PRESSURE * (0.5 + 0.5 * Math.sin(frame * 0.01));
      particles.emit(
        'raptorPlume',
        0,
        0,
        0,
        1,
        DT,
        plumeScaleFactor(pressure),
        plumeSpreadFactor(pressure),
      );
      particles.emit('plasmaTrail', 0, 0, Math.PI, 0.8, DT, 1);
      particles.update(DT);
      expect(particles.container.children.length).toBe(children);
    }

    // And the pool held: nothing escaped it, and nothing was starved into
    // emitting zero particles for the whole run either.
    expect(particles.alive).toBeGreaterThan(0);
    expect(particles.alive).toBeLessThanOrEqual(particles.capacity);
  });

  it('the world redraws its horizon only when the curvature actually moves', () => {
    /*
      M6.7 made the ground a curve, and a curve has to be rebuilt when it
      changes where a rectangle only had to be rebuilt on resize. Left
      unquantised that would be a `Graphics` rebuild on every frame of a climb —
      the geometry moves by a fraction of a pixel per frame, so it would rebuild
      constantly and look identical every time.

      Quantising the sagitta to whole pixels is what prevents that, and this is
      the number that says so. `horizonSagittaFraction` is the whole input, so
      counting pixel-boundary crossings measures exactly what the render loop
      will do.

      Asserted as a FRACTION of samples rather than as a count. The first
      version guessed "under 40" and measured 63, which is a fine result and a
      bad assertion — the count depends on the step, the viewport and the
      altitude range, none of which the claim is about. The claim is that the
      rebuild is rare: about 2% of samples over a 30 km climb at 1280px, where
      an unquantised version would be 100%.
    */
    const VIEWPORT = 1280;
    let redraws = 0;
    let samples = 0;
    let last = -1;
    for (let h = 0; h <= 30_000; h += 10) {
      samples += 1;
      const sagitta = Math.round(horizonSagittaFraction(h) * VIEWPORT);
      if (sagitta !== last) {
        redraws += 1;
        last = sagitta;
      }
    }
    const fraction = redraws / samples;
    expect(fraction, `${redraws} rebuilds in ${samples} samples`).toBeLessThan(0.05);
  });

  it('a long flight does not grow the heap without bound', () => {
    // Heap measurement is only available under --expose-gc, and is noisy even
    // then. What is portable is that the state's SHAPE is constant: if the
    // simulation were accumulating anything per step, the field count would
    // move. It is the same check the golden fixtures make, run over a long run.
    const count = (o: unknown): number => {
      if (o === null || typeof o !== 'object') return 1;
      return Object.values(o).reduce<number>((n, v) => n + count(v), 0);
    };

    let s = createScenarioState(getScenario('rtls')!);
    cmd.toggleBoostBack(s);
    const before = count(s);
    for (let i = 0; i < 120 * 120; i++) s = step(s, DT);
    expect(count(s)).toBe(before);
  });

  it('the loop keeps exactly two states, however long it runs', () => {
    // Not a history buffer: `previous` and `state`, and nothing else.
    const loop = createLoopState(createScenarioState(getScenario('landing-burn')!));
    for (let i = 0; i < 10_000; i++) advance(loop, DT);
    expect(Object.keys(loop).sort()).toEqual(
      ['accumulator', 'previous', 'simulatedTime', 'state', 'totalSteps'].sort(),
    );
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

    const oneCost = medianMs(5, () => {
      for (let i = 0; i < 200; i++) advance(one, DT);
    });
    const sixteenCost = medianMs(5, () => {
      for (let i = 0; i < 200; i++) advance(sixteen, DT, { timeWarp: 16 });
    });

    expect(sixteen.totalSteps / one.totalSteps).toBeCloseTo(16, 0);
    // Allow generous headroom for measurement noise; the point is that it is
    // not quadratic.
    expect(sixteenCost / oneCost).toBeLessThan(32);
  });
});

/* ── M7.5: what the streaks cost the pool ─────────────────────────────── */

describe('particle pool headroom, with the velocity streaks added', () => {
  it('reports peak usage across all seven scenarios against the 576 baseline', () => {
    /*
      DEPTH-AND-SPEED-PLAN § 3.3 measured the headroom before any of this
      existed: peak 576 of 4000 across the seven scenarios, 86% free. M7.5 spends
      some of it, and this is the number.

      Run through the real effect driver rather than by calling `emit` directly,
      because the thing that could go wrong is a CALLER — the 2021 leak was a
      renderer effect fired from a new call site, and the streaks are exactly
      that: a new call site, emitting every frame, at a rate driven by a curve.
    */
    const particles = createParticleSystem(Texture.EMPTY, 4000, 20_250_825);
    const effects = createEffectDriver();
    const live: MutableViewport = {
      width: 0,
      height: 0,
      physicalHeight: 0,
      physicalWidth: 0,
      scale: 0,
    };
    const FRAME = 1 / 60;

    let peak = 0;
    let peakAt = '';
    const report: string[] = [];

    for (const spec of GOLDEN_SPECS) {
      let s = spec.build();
      writeViewport(live, 1280, 800, vehicleHeight, 1, s.kinematics.altitude);
      const camera = createCamera(
        live,
        s.kinematics.downRangeDistance,
        s.kinematics.speedX,
        s.kinematics.speedY,
      );
      let scenarioPeak = 0;

      // Two 120 Hz steps per 60 fps frame, as the loop drains them.
      for (let i = 0; i < spec.steps; i += 2) {
        // The driver diffs against the previous state for its edge detection —
        // engine ignitions, shutdowns — so it has to be the state from before
        // this frame's steps rather than from before the last one.
        const previous = s;
        s = step(s, DT);
        s = step(s, DT);
        writeViewport(live, 1280, 800, vehicleHeight, 1, s.kinematics.altitude);
        effects.update(particles, camera, live, s, previous, FRAME);
        scenarioPeak = Math.max(scenarioPeak, particles.alive);
      }

      report.push(`${spec.id}: peak ${scenarioPeak}`);
      if (scenarioPeak > peak) {
        peak = scenarioPeak;
        peakAt = spec.id;
      }
      particles.clear();
    }

    const headroom = ((1 - peak / particles.capacity) * 100).toFixed(0);
    console.log(
      `${report.join(' · ')}\n   worst ${peak} of ${particles.capacity} (${headroom}% free), ` +
        `at ${peakAt}; baseline before M7.5 was 576`,
    );

    // The pool is fixed and must never be the thing that fails: the emitter
    // starves rather than overflowing, but a peak near capacity would mean
    // effects silently dropping frames' worth of particles.
    expect(peak, `peak ${peak} of ${particles.capacity}`).toBeLessThan(particles.capacity * 0.75);
    // And it is genuinely emitting, or this measures nothing.
    expect(peak).toBeGreaterThan(100);
  });
});
