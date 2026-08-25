/**
 * M4.5: the flight recorder.
 *
 * The interesting properties are not "does it store numbers". They are:
 * when it samples (2021's rule, keyed off SimState so warp cannot change it),
 * that it stays outside SimState, and that every plot's channels exist.
 */
import { describe, expect, it } from 'vitest';
import { CHANNELS, createRecorder, PLOTS, shouldSample } from '$app/recorder';
import { advance, createLoopState, DT } from '$app/loop';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { recordTimeInterval, starBaseXPos } from '$core/constants';
import { toggleAllRaptors } from '$core/control/commands';
import type { SimState } from '$core/state';

describe('the sampling rule', () => {
  it('samples every recordTimeInterval frames', () => {
    let s: SimState = createScenarioState(getScenario('booster-sep')!);
    const hits: number[] = [];
    for (let i = 0; i < 100; i++) {
      s = step(s, DT);
      if (shouldSample(s)) hits.push(s.world.updatedFrameCount);
    }
    expect(hits.length).toBeGreaterThan(0);
    for (const frame of hits) expect(frame % recordTimeInterval).toBe(0);
  });

  it('stops once the flight is over', () => {
    // updateBackEnd.js:212 — no samples while crashed, broken up, or on the
    // ground. Otherwise every plot ends in a long flat tail of the wreckage.
    const s = createScenarioState(getScenario('landing-burn')!);
    s.world.updatedFrameCount = recordTimeInterval;
    expect(shouldSample(s)).toBe(true);

    for (const kill of ['crashed', 'inFlightBreakUp'] as const) {
      const dead = createScenarioState(getScenario('landing-burn')!);
      dead.world.updatedFrameCount = recordTimeInterval;
      dead.failures[kill] = true;
      expect(shouldSample(dead), kill).toBe(false);
    }

    for (const rest of ['onTheGround', 'landed'] as const) {
      const down = createScenarioState(getScenario('landing-burn')!);
      down.world.updatedFrameCount = recordTimeInterval;
      down.status[rest] = true;
      expect(shouldSample(down), rest).toBe(false);
    }
  });
});

describe('recording', () => {
  function record(frames: number) {
    const recorder = createRecorder();
    let s: SimState = createScenarioState(getScenario('booster-sep')!);
    toggleAllRaptors(s);
    for (let i = 0; i < frames; i++) {
      s = step(s, DT);
      recorder.sample(s);
    }
    return recorder;
  }

  it('keeps every channel the same length as the time axis', () => {
    const recorder = record(1_200);
    expect(recorder.length).toBeGreaterThan(100);
    for (const channel of CHANNELS) {
      expect(recorder.series[channel.id]!.length, channel.id).toBe(recorder.length);
    }
  });

  it('labels the x-axis in simulated seconds', () => {
    // 2021 added `timeAccel * recordTimeInterval`, which counted warped frames,
    // so the same flight got a different time axis at a different warp setting.
    const recorder = record(1_200);
    const expectedStep = recordTimeInterval * DT;
    expect(recorder.time[0]).toBeCloseTo(expectedStep, 12);
    expect(recorder.time[9]).toBeCloseTo(expectedStep * 10, 12);
  });

  it('records downrange relative to StarBase, as the fly-path plot showed', () => {
    const recorder = record(600);
    const first = recorder.series['downRange']![0]!;
    // The preset starts 45 km downrange, not half a planet from the origin.
    expect(Math.abs(first)).toBeLessThan(1_000_000);
    expect(first + starBaseXPos).toBeGreaterThan(1_000_000);
  });

  it('records propellant in tonnes, converted once', () => {
    const recorder = record(600);
    const propellant = recorder.series['propellant']![0]!;
    expect(propellant).toBeGreaterThan(1);
    expect(propellant).toBeLessThan(1_500);
  });

  it('clear() empties every channel and restarts the clock', () => {
    const recorder = record(600);
    expect(recorder.length).toBeGreaterThan(0);

    recorder.clear();
    expect(recorder.length).toBe(0);
    for (const channel of CHANNELS) expect(recorder.series[channel.id]!.length).toBe(0);

    let s: SimState = createScenarioState(getScenario('booster-sep')!);
    for (let i = 0; i < 60; i++) {
      s = step(s, DT);
      recorder.sample(s);
    }
    expect(recorder.time[0]).toBeCloseTo(recordTimeInterval * DT, 12);
  });

  it('records the same samples however the steps were batched', () => {
    // The rule keys off updatedFrameCount, which lives in SimState, so frame
    // rate and warp cannot change what is recorded — only how fast it fills.
    const a = createRecorder();
    const loopA = createLoopState(createScenarioState(getScenario('rtls')!));
    for (let i = 0; i < 300; i++) {
      advance(loopA, 1 / 60, { onStep: (state) => a.sample(state) });
    }

    // The same flight at a different frame rate, and under warp.
    const b = createRecorder();
    const loopB = createLoopState(createScenarioState(getScenario('rtls')!));
    while (loopB.totalSteps < loopA.totalSteps) {
      advance(loopB, 1 / 240, { timeWarp: 4, onStep: (state) => b.sample(state) });
    }

    // Stepped by hand, the reference.
    const c = createRecorder();
    let s: SimState = createScenarioState(getScenario('rtls')!);
    for (let i = 0; i < loopA.totalSteps; i++) {
      s = step(s, DT);
      c.sample(s);
    }

    expect(a.length).toBeGreaterThan(10);
    expect(a.series['altitude']).toEqual(c.series['altitude']!.slice(0, a.length));
    expect(b.series['altitude']!.slice(0, a.length)).toEqual(a.series['altitude']);
  });
});

