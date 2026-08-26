/**
 * M9.2: the view runs on the SIMULATION's clock, not the wall's.
 *
 * THE BUG THIS FILE EXISTS FOR. `App.svelte` measured one wall `frameTime` per
 * rAF and handed the same number to two different things: to `advance()`, which
 * treats it as real time to be BUDGETED, and to the camera, the cloud deck, the
 * distant earth and the particle system, which treat it as world time that has
 * PASSED. Those are only the same number while nothing goes wrong. `advance`
 * clamps at MAX_FRAME_TIME, drains whole DT steps, divides by the slow-motion
 * factor, multiplies by the warp factor, and bails out at MAX_STEPS_PER_FRAME —
 * and it returns exactly how much time it actually simulated so the caller can
 * know. The caller discarded the return value.
 *
 * The consequence is not subtle and is not theoretical: the `reentry` preset did
 * not draw the vehicle AT ALL. Instrumented in the browser it sat 1734 px off
 * the left edge of a 1280 px frame within four seconds of loading, and stayed
 * there. Three milestones of screenshot review never caught it, because a
 * screenshot of a sky looks like a sky.
 *
 * WHY IT COMPOUNDS. `centerizeAcceleration` returns exactly 0 once the camera is
 * more than half a viewport from its target — a 2021 branch whose purpose is
 * "do not lurch after an explosion", applied to a vehicle that is flying
 * normally. So the clock mismatch does not produce a wobble that settles. It
 * produces an error that grows past the give-up radius once and then FREEZES
 * there, permanently, for the rest of the flight.
 *
 * WHAT IS TESTED HERE. The pairing, not the pieces: `advance()` and
 * `updateCamera()` driven together the way the one rAF tick drives them, over
 * all seven golden flights, with the frame-time sequences a real browser
 * produces. Each test comes in a pair — the fixed clock must hold the vehicle in
 * frame, and the wall clock must NOT. The second half of each pair is not
 * decoration: without it the first half could go green because the scenario got
 * easier rather than because the fix works, and this is a Bug-fix tier change,
 * which means the failing test is the evidence.
 */
import { describe, expect, it } from 'vitest';
import { advance, createLoopState, DT } from '$app/loop';
import { CAMERA_MAX_DT } from '$view/camera';
import {
  createCamera,
  updateCamera,
  worldToScreen,
  writeViewport,
  type CameraTarget,
  type MutableViewport,
} from '$view/camera';
import { vehicleHeight } from '$core/constants';
import type { SimState } from '$core/state';
import { GOLDEN_SPECS } from '../golden/scenarios';

/**
 * Which clock the view is driven by. The whole subject of this file.
 *
 *   perStep   what `App.svelte` does since M9.2: the camera is advanced from
 *             `AdvanceOptions.onStep`, once per simulation step, always at DT
 *   perFrame  the obvious half-fix — once per frame, but with the SIMULATED
 *             elapsed time rather than the frame time. Better, and not enough:
 *             a second-order follow that only ever sees the endpoint of a frame
 *             lags by an amount that still depends on the frame rate
 *   wall      what it did before: once per frame, with the wall frame time
 */
type Clock = 'perStep' | 'perFrame' | 'wall';

interface FlightOptions {
  readonly clock: Clock;
  /** Seconds of wall time this frame took. Called once per frame. */
  readonly frameTime: (frame: number) => number;
  readonly timeWarp?: number;
  readonly slowMotion?: number;
}

interface Flown {
  /** Worst horizontal offset of the vehicle from frame centre, as a fraction of a half-frame. */
  readonly worstX: number;
  readonly worstY: number;
  /** Where the camera ended up, in metres. Compared for EXACT equality. */
  readonly finalX: number;
  readonly finalY: number;
  /** True if the vehicle was ever outside the frame entirely. */
  readonly lost: boolean;
  readonly frames: number;
  readonly report: string;
}

/**
 * Fly a golden scenario through the loop and the camera together.
 *
 * A faithful reproduction of `App.svelte`'s tick and nothing more: measure a
 * frame time, `advance()` the loop with it, then move the camera. The only
 * variable is WHICH NUMBER the camera gets — and that one choice is the entire
 * content of this milestone's first bug.
 */
