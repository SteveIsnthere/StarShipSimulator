/**
 * The fixed-timestep loop.
 *
 * This is the piece the 2021 build did not have, and its absence is why that
 * simulation ran roughly 19% slow under load and behaved differently on
 * different devices. updateBackEnd() measured the real time since the last
 * frame, clamped it to [1, 30] ms, and integrated by whatever that was — so a
 * frame that took 45 ms advanced the world by 30, and the physics silently ran
 * in slow motion whenever the renderer struggled.
 *
 * Here the simulation advances only in fixed DT increments. Frame time feeds an
 * accumulator, whole steps are drained from it, and the remainder is handed to
 * the renderer as an interpolation factor. The number of steps per frame varies;
 * what a step means never does.
 *
 * Three consequences, all of them things CLAUDE.md asks for:
 *   - determinism: the same inputs produce the same trajectory at any frame rate
 *     (tests/golden proves this bit-for-bit across batchings);
 *   - honest time warp: warp N runs N steps per frame. dt is never scaled,
 *     because scaling dt would change what the physics means;
 *   - no spiral of death: a frame time longer than MAX_FRAME_TIME is clamped, so
 *     a slow frame cannot demand more steps than the next frame can afford.
 */
import { step, type StepInput, NO_INPUT } from '$core/step';
import type { SimState } from '$core/state';

/** Seconds per simulation step. 120 Hz. */
export const DT = 1 / 120;

/**
 * Seconds. Frame times longer than this are clamped.
 *
 * Without a clamp, a 2-second stall (a tab backgrounded, a GC pause) would
 * demand 240 steps on the next frame, which takes longer than a frame, which
 * demands more steps still — the spiral of death. Clamping drops simulated time
 * on the floor instead, which is the right trade: the world runs slow for one
 * frame rather than locking up.
 *
 * 0.25 s is the value CLAUDE.md specifies.
 */
export const MAX_FRAME_TIME = 0.25;

/** Guard against a pathological warp factor demanding unbounded work. */
export const MAX_STEPS_PER_FRAME = 2000;

export interface LoopState {
  /** The simulation as of the last completed step. */
  state: SimState;
  /** The state before that step, for interpolation. */
  previous: SimState;
  /** Unconsumed simulated time, in seconds. Always < DT. */
  accumulator: number;
  /** Steps taken since the loop started. */
  totalSteps: number;
  /** Simulated seconds elapsed. */
  simulatedTime: number;
}

export function createLoopState(initial: SimState): LoopState {
  return {
    state: initial,
    previous: initial,
    accumulator: 0,
    totalSteps: 0,
    simulatedTime: 0,
  };
}

export interface AdvanceOptions {
  /** Steps to run per drained increment. 1 is real time, 4 is 4x warp. */
  readonly timeWarp?: number;
  /**
   * Divisor for slow motion. 1 is real time, 4 is quarter speed.
   *
   * Speeding up and slowing down are not symmetric operations here, and it is
   * worth being explicit about why rather than papering over it with one signed
   * number. Speeding up means running MORE steps per frame — that is `timeWarp`
   * above, and it is the only honest way to do it, because a step must always
   * mean DT seconds (CLAUDE.md).
   *
   * Slowing down cannot be "fewer steps per frame": below one step per frame
   * there is no such thing. What it is instead is less REAL time entering the
   * accumulator, so whole DT steps come out more rarely. dt is still never
   * scaled; the simulation is untouched, it simply advances less per second of
   * wall clock. 2021 did this by dividing `renderTimeInterval`, which scaled
   * every per-frame rate constant in the physics and so changed what the model
   * meant at each setting.
   */
  readonly slowMotion?: number;
  /** Commands for this frame. Applied to every step within it. */
  readonly input?: StepInput;
  /** When true, time still passes for the renderer but the sim does not step. */
  readonly paused?: boolean;
  /**
   * Called after every step, with the new state.
   *
   * The flight recorder needs this, and the reason is a difference between v2
   * and 2021 that is easy to miss: in 2021 a frame WAS a step, so "sample every
   * fifth frame" and "sample every fifth step" were the same sentence. Here a
   * frame runs however many steps the accumulator drained — two at 60 fps,
   * sixteen at warp 8 — so a recorder called once per frame would silently skip
   * most of the sampling points and record a different flight at a different
   * frame rate.
   *
   * Pass a stable function: this is the per-frame path and CLAUDE.md forbids
   * allocating in it.
   */
  readonly onStep?: (state: SimState) => void;
}