describe('the plot specs', () => {
  it('names only channels that exist', () => {
    const ids = new Set(CHANNELS.map((c) => c.id));
    for (const plot of PLOTS) {
      for (const id of plot.channels) expect(ids.has(id), `${plot.id}/${id}`).toBe(true);
      if (plot.xChannel) expect(ids.has(plot.xChannel), plot.id).toBe(true);
    }
  });

  it('is the nine plots 2021 had', () => {
    expect(PLOTS.length).toBe(9);
    expect(PLOTS.map((p) => p.title)).toEqual([
      'FlyPath',
      'Speed in M/S',
      'Propellent in tons',
      'Acceleration',
      'Angle in Radian',
      'ControlInPut',
      'Heating&DynamicPressure',
      'AerodynamicForce',
      'Altitude',
    ]);
  });

  it('every channel 2021 recorded is still recorded', () => {
    expect(CHANNELS.length).toBe(19);
  });
});

describe('the recorder stays out of the simulation', () => {
  it('does not touch the state it is given', () => {
    const recorder = createRecorder();
    let s: SimState = createScenarioState(getScenario('reentry')!);
    for (let i = 0; i < 50; i++) s = step(s, DT);

    const before = JSON.stringify(s, (_k, v: unknown) =>
      typeof v === 'number' && !Number.isFinite(v) ? String(v) : v,
    );
    recorder.sample(s);
    const after = JSON.stringify(s, (_k, v: unknown) =>
      typeof v === 'number' && !Number.isFinite(v) ? String(v) : v,
    );

    expect(after).toBe(before);
  });

  it('a long recording does not slow the step down', () => {
    // The reason the recorder is not in SimState: cloning a growing array on
    // every step would make each step O(flight length). This shows it is not.
    const recorder = createRecorder();
    let s: SimState = createScenarioState(getScenario('booster-sep')!);

    const time = (frames: number) => {
      const t0 = performance.now();
      for (let i = 0; i < frames; i++) {
        s = step(s, DT);
        recorder.sample(s);
      }
      return performance.now() - t0;
    };

    time(2_000);
    const early = Math.min(time(2_000), time(2_000));
    for (let i = 0; i < 20_000; i++) {
      s = step(s, DT);
      recorder.sample(s);
    }
    const late = Math.min(time(2_000), time(2_000));

    expect(recorder.length).toBeGreaterThan(4_000);
    // Generous: this catches O(n), not a 30% drift from cache effects.
    expect(late, `${early.toFixed(1)} ms then ${late.toFixed(1)} ms`).toBeLessThan(early * 3 + 5);
  });
});