function fly(spec: (typeof GOLDEN_SPECS)[number], options: FlightOptions): Flown {
  const live: MutableViewport = {
    width: 0,
    height: 0,
    physicalHeight: 0,
    physicalWidth: 0,
    scale: 0,
  };
  writeViewport(live, 1280, 800, vehicleHeight, 1, 0);

  let state: SimState = spec.build();
  const loop = createLoopState(state);

  // Seeded with the vehicle's own velocity, exactly as App.svelte seeds it, so
  // there is no start-up transient to mistake for the bug under test.
  const camera = createCamera(
    live,
    state.kinematics.downRangeDistance,
    state.kinematics.speedX,
    state.kinematics.speedY,
  );
  camera.posY = Math.max(live.physicalHeight * 0.5, state.kinematics.altitude);

  const target: CameraTarget & {
    downRangeDistance: number;
    altitude: number;
    speedX: number;
    speedY: number;
    landed: boolean;
    onTheGround: boolean;
    crashed: boolean;
    dynamicPressure: number;
    thrustAcceleration: number;
  } = {
    downRangeDistance: 0,
    altitude: 0,
    speedX: 0,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
    dynamicPressure: 0,
    thrustAcceleration: 0,
  };

  const warp = options.timeWarp ?? 1;
  const slow = options.slowMotion ?? 1;
  // Enough frames to fly the whole recorded scenario at whatever rate the
  // options ask for, plus slack for the frames that simulate nothing.
  const wanted = spec.steps;
  let simulated = 0;
  let frames = 0;
  let worstX = 0;
  let worstY = 0;
  let lost = false;
  let worstAt = 0;

  /** Point the camera at one state and advance it by `dt`. */
  const follow = (at: SimState, dt: number): void => {
    const k = at.kinematics;
    writeViewport(live, 1280, 800, vehicleHeight, 1, k.altitude);
    target.downRangeDistance = k.downRangeDistance;
    target.altitude = k.altitude;
    target.speedX = k.speedX;
    target.speedY = k.speedY;
    target.landed = at.status.landed;
    target.onTheGround = at.status.onTheGround;
    target.crashed = at.failures.crashed;
    target.dynamicPressure = at.forces.dynamicPressure;
    target.thrustAcceleration = at.forces.thrustAcceleration;
    updateCamera(camera, target, live, dt);
  };

  // Allocated once, outside the loop, the way App.svelte allocates its own.
  const onStep = options.clock === 'perStep' ? (at: SimState) => follow(at, DT) : undefined;

  while (simulated < wanted && frames < 200_000) {
    const frameTime = options.frameTime(frames);
    const result = advance(loop, frameTime, {
      timeWarp: warp,
      slowMotion: slow,
      ...(onStep ? { onStep } : {}),
    });
    simulated += result.steps;
    frames += 1;

    state = loop.state;
    const k = state.kinematics;

    if (options.clock === 'perFrame') follow(state, result.simulatedDt);
    else if (options.clock === 'wall') follow(state, frameTime);

    // A destroyed vehicle is allowed to leave the frame — that is the give-up
    // behaviour, deliberately kept, and the owner's decision at M9.2 is that it
    // is the ONLY case that keeps it.
    if (state.failures.crashed || state.failures.inFlightBreakUp) break;

    const p = worldToScreen(camera, live, k.downRangeDistance, k.altitude);
    const offX = Math.abs(p.x - live.width / 2) / (live.width / 2);
    const offY = Math.abs(p.y - live.height / 2) / (live.height / 2);
    /*
      NaN counts as lost, and this guard is not hypothetical: the first run of
      this file drove the camera with an undefined dt, every comparison against
      NaN was false, and four framing tests went green while measuring nothing.
      A test that passes because its measurement collapsed is worse than no test.
    */
    if (!Number.isFinite(offX) || !Number.isFinite(offY)) {
      lost = true;
      break;
    }
    if (offX > worstX) {
      worstX = offX;
      worstAt = simulated * DT;
    }
    if (offY > worstY) worstY = offY;
    if (offX > 1 || offY > 1) lost = true;
  }

  return {
    worstX,
    worstY,
    finalX: camera.posX,
    finalY: camera.posY,
    lost,
    frames,
    report:
      `${spec.id} on the ${options.clock} clock: worst offset ` +
      `${(worstX * 100).toFixed(0)}% x (at t+${worstAt.toFixed(1)} s), ` +
      `${(worstY * 100).toFixed(0)}% y, over ${frames} frames`,
  };
}

/** A steady sixty frames a second, with nothing going wrong. */
const steady = () => 1 / 60;