export interface AdvanceResult {
  /** Steps actually run this frame. */
  readonly steps: number;
  /**
   * 0..1 — how far between `previous` and `state` the renderer should draw.
   *
   * Without this the picture stutters whenever the frame rate is not an exact
   * multiple of the step rate: a 144 Hz display running a 120 Hz sim shows the
   * same state twice every fifth frame. Interpolating removes that.
   */
  readonly alpha: number;
  /** True if frame time was clamped, i.e. simulated time was dropped. */
  readonly clamped: boolean;
  /**
   * Seconds of SIMULATED time this frame advanced the world. `steps * DT`.
   *
   * WHAT THE VIEW MUST BE DRIVEN BY (M9.2), and the reason this field exists
   * rather than the caller multiplying for itself. It is not the frame time,
   * and the difference is every mechanism in this file: the clamp above drops
   * simulated time on the floor, the accumulator hands out only whole steps,
   * slow motion feeds it less real time, warp runs the step loop N times, and
   * the max-steps bailout abandons the rest. A renderer handed the frame time
   * integrates a different amount of world than the physics did, and the error
   * is one-directional and cumulative.
   *
   * It cost three milestones to find that out. `advance` already returned
   * `steps` and `clamped`, which between them say the same thing; App.svelte
   * discarded the whole result and passed its own `frameTime` to the camera,
   * the cloud deck, the distant earth and the particle system. On `reentry`
   * that put the vehicle 1734 px off the left edge of a 1280 px frame, and
   * `centerizeAcceleration` had given up by then so it never came back.
   */
  readonly simulatedDt: number;
}

/**
 * Advance the loop by one frame.
 *
 * @param loop mutated in place — this is the per-frame hot path and CLAUDE.md
 *   requires zero allocation here. `step()` itself remains pure.
 * @param frameTime real seconds since the previous frame
 */
export function advance(
  loop: LoopState,
  frameTime: number,
  options: AdvanceOptions = {},
): AdvanceResult {
  const warp = options.timeWarp ?? 1;
  const slow = options.slowMotion ?? 1;
  const onStep = options.onStep;
  const input = options.input ?? NO_INPUT;

  let clamped = false;
  let dtFrame = frameTime;
  if (!(dtFrame > 0)) {
    // Negative or NaN frame time: a clock that went backwards, or a first frame
    // with no previous timestamp. Treat as no elapsed time rather than as chaos.
    dtFrame = 0;
  }
  if (dtFrame > MAX_FRAME_TIME) {
    dtFrame = MAX_FRAME_TIME;
    clamped = true;
  }

  if (options.paused === true) {
    return { steps: 0, alpha: loop.accumulator / DT, clamped, simulatedDt: 0 };
  }

  // Slow motion scales the real time entering the accumulator, never dt.
  loop.accumulator += slow === 1 ? dtFrame : dtFrame / slow;

  let steps = 0;
  while (loop.accumulator >= DT) {
    loop.accumulator -= DT;

    // Time warp runs the step loop N times. It never scales dt: a step must
    // always mean the same thing, or goldens and warp cannot coexist.
    for (let i = 0; i < warp; i++) {
      loop.previous = loop.state;
      loop.state = step(loop.state, DT, input);
      if (onStep) onStep(loop.state);
      steps += 1;
      loop.totalSteps += 1;
      loop.simulatedTime += DT;
      if (steps >= MAX_STEPS_PER_FRAME) {
        loop.accumulator = 0;
        return { steps, alpha: 0, clamped: true, simulatedDt: steps * DT };
      }
    }
  }

  return { steps, alpha: loop.accumulator / DT, clamped, simulatedDt: steps * DT };
}

/**
 * Linear interpolation factor for the renderer, as a convenience.
 *
 * Deliberately not an interpolated SimState: building one per frame would
 * allocate a whole state on the hot path. The view layer interpolates only the
 * handful of quantities it draws, from `previous` and `state` directly.
 */
export function interpolate(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}
