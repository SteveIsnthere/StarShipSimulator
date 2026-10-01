/**
 * The HUD's 2 ms budget, timed. Not part of the gate (see tests/view/perf.timing.test.ts);
 * run with `npm run bench` on an idle machine.
 */
/**
 * M4.1: the HUD binder.
 *
 * The 2021 wound, measured: displayComponents/dispUpdate.js contains 45
 * `document.getElementById` calls, 18 of them in `updateFlightParamDisp()` —
 * the only function of the three on the per-frame path — and it assigns
 * `textContent` unconditionally. It could only afford that by running its body
 * every fifth frame (`updatedFrameCount % 5 == 0`), i.e. at 12 Hz on a 60 fps
 * machine. The binder updates at the full frame rate instead, and pays less.
 *
 * So the tests here are not "does it show the right number" — they are the
 * three properties that make it a different thing from 2021:
 *
 *   1. Elements are resolved once. The per-frame path never looks anything up.
 *   2. Writes are diffed. Unchanged readouts cost nothing.
 *   3. The whole update fits the 2 ms budget from `sim-core-conventions`.
 *
 * The binder takes a resolver rather than reaching for `document`, so all of
 * this runs in plain Node against counting stubs — which is also how the write
 * counts below are exact rather than approximate.
 */
import { describe, expect, it } from 'vitest';
import { createIndicatorBinder, createMetricBinder, type ClassTarget } from '$hud/binder';
import { METRICS } from '$hud/metrics';
import { INDICATORS } from '$hud/indicators';
import { createTimeline, trackFor } from '$hud/timeline';
import { createMapRenderer } from '$hud/trajectory-draw';
import { createTimelineBinder } from '$hud/timeline-binder';
import { type SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import * as cmd from '$core/control/commands';

import { harness, recordingMapContext } from './binder-harness';

describe('the 2 ms budget', () => {
  it('an update costs a small fraction of 2 ms, even when every readout changes', () => {
    const { binder } = harness();
    let state: SimState = createScenarioState(getScenario('reentry')!);

    // Warm up so this measures steady state, not first-call compilation.
    for (let i = 0; i < 500; i++) {
      state = step(state, DT);
      binder.update(state);
    }

    const samples: number[] = [];
    for (let run = 0; run < 7; run++) {
      const states: SimState[] = [];
      for (let i = 0; i < 1_000; i++) {
        state = step(state, DT);
        states.push(state);
      }
      const t0 = performance.now();
      for (const s of states) binder.update(s);
      samples.push((performance.now() - t0) / 1_000);
    }
    samples.sort((a, b) => a - b);
    const perUpdate = samples[Math.floor(samples.length / 2)]!;

    expect(perUpdate, `HUD update cost ${perUpdate.toFixed(4)} ms`).toBeLessThan(2);
  });

  it('all FOUR binders together still fit it, on the finished overlay', () => {
    /*
      The budget is per frame, not per binder. M6.2 put a third binder on the
      frame path (gauges, bars, dots, chevron) and M6.3 a fourth (the event
      track). Measuring the readout binder alone would have kept saying 'green'
      while the actual per-frame cost grew — exactly the shape of regression a
      budget exists to catch. So this measures what the session's tick really
      calls for the HUD, in the order it calls it.
    */
    const text = harness();

    const metricEls = new Map<string, { setAttribute(name: string, value: string): void }>();
    for (const metric of METRICS) {
      metricEls.set(metric.id, { setAttribute: () => {} });
    }
    const metrics = createMetricBinder({
      resolve: (id) => metricEls.get(id) ?? null,
    });

    const indicatorEls = new Map<string, ClassTarget>();
    for (const indicator of INDICATORS) {
      indicatorEls.set(indicator.id, { classList: { toggle: () => {} } });
    }
    const indicators = createIndicatorBinder({
      resolve: (id) => indicatorEls.get(id) ?? null,
    });

    const timeline = createTimeline();
    const track = trackFor('reentry');
    const timelineBinder = createTimelineBinder({
      timeline,
      resolveText: () => ({ textContent: null }),
    });
    timelineBinder.rebind(track, () => ({ setAttribute: () => {} }));

    let state: SimState = createScenarioState(getScenario('reentry')!);
    cmd.toggleAutoLand(state);

    /*
      M7.7: the map is IN this benchmark, not beside it.

      The whole reason this test measures the frame rather than one binder is
      the note above — a per-binder benchmark keeps saying green while the real
      cost grows. M7.1 added a canvas repaint to the same tick, and leaving it
      out would have reintroduced exactly that blind spot one milestone after
      it was closed.

      It is offered at 10 Hz through `update`, which is what the session's tick does, so
      what is measured is the real amortised cost: nine frames of one throttle
      check and a tenth that repaints.
    */
    const mapContext = recordingMapContext(280, 104);
    const trail = { downRange: [] as number[], altitude: [] as number[] };
    const map = createMapRenderer({ context: mapContext, trail });

    const tick = (s: SimState) => {
      timeline.observe(s);
      text.binder.update(s);
      metrics.update(s);
      timelineBinder.update();
      indicators.update(s);
      map.update(s, 1 / 120);
      // The trail grows as the recorder feeds it, so the decimation is
      // measured over a real length rather than an empty array.
      if (trail.downRange.length < 20_000 && s.world.updatedFrameCount % 5 === 0) {
        trail.downRange.push(s.kinematics.downRangeDistance);
        trail.altitude.push(s.kinematics.altitude);
      }
    };

    for (let i = 0; i < 500; i++) {
      state = step(state, DT);
      tick(state);
    }

    const samples: number[] = [];
    for (let run = 0; run < 7; run++) {
      const states: SimState[] = [];
      for (let i = 0; i < 1_000; i++) {
        state = step(state, DT);
        states.push(state);
      }
      const t0 = performance.now();
      for (const s of states) tick(s);
      samples.push((performance.now() - t0) / 1_000);
    }
    samples.sort((a, b) => a - b);
    const perFrame = samples[Math.floor(samples.length / 2)]!;

    const report =
      `whole-HUD frame cost ${perFrame.toFixed(4)} ms of a 2 ms budget, ` +
      `map redrew ${map.drawCount} times over ${trail.downRange.length} trail points`;
    console.log(report);
    expect(perFrame, report).toBeLessThan(2);
    // And the map was genuinely in the loop, or this measured the old frame.
    expect(map.drawCount).toBeGreaterThan(10);
  });
});