/**
 * Sixty frames a second with a stall every two seconds.
 *
 * NOT A PATHOLOGICAL INPUT. A 400 ms frame is a garbage collection, a texture
 * upload, a phone throttling itself, or the very first frame after mount — the
 * browser probe that opened this milestone measured exactly this shape during a
 * re-entry, where the particle load is heaviest. It is above MAX_FRAME_TIME, so
 * `advance` clamps it and DROPS 150 ms of simulated time on the floor. On the
 * wall clock the camera spends that 150 ms travelling anyway.
 */
const stalling = (frame: number) => (frame % 120 === 119 ? 0.4 : 1 / 60);

describe('the vehicle stays in frame, over all seven goldens', () => {
  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s, with frames dropping', (_id, spec) => {
    const flown = fly(spec, { clock: 'perStep', frameTime: stalling });
    /*
      The same bounds M7.3's property 1 asserts, held under a frame-time
      sequence property 1 never saw: half a frame horizontally, and a whole
      half-frame vertically because the ground-mode handoff puts the vehicle on
      the top edge by construction and CLAUDE.md names that band as the soul.
    */
    expect(flown.worstX, flown.report).toBeLessThan(0.5);
    expect(flown.worstY, flown.report).toBeLessThanOrEqual(1);
    expect(flown.lost, flown.report).toBe(false);
  });

  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s, at 9x warp', (_id, spec) => {
    const flown = fly(spec, { clock: 'perStep', frameTime: steady, timeWarp: 9 });
    expect(flown.worstX, flown.report).toBeLessThan(0.5);
    expect(flown.worstY, flown.report).toBeLessThanOrEqual(1);
    expect(flown.lost, flown.report).toBe(false);
  });

  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s, at 1/9 speed', (_id, spec) => {
    const flown = fly(spec, { clock: 'perStep', frameTime: steady, slowMotion: 9 });
    expect(flown.worstX, flown.report).toBeLessThan(0.5);
    expect(flown.worstY, flown.report).toBeLessThanOrEqual(1);
    expect(flown.lost, flown.report).toBe(false);
  });
});

describe('property 3, strengthened: the camera path does not depend on the frame rate', () => {
  /*
    M7.3 could only claim this to a tolerance — 1.71 m of drift between 30 and
    144 fps over ten seconds, because the camera took one explicit Euler step per
    frame and the step sizes differed fivefold. Driving it from `onStep` makes
    the claim EXACT: the camera sees the same sequence of simulation states, at
    the same dt, in the same order, whatever the display is doing. There is
    nothing left for a frame rate to change.

    Which is why this is an equality rather than a bound, and why it is the test
    worth having. A tolerance can absorb a regression; an identity cannot.
  */
  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))(
    '%s lands the camera on the same metre at 60 fps, with stalls, and at 9x',
    (_id, spec) => {
      const reference = fly(spec, { clock: 'perStep', frameTime: steady });
      for (const [label, options] of [
        ['a 400 ms stall every two seconds', { frameTime: stalling }],
        ['9x time warp', { frameTime: steady, timeWarp: 9 }],
        ['1/9 slow motion', { frameTime: steady, slowMotion: 9 }],
      ] as const) {
        const other = fly(spec, { clock: 'perStep', ...options });
        expect(other.finalX, `${label}\n${reference.report}\n${other.report}`).toBe(
          reference.finalX,
        );
        expect(other.finalY, `${label}\n${reference.report}\n${other.report}`).toBe(
          reference.finalY,
        );
      }
    },
  );
});

describe('and the two clocks that do not work', () => {
  /*
    THE FAILING HALF, KEPT.

    Every scenario is flown again on the clock the application actually used
    until this task, and at least one of them must lose the vehicle completely.
    Asserted across the set rather than per scenario on purpose: which flight
    breaks first depends on speed and field of view, and pinning it to `reentry`
    would make this a description of one flight instead of a statement about the
    clock. Without this half, the half above could go green because a scenario
    got easier rather than because the fix works — and this is a Bug-fix tier
    change, where the failing test is the evidence.
  */
  const losesIt = (clock: Clock, options: Omit<FlightOptions, 'clock'>) => {
    const reports: string[] = [];
    let anyLost = false;
    for (const spec of GOLDEN_SPECS) {
      const flown = fly(spec, { clock, ...options });
      reports.push(flown.report + (flown.lost ? '  <-- LOST' : ''));
      if (flown.lost) anyLost = true;
    }
    return { anyLost, report: reports.join('\n') };
  };

  it('the wall clock loses the vehicle when frames drop', () => {
    const { anyLost, report } = losesIt('wall', { frameTime: stalling });
    expect(anyLost, `the wall clock no longer breaks anything:\n${report}`).toBe(true);
  });

  it('the wall clock loses it at 9x warp, failing the other way round', () => {
    // The mirror image of the dropped frame. There the simulation advanced LESS
    // than the wall and the camera ran ahead; at warp the simulation advances
    // nine times MORE and a camera on the wall clock is left standing.
    const { anyLost, report } = losesIt('wall', { frameTime: steady, timeWarp: 9 });
    expect(anyLost, `warp no longer breaks the wall clock:\n${report}`).toBe(true);
  });

  it('and simulated time once per FRAME is better, but still not enough', () => {
    /*
      Worth keeping, because it is the fix that looks finished. Handing the
      camera `simulatedDt` once a frame removes the clock mismatch entirely —
      and the vehicle still leaves the frame at 9x, because a second-order
      follow that only sees where its target ENDED UP is chasing a teleport.
      At 9x on a 60 Hz display that teleport is 1.1 km, two thirds of a frame
      width, every frame.
    */
    const { anyLost, report } = losesIt('perFrame', { frameTime: steady, timeWarp: 9 });
    expect(anyLost, `per-frame simulated time now suffices — say so:\n${report}`).toBe(true);
  });

  it('all three agree when nothing goes wrong, which is why this survived', () => {
    /*
      At a steady frame rate with no warp the clocks differ by less than one
      step of leftover accumulator, and the camera's per-frame step is only
      twice its per-step one. The worst disagreement across the seven is 4.4% of
      a half-frame, on `reentry` — visible to an instrument, invisible to an
      eye, and every screenshot ever taken of this application was taken under
      exactly these conditions. That is the whole answer to "how did this last
      three milestones".
    */
    const reports: string[] = [];
    let worst = 0;
    for (const spec of GOLDEN_SPECS) {
      const perStep = fly(spec, { clock: 'perStep', frameTime: steady });
      const wall = fly(spec, { clock: 'wall', frameTime: steady });
      const gap = Math.abs(perStep.worstX - wall.worstX);
      worst = Math.max(worst, gap);
      reports.push(`${spec.id}: ${(gap * 100).toFixed(1)}% of a half-frame apart`);
    }
    expect(worst, reports.join('\n')).toBeLessThan(0.06);
  });
});

describe('the camera step and the simulation step', () => {
  it('are the same length, which is what makes the per-step camera exact', () => {
    /*
      `view/camera.ts` writes CAMERA_MAX_DT out rather than importing DT,
      because dependencies point down and `app/` is above `view/`. That is the
      right call and it leaves exactly one thing to check: that the two numbers
      have not drifted apart. If they ever do, the camera's own sub-stepping
      stops matching the rate it is actually driven at, and the identity above
      quietly becomes a tolerance again.
    */
    expect(CAMERA_MAX_DT).toBe(DT);
  });
});

describe('what advance() reports', () => {
  it('says how much time it actually simulated, not how much it was offered', () => {
    const spec = GOLDEN_SPECS[0]!;
    const loop = createLoopState(spec.build());
    // A frame longer than MAX_FRAME_TIME: 0.4 s offered, 0.25 s simulated.
    const result = advance(loop, 0.4, {});
    expect(result.clamped).toBe(true);
    expect(result.simulatedDt).toBeCloseTo(0.25, 10);
    expect(result.simulatedDt).toBe(result.steps * DT);
  });

  it('reports nine times the frame at warp 9, and a ninth of it in slow motion', () => {
    const spec = GOLDEN_SPECS[0]!;
    const fast = createLoopState(spec.build());
    const slow = createLoopState(spec.build());
    // Ten frames, so the accumulator remainder is a small share of the total.
    let fastTotal = 0;
    let slowTotal = 0;
    for (let i = 0; i < 60; i++) {
      fastTotal += advance(fast, 1 / 60, { timeWarp: 9 }).simulatedDt;
      slowTotal += advance(slow, 1 / 60, { slowMotion: 9 }).simulatedDt;
    }
    expect(fastTotal).toBeCloseTo(9, 1);
    expect(slowTotal).toBeCloseTo(1 / 9, 1);
  });

  it('simulates nothing while paused, so the view holds still too', () => {
    const spec = GOLDEN_SPECS[0]!;
    const loop = createLoopState(spec.build());
    expect(advance(loop, 1 / 60, { paused: true }).simulatedDt).toBe(0);
  });
});
